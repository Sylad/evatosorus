// L28 — page « Plan de travail » : ce qui est publié du plan (docs/plan/raf.yaml).
// Liste BLANCHE : identifiant, titre, état et décompte des sous-tâches, rien d'autre —
// jamais les notes, verdicts UX, raisons d'abandon ni titres de sous-tâches.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicPlan, parsePublicPlan, RECENT_DONE } from '../frontend/src/lib/plan-public.ts';

const SECRET = 'SECRET-NOTE-NE-DOIT-PAS-SORTIR';

const plan = {
  version: 1,
  project: 'demo',
  lots: [
    { id: 'L1', title: 'Fini il y a longtemps', status: 'done', created: '2026-09-01', finished: '2026-09-02', notes: [{ date: '2026-09-02', text: SECRET }] },
    { id: 'L2', title: 'En cours A', status: 'doing', created: '2026-09-03', started: '2026-09-04', notes: [{ date: '2026-09-04', text: SECRET }],
      tasks: [{ id: 't1', title: `${SECRET} titre de sous-tâche`, status: 'done' }, { id: 't2', title: 'x', status: 'todo' }, { id: 't3', title: 'y', status: 'dropped' }] },
    { id: 'L3', title: 'Prévu B', status: 'todo', created: '2026-09-05', estimate: 0.5, quickwin: true },
    { id: 'L4', title: 'Abandonné', status: 'dropped', created: '2026-09-05', reason: SECRET },
    { id: 'L5', title: 'Fini récemment', status: 'done', created: '2026-09-06', finished: '2026-09-20', ux: { date: '2026-09-20', verdict: SECRET } },
    { id: 'L6', title: 'Fini sans date de fin', status: 'done', created: '2026-09-10', started: '2026-09-12' },
    { id: 'L7', title: 'Prévu C', status: 'todo', created: '2026-09-07' },
  ],
};

test('trois groupes : en cours, prévu (ordre du plan), récemment livré (plus récent en haut) ; abandonnés absents', () => {
  const p = publicPlan(plan);
  assert.deepEqual(p.doing.map((l) => l.id), ['L2']);
  assert.deepEqual(p.todo.map((l) => l.id), ['L3', 'L7']);
  // Date de fin, sinon de début, sinon de création.
  assert.deepEqual(p.done.map((l) => l.id), ['L5', 'L6', 'L1']);
  assert.ok(![...p.doing, ...p.todo, ...p.done].some((l) => l.id === 'L4'));
});

test('liste blanche : id, titre, état, date de livraison et décompte des sous-tâches (abandonnées exclues) — rien d’autre', () => {
  const p = publicPlan(plan);
  assert.deepEqual(p.doing[0], { id: 'L2', title: 'En cours A', status: 'doing', tasks: { done: 1, total: 2 } });
  assert.deepEqual(p.todo[0], { id: 'L3', title: 'Prévu B', status: 'todo' });
  assert.deepEqual(p.done[0], { id: 'L5', title: 'Fini récemment', status: 'done', finished: '2026-09-20' });
  assert.ok(!JSON.stringify(p).includes(SECRET), 'une note, un verdict, une raison ou un titre de sous-tâche est sorti');
});

test(`récemment livré : les ${RECENT_DONE} derniers lots terminés, avec le total des lots livrés`, () => {
  const many = { lots: Array.from({ length: RECENT_DONE + 4 }, (_, i) => ({ id: `L${i + 1}`, title: `T${i + 1}`, status: 'done', finished: `2026-09-${String(i + 1).padStart(2, '0')}` })) };
  const p = publicPlan(many);
  assert.equal(p.done.length, RECENT_DONE);
  assert.equal(p.done[0].id, `L${RECENT_DONE + 4}`);
  assert.deepEqual(p.counts, { doing: 0, todo: 0, done: RECENT_DONE + 4 });
});

test('plan vide, illisible ou lot incomplet : pas d’exception, lots sans titre ignorés', () => {
  for (const bad of [null, undefined, {}, { lots: 'x' }, { lots: [null, 3, { id: 'L1' }, { id: 'L2', title: '', status: 'todo' }] }]) {
    const p = publicPlan(bad);
    assert.deepEqual([p.doing, p.todo, p.done], [[], [], []], JSON.stringify(bad));
  }
  assert.deepEqual(publicPlan({ lots: [{ id: 'L9', title: 'Sans état', status: 'bizarre' }] }).todo, []);
});

test('parsePublicPlan lit le YAML (dates laissées en texte) ; le vrai raf.yaml en sort sans aucune note', () => {
  const text = readFileSync(new URL('../docs/plan/raf.yaml', import.meta.url), 'utf8');
  const p = parsePublicPlan(text);
  assert.ok(p.doing.length + p.todo.length + p.done.length > 0);
  for (const l of p.done) assert.match(l.finished ?? '', /^(\d{4}-\d{2}-\d{2})?$/);
  const out = JSON.stringify(p);
  const notes = [...text.matchAll(/text: "((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  assert.ok(notes.length > 0, 'aucune note trouvée dans raf.yaml : le test ne prouverait rien');
  for (const n of notes) assert.ok(!out.includes(n.slice(0, 40)), `note publiée : ${n.slice(0, 60)}`);
});
