// L23 — menu du téléphone au clavier (WCAG 2.4.3 ordre du focus, 2.4.11 focus non masqué) :
// tiroir fermé hors de l'ordre de tabulation ; à l'ouverture le focus entre dans le tiroir
// et le reste de la page est inert (ni Tab ni curseur virtuel) ; Échap, le bouton et le
// voile rendent le focus au bouton du menu ; le bouton fixe ne masque jamais l'élément
// qui a le focus ; libellé et pastille des nouveautés inchangés ; bureau inchangé.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const UNSEEN = { date: '2000-01-01', slugs: [], all: true };
const PAGES = ['/codex/', '/especes/tyrannosaurus-rex/', '/about/'];

async function newPage(env, width, { unseen = false } = {}) {
  const context = await env.browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  if (unseen) await context.addInitScript((seen) => localStorage.setItem('evato.news.seen-v1', JSON.stringify(seen)), UNSEEN);
  return { context, page: await context.newPage() };
}

// Où est le focus : 'sidebar', 'burger', ou un descripteur de l'élément.
const focusWhere = (page) => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return 'body';
  if (a.closest('#evato-sidebar')) return 'sidebar';
  if (a.closest('#evato-burger')) return 'burger';
  return `${a.tagName.toLowerCase()}${a.getAttribute('href') ? `[${a.getAttribute('href')}]` : ''}`;
});

// Noms des nœuds NON ignorés de l'arbre d'accessibilité (ce que lit un lecteur d'écran).
async function axNames(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  // Chromium applique text-transform aux noms (« CODEX ») : comparés en minuscules.
  // Hors titre du document (RootWebArea), qui reprend le nom de la page.
  return nodes.filter((n) => !n.ignored && n.name?.value && n.role?.value !== 'RootWebArea').map((n) => n.name.value.trim().toLowerCase());
}

const isOpen = (page) => page.evaluate(() => document.documentElement.getAttribute('data-drawer-open') === 'true');
const waitClosed = (page) => page.waitForFunction(() => !document.documentElement.hasAttribute('data-drawer-open'));
const waitSettled = (page) => page.waitForTimeout(350); // glissement 250 ms

test('téléphone : tiroir fermé hors de l\'ordre Tab, focus dans le tiroir à l\'ouverture, page inert, retour au bouton', { timeout: 300_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const width of [390, 320]) {
    const { context, page } = await newPage(env, width, { unseen: true });
    for (const path of PAGES) {
      const where = `${path} @ ${width}px`;
      await page.goto(env.base + path, { waitUntil: 'load' });

      // 1. Fermé : 15 tabulations depuis le haut de page, aucune dans le tiroir.
      const seen = [];
      for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); seen.push(await focusWhere(page)); }
      assert.ok(!seen.includes('sidebar'), `${where} : Tab entre dans le tiroir fermé (${seen.join(' → ')})`);
      assert.ok(seen.includes('burger'), `${where} : le bouton du menu n'est pas atteint au clavier (${seen.join(' → ')})`);
      const label = await page.getAttribute('#evato-burger', 'aria-label');
      assert.match(label, /^Ouvrir la navigation \(\d+ nouveautés? non vues?\)$/, `${where} : libellé « ${label} »`);
      assert.ok(await page.locator('#evato-burger .news-badge').isVisible(), `${where} : pastille absente`);
      assert.ok(!(await axNames(page)).includes('plan de travail'), `${where} : tiroir fermé exposé aux lecteurs d'écran`);

      // 2. Ouverture au clavier : le focus entre dans le tiroir, la page est inert.
      await page.focus('#evato-burger');
      await page.keyboard.press('Enter');
      await waitSettled(page);
      assert.ok(await isOpen(page), `${where} : le menu ne s'ouvre pas au clavier`);
      assert.equal(await focusWhere(page), 'sidebar', `${where} : focus hors du tiroir à l'ouverture`);
      assert.equal(await page.getAttribute('#evato-burger', 'aria-label'), 'Fermer la navigation');
      const inert = await page.evaluate(() => ({
        main: document.querySelector('main').inert,
        others: [...document.body.children].filter((c) => !c.inert && !c.matches('#evato-burger, .codex-shell, script, style, [aria-hidden="true"]') && c.getClientRects().length).map((c) => c.tagName + '.' + c.className),
      }));
      assert.ok(inert.main, `${where} : contenu non inert`);
      assert.deepEqual(inert.others, [], `${where} : éléments actifs derrière le tiroir`);
      // Curseur virtuel : l'arbre d'accessibilité de Chromium (CDP) n'expose plus le titre
      // de la page, mais expose les liens du tiroir.
      const exposed = await axNames(page);
      // Premier paragraphe long du contenu (le titre peut coïncider avec un lien du tiroir).
      const para = (await page.evaluate(() => [...document.querySelectorAll('main p')].map((p) => p.textContent.trim()).find((t) => t.length > 60)))
        .slice(0, 40).toLowerCase();
      assert.ok(!exposed.some((n) => n.includes(para)), `${where} : « ${para} » encore exposé aux lecteurs d'écran`);
      assert.ok(exposed.includes('codex'), `${where} : liens du tiroir absents de l'arbre d'accessibilité`);
      // Tab et Maj+Tab restent dans le tiroir et le bouton du menu.
      const cycle = [];
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press('Tab');
        cycle.push(await focusWhere(page));
        // 2.4.11 dans le tiroir ouvert aussi : le lien focalisé n'est pas sous le bouton.
        const covered = await page.evaluate(() => {
          const a = document.activeElement;
          if (!a?.closest('#evato-sidebar')) return null;
          const f = a.getBoundingClientRect();
          const b = document.getElementById('evato-burger').getBoundingClientRect();
          return f.right > b.left && f.left < b.right && f.bottom > b.top && f.top < b.bottom ? a.textContent.trim() : null;
        });
        assert.equal(covered, null, `${where} : lien du tiroir « ${covered} » sous le bouton du menu`);
      }
      for (let i = 0; i < 4; i++) { await page.keyboard.press('Shift+Tab'); cycle.push(await focusWhere(page)); }
      const escaped = cycle.filter((w) => w !== 'sidebar' && w !== 'burger' && w !== 'body');
      assert.deepEqual(escaped, [], `${where} : le focus sort du tiroir (${cycle.join(' → ')})`);

      // 3. Échap : fermé, focus sur le bouton, page de nouveau active, libellé restauré.
      await page.keyboard.press('Escape');
      await waitClosed(page);
      assert.equal(await focusWhere(page), 'burger', `${where} : Échap ne rend pas le focus au bouton`);
      assert.ok(!(await page.evaluate(() => document.querySelector('main').inert)), `${where} : contenu resté inert`);
      assert.match(await page.getAttribute('#evato-burger', 'aria-label'), /^Ouvrir la navigation \(\d+ nouveautés? non vues?\)$/);

      // 4. Le bouton lui-même ferme (Entrée) : focus sur le bouton.
      await page.keyboard.press('Enter');
      await waitSettled(page);
      assert.equal(await focusWhere(page), 'sidebar');
      await page.focus('#evato-burger');
      await page.keyboard.press('Enter');
      await waitClosed(page);
      assert.equal(await focusWhere(page), 'burger', `${where} : le bouton ne garde pas le focus à la fermeture`);

      // 5. Le voile ferme aussi et rend le focus au bouton.
      await page.keyboard.press('Enter');
      await waitSettled(page);
      await page.mouse.click(width - 10, 700);
      await waitClosed(page);
      assert.equal(await focusWhere(page), 'burger', `${where} : le voile ne rend pas le focus au bouton`);
      await waitSettled(page);
      // Fermé à nouveau : les liens du tiroir sont hors de l'ordre Tab.
      await page.keyboard.press('Tab');
      assert.notEqual(await focusWhere(page), 'sidebar', `${where} : tiroir refermé encore dans l'ordre Tab`);
    }
    await context.close();
  }
});

// WCAG 2.4.11 : à chaque tabulation dans la page, l'élément focalisé n'est pas masqué
// (même en partie) par le bouton fixe du menu.
test('téléphone : le bouton fixe ne masque jamais l\'élément qui a le focus', { timeout: 300_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  for (const width of [390, 320]) {
    const { context, page } = await newPage(env, width);
    for (const path of ['/codex/', '/especes/tyrannosaurus-rex/', '/vitrines/', '/about/']) {
      await page.goto(env.base + path, { waitUntil: 'load' });
      if (path === '/codex/') await page.waitForSelector('.species-card');
      // 60 tabulations vers le bas, puis 40 Maj+Tab : en remontant, le navigateur amène
      // l'élément en HAUT de l'écran, là où est le bouton fixe.
      for (let i = 0; i < 100; i++) {
        await page.keyboard.press(i < 60 ? 'Tab' : 'Shift+Tab');
        await page.waitForTimeout(20);
        const r = await page.evaluate(() => {
          const a = document.activeElement;
          if (!a || a === document.body || a.closest('#evato-burger')) return null;
          const r0 = a.getBoundingClientRect();
          // <video controls> : le focus est sur un contrôle de la barre native, en bas de
          // la vidéo (c'est elle que le navigateur amène dans l'écran) — mesurer cette barre.
          const f = a.tagName === 'VIDEO' ? { left: r0.left, right: r0.right, top: r0.bottom - 48, bottom: r0.bottom } : r0;
          const b = document.getElementById('evato-burger').getBoundingClientRect();
          const overlap = Math.max(0, Math.min(f.right, b.right) - Math.max(f.left, b.left)) * Math.max(0, Math.min(f.bottom, b.bottom) - Math.max(f.top, b.top));
          return overlap > 0 ? `${a.tagName.toLowerCase()}[${a.getAttribute('href') ?? a.className}] y ${Math.round(f.top)}–${Math.round(f.bottom)}` : null;
        });
        if (r) failures.push(`${path} @ ${width}px : ${r}`);
      }
    }
    await context.close();
  }
  assert.deepEqual([...new Set(failures)], []);
});

test('bureau 1440 px : barre latérale dans l\'ordre Tab, rien d\'inert, bouton du menu absent', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await newPage(env, 1440);
  await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
  const seen = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); seen.push(await focusWhere(page)); }
  assert.ok(seen.includes('sidebar'), `barre latérale hors de l'ordre Tab (${seen.join(' → ')})`);
  assert.ok(!seen.includes('burger'));
  assert.equal(await page.evaluate(() => document.querySelectorAll('[inert]').length), 0);
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('evato-sidebar')).visibility), 'visible');
  await context.close();
});

// Ouvrir un lien du tiroir dans un nouvel onglet (Ctrl+Entrée, Ctrl+clic, clic du milieu)
// laisse l'utilisateur sur la page : le tiroir reste ouvert et le focus reste sur le lien.
// Seule une navigation dans le même onglet ferme le tiroir.
test('téléphone : un lien du tiroir ouvert dans un nouvel onglet ne ferme pas le tiroir', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await newPage(env, 390);
  // Les nouveaux onglets sont refermés aussitôt.
  context.on('page', (p) => p.close().catch(() => {}));
  await page.goto(`${env.base}/codex/`, { waitUntil: 'load' });
  const link = page.locator('#evato-sidebar a[href="/vitrines/"]');
  for (const how of ['Control+Enter', 'Control+clic', 'clic du milieu']) {
    if (!(await isOpen(page))) {
      await page.focus('#evato-burger');
      await page.keyboard.press('Enter');
      await waitSettled(page);
    }
    if (how === 'Control+Enter') {
      await link.focus();
      await page.keyboard.press('Control+Enter');
    } else {
      await link.click({ button: how === 'clic du milieu' ? 'middle' : 'left', modifiers: how === 'Control+clic' ? ['Control'] : [] });
    }
    await page.waitForTimeout(400);
    assert.equal(new URL(page.url()).pathname, '/codex/', `${how} : la page a changé`);
    assert.ok(await isOpen(page), `${how} : le tiroir s'est fermé`);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('href')), '/vitrines/', `${how} : focus perdu`);
  }
  // Clic simple : navigation dans l'onglet, tiroir fermé.
  await Promise.all([page.waitForURL((u) => u.pathname === '/vitrines/'), link.click()]);
  await context.close();
});
