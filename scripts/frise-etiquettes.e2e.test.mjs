// L39 — Frise des Périodes : lisibilité des étiquettes. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — l'étiquette du curseur (« 145 Ma ») ne recouvre ni le titre ni l'indication d'ère au-dessus de la frise,
//      à 1440, 390 et 320 px, au départ comme aux deux extrémités.
// R2 — la plage de dates d'une bande (« 252 — 201 Ma ») tient sur une seule ligne et dans sa bande, à 1440, 390 et 320 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const WIDTHS = [1440, 390, 320];
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test('R1 — l’étiquette du curseur ne recouvre pas le texte au-dessus de la frise', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
    for (const key of [null, 'Home', 'End']) {
      if (key) { await page.locator('[data-meso-cursor]').focus(); await page.keyboard.press(key); }
      const m = await page.evaluate(() => {
        const box = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
        const texts = [...document.querySelectorAll('.meso-timeline-title, .meso-timeline-hint')].filter((e) => !e.hidden);
        return { readout: box(document.querySelector('[data-meso-readout]')), texts: texts.map((e) => ({ cls: e.className, text: e.textContent.trim(), box: box(e) })) };
      });
      assert.ok(m.texts.length >= 2, `${w}px : titre et indication attendus`);
      for (const x of m.texts) assert.ok(!overlap(m.readout, x.box), `${w}px (${key ?? 'départ'}) : l'étiquette recouvre « ${x.text} »`);
    }
    await context.close();
  }
});

test('R2 — la plage de dates d’une bande tient sur une seule ligne', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of WIDTHS) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${env.base}/periodes/`, { waitUntil: 'load' });
    const m = await page.evaluate(() => [...document.querySelectorAll('.meso-band')].map((b) => {
      const r = b.querySelector('.meso-band-range');
      return { id: b.dataset.period, fits: r.scrollWidth <= b.getBoundingClientRect().width, display: getComputedStyle(r).display, lines: Math.round(r.getBoundingClientRect().height / parseFloat(getComputedStyle(r).lineHeight)), };
    }));
    for (const x of m.filter((y) => y.display !== 'none')) {
      assert.equal(x.lines, 1, `${w}px ${x.id} : plage sur ${x.lines} lignes`);
      assert.ok(x.fits, `${w}px ${x.id} : plage plus large que sa bande`);
    }
    await context.close();
  }
});
