#!/usr/bin/env node
/**
 * gate-fusion.mjs — measures the RENDERED fusion artboards, not their description.
 *
 * The test this encodes: would this gate still pass if the generator emitted the
 * same file three times? It must not. Every check reads the emitted HTML.
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const parent = path.join(here, '..');
const FILES = ['Main.dc.html', 'LitMile.dc.html', 'NightHarbor.dc.html'];

const V = JSON.parse(fs.readFileSync(path.join(parent, 'copy-pack.json'), 'utf8')).verbatim;
const B1 = fs.readFileSync(path.join(here, '_src_B1.html'), 'utf8');
const HEADER = B1.slice(B1.indexOf('<header'), B1.indexOf('</header>') + 9);

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? 'ok  ' : 'FAIL'}   ${m}`); if (!c) fail++; };
const src = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(here, f), 'utf8')]));

console.log('\n── SEAN\'S FOUR INSTRUCTIONS ──');
for (const f of FILES) {
  const t = src[f];
  ok(t.includes(HEADER), `${f.padEnd(20)} header BYTE-IDENTICAL to approved B1 (${HEADER.length}B)`);
  ok(/swans-hero-frame\.jpg/.test(t), `${f.padEnd(20)} hero is a real Swans.mp4 frame`);
  ok(/SWAPPABLE SLOT/.test(t), `${f.padEnd(20)} hero badged swappable`);
  const movies = (t.match(/MOVIE AREA \d/g) || []).length;
  ok(movies >= 2, `${f.padEnd(20)} movie areas for MiniMax H3: ${movies} (need >=2)`);
  const stages = (t.match(/perspective:1000px/g) || []).length;
  const layers = (t.match(/translateZ\(/g) || []).length;
  ok(stages >= 3 && layers >= 12, `${f.padEnd(20)} parallax: ${stages} stages / ${layers} depth layers (need >=3 / >=12)`);
}

console.log('\n── HARVEST (asset-harvest.md) ──');
const artDir = path.join(parent, 'art');
for (const f of FILES) {
  const t = src[f];
  ok(/swan-logo\.png/.test(t), `${f.padEnd(20)} carries the real crystalline mark`);
  const plates = [...new Set((t.match(/[a-z-]+-bg\.jpg/g) || []))];
  const missing = plates.filter((p) => !fs.existsSync(path.join(artDir, p)));
  ok(plates.length >= 2 && missing.length === 0,
    `${f.padEnd(20)} real harvested plates: ${plates.length}${missing.length ? ` MISSING ${missing}` : ''}`);
}

console.log('\n── COPY IS MATERIAL ──');
const need = ['headline', 'sub', 'cta_primary', 'cta_secondary', 'mission_1', 'mission_closing', 'cta_title', 'cta_body'];
for (const f of FILES) {
  const t = src[f];
  const miss = need.filter((k) => !t.includes(V[k].replace(/&/g, '&amp;')) && !t.includes(V[k]));
  ok(miss.length === 0, `${f.padEnd(20)} verbatim copy present${miss.length ? ` — MISSING ${miss}` : ` (${need.length}/${need.length})`}`);
}

console.log('\n── DISTINCTNESS (would 3 identical files pass?) ──');
const sig = (t) => ({
  bytes: t.length,
  sections: (t.match(/<section/g) || []).length,
  layers: (t.match(/translateZ\(/g) || []).length,
  rail: /SECTION RAIL/.test(t) ? 1 : 0,
  windowWall: /WINDOW WALL/.test(t) ? 1 : 0,
  transform: /THE WATER HARDENS/.test(t) ? 1 : 0,
  h1: (t.match(/font-size:(\d+)px;line-height:1\.0/) || [0, 0])[1],
  centered: /text-align:center/.test(t) ? 1 : 0,
});
const sigs = FILES.map((f) => [f, sig(src[f])]);
for (const [f, s] of sigs) console.log(`  ${f.padEnd(20)} ${JSON.stringify(s)}`);
let worst = 99;
for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) {
  const [fa, a] = sigs[i], [fb, b] = sigs[j];
  const diff = Object.keys(a).filter((k) => a[k] !== b[k]).length;
  worst = Math.min(worst, diff);
  ok(diff >= 3, `${fa.replace('.dc.html', '')} vs ${fb.replace('.dc.html', '')}: differs on ${diff} axes (need >=3)`);
}
ok(new Set(FILES.map((f) => src[f])).size === 3, 'all three files are distinct documents');

console.log('\n── FORMAT ──');
for (const f of FILES) {
  const t = src[f];
  ok(/support\.js/.test(t) && /<x-dc>/.test(t) && /DCLogic/.test(t), `${f.padEnd(20)} valid .dc.html envelope`);
  ok(!/\{\{(?!accent)/.test(t), `${f.padEnd(20)} no stray template holes`);
  ok(/prefers-reduced-motion/.test(t), `${f.padEnd(20)} reduced-motion fallback`);
}

console.log(`\n${fail === 0 ? 'GATE PASSED' : `GATE FAILED — ${fail} defect(s)`}  (weakest pair: ${worst} axes)\n`);
process.exit(fail === 0 ? 0 : 1);
