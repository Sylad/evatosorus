// L11 — revue UX de /about/ (2026-11-19). Lit frontend/dist ; skip sans playwright-core/Chromium.
// R1 (B1, WCAG 1.4.3) — corps (#EBD9C5) et liens ambre (#D4A55E) ≥ 4,5:1 au PIRE PIXEL sur
//   l'image de fond fixe, à 1440 et 390 px : chaque paragraphe, puce et lien, placé en haut,
//   au milieu et en bas de l'écran (le fond est fixe : c'est la position dans l'écran qui
//   change ce qu'il y a dessous), fond figé aux deux bornes de sa respiration (scale 1,04 / 1,10).
// R2 (m2) — les paragraphes d'une section sont séparés (marge ≥ 0,75em).
// R3 (m4) — à 390 px, le bouton Pause ne recouvre aucun texte de la page au repos (haut de page)
//   et, en lisant, reste dans la bande du burger de navigation au lieu de couper la fin des lignes.
// R4 (m6) — chaque lien qui ouvre un nouvel onglet le dit (visible et pour le lecteur d'écran).
// R5 (m3, m5) — la version d'Astro annoncée est celle de package.json ; pas d'emoji pictogramme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupBrowser, worstPixelContrast } from './lib/e2e-dist.mjs';

const MIN = 4.5;
const WIDTHS = [[1440, 900], [390, 844]];
const SCALES = [1.04, 1.1];
const SPOTS = [0.08, 0.45, 0.8]; // haut de l'élément à 8 %, 45 %, 80 % de la hauteur d'écran

async function open(env, width, height) {
  const context = await env.browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${env.base}/about/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Lucioles des mots ambre (aléatoires) neutralisées : on mesure la couleur de repos.
  await page.addStyleTag({ content: '.amber-word, .amber-word--lit, .amber-word--pulse { color: inherit !important; text-shadow: none !important; animation: none !important; } .evato-motion-toggle { visibility: hidden !important; }' });
  return { context, page };
}

test(`R1 — corps et liens de /about/ ≥ ${MIN}:1 au pire pixel (1440/390 px, 3 positions, 2 états du fond)`, { timeout: 900_000 }, async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const failures = [];
  const worstByKind = {};
  for (const [width, height] of WIDTHS) {
    const { context, page } = await open(env, width, height);
    // Éléments de texte de la colonne, hors encadré final (fond propre) : paragraphes, puces, liens.
    const targets = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.about section:not(.about-cta) p, .about section:not(.about-cta) li, .about section a, .about .lede').forEach((el, i) => {
        el.dataset.l11 = String(i);
        out.push({ id: i, kind: el.tagName === 'A' ? 'lien' : 'corps', label: el.textContent.trim().slice(0, 40) });
      });
      return out;
    });
    assert.ok(targets.filter((x) => x.kind === 'lien').length >= 20, 'liens de la page attendus');
    for (const scale of SCALES) {
      await page.evaluate((s) => {
        let st = document.getElementById('l11-bg');
        if (!st) { st = document.createElement('style'); st.id = 'l11-bg'; document.head.append(st); }
        st.textContent = `.codex-bg { animation: none !important; transform: scale(${s}) !important; }`;
      }, scale);
      for (const { id, kind, label } of targets) {
        const sel = `[data-l11="${id}"]`;
        for (const spot of SPOTS) {
          const ok = await page.evaluate(({ sel, spot }) => {
            const el = document.querySelector(sel);
            const r = el.getBoundingClientRect();
            if (r.height > innerHeight * (1 - spot) - 4) return false; // ne tient pas à cette position
            window.scrollBy(0, r.top - innerHeight * spot);
            const r2 = el.getBoundingClientRect();
            return r2.top >= 0 && r2.bottom <= innerHeight;
          }, { sel, spot });
          if (!ok) continue;
          const { worst, glyphs } = await worstPixelContrast(page, sel);
          if (glyphs < 20) continue; // texte porté par les enfants (puce faite d'un lien seul…)
          worstByKind[`${kind} @${width}`] = Math.min(worstByKind[`${kind} @${width}`] ?? Infinity, worst);
          if (worst < MIN) failures.push(`${kind} « ${label} » @${width}px scale ${scale} pos ${spot} : ${worst.toFixed(2)}:1`);
        }
      }
    }
    await context.close();
  }
  for (const [k, w] of Object.entries(worstByKind)) t.diagnostic(`pire ${k} : ${w.toFixed(2)}:1`);
  assert.deepEqual(failures.slice(0, 25), [], `${failures.length} mesures sous ${MIN}:1`);
});

test('R2 — paragraphes d\'une section séparés', async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  for (const [width, height] of WIDTHS) {
    const { context, page } = await open(env, width, height);
    const gaps = await page.evaluate(() => [...document.querySelectorAll('.about section p + p')].map((p) => {
      const prev = p.previousElementSibling.getBoundingClientRect();
      return { gap: p.getBoundingClientRect().top - prev.bottom, fs: parseFloat(getComputedStyle(p).fontSize) };
    }));
    assert.ok(gaps.length >= 2);
    for (const { gap, fs } of gaps) assert.ok(gap >= 0.75 * fs, `@${width} : ${gap}px entre deux paragraphes`);
    await context.close();
  }
});

test('R3 — à 390 px, le bouton Pause ne recouvre aucun texte au repos et reste dans la bande du burger', async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const context = await env.browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${env.base}/about/`, { waitUntil: 'load' });
  const overlaps = () => page.evaluate(() => {
    const b = document.getElementById('evato-motion-toggle').getBoundingClientRect();
    const hits = [];
    const walker = document.createTreeWalker(document.querySelector('.codex-main'), NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom) hits.push(n.textContent.trim().slice(0, 30));
      }
    }
    return hits;
  });
  assert.equal(await page.locator('#evato-motion-toggle').isVisible(), true);
  assert.deepEqual(await overlaps(), [], 'haut de page, au repos');
  // En lisant, il reste dans la bande du burger (fixe en haut à droite) : il ne masque rien
  // de plus que lui.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  const [btn, burger] = await page.evaluate(() => ['evato-motion-toggle', 'evato-burger']
    .map((id) => document.getElementById(id).getBoundingClientRect().toJSON()));
  assert.ok(btn.top >= burger.top - 1 && btn.bottom <= burger.bottom + 1, `bouton ${btn.top}–${btn.bottom}, burger ${burger.top}–${burger.bottom}`);
  assert.ok(btn.right <= burger.left - 4, 'à gauche du burger, sans le toucher');
  assert.ok(btn.width >= 44 && btn.height >= 44, 'cible ≥ 44 px');
  await context.close();
});

test('R4 — chaque lien vers un nouvel onglet le signale', async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const { context, page } = await open(env, 1440, 900);
  const res = await page.evaluate(() => [...document.querySelectorAll('.about a[target="_blank"]')].map((a) => ({
    text: a.textContent.trim(),
    after: getComputedStyle(a, '::after').content,
  })));
  assert.ok(res.length >= 20);
  for (const { text, after } of res) {
    assert.match(after, /↗/, `« ${text} » : marque visible`);
    assert.match(after, /nouvel onglet/, `« ${text} » : texte pour le lecteur d'écran`);
  }
  // La flèche ne passe jamais seule à la ligne : elle finit sur la même ligne que le dernier
  // mot du lien (390 px, où « Eywa » finissait une ligne et « ↗ » commençait la suivante).
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    const orphans = await page.evaluate(() => [...document.querySelectorAll('.about a[target="_blank"]')].filter((a) => {
      const rects = [...a.getClientRects()].filter((r) => r.width > 0);
      if (rects.length < 2) return false;
      return rects.at(-1).width < 20; // dernière ligne réduite à la flèche
    }).map((a) => a.textContent.trim()));
    assert.deepEqual(orphans, [], `@${w}px : flèche seule sur sa ligne`);
  }
  // L'accessible name du lien porte la mention.
  const snap = await page.locator('.about a[href="https://paleobiodb.org"]').first().evaluate((a) => a.computedName ?? null);
  if (snap !== null) assert.match(snap, /nouvel onglet/);
  await context.close();
});

test('R5 — version d\'Astro réelle, aucun emoji pictogramme dans le texte', async (t) => {
  const env = await setupBrowser(t);
  if (!env) return;
  const major = JSON.parse(readFileSync(new URL('../frontend/package.json', import.meta.url), 'utf8'))
    .dependencies.astro.replace(/^\D*/, '').split('.')[0];
  const { context, page } = await open(env, 1440, 900);
  const text = await page.locator('.about').innerText();
  assert.match(text, new RegExp(`Astro ${major}\\b`));
  assert.doesNotMatch(text, new RegExp(`Astro (?!${major}\\b)\\d`), 'une autre version d\'Astro est annoncée');
  assert.doesNotMatch(text, /\p{Emoji_Presentation}/u); // 🦖 (le © reste permis)
  await context.close();
});
