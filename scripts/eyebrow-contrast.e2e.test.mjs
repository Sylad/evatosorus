// L25 — WCAG 1.4.3 : sur-titres de section posés sur l'image de fond animée (.codex-bg)
// ou sur la vidéo d'un bandeau — mesurés au PIRE PIXEL sous les glyphes
// (scripts/lib/e2e-dist.mjs).
// - Bandeaux vidéo (codex, périodes, carte, films, vitrines) : 8 largeurs de 320 à 1440 px,
//   10 instants répartis sur toute la vidéo (2 % … 98 %, dernier 5 % compris). Cible 5,5:1 :
//   la vidéo a d'autres images que celles mesurées, il faut de la marge.
// - Sur-titres sur l'image de fond : 1440 / 390 / 320 px, fond figé à scale 1,04 / 1,07 /
//   1,10 (bornes et milieu de l'animation) ; seuil 4,5:1.
// Une page est chargée une fois par largeur ; on déplace ensuite la vidéo ou le fond.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
// EVATO_CONTRAST_REPORT=1 imprime toutes les mesures ; EVATO_CONTRAST_FRAMES=n change le
// nombre d'instants vidéo (vérification approfondie hors suite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser, worstPixelContrast } from './lib/e2e-dist.mjs';

// [page, sélecteur du sur-titre, sélecteur du bandeau]
const BANNERS = [
  ['/codex/', '.page-hero-eyebrow', '.page-hero'],
  ['/periodes/', '.page-hero-eyebrow', '.page-hero'],
  ['/carte/', '.page-hero-eyebrow', '.page-hero'],
  ['/films/', '.films-hero-overlay .codex-eyebrow', '.films-hero'],
  ['/vitrines/', '.vitrine-hero .page-kicker', '.vitrine-hero'],
];
const BANNER_WIDTHS = [[320, 844], [360, 740], [375, 667], [390, 844], [414, 896], [768, 1024], [1024, 768], [1440, 900]];
const N = Number(process.env.EVATO_CONTRAST_FRAMES || 10);
const FRAMES = Array.from({ length: N }, (_, i) => 0.02 + (0.96 * i) / (N - 1));
const BANNER_MIN = 5.5;

// [page, sélecteur] — sur-titres posés sur l'image de fond animée
const ON_BG = [
  ['/videos/', '.videos-header .codex-eyebrow'],
  ['/films/', '.saga-title'],
  ['/films/jurassic-park-1993/', '.codex-eyebrow'],
  ['/periodes/jurassique/', '.codex-eyebrow'],
  ['/periodes/cretace/', '.codex-eyebrow'],
  ['/especes/tyrannosaurus-rex/', '.detail-header .codex-eyebrow'], // Crétacé
  ['/especes/allosaurus-fragilis/', '.detail-header .codex-eyebrow'], // Jurassique
  ['/especes/eoraptor-lunensis/', '.detail-header .codex-eyebrow'], // Trias (accent rouge)
  ['/especes/tyrannosaurus-rex/', '.field-notes .section-kicker'],
];
const BG_WIDTHS = [[1440, 900], [390, 844], [320, 844]];
const SCALES = [1.04, 1.07, 1.1];
const BG_MIN = 4.5;

// Vidéo du bandeau chargée entière en mémoire (le serveur de test ne gère pas les
// requêtes Range, sans lesquelles Chromium ne se déplace pas dans la vidéo), arrêtée.
const prepareVideo = (page, banner) => page.evaluate(async (banner) => {
  const v = document.querySelector(banner).querySelector('video');
  v.pause();
  const blob = await (await fetch(v.currentSrc || v.querySelector('source').src)).blob();
  v.src = URL.createObjectURL(blob);
  await new Promise((r) => v.addEventListener('loadeddata', r, { once: true }));
  v.pause();
  return v.duration;
}, banner);

const seek = (page, banner, at) => page.evaluate(async ({ banner, at }) => {
  const v = document.querySelector(banner).querySelector('video');
  await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); v.currentTime = v.duration * at; });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return v.currentTime;
}, { banner, at });

test(`sur-titres des bandeaux vidéo ≥ ${BANNER_MIN}:1 au pire pixel (8 largeurs, ${N} instants)`, { timeout: 900_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const worstByCase = new Map();
  const failures = [];
  for (const [width, height] of BANNER_WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    for (const [path, sel, banner] of BANNERS) {
      await page.goto(env.base + path, { waitUntil: 'load' });
      await page.addStyleTag({ content: '.codex-bg { animation: none !important; transform: scale(1.07) !important; }' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      const duration = await prepareVideo(page, banner);
      assert.ok(duration > 1, `${path} : vidéo illisible`);
      for (const at of FRAMES) {
        const time = await seek(page, banner, at);
        const { worst, glyphs } = await worstPixelContrast(page, sel);
        const where = `${path} ${sel} @${width}px vidéo ${time.toFixed(1)} s`;
        assert.ok(glyphs > 20, `${where} : glyphes non détectés (${glyphs})`);
        const key = `${path} @${width}`;
        worstByCase.set(key, Math.min(worstByCase.get(key) ?? Infinity, worst));
        if (process.env.EVATO_CONTRAST_REPORT) t.diagnostic(`${where} : ${worst.toFixed(2)}:1 (${glyphs} px)`);
        if (worst < BANNER_MIN) failures.push(`${where} : ${worst.toFixed(2)}:1`);
      }
    }
    await context.close();
  }
  for (const [k, w] of worstByCase) t.diagnostic(`pire ${k} : ${w.toFixed(2)}:1`);
  assert.deepEqual(failures, []);
});

test(`sur-titres posés sur l'image de fond ≥ ${BG_MIN}:1 au pire pixel (1440/390/320 px, 3 états du fond)`, { timeout: 600_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const worstByCase = new Map();
  const failures = [];
  for (const [width, height] of BG_WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    for (const [path, sel] of ON_BG) {
      await page.goto(env.base + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      for (const scale of SCALES) {
        await page.evaluate((scale) => {
          let s = document.getElementById('evato-test-bg');
          if (!s) { s = document.createElement('style'); s.id = 'evato-test-bg'; document.head.append(s); }
          s.textContent = `.codex-bg { animation: none !important; transform: scale(${scale}) !important; }`;
        }, scale);
        await page.waitForTimeout(80);
        const { worst, glyphs } = await worstPixelContrast(page, sel);
        const where = `${path} ${sel} @${width}px scale ${scale}`;
        assert.ok(glyphs > 20, `${where} : glyphes non détectés (${glyphs})`);
        const key = `${path} ${sel}`;
        worstByCase.set(key, Math.min(worstByCase.get(key) ?? Infinity, worst));
        if (process.env.EVATO_CONTRAST_REPORT) t.diagnostic(`${where} : ${worst.toFixed(2)}:1 (${glyphs} px)`);
        if (worst < BG_MIN) failures.push(`${where} : ${worst.toFixed(2)}:1`);
      }
    }
    await context.close();
  }
  for (const [k, w] of worstByCase) t.diagnostic(`pire ${k} : ${w.toFixed(2)}:1`);
  assert.deepEqual(failures, []);
});
