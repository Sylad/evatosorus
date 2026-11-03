// L49 — Page 404 : une adresse inconnue ne sert plus l'accueil avec un statut 200.
// Cloudflare Pages sert dist/404.html avec le statut 404 quand il existe (sinon il retombe sur l'accueil).
// R1 — le build produit dist/404.html.
// R2 — la page dit « 404 » (titre de l'onglet et h1) et n'est pas une copie de l'accueil.
// R3 — elle propose le retour à l'accueil et au codex.
// R4 — elle porte la navigation du site (CodexLayout) : une seule rubrique active, aucune.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { DIST } from './lib/e2e-dist.mjs';

const lit = (f) => readFileSync(`${DIST}${f}`, 'utf8');

test('R1 — le build produit dist/404.html', () => {
  assert.ok(existsSync(`${DIST}404.html`), 'dist/404.html absent : Cloudflare Pages servirait l\'accueil en 200');
});

test('R2 — la page annonce 404 et n\'est pas l\'accueil', () => {
  const html = lit('404.html');
  assert.match(html, /<title>[^<]*404[^<]*<\/title>/, 'titre sans 404');
  assert.match(html, /<h1[^>]*>[^<]*404[^<]*<\/h1>/, 'h1 sans 404');
  assert.notEqual(html, lit('index.html'), '404.html est une copie de l\'accueil');
});

test('R3 — la page propose le retour à l\'accueil et au codex', () => {
  const main = lit('404.html').match(/<article class="notfound"[\s\S]*?<\/article>/)?.[0] ?? '';
  assert.ok(main, 'article .notfound absent');
  assert.match(main, /<a[^>]+href="\/"/, 'lien vers l\'accueil absent');
  assert.match(main, /<a[^>]+href="\/codex\/"/, 'lien vers le codex absent');
});

test('R4 — la navigation du site est présente, sans rubrique active', () => {
  const html = lit('404.html');
  assert.match(html, /href="\/codex\/"/);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 0, 'une rubrique est marquée active sur une page inconnue');
});
