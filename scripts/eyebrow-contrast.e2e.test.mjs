// L25 — WCAG 1.4.3 : sur-titres de section posés sur l'image de fond animée (.codex-bg)
// ou sur la vidéo d'un bandeau (PageHero, films) — vidéos, films, périodes, carte, fiches
// espèces (et le codex, qui partage le bandeau) — mesurés au PIRE PIXEL sous les glyphes
// (scripts/lib/e2e-dist.mjs), à 1440, 390 et 320 px. Plusieurs images par cas : fond
// figé à scale 1,04 / 1,07 / 1,10 (bornes et milieu de l'animation) ; vidéo arrêtée à
// 4 instants répartis sur sa durée.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
// EVATO_CONTRAST_REPORT=1 imprime toutes les mesures (diagnostics).
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser, worstPixelContrast } from './lib/e2e-dist.mjs';

// [page, sélecteur, fond]
const CASES = [
  ['/videos/', '.videos-header .codex-eyebrow', 'bg'],
  ['/films/', '.films-hero-overlay .codex-eyebrow', 'video'],
  ['/films/', '.saga-title', 'bg'],
  ['/films/jurassic-park-1993/', '.codex-eyebrow', 'bg'],
  ['/periodes/', '.page-hero-eyebrow', 'video'],
  ['/periodes/jurassique/', '.codex-eyebrow', 'bg'],
  ['/periodes/cretace/', '.codex-eyebrow', 'bg'],
  ['/carte/', '.page-hero-eyebrow', 'video'],
  ['/codex/', '.page-hero-eyebrow', 'video'],
  ['/especes/tyrannosaurus-rex/', '.detail-header .codex-eyebrow', 'bg'], // Crétacé
  ['/especes/allosaurus-fragilis/', '.detail-header .codex-eyebrow', 'bg'], // Jurassique
  ['/especes/eoraptor-lunensis/', '.detail-header .codex-eyebrow', 'bg'], // Trias (accent rouge)
  ['/especes/tyrannosaurus-rex/', '.field-notes .section-kicker', 'bg'],
];
const WIDTHS = [1440, 390, 320];
const SCALES = [1.04, 1.07, 1.1];
// EVATO_CONTRAST_FRAMES=n : n instants répartis (vérification approfondie hors suite).
const FRAMES = process.env.EVATO_CONTRAST_FRAMES
  ? Array.from({ length: Number(process.env.EVATO_CONTRAST_FRAMES) }, (_, i) => (i + 0.5) / Number(process.env.EVATO_CONTRAST_FRAMES))
  : [0.1, 0.35, 0.6, 0.85];

async function freezeVideo(page, sel, at) {
  return page.evaluate(async ({ sel, at }) => {
    const v = document.querySelector(sel).closest('.page-hero, .films-hero')?.querySelector('video');
    if (!v) return false;
    v.pause();
    // Le petit serveur de test ne gère pas les requêtes Range : sans elles, Chromium ne
    // peut pas se déplacer dans la vidéo. La vidéo entière est chargée en mémoire (blob).
    if (!v.src.startsWith('blob:')) {
      const blob = await (await fetch(v.currentSrc || v.querySelector('source').src)).blob();
      v.src = URL.createObjectURL(blob);
      await new Promise((r) => v.addEventListener('loadeddata', r, { once: true }));
      v.pause();
    }
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); v.currentTime = v.duration * at; });
    if (v.readyState < 2) await new Promise((r) => v.addEventListener('loadeddata', r, { once: true }));
    return v.currentTime;
  }, { sel, at });
}

test('sur-titres de section ≥ 4,5:1 au pire pixel (fond animé et vidéos, 1440/390/320 px)', { timeout: 900_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const worstByCase = new Map();
  const failures = [];
  for (const width of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width, height: width > 1000 ? 900 : 844 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    for (const [path, sel, kind] of CASES) {
      const variants = kind === 'bg' ? SCALES : FRAMES;
      for (const v of variants) {
        await page.goto(env.base + path, { waitUntil: 'load' });
        await page.addStyleTag({ content: `.codex-bg { animation: none !important; transform: scale(${kind === 'bg' ? v : 1.07}) !important; }` });
        await page.evaluate(() => document.fonts.ready);
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        if (kind === 'video') {
          const at = await freezeVideo(page, sel, v);
          assert.ok(at !== false && at > 0, `${path} : vidéo introuvable ou non déplacée (${at})`);
        }
        await page.waitForTimeout(150);
        const { worst, glyphs } = await worstPixelContrast(page, sel);
        const where = `${path} ${sel} @${width}px ${kind === 'bg' ? `scale ${v}` : `vidéo ${Math.round(v * 100)} %`}`;
        assert.ok(glyphs > 20, `${where} : glyphes non détectés (${glyphs})`);
        const key = `${path} ${sel}`;
        worstByCase.set(key, Math.min(worstByCase.get(key) ?? Infinity, worst));
        if (process.env.EVATO_CONTRAST_REPORT) t.diagnostic(`${where} : ${worst.toFixed(2)}:1 (${glyphs} px)`);
        if (worst < 4.5) failures.push(`${where} : ${worst.toFixed(2)}:1`);
      }
    }
    await context.close();
  }
  for (const [k, w] of worstByCase) t.diagnostic(`pire ${k} : ${w.toFixed(2)}:1`);
  assert.deepEqual(failures, []);
});
