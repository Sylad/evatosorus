// L52 — Revue UX « bonnes pratiques d'une appli web standard » : rejoue les écarts corrigés dans le lot.
// Rapport complet : docs/qa/revue-L52-bonnes-pratiques.md. Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 — taille de texte : la racine suit le réglage du navigateur (pas de font-size en px sur html, WCAG 1.4.4),
//      et toute hauteur 100vh a sa reprise en 100dvh (barre du navigateur mobile).
// R2 — /periodes/ : plages des cartes atténuées ≥ 4,5:1 (WCAG 1.4.3), sur le fond uni de la page ET au pire
//      pixel du fond réel (fond de carte, photo) ; graduations, plages des bandes, libellés d'ère et
//      pastilles d'espèces ≥ 12 px à 320, 390 et 1440 px.
// R3 — /codex/ : la liste « Groupe » a un nom accessible (WCAG 4.1.2) ; bord des boutons radio vides
//      ≥ 3:1 contre le fond réel derrière le bouton (WCAG 1.4.11), mesuré au pixel.
// R4 — /carte/ : légende et attribution ≥ 12 px, liens de l'attribution soulignés (WCAG 1.4.1).
// R5 — fiche espèce : image des espèces voisines en alt="" (le nom suit dans le lien), pas d'aside imbriqué.
// R6 — fiche espèce (C10) : la vidéo atteinte au clavier porte l'anneau ambre (WCAG 2.4.7, global.css).
// R7 — cartes d'espèce (C7) : étiquette de période et étiquette « silhouette » ≥ 12 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupBrowser } from './lib/e2e-dist.mjs';

const SRC = fileURLToPath(new URL('../frontend/src/', import.meta.url));

function fichiers(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name === 'node_modules') return [];
    const p = join(dir, d.name);
    return d.isDirectory() ? fichiers(p) : /\.(astro|css|tsx)$/.test(d.name) ? [p] : [];
  });
}

async function ouvre(env, w, path, h = 844) {
  const context = await env.browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}${path}`, { waitUntil: 'load' });
  return page;
}

const tailles = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)]
  .filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none')
  .map((e) => [e.textContent.trim().slice(0, 30), parseFloat(getComputedStyle(e).fontSize)]), sel);

const contraste = (page, sel) => page.evaluate((s) => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const rgb = (c) => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
  return [...document.querySelectorAll(s)].map((e) => {
    // Couleur du texte composée avec l'opacité cumulée des ancêtres, sur le fond de page.
    let a = 1; for (let n = e; n; n = n.parentElement) a *= parseFloat(getComputedStyle(n).opacity);
    const fg = rgb(getComputedStyle(e).color); const bg = rgb(getComputedStyle(document.documentElement).backgroundColor);
    const mix = fg.slice(0, 3).map((v, i) => a * v + (1 - a) * bg[i]);
    const [l1, l2] = [lum(mix), lum(bg)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
}, sel);

// Fond réel au pixel : `masque` (CSS) efface ce qu'on mesure (texte, bouton) sans changer la mise en page,
// puis on capture la boîte de chaque élément et on garde le pire rapport entre la couleur `couleur(e)`
// (composée avec l'opacité cumulée des ancêtres) et chacun des pixels du fond capturé. Sous une opacité
// d'ancêtre < 1, la composition sur le pixel capturé (déjà atténué) est prudente : elle sous-estime le rapport.
async function contrasteFondReel(page, sel, masque, couleur) {
  const els = page.locator(sel);
  const n = await els.count();
  const fg = await els.evaluateAll((list, src) => {
    const f = new Function('e', `return (${src})(e)`);
    const rgb = (c) => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
    return list.map((e) => {
      let a = 1; for (let k = e; k; k = k.parentElement) a *= parseFloat(getComputedStyle(k).opacity);
      const c = rgb(f(e));
      return [...c.slice(0, 3), (c[3] / 255) * a];
    });
  }, couleur.toString());
  const style = await page.addStyleTag({ content: `${sel} { ${masque} }` });
  const pires = [];
  for (let i = 0; i < n; i++) {
    const loc = els.nth(i);
    if (!(await loc.isVisible())) continue;
    const png = (await loc.screenshot({ animations: 'disabled' })).toString('base64');
    pires.push(await page.evaluate(async ([b64, [r, g, b, a]]) => {
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const lum = (p) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let pire = Infinity;
      for (let k = 0; k < d.length; k += 4) {
        const px = [d[k], d[k + 1], d[k + 2]];
        const mix = [r, g, b].map((v, j) => a * v + (1 - a) * px[j]);
        const [l1, l2] = [lum(mix), lum(px)];
        pire = Math.min(pire, (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
      }
      return pire;
    }, [png, fg[i]]));
  }
  await style.evaluate((node) => node.remove());
  return pires;
}

test('R1 — racine en %, et 100vh toujours repris en 100dvh', () => {
  const css = readFileSync(join(SRC, 'styles/global.css'), 'utf8');
  const html = css.match(/html\s*\{[^}]*\}/)[0];
  assert.doesNotMatch(html, /font-size:\s*[\d.]+px/, 'html { font-size } en px ignore la taille choisie dans le navigateur');
  const manque = [];
  for (const f of fichiers(SRC)) {
    const lignes = readFileSync(f, 'utf8').split('\n');
    lignes.forEach((l, i) => {
      const m = l.match(/^\s*((?:min-|max-)?height):\s*100vh;/);
      if (m && !new RegExp(`${m[1]}:\\s*100dvh`).test(lignes[i + 1] ?? '')) manque.push(`${f.slice(SRC.length)}:${i + 1}`);
    });
  }
  assert.deepEqual(manque, [], '100vh sans 100dvh juste après');
});

test('R2 — /periodes/ : plages atténuées ≥ 4,5:1, textes de la frise et pastilles ≥ 12 px', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [320, 390, 1440]) {
    const page = await ouvre(env, w, '/periodes/');
    const ratios = await contraste(page, '.meso-iconic:not(.meso-iconic--lit) .meso-iconic-range');
    assert.ok(ratios.length > 0, `${w}px : au moins une carte atténuée`);
    for (const r of ratios) assert.ok(r >= 4.5, `${w}px : plage atténuée à ${r.toFixed(2)}:1`);
    const reels = await contrasteFondReel(page, '.meso-iconic .meso-iconic-range',
      'color: transparent !important; text-shadow: none !important;', (e) => getComputedStyle(e).color);
    assert.ok(reels.length > ratios.length, `${w}px : une capture par carte, allumée ou non`);
    for (const r of reels) assert.ok(r >= 4.5, `${w}px : plage à ${r.toFixed(2)}:1 sur son fond réel (photo de la page)`);
    const petits = (await tailles(page, '.meso-tick-label, .meso-band-range, .meso-band-label, .meso-iconic-range, .iconic-pill')).filter(([, f]) => f < 12);
    assert.deepEqual(petits, [], `${w}px : textes sous 12 px`);
  }
});

test('R3 — /codex/ : liste « Groupe » nommée, bord des boutons radio ≥ 3:1', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 1440, '/codex/', 900);
  await page.waitForSelector('select.filter-select');
  assert.equal(await page.getAttribute('select.filter-select', 'aria-label'), 'Groupe');
  // Le bouton est effacé (opacity 0, il garde sa boîte) : la capture donne le fond réel derrière lui.
  const radios = ".codex-filters input[type='radio']:not(:checked)";
  const ratios = await contrasteFondReel(page, radios, 'opacity: 0 !important;', (e) => getComputedStyle(e).borderTopColor);
  assert.ok(ratios.length > 0, 'au moins un bouton radio vide');
  for (const r of ratios) assert.ok(r >= 3, `bord d'un bouton radio vide à ${r.toFixed(2)}:1 sur son fond`);
});

test('R4 — /carte/ : légende et attribution ≥ 12 px, liens soulignés', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const w of [390, 1440]) {
    const page = await ouvre(env, w, '/carte/');
    await page.waitForSelector('.leaflet-control-attribution a');
    const petits = (await tailles(page, '.legend-item, .leaflet-control-attribution, .leaflet-control-attribution a')).filter(([, f]) => f < 12);
    assert.deepEqual(petits, [], `${w}px : textes sous 12 px`);
    const deco = await page.evaluate(() => [...document.querySelectorAll('.leaflet-control-attribution a')].map((a) => getComputedStyle(a).textDecorationLine));
    for (const d of deco) assert.match(d, /underline/, `${w}px : lien d'attribution non souligné`);
  }
});

test('R5 — fiche espèce : voisines en alt="", aucun aside dans main', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 1440, '/especes/tyrannosaurus-rex/', 900);
  const r = await page.evaluate(() => ({
    alts: [...document.querySelectorAll('.related-card img')].map((i) => i.getAttribute('alt')),
    aside: document.querySelectorAll('main aside').length,
  }));
  assert.ok(r.alts.length > 0, 'au moins une espèce voisine illustrée');
  assert.deepEqual([...new Set(r.alts)], [''], 'image d’une voisine avec un alt qui répète son nom');
  assert.equal(r.aside, 0);
});

test('R6 — fiche espèce : la vidéo atteinte au clavier porte l’anneau ambre', { timeout: 60_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const page = await ouvre(env, 1440, '/especes/tyrannosaurus-rex/', 900);
  await page.waitForSelector('.detail-videos video');
  let surVideo = false;
  for (let i = 0; i < 120 && !surVideo; i++) {
    await page.keyboard.press('Tab');
    surVideo = await page.evaluate(() => document.activeElement?.tagName === 'VIDEO');
  }
  assert.ok(surVideo, 'aucune vidéo atteinte au clavier en 120 appuis sur Tab');
  const r = await page.evaluate(() => {
    const v = document.activeElement;
    const s = getComputedStyle(v);
    const ambre = document.createElement('span');
    ambre.style.color = 'var(--color-evato-amber-bright)';
    document.body.append(ambre);
    const attendu = getComputedStyle(ambre).color;
    ambre.remove();
    return { fv: v.matches(':focus-visible'), style: s.outlineStyle, largeur: parseFloat(s.outlineWidth), couleur: s.outlineColor, attendu };
  });
  assert.ok(r.fv, 'la vidéo focalisée au clavier doit être :focus-visible');
  assert.equal(r.style, 'solid', `anneau de la vidéo : outline-style ${r.style} (Chromium ne dessine pas « auto » sur l’hôte video)`);
  assert.ok(r.largeur >= 2, `anneau de ${r.largeur} px`);
  assert.equal(r.couleur, r.attendu, 'anneau de la couleur ambre de la charte');
});

test('R7 — cartes d’espèce : période et « silhouette » ≥ 12 px', { timeout: 90_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  // /periodes/cretace/ : cartes de SpeciesCard.astro (C7), dont des espèces en silhouette.
  // /codex/ : cartes de CodexBrowser (codex-browser.css), aucune silhouette aujourd'hui : l'étiquette est
  // mesurée sur un clone de l'étiquette de période, qui garde sa place dans .species-card.
  for (const [path, clone] of [['/periodes/cretace/', false], ['/codex/', true]]) {
    for (const w of [320, 1440]) {
      const page = await ouvre(env, w, path, 900);
      await page.waitForSelector('.card-period');
      const r = await page.evaluate((cloner) => {
        if (cloner && !document.querySelector('.card-silhouette-tag')) {
          const p = document.querySelector('.card-period');
          const tag = p.cloneNode(true); tag.className = 'card-silhouette-tag'; tag.textContent = 'silhouette'; p.after(tag);
        }
        const px = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length).map((e) => parseFloat(getComputedStyle(e).fontSize));
        return { periodes: px('.card-period'), silhouettes: px('.card-silhouette-tag') };
      }, clone);
      assert.ok(r.periodes.length > 0, `${path} ${w}px : au moins une étiquette de période`);
      assert.ok(r.silhouettes.length > 0, `${path} ${w}px : au moins une étiquette « silhouette »`);
      assert.deepEqual(r.periodes.filter((f) => f < 12), [], `${path} ${w}px : étiquette de période sous 12 px`);
      assert.deepEqual(r.silhouettes.filter((f) => f < 12), [], `${path} ${w}px : étiquette « silhouette » sous 12 px`);
    }
  }
});
