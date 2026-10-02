// L22 — titres : aucun mot coupé, aucun mot qui déborde, aucun titre rogné, de 320 à 1440 px.
// Règle : un titre (h1–h4, titres de cartes compris) ne passe jamais à la ligne au milieu
// d'un mot et aucun de ses mots ne dépasse sa boîte — SAUF un mot qui, seul, est plus large
// que la boîte même à la taille plancher du titre (variable CSS --fit-floor posée sur le
// titre ; sans elle, aucune exception). Ces mots-là (noms scientifiques hors norme) passent
// à la ligne (overflow-wrap: break-word, en dernier recours). Aucun texte rogné par un parent en
// overflow: hidden.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const VIEWPORTS = [[320, 640], [360, 740], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1440, 900]];
const PAGES = [
  '/',
  '/vitrines/',
  '/comprendre/',
  '/codex/',
  '/periodes/',
  '/periodes/jurassique/',
  '/periodes/cretace/',
  '/films/',
  '/films/jurassic-park-1993/',
  '/videos/',
  '/carte/',
  '/about/',
  '/nouveautes/',
  '/plan-de-travail/',
  '/especes/tyrannosaurus-rex/',
  '/especes/parasaurolophus-walkeri/',
  '/especes/carcharodontosaurus-saharicus/',
  '/especes/chinshakiangosaurus-chunghoensis/',
  '/especes/chuandongocoelurus-primitivus/',
  '/especes/khankhuuluu-mongoliensis/',
  '/especes/micropachycephalosaurus-hongtuyanensis/',
  '/especes/dispersituberoolithus-exilis/',
];

// Mesure dans la page : liste des écarts à la règle.
const audit = (page) => page.evaluate(() => {
  // Défilement horizontal de la page (un mot qui déborde de sa carte peut l'élargir).
  const sw = document.documentElement.scrollWidth;
  const vw = document.documentElement.clientWidth;
  const out = sw > vw ? [`page plus large que l'écran (${sw} > ${vw})`] : [];
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0';
  document.body.append(probe);
  // Titres, et noms des espèces emblématiques de la frise (/periodes/).
  const headings = document.querySelectorAll('h1, h2, h3, h4, .meso-iconic-name');
  for (const h of headings) {
    if (h.closest('#evato-sidebar, .leaflet-container')) continue;
    const cs = getComputedStyle(h);
    if (cs.display === 'none' || cs.visibility === 'hidden' || !h.getClientRects().length) continue;
    const box = h.getBoundingClientRect();
    const inner = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const left = box.left + parseFloat(cs.paddingLeft);
    // Taille plancher : --fit-floor (en px calculés via la sonde) sinon taille actuelle.
    const floorVar = cs.getPropertyValue('--fit-floor').trim();
    probe.style.font = cs.font;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.textTransform = cs.textTransform;
    probe.style.fontSize = floorVar || cs.fontSize;
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(n.textContent))) {
        const word = m[0];
        const r = document.createRange();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + word.length);
        const rects = [...r.getClientRects()];
        const broken = new Set(rects.map((x) => Math.round(x.top))).size > 1;
        const overflow = rects.some((x) => x.right > left + inner + 1 || x.left < left - 1);
        if (!broken && !overflow) continue;
        probe.textContent = word.replace(/[­]/g, '');
        // Sans plancher déclaré, le titre n'a pas de taille minimale : aucune coupure permise.
        const tooWideAlone = Boolean(floorVar) && probe.getBoundingClientRect().width > inner + 1;
        if (tooWideAlone && broken && !overflow) continue; // coupé avec trait d'union : permis
        out.push(`${h.tagName.toLowerCase()}.${String(h.className).split(' ')[0]} « ${word} » ${broken ? 'coupé' : 'déborde'}`);
      }
    }
    // Rogné par un parent en overflow non visible ?
    for (let a = h.parentElement; a && a !== document.body; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (ac.overflowX === 'visible' && ac.overflowY === 'visible') continue;
      const b = a.getBoundingClientRect();
      if (box.top < b.top - 1 || box.bottom > b.bottom + 1 || box.left < b.left - 1 || box.right > b.right + 1) {
        out.push(`${h.tagName.toLowerCase()} « ${h.textContent.trim().slice(0, 30)} » rogné par ${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]}`);
      }
      break;
    }
  }
  probe.remove();
  return out;
});

async function run(t, { spacing = false, viewports = VIEWPORTS } = {}) {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  for (const [width, height] of viewports) {
    const context = await env.browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(env.base + path, { waitUntil: 'load' });
      if (spacing) {
        // WCAG 1.4.12 : espacements imposés par l'utilisateur.
        await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
      }
      if (path === '/codex/') await page.waitForSelector('.species-card');
      await page.evaluate(() => document.fonts.ready);
      for (const f of await audit(page)) {
        // Espacements imposés (1.4.12) : la taille ajustée ignore l'espacement de
        // l'utilisateur, un long mot peut passer à la ligne — aucun contenu perdu. Seuls
        // le débordement et le rognage comptent.
        if (spacing && / coupé$/.test(f)) continue;
        failures.push(`${path} @${width}×${height} : ${f}`);
      }
    }
    await context.close();
  }
  assert.deepEqual([...new Set(failures)], []);
}

test('titres : ni mot coupé ni débordement ni titre rogné (320 → 1440 px)', { timeout: 600_000 }, (t) => run(t));

test('titres avec les espacements WCAG 1.4.12 à 320 et 390 px : rien ne déborde ni n\'est rogné', { timeout: 300_000 }, (t) =>
  run(t, { spacing: true, viewports: [[320, 640], [390, 844]] }));

// La table des chasses (frontend/src/lib/cinzel-advances.json) prédit la largeur rendue :
// jamais en dessous (sinon un mot déborderait), au plus 8 % au-dessus.
test('table des chasses de Cinzel : largeur prédite ≥ largeur rendue, à 8 % près', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { wordEm } = await import('../frontend/src/lib/title-fit.mjs');
  const WORDS = ['Micropachycephalosaurus', 'Tyrannosaure', 'Pachycéphalosaure', 'Khankhuuluu', 'Jurassique', 'Crétacé', 'dinosaures', 'commence', 'WWMM', 'Œuf', 'lézards.'];
  const context = await env.browser.newContext();
  const page = await context.newPage();
  await page.goto(`${env.base}/about/`, { waitUntil: 'load' });
  const measured = await page.evaluate(async (words) => {
    await document.fonts.load('400 100px Cinzel', words.join(''));
    return words.map((w) => {
      const s = document.createElement('span');
      s.style.cssText = 'font:400 100px Cinzel;letter-spacing:0.06em;white-space:nowrap;position:absolute';
      s.textContent = w;
      document.body.append(s);
      const width = s.getBoundingClientRect().width / 100;
      s.remove();
      return width;
    });
  }, WORDS);
  await context.close();
  WORDS.forEach((w, i) => {
    const p = wordEm(w, 0.06);
    assert.ok(p >= measured[i] && p <= measured[i] * 1.08, `${w} : prédit ${p.toFixed(2)} em, rendu ${measured[i].toFixed(2)} em`);
  });
});

// Navigateur sans unité cqi : dans les feuilles servies, l'unité « cqi » devient une unité
// inconnue (« cqzz ») — partout, condition @supports comprise. Les titres prennent alors
// leur taille de repli — jamais la taille du
// texte courant hérité (déclaration à cqi invalide au calcul), et le titre de fiche reste
// plus grand que le nom scientifique dessous et tient dans la largeur.
test('sans container queries : tailles de repli saines (fiche, cartes, vitrines, périodes)', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const context = await env.browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('**/*', async (route) => {
      const res = await route.fetch();
      const type = res.headers()['content-type'] ?? '';
      if (!/text\/(css|html)/.test(type)) return route.fulfill({ response: res });
      const body = (await res.text()).replace(/(\d)cqi\b/g, '$1cqzz');
      return route.fulfill({ response: res, body });
    });
    const page = await context.newPage();
    const checks = [
      ['/especes/tyrannosaurus-rex/', '.detail-header h1', '.sci-name'],
      ['/especes/parasaurolophus-walkeri/', '.detail-header h1', '.sci-name'],
      ['/periodes/cretace/', '.card-title', null],
      ['/vitrines/', '.vitrine-body h2', null],
      ['/periodes/', '.period-card h2', null],
      ['/comprendre/', '.learn-hero h1', null],
    ];
    for (const [path, sel, smaller] of checks) {
      await page.goto(env.base + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(({ sel, smaller }) => {
        const h = document.querySelector(sel);
        const size = parseFloat(getComputedStyle(h).fontSize);
        const body = parseFloat(getComputedStyle(h.parentElement).fontSize);
        const sci = smaller ? parseFloat(getComputedStyle(document.querySelector(smaller)).fontSize) : 0;
        const supported = CSS.supports('width', '1cqi');
        return { size, body, sci, overflow: h.scrollWidth > h.clientWidth + 1, supported };
      }, { sel, smaller });
      const where = `${path} ${sel} @${width}px`;
      if (r.sci && r.size <= r.sci) failures.push(`${where} : titre ${r.size}px ≤ nom scientifique ${r.sci}px`);
      if (!r.sci && r.size === r.body) failures.push(`${where} : taille héritée du texte (${r.size}px)`);
      if (path.startsWith('/especes/') && r.overflow) failures.push(`${where} : déborde`);
    }
    await context.close();
  }
  assert.deepEqual(failures, []);
});

// Balayage tous les 8 px de 320 à 1 440 px : une seule page chargée par URL, fenêtre
// redimensionnée sur place (la grille des vitrines changeait de disposition entre 1 184
// et 1 272 px et coupait les noms).
test('balayage 320 → 1 440 px tous les 8 px (vitrines, périodes, codex, comprendre) : aucun mot coupé, rien ne déborde', { timeout: 600_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const path of ['/vitrines/', '/periodes/', '/codex/', '/comprendre/']) {
    await page.goto(env.base + path, { waitUntil: 'load' });
    if (path === '/codex/') await page.waitForSelector('.species-card');
    await page.evaluate(() => document.fonts.ready);
    for (let width = 320; width <= 1440; width += 8) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      for (const f of await audit(page)) failures.push(`${path} @${width} : ${f}`);
    }
  }
  await context.close();
  assert.deepEqual([...new Set(failures)], []);
});

// Frise des périodes, noms des espèces emblématiques : 320 → 400 px tous les 8 px, police
// normale, police racine ×1,25, espacements WCAG 1.4.12 — pas de défilement horizontal,
// aucun nom rogné ni débordant (coupure permise seulement sous espacements imposés).
test('/periodes/ 320 → 400 px (×1, ×1,25, espacements 1.4.12) : la frise tient dans la largeur', { timeout: 300_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  const VARIANTS = {
    normal: '',
    'police ×1,25': 'html { font-size: 21.875px !important; }',
    'espacements 1.4.12': '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  };
  const context = await env.browser.newContext({ viewport: { width: 400, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  for (const [name, css] of Object.entries(VARIANTS)) {
    await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
    if (css) await page.addStyleTag({ content: css });
    await page.evaluate(() => document.fonts.ready);
    for (let width = 320; width <= 400; width += 8) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      for (const f of await audit(page)) {
        if (name !== 'normal' && / coupé$/.test(f)) continue;
        failures.push(`${name} @${width} : ${f}`);
      }
    }
  }
  await context.close();
  assert.deepEqual([...new Set(failures)], []);
});
