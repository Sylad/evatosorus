// Porte rouge du 2026-11-18 (L10) : sous WSLg, Chromium headless se connecte au compositeur
// Wayland de WSLg (XDG_RUNTIME_DIR/wayland-0) dès qu'une page porte une <video> ; la
// connexion reste bloquée et `page.goto` expire (≈ 7 lancements sur 10 sur /carte/,
// /about/, /vitrines/…). Mesuré : sans wayland-0 dans XDG_RUNTIME_DIR, ou avec un
// WAYLAND_DISPLAY qui ne désigne rien, 30 chargements sur 30. Les tests lancent donc
// Chromium sans affichage, tous par le même environnement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { headlessEnv } from './lib/e2e-dist.mjs';

test('headlessEnv : ni Wayland ni X11, le reste de l’environnement gardé', () => {
  const env = headlessEnv({ WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0', PATH: '/usr/bin', XDG_RUNTIME_DIR: '/run/user/1000' });
  assert.equal(env.DISPLAY, undefined);
  assert.notEqual(env.WAYLAND_DISPLAY, 'wayland-0');
  // Absent ne suffit pas : Chromium retombe alors sur « wayland-0 » par défaut.
  assert.ok(env.WAYLAND_DISPLAY, 'WAYLAND_DISPLAY doit désigner un socket inexistant');
  assert.equal(env.PATH, '/usr/bin');
  assert.equal(env.XDG_RUNTIME_DIR, '/run/user/1000');
});

test('chaque lancement de Chromium des tests passe headlessEnv()', () => {
  const dir = new URL('./', import.meta.url);
  const files = ['lib/e2e-dist.mjs', ...readdirSync(dir).filter((f) => f.endsWith('.test.mjs'))];
  let launches = 0;
  for (const f of files) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/chromium\.launch\(([^;]*)\);/g)) {
      launches++;
      assert.match(m[1], /env: headlessEnv\(\)/, `${f} : chromium.launch sans env: headlessEnv()`);
    }
  }
  assert.ok(launches >= 3, `${launches} lancements trouvés`);
});
