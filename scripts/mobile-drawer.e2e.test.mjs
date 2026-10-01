// L18 — menu mobile : le tiroir doit passer AU-DESSUS du voile sur toutes les pages.
//
// Test navigateur (Playwright + Chromium) sur le site CONSTRUIT (frontend/dist).
// Branché dans `npm run test:scripts` comme les autres tests de scripts/ ; il se met
// en « skip » (sans échouer) quand il ne peut pas tourner :
//   - frontend/dist absent (lancer `npx astro build` avant) ;
//   - playwright-core non installé, ou Chromium absent (`npx playwright-core install chromium`).
// Par défaut il sert frontend/dist lui-même (petit serveur statique) ; EVATO_BASE_URL
// permet de viser un serveur déjà lancé (ex. `npx astro preview --port 4330`).
// EVATO_E2E_SHOTS=<dossier> enregistre une capture par page et par largeur, menu ouvert.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIST = fileURLToPath(new URL('../frontend/dist/', import.meta.url));

// Une page par route qui porte le menu (CodexLayout), plus l'accueil (BaseLayout).
const PAGES = [
  '/codex/',
  '/especes/aardonyx-celestae/',
  '/vitrines/',
  '/comprendre/',
  '/periodes/',
  '/periodes/jurassique/',
  '/carte/',
  '/films/',
  '/films/jurassic-park-1993/',
  '/videos/',
  '/nouveautes/',
  '/about/',
  '/',
];
const MOBILE_WIDTHS = [390, 320];
// Pages rejouées après défilement : la carte Leaflet (panes z 200–400, contrôles
// z 800–1000) passe alors sous le tiroir (revue UX de L18).
const SCROLLED = [['/carte/', 600]];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
};

function serveDist() {
  const server = createServer((req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
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
  const external = process.env.EVATO_BASE_URL;
  if (!external && !existsSync(join(DIST, 'codex', 'index.html'))) {
    t.skip('frontend/dist absent : lancer `npx astro build` avant');
    return null;
  }
  let chromium;
  try {
    // Le test vit dans scripts/ : résoudre depuis frontend/ (devDependency du site).
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
  const server = external ? null : await serveDist();
  const base = external ?? `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await browser.close();
    if (server) await new Promise((r) => server.close(r));
  });
  return { browser, base };
}

// Pour chaque lien du tiroir : l'élément au centre du lien est-il bien ce lien ?
// Puis balayage VISUEL de toute la surface visible du tiroir (pas de 12 px) : l'élément
// peint au-dessus de chaque point doit appartenir au tiroir (ou être le burger).
// Une carte Leaflet, une vidéo ou le voile peints par-dessus apparaissent ici.
// Renvoie la liste des recouvrements (vide = tiroir net et cliquable).
const coveredLinks = (page) => page.evaluate(() => {
  const out = [];
  const name = (el) => (el ? (el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`) : 'rien');
  const sidebar = document.getElementById('evato-sidebar');
  const burger = document.getElementById('evato-burger');
  for (const a of sidebar.querySelectorAll('a')) {
    const r = a.getBoundingClientRect();
    if (r.width === 0 || r.bottom <= 0 || r.top >= innerHeight) continue; // hors écran (défilement du tiroir)
    const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const above = stack.slice(0, stack.findIndex((el) => el === a || a.contains(el)));
    if (stack[0]?.closest('a') !== a) out.push(`${a.getAttribute('href')} → ${name(stack[0])}`);
    else if (above.length) out.push(`${a.getAttribute('href')} → ${name(above[0])}`);
  }
  // Pendant le balayage, tout devient « touchable » : elementFromPoint renvoie alors
  // ce qui est PEINT au-dessus, y compris les éléments en pointer-events: none
  // (tuiles Leaflet, calques décoratifs).
  const probe = document.createElement('style');
  probe.textContent = '* { pointer-events: auto !important; }';
  document.head.append(probe);
  const r = sidebar.getBoundingClientRect();
  const seen = new Set();
  for (let y = Math.max(r.top, 0) + 2; y < Math.min(r.bottom, innerHeight) - 1; y += 12) {
    for (let x = Math.max(r.left, 0) + 2; x < Math.min(r.right, innerWidth) - 1; x += 12) {
      const top = document.elementFromPoint(x, y);
      if (top && (sidebar.contains(top) || burger?.contains(top))) continue;
      const key = name(top);
      if (!seen.has(key)) { seen.add(key); out.push(`tiroir (${Math.round(x)}, ${Math.round(y)}) → ${key}`); }
    }
  }
  probe.remove();
  return out;
});

const isOpen = (page) => page.evaluate(() => document.documentElement.getAttribute('data-drawer-open') === 'true');

async function openDrawer(page) {
  await page.click('#evato-burger');
  // Attendre la fin du glissement (transition 250 ms).
  await page.waitForFunction(() => {
    const s = document.getElementById('evato-sidebar');
    return s && s.getBoundingClientRect().left >= -0.5;
  });
  await page.waitForTimeout(350);
}

const centerOf = async (locator) => {
  const b = await locator.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

test('L18 — menu mobile : tiroir au-dessus du voile, liens cliquables, fermeture voile + Échap', { timeout: 300_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const { browser, base } = env;
  const shots = process.env.EVATO_E2E_SHOTS;
  if (shots) mkdirSync(shots, { recursive: true });

  for (const width of MOBILE_WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const cases = [...PAGES.map((p) => [p, 0]), ...SCROLLED];
    for (const [path, scroll] of cases) {
      const where = `${path}${scroll ? ` défilée ${scroll} px` : ''} @ ${width}px`;
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      // La carte est rendue côté client (client:only) : attendre Leaflet et ses tuiles/contrôles.
      if (path === '/carte/') await page.waitForSelector('.leaflet-control-zoom', { timeout: 15_000 });
      if (scroll) {
        // Borné au bas de page (à 390 px, /carte/ ne défile que de ~580 px).
        const target = await page.evaluate((y) => Math.min(y, document.documentElement.scrollHeight - innerHeight), scroll);
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), target);
        await page.waitForFunction((y) => Math.abs(window.scrollY - y) < 2, target);
      }
      if (await page.locator('#evato-burger').count() === 0) {
        // Accueil (BaseLayout seul) : pas de tiroir, rien ne doit le simuler.
        assert.equal(await page.locator('#evato-drawer-overlay').count(), 0, where);
        continue;
      }

      await openDrawer(page);
      assert.ok(await isOpen(page), `${where} : le menu ne s'ouvre pas`);
      if (shots) await page.screenshot({ path: join(shots, `${path.replace(/\W+/g, '_') || 'home'}${scroll ? `-defile${scroll}` : ''}-${width}.png`) });
      assert.deepEqual(await coveredLinks(page), [], `${where} : liens du tiroir recouverts`);

      // Clic sur le voile, à droite du tiroir et sous le burger : ferme.
      await page.mouse.click(width - 10, 700);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-drawer-open'));

      // Échap ferme.
      await openDrawer(page);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-drawer-open'));
    }

    // Clic RÉEL (souris, sans forcer) sur un lien du tiroir : il navigue.
    for (const [from, href] of [['/codex/', '/vitrines/'], ['/especes/aardonyx-celestae/', '/codex/']]) {
      await page.goto(base + from, { waitUntil: 'domcontentloaded' });
      await openDrawer(page);
      const { x, y } = await centerOf(page.locator(`#evato-sidebar a[href="${href}"]`));
      await Promise.all([
        page.waitForURL((u) => u.pathname === href, { timeout: 5_000 }),
        page.mouse.click(x, y),
      ]).catch(() => assert.fail(`${from} @ ${width}px : le clic sur ${href} n'a pas navigué (url ${page.url()})`));
    }
    await context.close();
  }
});

test('L18 — bureau 1440 px : barre latérale visible et cliquable, ni burger ni voile', { timeout: 120_000 }, async (t) => {
  const env = await setup(t);
  if (!env) return;
  const { browser, base } = env;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  for (const path of ['/codex/', '/especes/aardonyx-celestae/', '/about/']) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    assert.ok(!(await page.locator('#evato-burger').isVisible()), `${path} : burger visible au bureau`);
    assert.ok(!(await page.locator('#evato-drawer-overlay').isVisible()), `${path} : voile visible au bureau`);
    assert.deepEqual(await coveredLinks(page), [], `${path} : liens recouverts au bureau`);
  }
  const { x, y } = await centerOf(page.locator('#evato-sidebar a[href="/codex/"]'));
  await Promise.all([page.waitForURL((u) => u.pathname === '/codex/'), page.mouse.click(x, y)]);
  await context.close();
});
