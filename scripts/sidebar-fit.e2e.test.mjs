// Revue UX L27/L28 — barre latérale (11 liens depuis Nouveautés et Plan de travail) : sur un
// bureau de 768 px de haut (1366×768), tous les liens visibles sans défiler, cibles ≥ 24 px.
// Lit frontend/dist ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const nav = (page) => page.evaluate(() => {
  const links = [...document.querySelectorAll('#evato-sidebar .codex-nav-link')];
  return { n: links.length, bottom: Math.max(...links.map((a) => a.getBoundingClientRect().bottom)), minH: Math.min(...links.map((a) => a.getBoundingClientRect().height)), vh: innerHeight };
});

test('1366×768 et 1280×720 : les 11 liens de la barre latérale tiennent dans l’écran, cibles ≥ 24 px', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const [w, h] of [[1366, 768], [1280, 720]]) {
    const context = await env.browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const path of ['/codex/', '/plan-de-travail/']) {
      await page.goto(env.base + path, { waitUntil: 'load' });
      const m = await nav(page);
      assert.equal(m.n, 11);
      assert.ok(m.bottom <= m.vh, `${w}×${h} ${path} : dernier lien jusqu’à ${m.bottom}px`);
      assert.ok(m.minH >= 24, `${w}×${h} : cible de ${m.minH}px`);
    }
    await context.close();
  }
});

test('1440×900 : espacement d’origine des liens conservé (le resserrement ne vaut que pour les écrans bas)', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
  const pad = await page.locator('#evato-sidebar .codex-nav-link').first().evaluate((a) => parseFloat(getComputedStyle(a).paddingTop) / parseFloat(getComputedStyle(document.documentElement).fontSize));
  assert.ok(Math.abs(pad - 0.55) < 1e-3, `padding ${pad}rem au lieu de 0,55`);
  await context.close();
});
