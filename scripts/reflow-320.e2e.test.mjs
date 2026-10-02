// L22 — redistribution à 320 px (WCAG 1.4.10) : aucune page ne défile horizontalement,
// sans masquer le débordement (overflow-x reste « visible » sur html, body et le contenu),
// rien à x < 0 avec une police racine ×1,25, et le bouton du menu (pastille comprise)
// tient entier dans l'écran. Deux contextes : fenêtre de 320 px simple, et émulation de
// téléphone (isMobile) où un débordement ÉLARGIT la fenêtre de mise en page — c'est là que
// le bouton fixe partait à x 312–360 sur /codex/.
// Lit frontend/dist (lancer `npx astro build` avant) ; skip sans playwright-core/Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowser } from './lib/e2e-dist.mjs';

const PAGES = [
  '/codex/',
  '/about/',
  '/vitrines/',
  '/especes/aardonyx-celestae/',
  '/especes/tyrannosaurus-rex/', // galerie vidéo (grille minmax 320 px)
  '/especes/micropachycephalosaurus-hongtuyanensis/', // plus long mot de titre (23 lettres)
  '/especes/dispersituberoolithus-exilis/',
  '/especes/guizhouichthyosaurus-wolonggangense/',
  '/especes/macroelongatoolithus-carlylei/',
  '/films/',
  '/films/jurassic-park-1993/',
  '/videos/',
  '/periodes/',
  '/periodes/jurassique/',
  '/comprendre/',
  '/carte/',
  '/nouveautes/',
  '/plan-de-travail/',
];
// Police racine du site : 17,5 px ; ×1,25 = 21,875 px.
const ROOT_SCALED = 'html { font-size: 21.875px !important; }';
// Mémoire des Nouveautés vide de slugs : toutes les entrées comptent comme non vues,
// la pastille du bouton du menu est affichée.
const UNSEEN = { date: '2000-01-01', slugs: [], all: true };

const measure = (page) => page.evaluate(() => {
  const html = document.documentElement;
  const vw = html.clientWidth;
  const off = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    // Fixes (bouton du menu, fonds) mesurés à part ; tiroir fermé hors écran par conception ;
    // tuiles Leaflet : coupées par la carte (overflow hidden voulu).
    if (cs.position === 'fixed' || el.closest('#evato-burger, #evato-sidebar, .codex-bg, .leaflet-container')) continue;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) continue;
    if (b.right > vw + 0.5 || b.left < -0.5) {
      off.push(`${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/)[0]} [${Math.round(b.left)}–${Math.round(b.right)}]`);
    }
  }
  const box = (el) => { const r = el?.getBoundingClientRect(); return r && { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  const burger = document.getElementById('evato-burger');
  const badge = burger?.querySelector('.news-badge');
  const main = document.querySelector('main');
  return {
    vw, iw: innerWidth, sw: html.scrollWidth, off: off.slice(0, 8),
    overflowX: [html, document.body, main].filter(Boolean).map((e) => getComputedStyle(e).overflowX),
    burger: box(burger), badge: badge && !badge.hidden ? box(badge) : null,
  };
});

test('320 px : aucun défilement horizontal, rien hors écran, bouton du menu et pastille entiers', { timeout: 600_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  for (const mobile of [false, true]) {
    for (const scaled of [false, true]) {
      const context = await env.browser.newContext({
        viewport: { width: 320, height: 640 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: 'reduce',
      });
      await context.addInitScript((seen) => localStorage.setItem('evato.news.seen-v1', JSON.stringify(seen)), UNSEEN);
      const page = await context.newPage();
      for (const path of PAGES) {
        await page.goto(env.base + path, { waitUntil: 'load' });
        if (scaled) await page.addStyleTag({ content: ROOT_SCALED });
        if (path === '/codex/') await page.waitForSelector('.filter-search');
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);
        const m = await measure(page);
        const where = `${path} ${mobile ? 'téléphone' : 'fenêtre'} 320 px${scaled ? ' police ×1,25' : ''}`;
        if (m.sw > m.vw) failures.push(`${where} : scrollWidth ${m.sw} > ${m.vw} — ${m.off.join(', ')}`);
        else if (m.off.length) failures.push(`${where} : hors écran ${m.off.join(', ')}`);
        if (m.iw !== 320) failures.push(`${where} : fenêtre de mise en page élargie à ${m.iw} px`);
        if (m.overflowX.some((o) => o !== 'visible')) failures.push(`${where} : overflow-x masqué (${m.overflowX})`);
        for (const [name, b] of [['bouton du menu', m.burger], ['pastille', m.badge]]) {
          // /nouveautes/ marque tout comme vu : pas de pastille sur cette page.
          if (!b) { if (name === 'bouton du menu' || path !== '/nouveautes/') failures.push(`${where} : ${name} absent(e)`); continue; }
          if (b.left < 0 || b.right > 320 || b.top < 0) failures.push(`${where} : ${name} hors écran [${Math.round(b.left)}–${Math.round(b.right)}]`);
        }
      }
      await context.close();
    }
  }
  assert.deepEqual(failures, []);
});

// Le défilement supprimé, un titre trop grand serait coupé au milieu d'un mot
// (overflow-wrap: break-word) : à 320 px, police normale, les titres tiennent sans coupure,
// le titre de fiche s'ajustant au plus long mot du nom. Exception voulue : un mot de 20
// lettres ou plus (Micropachycephalosaurus, Dispersituberoolithus…) ne tient pas au-dessus
// de la taille plancher du titre (celle du nom scientifique) ; il passe alors à la ligne.
test('320 px : titres h1/h2 sans mot coupé (sauf noms de 20 lettres et plus)', { timeout: 120_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 320, height: 640 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const failures = [];
  for (const path of PAGES.filter((p) => p !== '/carte/')) {
    await page.goto(env.base + path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const broken = await page.evaluate(() => {
      const out = [];
      for (const h of document.querySelectorAll('main h1, main h2')) {
        const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const re = /\S+/g;
          let m;
          while ((m = re.exec(n.textContent))) {
            const r = document.createRange();
            r.setStart(n, m.index);
            r.setEnd(n, m.index + m[0].length);
            if (new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1) out.push(m[0]);
          }
        }
      }
      return out;
    });
    const unexpected = broken.filter((w) => w.length < 20);
    if (unexpected.length) failures.push(`${path} : ${unexpected.join(', ')}`);
  }
  await context.close();
  assert.deepEqual(failures, []);
});
