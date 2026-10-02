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
  const out = [];
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0';
  document.body.append(probe);
  const headings = document.querySelectorAll('h1, h2, h3, h4');
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
