// Outils communs aux tests navigateur sur le site CONSTRUIT (frontend/dist) :
// petit serveur statique + Chromium via playwright-core (skip propre s'il manque).
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const DIST = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};

function serveDist() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    let file = join(DIST, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Renvoie { browser, base } ou null (test passé en skip) ; ferme tout en fin de test.
export async function setupBrowser(t) {
  let chromium;
  try {
    const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
    ({ chromium } = require('playwright-core'));
  } catch {
    t.skip('playwright-core non installé');
    return null;
  }
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    t.skip(`Chromium indisponible (${String(e.message).split('\n')[0]})`);
    return null;
  }
  const server = await serveDist();
  t.after(async () => {
    await browser.close();
    await new Promise((r) => server.close(r));
  });
  return { browser, base: `http://127.0.0.1:${server.address().port}` };
}

// Contraste au PIRE PIXEL d'un texte posé sur un fond non uni (image, vidéo).
// Deux captures de la boîte de l'élément : texte transparent (le fond tel qu'il est
// vu derrière les lettres, ombre portée comprise), puis texte visible ; les pixels qui
// changent sont ceux des glyphes. Pour chacun, contraste couleur du texte / pixel du fond.
// Renvoie { worst, glyphs } (ratio minimal, nombre de pixels de glyphes mesurés).
// { edges: true } : compte aussi les bords anticrénelés (tout pixel modifié par le texte,
// couleur du texte contre le fond sous ce pixel) — mesure plus sévère que le cœur des glyphes.
export async function worstPixelContrast(page, selector, { edges = false } = {}) {
  const el = page.locator(selector).first();
  const box = await el.boundingBox();
  const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
  const color = await el.evaluate((n) => getComputedStyle(n).color);
  await el.evaluate((n) => { n.dataset.prevColor = n.style.color; n.style.setProperty('color', 'transparent', 'important'); });
  const bg = await page.screenshot({ clip, animations: 'disabled' });
  await el.evaluate((n) => { n.style.color = n.dataset.prevColor; delete n.dataset.prevColor; });
  const fg = await page.screenshot({ clip, animations: 'disabled' });
  return page.evaluate(async ({ bg, fg, color, edges }) => {
    const load = async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height).data;
    };
    const [a, b] = [await load(bg), await load(fg)];
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = (r, g, bl) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
    // Couleur calculée normalisée en RGB 0–255 par un canevas : getComputedStyle rend
    // color-mix() en « color(srgb 0.58 0.67 0.57) », pas en rgb().
    const px = document.createElement('canvas').getContext('2d');
    px.fillStyle = color;
    px.fillRect(0, 0, 1, 1);
    const [r, g, bl] = px.getImageData(0, 0, 1, 1).data;
    const L = lum(r, g, bl);
    let worst = Infinity; let glyphs = 0;
    for (let i = 0; i < a.length; i += 4) {
      const diff = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      // Cœur des glyphes seulement : le pixel rendu est proche de la couleur du texte
      // (l'anticrénelage des bords mélange texte et fond, il ne se mesure pas).
      const near = Math.abs(b[i] - r) + Math.abs(b[i + 1] - g) + Math.abs(b[i + 2] - bl) < 60;
      if (edges ? diff <= 24 : (diff < 30 || !near)) continue;
      glyphs++;
      const B = lum(a[i], a[i + 1], a[i + 2]);
      const ratio = (Math.max(L, B) + 0.05) / (Math.min(L, B) + 0.05);
      if (ratio < worst) worst = ratio;
    }
    return { worst, glyphs };
  }, { bg: bg.toString('base64'), fg: fg.toString('base64'), color, edges });
}
