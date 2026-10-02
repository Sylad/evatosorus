// L28 — page « Plan de travail » (/plan-de-travail/) : en cours, prévu, récemment livré,
// générée AU BUILD depuis docs/plan/raf.yaml. Titres et états seulement : AUCUN texte de
// note (ni verdict UX, ni raison d'abandon, ni titre de sous-tâche) ne doit sortir dans
// le site construit — vérifié sur TOUS les fichiers de frontend/dist.
//
// Lit le site CONSTRUIT : lancer `npx astro build` avant. Tests navigateur en « skip »
// sans playwright-core ni Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { DIST, setupBrowser } from './lib/e2e-dist.mjs';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { parse } = require('yaml');
const RAF = parse(readFileSync(new URL('../docs/plan/raf.yaml', import.meta.url), 'utf8'));
const PAGE = join(DIST, 'plan-de-travail', 'index.html');
const html = () => readFileSync(PAGE, 'utf8');

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&');

const lots = RAF.lots;
const shown = (status) => lots.filter((l) => l.status === status);

test('dist/plan-de-travail/index.html est construit, titré « Plan de travail »', () => {
  assert.ok(existsSync(PAGE), 'page absente : lancer `npx astro build`');
  assert.match(html(), /<title>Plan de travail — Evatosorus<\/title>/);
  assert.match(html(), /<h1[^>]*>[^<]+<\/h1>/);
});

test('trois sections titrées ; tous les lots en cours et prévus, dans l’ordre du plan, avec leur état écrit', () => {
  const page = decode(html());
  for (const h of ['En cours', 'Prévu', 'Récemment livré']) assert.match(page, new RegExp(`<h2[^>]*>${h}`), `section « ${h} » absente`);
  for (const status of ['doing', 'todo']) {
    const ids = [...page.matchAll(new RegExp(`<li[^>]*class="plan-lot" data-status="${status}"[^>]*data-id="([^"]+)"`, 'g'))].map((m) => m[1]);
    assert.deepEqual(ids, shown(status).map((l) => l.id), status);
    for (const l of shown(status)) assert.ok(page.includes(l.title), `${l.id} : titre absent`);
  }
  const done = [...page.matchAll(/<li[^>]*class="plan-lot" data-status="done"[^>]*data-id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(done.length > 0 && done.length <= 8, `${done.length} lots livrés affichés`);
  assert.ok(done.every((id) => shown('done').some((l) => l.id === id)));
  assert.ok(!lots.filter((l) => l.status === 'dropped').some((l) => page.includes(`data-id="${l.id}"`)), 'lot abandonné publié');
});

test('AUCUN texte privé du plan (notes, verdicts UX, raisons, titres de sous-tâches) dans le site construit', () => {
  const secrets = [];
  for (const l of lots) {
    for (const n of l.notes ?? []) secrets.push([`${l.id} note`, n.text]);
    if (l.ux?.verdict) secrets.push([`${l.id} ux`, l.ux.verdict]);
    if (l.reason) secrets.push([`${l.id} raison`, l.reason]);
    // Titre de sous-tâche, sauf s'il est aussi le titre d'un lot (sous-tâche promue en lot :
    // les titres de lots sont publics par construction).
    for (const t of l.tasks ?? []) if (!lots.some((x) => x.title === t.title)) secrets.push([`${l.id}/${t.id} titre`, t.title]);
  }
  assert.ok(secrets.filter(([k]) => k.endsWith('note')).length > 0, 'aucune note dans raf.yaml : le test ne prouverait rien');
  // Fragment distinctif de chaque texte (assez long pour ne pas tomber par hasard).
  const needles = secrets.map(([k, s]) => [k, String(s).trim().slice(0, 48)]).filter(([, s]) => s.length >= 24);
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (['.html', '.js', '.mjs', '.json', '.css', '.txt', '.xml', '.svg'].includes(extname(e.name))) files.push(p);
    }
  };
  walk(DIST);
  assert.ok(files.length > 100, `dist presque vide (${files.length} fichiers)`);
  const leaks = [];
  for (const f of files) {
    const text = decode(readFileSync(f, 'utf8'));
    for (const [k, s] of needles) if (text.includes(s)) leaks.push(`${k} → ${f.slice(DIST.length)}`);
  }
  assert.deepEqual(leaks, []);
});

test('le menu de toutes les pages internes mène à /plan-de-travail/, actif sur la page', () => {
  for (const p of ['codex', 'about', 'nouveautes']) {
    assert.match(readFileSync(join(DIST, p, 'index.html'), 'utf8'), /<a href="\/plan-de-travail\/" class="codex-nav-link"/, p);
  }
  assert.match(html(), /<a href="\/plan-de-travail\/" class="codex-nav-link active"[^>]*aria-current="page"/);
});

// ── Navigateur ──────────────────────────────────────────────────────────────
// Contraste WCAG du texte des sections sur leur fond, composé dans le PIRE cas (fond blanc
// sous la carte translucide : l'image de fond peut être claire).
const worstContrast = (page) => page.evaluate(() => {
  const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1]; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
  const out = [];
  for (const card of document.querySelectorAll('.plan-section, .plan-summary')) {
    const bg = over(rgba(getComputedStyle(card).backgroundColor), [255, 255, 255]);
    for (const el of card.querySelectorAll('h2, p, span, li')) {
      if (!el.textContent.trim()) continue;
      const fg = over(rgba(getComputedStyle(el).color), bg);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      out.push({ sel: `${card.className} ${el.tagName}.${el.className}`, ratio: (a + 0.05) / (b + 0.05) });
    }
  }
  return out;
});

test('reflow 320/390/1440 px : aucun défilement horizontal, contraste ≥ 4,5:1', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const width of [320, 390, 1440]) {
    const context = await env.browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/plan-de-travail/`, { waitUntil: 'load' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `${width}px : débordement horizontal de ${overflow}px`);
    const results = await worstContrast(page);
    assert.ok(results.length > 0, 'aucun texte mesuré');
    for (const { sel, ratio } of results) assert.ok(ratio >= 4.5, `${width}px ${sel} : ${ratio.toFixed(2)}:1`);
    await context.close();
  }
});

test('bureau 1440 px, au clavier : Tab atteint « Plan de travail » dans la barre latérale (contour visible), Entrée y mène', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${env.base}/about/`, { waitUntil: 'domcontentloaded' });
  let reached = false;
  for (let i = 0; i < 30 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.getAttribute('href') === '/plan-de-travail/');
  }
  assert.ok(reached, 'lien Plan de travail hors de l’ordre de tabulation');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, 'none', 'contour de focus invisible');
  await Promise.all([page.waitForURL((u) => u.pathname === '/plan-de-travail/'), page.keyboard.press('Enter')]);
  await context.close();
});
