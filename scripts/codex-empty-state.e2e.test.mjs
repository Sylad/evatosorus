// L21 — codex : état vide en français, pas de « 0 – 0 », compteur annoncé poliment.
// Le compteur visible (« 1 – 60 sur 1 511 », L19) n'est pas une région live : il change à
// chaque frappe. Une région role=status (aria-live=polite) annonce la valeur STABILISÉE
// après une pause de frappe — une seule annonce pour une rafale de touches.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

async function openCodex(env, width = 390) {
  const context = await env.browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
  await page.waitForSelector('.filter-count');
  return { context, page };
}

// Journal des textes successifs de la région live (MutationObserver posé avant la frappe).
const watchLive = (page) => page.evaluate(() => {
  const live = document.querySelector('.codex-browser [role="status"]');
  window.__liveLog = [];
  new MutationObserver(() => {
    const txt = live.textContent.trim();
    if (txt) window.__liveLog.push(txt.replace(/\s+/g, " "));
  }).observe(live, { childList: true, subtree: true, characterData: true });
});

test('codex vide : message en français, compteur sans « 0 – 0 », bouton pour tout réafficher', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await openCodex(env);
  await page.fill('.filter-search', 'zzzqqq');
  await page.waitForSelector('.empty-state');
  const empty = (await page.textContent('.empty-state')).replace(/\s+/g, ' ');
  assert.match(empty, /Aucune espèce ne correspond à « zzzqqq »/, empty);
  assert.doesNotMatch(empty, /match/i);
  const count = (await page.textContent('.filter-count')).replace(/\s+/g, ' ');
  assert.doesNotMatch(count, /0\s*[–-]\s*0/, `compteur : « ${count} »`);
  assert.match(count, /^0 espèce$/, `compteur : « ${count} »`);

  // Filtres seuls (sans recherche) : message adapté, sans guillemets vides.
  await page.click('.empty-state button');
  await page.waitForSelector('.species-card');
  assert.equal(await page.inputValue('.filter-search'), '');
  // Le bouton disparaît avec l'état vide : le focus revient au champ de recherche.
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains('filter-search')), 'focus perdu après réinitialisation');
  assert.match((await page.textContent('.filter-count')).replace(/\s+/g, ' '), /^1 – 60 sur 1 511$/);
  // Trias + carnivore + groupe « autre » : aucune espèce (mesuré le 2026-10-02).
  await page.check('input[name="period"] >> nth=1');
  await page.check('input[name="diet"] >> nth=1');
  await page.selectOption('.filter-select', 'other');
  await page.waitForSelector('.empty-state');
  const msg = (await page.textContent('.empty-state')).replace(/\s+/g, ' ');
  assert.match(msg, /Aucune espèce ne correspond à ces filtres/, msg);
  assert.doesNotMatch(msg, /« »/, msg);
  await context.close();
});

test('codex : compteur au format L19 avec résultats, région live polie, une seule annonce par rafale', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await openCodex(env);
  // Le compteur visible n'est PAS live ; la région role=status l'est, poliment.
  assert.equal(await page.locator('.filter-count[aria-live]').count(), 0);
  const live = page.locator('.codex-browser [role="status"]');
  assert.equal(await live.count(), 1);
  assert.equal(await live.getAttribute('aria-live'), 'polite');
  assert.equal((await live.textContent()).trim(), '', 'rien annoncé au chargement');

  await watchLive(page);
  // Rafale : 6 touches à 40 ms d'intervalle → une seule annonce, la valeur finale.
  await page.locator('.filter-search').pressSequentially('raptor', { delay: 40 });
  await page.waitForTimeout(1500);
  const log = await page.evaluate(() => window.__liveLog);
  const n = await page.evaluate(() => document.querySelectorAll('.species-card').length);
  assert.equal(log.length, 1, `annonces : ${JSON.stringify(log)}`);
  assert.match(log[0], /^\d+ espèces? trouvées? pour « raptor »\.$/, log[0]);
  const count = (await page.textContent('.filter-count')).replace(/\s+/g, ' ');
  assert.match(count, /^1 – \d+ sur \d+$/, count);
  assert.ok(n > 0);
  // U+00A0 – U+00A0 (L19) conservés dans le DOM.
  assert.ok((await page.textContent('.filter-count')).includes(' – '));

  // Puis une recherche vide : l'annonce dit l'état vide en français.
  await page.fill('.filter-search', 'zzzqqq');
  await page.waitForTimeout(1500);
  const log2 = await page.evaluate(() => window.__liveLog);
  assert.equal(log2.length, 2, JSON.stringify(log2));
  assert.match(log2[1], /Aucune espèce ne correspond à « zzzqqq »/);
  await context.close();
});

// Deux recherches différentes au même nombre de résultats : chacune est annoncée (le
// message nomme la recherche ; la région est vidée à chaque nouvelle frappe), toujours
// une fois par rafale.
test('codex : deux recherches au même compte sont annoncées chacune', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await openCodex(env);
  await watchLive(page);
  await page.locator('.filter-search').pressSequentially('tyrannosaurus', { delay: 30 });
  await page.waitForTimeout(1500);
  await page.fill('.filter-search', '');
  await page.locator('.filter-search').pressSequentially('velociraptor', { delay: 30 });
  await page.waitForTimeout(1500);
  const log = await page.evaluate(() => window.__liveLog);
  assert.deepEqual(log, [
    '1 espèce trouvée pour « tyrannosaurus ».',
    '1 espèce trouvée pour « velociraptor ».',
  ]);
  await context.close();
});
