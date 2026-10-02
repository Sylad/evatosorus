// Outil (pas un test) : mesure dans Chromium la chasse de chaque caractère de Cinzel 400
// (em, sans approche) et l'écrit dans frontend/src/lib/cinzel-advances.json, lu au build
// par frontend/src/lib/title-fit.mjs pour dimensionner les titres sur leur plus long mot.
// À relancer si la police change : node scripts/measure-cinzel-advances.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const font = (f) => readFileSync(new URL(`../frontend/public/fonts/${f}`, import.meta.url)).toString('base64');
const CHARS = [];
for (let c = 0x20; c <= 0x7e; c++) CHARS.push(String.fromCharCode(c));
for (let c = 0xa0; c <= 0xff; c++) CHARS.push(String.fromCharCode(c));
CHARS.push('’', '‘', '“', '”', '«', '»', '–', '—', '…', 'œ', 'Œ', '→', ' ');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<style>
@font-face { font-family: C; src: url(data:font/woff2;base64,${font('cinzel-latin-wght-normal.woff2')}) format('woff2'); unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2191-2193; }
@font-face { font-family: C; src: url(data:font/woff2;base64,${font('cinzel-latin-ext-wght-normal.woff2')}) format('woff2'); unicode-range: U+0100-02BA,U+1E00-1E9F; }
</style><span style="font-family:C">x</span>`);
const table = await page.evaluate(async (chars) => {
  await document.fonts.load('400 100px C', chars.join(''));
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = '400 100px C';
  return Object.fromEntries(chars.map((c) => [c, Math.round(ctx.measureText(c).width * 10) / 1000]));
}, CHARS);
await browser.close();
writeFileSync(new URL('../frontend/src/lib/cinzel-advances.json', import.meta.url), JSON.stringify(table) + '\n');
console.log(`${Object.keys(table).length} caractères`);
