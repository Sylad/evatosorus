#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));

const speciesId = args.get('species');
if (!speciesId) {
  console.error('Usage: node scripts/propose-species-ollama.mjs --species=<species-id>');
  process.exit(1);
}

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
const seedPath = path.resolve(root, 'frontend', 'src', 'data', 'species.seed.ts');
const seedText = await readFile(seedPath, 'utf8');
const marker = `id: '${speciesId}'`;
const start = seedText.indexOf(marker);
if (start === -1) {
  console.error(`Unknown species id: ${speciesId}`);
  process.exit(1);
}

const snippetStart = Math.max(0, seedText.lastIndexOf('  {', start));
const snippetEnd = seedText.indexOf('\n  },', start);
const speciesSnippet = seedText.slice(snippetStart, snippetEnd + 5);
const outputPath = path.resolve(root, '..', 'tmp', `evatosorus-species-${speciesId}.json`);

const prompt = `Tu aides a curer une fiche paleontologique pour Evatosorus.
Ne remplace jamais la fiche source. Propose seulement des enrichissements a relire.
Ton: documentaire BBC serieux mais accessible, en francais.
Retourne uniquement un JSON valide:
{
  "speciesId": "string",
  "blurbProposal": "2 a 3 phrases",
  "factChecks": ["points a verifier"],
  "sourceSearchHints": ["requete source primaire ou Wikimedia a verifier"]
}

Fiche actuelle:
${speciesSnippet}`;

const response = await fetch(`${ollamaBaseUrl.replace(/\/$/, '')}/api/generate`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model: ollamaModel, stream: false, format: 'json', prompt }),
});

if (!response.ok) {
  throw new Error(`Ollama HTTP ${response.status}`);
}

const payload = await response.json();
const proposal = JSON.parse(payload.response ?? '{}');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), proposal }, null, 2));
console.log(outputPath);
