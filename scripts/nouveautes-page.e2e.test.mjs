// L13 — page /nouveautes/ : contenu généré au build depuis nouveautes.json, lien du menu
// (barre latérale au bureau, tiroir au téléphone), contraste, clavier et reflow à 320 px.
//
// Lit le site CONSTRUIT (frontend/dist) : lancer `npx astro build` avant. Les tests
// statiques échouent si dist est absent ou périmé ; les tests navigateur se mettent en
// « skip » sans playwright-core ni Chromium (comme mobile-drawer.e2e.test.mjs).
// EVATO_E2E_SHOTS=<dossier> enregistre une capture de la page à 1440, 390 et 320 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIST = fileURLToPath(new URL('../frontend/dist/', import.meta.url));
const DATA = JSON.parse(readFileSync(new URL('../frontend/public/nouveautes-data/nouveautes.json', import.meta.url), 'utf8'));
const PAGE = join(DIST, 'nouveautes', 'index.html');
const html = () => readFileSync(PAGE, 'utf8');

test('dist/nouveautes/index.html est construit, titré « Nouveautés »', () => {
  assert.ok(existsSync(PAGE), 'page absente : lancer `npx astro build`');
  assert.match(html(), /<title>Nouveautés — Evatosorus<\/title>/);
  assert.match(html(), /<h1[^>]*>[^<]*<\/h1>/);
});

test('une entrée par nouveauté, dans l’ordre du JSON (la plus récente en haut), titre + date + texte', () => {
  const page = html();
  const ids = [...page.matchAll(/<article[^>]*class="news-entry"[^>]*id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, DATA.entries.map((e) => e.slug));
  for (const e of DATA.entries) {
    const start = page.indexOf(`id="${e.slug}"`);
    const block = page.slice(start, page.indexOf('</article>', start));
    assert.ok(block.includes(`<time datetime="${e.date}"`), `${e.slug} : date absente`);
    assert.ok(block.includes(e.html.slice(0, 60)), `${e.slug} : texte absent`);
    for (const c of e.captures) {
      assert.ok(block.includes(`src="/nouveautes-data/${c}"`), `${e.slug} : capture ${c} absente`);
      assert.ok(existsSync(join(DIST, 'nouveautes-data', c)), `${c} non servie`);
    }
    assert.match(block, /<img [^>]*width="\d+"[^>]*height="\d+"/, `${e.slug} : dimensions des captures absentes`);
  }
});

test('date affichée en français (« 1 octobre 2026 »)', () => {
  assert.match(html(), /<time datetime="2026-10-01"[^>]*>1 octobre 2026<\/time>/);
});

test('le menu de toutes les pages internes mène à /nouveautes/, actif sur la page', () => {
  for (const p of ['codex', 'about', 'especes/aardonyx-celestae']) {
    assert.match(readFileSync(join(DIST, p, 'index.html'), 'utf8'), /<a href="\/nouveautes\/" class="codex-nav-link"/, p);
  }
  assert.match(html(), /<a href="\/nouveautes\/" class="codex-nav-link active"[^>]*aria-current="page"/);
});

// ── Navigateur ──────────────────────────────────────────────────────────────
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

async function setup(t) {
  let chromium;
  try {
    const require = createRequire(new URL('../frontend/package.json', import.meta.url));
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

// Contraste WCAG du texte des entrées sur le fond de la carte, composé dans le PIRE cas
// (fond de page blanc sous la carte translucide : l'image de fond peut être claire).
const worstContrast = (page) => page.evaluate(() => {
  const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
  const out = [];
  for (const card of document.querySelectorAll('.news-entry')) {
    const bg = over(rgba(getComputedStyle(card).backgroundColor), [255, 255, 255]);
    for (const el of card.querySelectorAll('h2, time, p, li, strong, a')) {
      const fg = over(rgba(getComputedStyle(el).color), bg);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      out.push({ sel: `${card.id} ${el.tagName}`, ratio: (a + 0.05) / (b + 0.05) });
    }
  }
  return out;
});

test('reflow 320/390/1440 px : aucun défilement horizontal, captures dans la largeur, contraste ≥ 4,5:1', { timeout: 120_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const shots = process.env.EVATO_E2E_SHOTS;
  if (shots) mkdirSync(shots, { recursive: true });
  for (const width of [320, 390, 1440]) {
    const context = await env.browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/nouveautes/`, { waitUntil: 'load' });
    assert.equal(await page.locator('.news-entry').count(), DATA.entries.length, `${width}px : entrées absentes`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `${width}px : débordement horizontal de ${overflow}px`);
    const wide = await page.evaluate(() => [...document.querySelectorAll('.news-entry img')]
      .filter((i) => i.getBoundingClientRect().right > innerWidth + 0.5).length);
    assert.equal(wide, 0, `${width}px : capture plus large que l'écran`);
    // Captures en loading="lazy" : forcer leur chargement, puis vérifier qu'elles s'affichent.
    await page.evaluate(() => document.querySelectorAll('.news-entry img').forEach((i) => { i.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('.news-entry img')].every((i) => i.complete));
    const broken = await page.evaluate(() => [...document.querySelectorAll('.news-entry img')].filter((i) => !i.naturalWidth).map((i) => i.src));
    assert.deepEqual(broken, [], `${width}px : captures non chargées`);
    for (const { sel, ratio } of await worstContrast(page)) assert.ok(ratio >= 4.5, `${width}px ${sel} : ${ratio.toFixed(2)}:1`);
    if (shots) await page.screenshot({ path: join(shots, `nouveautes-${width}.png`), fullPage: true });
    await context.close();
  }
});

test('téléphone 390 px : le tiroir propose « Nouveautés » et y mène', { timeout: 60_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/codex/`, { waitUntil: 'domcontentloaded' });
  await page.click('#evato-burger');
  const link = page.locator('#evato-sidebar a[href="/nouveautes/"]');
  await link.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL((u) => u.pathname === '/nouveautes/'), link.click()]);
  await context.close();
});

test('bureau 1440 px, au clavier : Tab atteint « Nouveautés » dans la barre latérale, Entrée y mène', { timeout: 60_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${env.base}/about/`, { waitUntil: 'domcontentloaded' });
  let reached = false;
  for (let i = 0; i < 30 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.getAttribute('href') === '/nouveautes/');
  }
  assert.ok(reached, 'lien Nouveautés hors de l’ordre de tabulation');
  await Promise.all([page.waitForURL((u) => u.pathname === '/nouveautes/'), page.keyboard.press('Enter')]);
  await context.close();
});

// Revue UX L13 : Entrée sur le lien d'une capture doit ouvrir la visionneuse comme le clic,
// pas le PNG brut ; les visionneuses des fiches espèces et des films ne régressent pas.
test('visionneuse : Entrée sur une capture l’ouvre, Échap la ferme ; clic sur fiche espèce et film inchangé', { timeout: 60_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const isOpen = () => page.evaluate(() => document.getElementById('evato-lightbox')?.hasAttribute('open'));

  await page.goto(`${env.base}/nouveautes/`, { waitUntil: 'load' });
  await page.locator('.news-capture').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).pathname, '/nouveautes/', 'Entrée a ouvert le PNG brut');
  assert.ok(await isOpen(), 'visionneuse fermée après Entrée');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('evato-lightbox').hasAttribute('open'));

  // Clic souris sur la capture : visionneuse aussi.
  await page.locator('.news-capture img').first().click();
  assert.ok(await isOpen(), 'visionneuse fermée après clic sur la capture');
  await page.keyboard.press('Escape');

  for (const path of ['/especes/tyrannosaurus-rex/', '/films/jurassic-park-1993/']) {
    await page.goto(env.base + path, { waitUntil: 'load' });
    await page.locator('[data-lightbox] img').first().click();
    assert.ok(await isOpen(), `${path} : visionneuse fermée après clic`);
    assert.equal(new URL(page.url()).pathname, path);
  }
  // Les liens ordinaires (sans image) dans la page ne sont pas interceptés.
  await page.goto(`${env.base}/nouveautes/`, { waitUntil: 'load' });
  await Promise.all([page.waitForURL((u) => u.pathname === '/codex/'), page.locator('#evato-sidebar a[href="/codex/"]').click()]);
  await context.close();
});

// Revue UX L13 : avant leur chargement, les captures doivent déjà occuper leur place
// (sinon 2×2 px puis saut de mise en page de plusieurs centaines de px à 320 px).
test('320 px, captures pas encore chargées : la place est réservée aux bonnes proportions', { timeout: 60_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  await page.route('**/nouveautes-data/captures/**', (route) => route.abort());
  await page.goto(`${env.base}/nouveautes/`, { waitUntil: 'domcontentloaded' });
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.news-capture img')].map((i) => {
    const r = i.getBoundingClientRect();
    return { src: i.getAttribute('src'), w: r.width, h: r.height, ratio: +i.getAttribute('width') / +i.getAttribute('height') };
  }));
  assert.ok(boxes.length > 0);
  for (const b of boxes) {
    assert.ok(b.w > 50, `${b.src} : largeur ${b.w}px`);
    assert.ok(Math.abs(b.w / b.h - b.ratio) < 0.05 * b.ratio, `${b.src} : ${b.w}×${b.h} au lieu du ratio ${b.ratio.toFixed(2)}`);
  }
  await context.close();
});

// ── L27 : lien permanent par entrée (/nouveautes/#<slug>), repris d'AetherWX ─────────
test('L27 : le titre de chaque entrée est un lien vers son ancre (#slug), l’entrée est focalisable', () => {
  const page = html();
  for (const e of DATA.entries) {
    const start = page.indexOf(`id="${e.slug}"`);
    const block = page.slice(start, page.indexOf('</article>', start));
    assert.match(block, new RegExp(`<a href="#${e.slug}" class="news-permalink"`), `${e.slug} : lien permanent absent`);
    assert.match(page.slice(page.lastIndexOf('<article', start), start + 200), /tabindex="-1"/, `${e.slug} : entrée non focalisable`);
  }
});

test('L27 : arriver sur /nouveautes/#<slug> signale l’entrée, lui donne le focus, juste sous le haut de l’écran', { timeout: 60_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const target = DATA.entries.at(-1).slug;
  for (const width of [390, 1440]) {
    const context = await env.browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/nouveautes/#${target}`, { waitUntil: 'load' });
    await page.waitForFunction((s) => document.activeElement?.id === s, target);
    assert.deepEqual(await page.locator('article.is-target').evaluateAll((as) => as.map((a) => a.id)), [target]);
    const top = await page.locator(`[id="${target}"]`).evaluate((a) => a.getBoundingClientRect().top);
    // Au téléphone, le bouton du menu (fixe, en haut à droite) ne doit pas masquer le titre.
    assert.ok(top >= (width > 1000 ? 0 : 56) - 1 && top < 200, `${width}px : entrée à ${top}px du haut`);
    await context.close();
  }
});

test('L27 : au clavier, Tab atteint le lien permanent (contour visible) ; Entrée met l’ancre dans l’URL, copie le lien et l’annonce', { timeout: 60_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto(`${env.base}/nouveautes/`, { waitUntil: 'load' });
  const slug = DATA.entries[0].slug;
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate((s) => document.activeElement?.getAttribute('href') === `#${s}`, slug);
  }
  assert.ok(reached, 'lien permanent hors de l’ordre de tabulation');
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  assert.ok(outline.style !== 'none' && outline.width >= 2, `contour de focus invisible (${JSON.stringify(outline)})`);
  await page.keyboard.press('Enter');
  await page.waitForFunction((s) => location.hash === `#${s}`, slug);
  const status = page.locator(`[id="${slug}"] .news-link-status`);
  await page.waitForFunction((s) => document.querySelector(`[id="${s}"] .news-link-status`)?.textContent.trim(), slug);
  assert.equal(await status.getAttribute('role'), 'status');
  assert.equal((await status.textContent()).trim(), 'Lien copié dans le presse-papiers');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${env.base}/nouveautes/#${slug}`);
  await context.close();
});
