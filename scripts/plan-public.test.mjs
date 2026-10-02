// L28 — page « Plan de travail » : ce qui est publié du plan (docs/plan/raf.yaml).
// Modèle finance-tracker (frontend/scripts/plan-data.mjs) : un lot n'apparaît que s'il est
// `visible: true` ET a un titre PUBLIC — son champ `public:`, sinon le titre de son entrée
// Nouveautés, sinon il est masqué ; JAMAIS le titre brut du plan. Liste blanche : id, titre
// public, état, date de livraison, décompte des sous-tâches (abandonnées exclues).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { publicPlan, parsePublicPlan, newsTitlesByLot, checkPublicTitle, planSummary, RECENT_DONE } from '../frontend/src/lib/plan-public.ts';

const { parse } = createRequire(new URL('../frontend/package.json', import.meta.url))('yaml');

const SECRET = 'PRIVE-NE-DOIT-PAS-SORTIR';

const plan = {
  version: 1,
  project: 'demo',
  lots: [
    { id: 'L1', title: `${SECRET} brut L1`, public: 'Ancienne amélioration', visible: true, status: 'done', created: '2026-09-01', finished: '2026-09-02', notes: [{ date: '2026-09-02', text: SECRET }] },
    { id: 'L2', title: `${SECRET} brut L2`, public: 'Ce qui est sur l’établi', visible: true, status: 'doing', created: '2026-09-03', started: '2026-09-04', notes: [{ date: '2026-09-04', text: SECRET }],
      tasks: [{ id: 't1', title: `${SECRET} sous-tâche`, status: 'done' }, { id: 't2', title: 'x', status: 'todo' }, { id: 't3', title: 'y', status: 'dropped' }, { id: 't4', title: 'z', status: 'dropped' }] },
    { id: 'L3', title: `${SECRET} brut L3`, visible: true, status: 'todo', created: '2026-09-05' },
    { id: 'L4', title: `${SECRET} brut L4`, public: 'Abandonné', visible: true, status: 'dropped', created: '2026-09-05', reason: SECRET },
    { id: 'L5', title: `${SECRET} brut L5`, visible: true, status: 'done', created: '2026-09-06', finished: '2026-09-20', ux: { date: '2026-09-20', verdict: SECRET } },
    { id: 'L6', title: `${SECRET} brut L6`, public: 'Invisible au visiteur', status: 'done', created: '2026-09-10', finished: '2026-09-21' },
    { id: 'L7', title: `${SECRET} brut L7`, public: 'La suite prévue', visible: true, status: 'todo', created: '2026-09-07' },
    { id: 'L8', title: 'Revue UX — Codex', visible: true, status: 'todo', created: '2026-09-07' },
  ],
};
// L5 a une Nouveauté ; L8 aussi, mais c'est un lot de processus (revue) : public: exigé.
const news = new Map([['L5', 'Une Nouveauté livrée'], ['L8', 'Le codex revu'], ['L3', undefined]]);

test('un lot n’apparaît que visible ET avec un titre public (public:, sinon titre de sa Nouveauté) ; abandonnés absents', () => {
  const p = publicPlan(plan, { newsTitles: news });
  assert.deepEqual(p.doing.map((l) => l.id), ['L2']);
  assert.deepEqual(p.todo.map((l) => l.id), ['L7'], 'L3 sans titre public, L8 revue sans public: → masqués');
  assert.deepEqual(p.done.map((l) => l.id), ['L5', 'L1'], 'L6 non visible → masqué');
  assert.equal(p.done[0].title, 'Une Nouveauté livrée');
  assert.equal(p.todo[0].title, 'La suite prévue');
});

test('liste blanche : id, titre PUBLIC, état, date de livraison, sous-tâches faites/total (abandonnées exclues des deux nombres)', () => {
  const p = publicPlan(plan, { newsTitles: news });
  assert.deepEqual(p.doing[0], { id: 'L2', title: 'Ce qui est sur l’établi', status: 'doing', tasks: { done: 1, total: 2 } });
  assert.deepEqual(p.done[1], { id: 'L1', title: 'Ancienne amélioration', status: 'done', finished: '2026-09-02' });
  assert.ok(!JSON.stringify(p).includes(SECRET), 'titre brut, note, verdict, raison ou sous-tâche publié');
});

test('public: prime sur le titre de la Nouveauté ; une revue avec public: est publiée', () => {
  const p = publicPlan({ lots: [
    { id: 'L1', title: 'brut', public: 'Titre choisi', visible: true, status: 'todo' },
    { id: 'L2', title: 'Revue UX — Films', public: 'Les pages Films revues', visible: true, status: 'todo' },
  ] }, { newsTitles: new Map([['L1', 'Titre de la Nouveauté']]) });
  assert.deepEqual(p.todo.map((l) => l.title), ['Titre choisi', 'Les pages Films revues']);
});

test('titre public non conforme (trop long, chemin, fichier, technique, identifiant de lot, sécurité) : le build échoue', () => {
  assert.equal(checkPublicTitle('  Un titre clair  ', 'L1'), 'Un titre clair');
  for (const bad of ['', 'x'.repeat(81), 'Page /nouveautes/', 'Lu depuis raf.yaml', 'Mémoire localStorage', 'Suite de L27', 'Faille XSS corrigée']) {
    assert.throws(() => checkPublicTitle(bad, 'L1'), /non conforme/, bad);
  }
  assert.throws(() => publicPlan({ lots: [{ id: 'L1', title: 'b', public: 'voir L2', visible: true, status: 'todo' }] }), /non conforme/);
});

test(`récemment livré : les ${RECENT_DONE} derniers lots terminés publiés, avec leur total`, () => {
  const many = { lots: Array.from({ length: RECENT_DONE + 4 }, (_, i) => ({ id: `L${i + 1}`, title: 'b', public: `Titre ${i + 1}`, visible: true, status: 'done', finished: `2026-09-${String(i + 1).padStart(2, '0')}` })) };
  const p = publicPlan(many);
  assert.equal(p.done.length, RECENT_DONE);
  assert.equal(p.done[0].id, `L${RECENT_DONE + 4}`);
  assert.deepEqual(p.counts, { doing: 0, todo: 0, done: RECENT_DONE + 4 });
});

test('plan vide, illisible ou lot incomplet : pas d’exception', () => {
  for (const bad of [null, undefined, {}, { lots: 'x' }, { lots: [null, 3, { id: 'L1' }, { id: 'L2', public: 'Titre', visible: true }] }]) {
    const p = publicPlan(bad);
    assert.deepEqual([p.doing, p.todo, p.done], [[], [], []], JSON.stringify(bad));
  }
});

test('newsTitlesByLot : titre de l’entrée la plus récente (première du JSON) citant le lot', () => {
  const m = newsTitlesByLot([
    { title: 'Récente', lots: ['L2', 'L3'] },
    { title: 'Ancienne', lots: ['L2'] },
    { title: 'Sans lots' },
  ]);
  assert.deepEqual([...m], [['L2', 'Récente'], ['L3', 'Récente']]);
});

test('le vrai raf.yaml : aucun titre brut (sauf s’il est aussi le titre public), aucune note ni sous-tâche publiée', () => {
  const text = readFileSync(new URL('../docs/plan/raf.yaml', import.meta.url), 'utf8');
  const entries = JSON.parse(readFileSync(new URL('../frontend/public/nouveautes-data/nouveautes.json', import.meta.url), 'utf8')).entries;
  const p = parsePublicPlan(text, entries);
  const shown = [...p.doing, ...p.todo, ...p.done];
  assert.ok(shown.length > 0);
  const raf = parse(text);
  const titles = new Set(shown.map((l) => l.title));
  const out = JSON.stringify(p);
  for (const l of raf.lots) {
    if (!titles.has(l.title)) assert.ok(!out.includes(l.title), `${l.id} : titre brut publié`);
    for (const n of l.notes ?? []) assert.ok(!out.includes(n.text), `${l.id} : note publiée`);
    for (const t of l.tasks ?? []) if (!titles.has(t.title)) assert.ok(!out.includes(t.title), `${l.id}/${t.id} publié`);
  }
  for (const l of shown) assert.equal(raf.lots.find((x) => x.id === l.id).visible, true, `${l.id} non visible publié`);
});

test('bandeau de décomptes : accordé, espaces insécables, sans les groupes vides (« 0 prévu » n’est pas affiché)', () => {
  assert.deepEqual(planSummary({ doing: 2, todo: 0, done: 9 }), ['2\u00a0travaux en cours', '9\u00a0livrés']);
  assert.deepEqual(planSummary({ doing: 1, todo: 1, done: 1 }), ['1\u00a0travail en cours', '1\u00a0prévu', '1\u00a0livré']);
  assert.deepEqual(planSummary({ doing: 0, todo: 6, done: 0 }), ['6\u00a0prévus']);
  assert.deepEqual(planSummary({ doing: 0, todo: 0, done: 0 }), []);
});

test('lots au même titre public (une Nouveauté pour deux lots) : une seule ligne par groupe, date la plus récente, étapes additionnées', () => {
  const p = publicPlan({ lots: [
    { id: 'L19', title: 'b', visible: true, status: 'done', finished: '2026-10-01', tasks: [{ id: 't1', status: 'done' }] },
    { id: 'L20', title: 'b', visible: true, status: 'done', finished: '2026-10-03', tasks: [{ id: 't1', status: 'todo' }, { id: 't2', status: 'done' }] },
    { id: 'L21', title: 'b', visible: true, status: 'done', finished: '2026-10-02' },
    { id: 'L22', title: 'b', visible: true, status: 'todo' },
    { id: 'L23', title: 'b', visible: true, status: 'todo' },
  ] }, { newsTitles: new Map([['L19', 'Le codex se lit mieux'], ['L20', 'Le codex se lit mieux'], ['L21', 'Autre'], ['L22', 'Même suite'], ['L23', 'Même suite']]) });
  assert.deepEqual(p.done, [
    { id: 'L20', title: 'Le codex se lit mieux', status: 'done', finished: '2026-10-03', tasks: { done: 2, total: 3 }, also: ['L19'] },
    { id: 'L21', title: 'Autre', status: 'done', finished: '2026-10-02' },
  ]);
  assert.deepEqual(p.todo, [{ id: 'L22', title: 'Même suite', status: 'todo', also: ['L23'] }]);
  assert.deepEqual(p.counts, { doing: 0, todo: 1, done: 2 });
  // Même titre mais états différents : deux lignes (une en cours, une livrée).
  const q = publicPlan({ lots: [
    { id: 'A1', title: 'b', public: 'Même titre', visible: true, status: 'done', finished: '2026-10-01' },
    { id: 'A2', title: 'b', public: 'Même titre', visible: true, status: 'doing' },
  ] });
  assert.equal(q.done.length + q.doing.length, 2);
});
