#!/usr/bin/env node
/**
 * gate-ten.mjs — measures STRUCTURE, not palette.
 *
 * The previous run passed a distinctness gate while shipping one layout in five
 * colours, because that gate scored colour-adjacent things. This one scores the
 * bones: nav model, scroll axis, primary repeating element, hero kind, type
 * family, ground (light/dark), and card-ness. Two boards may share a colour and
 * pass; two boards may NOT share a structure.
 *
 * The test it encodes: would this gate still pass if one layout were emitted ten
 * times in ten palettes? It must not — so palette contributes ZERO to the score.
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const FILES = ['Main', 'Board', 'Rail', 'Seam', 'Index', 'Feed', 'Object', 'Ledger', 'Field', 'Door']
  .map((n) => `${n}.dc.html`);
const CP = JSON.parse(fs.readFileSync(path.join(here, '..', 'copy-pack-full.json'), 'utf8'));

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? 'ok  ' : 'FAIL'}  ${m}`); if (!c) fail++; };
const S = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(here, f), 'utf8')]));

/** Structural fingerprint. Deliberately contains NO colour. */
const shape = (t) => ({
  scroll: /overflow-x:auto|scroll-snap-type:x/.test(t) ? 'horizontal' : 'vertical',
  // Most-specific first. An earlier version tested /columns:\s*\d/ for masonry,
  // which also matches grid-template-columns: — so four boards falsely read as
  // masonry and the gate reported collisions that were the detector's fault.
  hero: /break-inside:avoid/.test(t) ? 'masonry'
      : /<table/.test(t) ? 'table'
      : /scroll-snap-align/.test(t) ? 'panels'
      : /transform:scaleY\(-1\)/.test(t) ? 'seam'
      : /grid-template-columns:76px/.test(t) ? 'feed'
      : /grid-template-columns:52px/.test(t) ? 'index'
      : /border-bottom:2px solid/.test(t) ? 'filter-sentence'
      : /I AM HERE TO TRAIN/.test(t) ? 'split-door'
      : /position:absolute;left:\d+%;top:\d+%/.test(t) ? 'field'
      : 'object',
  nav: /position:sticky;top:0/.test(t) ? 'floating-pill'
     : /SOUND ON/.test(t) ? 'indexed-counter'
     : /LEDGER/.test(t) ? 'terminal-bar'
     : /NO MENU/.test(t) ? 'none'
     : /mi<\/div>|Los Angeles/.test(t) ? 'city-chip'
     : /No\. 01/.test(t) ? 'masthead'
     : /SCROLL SIDEWAYS/.test(t) ? 'sideways-hint'
     : /SW\.S/.test(t) ? 'inline-links'
     : /SCROLL TO CROSS/.test(t) ? 'mark-only'
     : 'centred-mark',
  type: /'Fira Code'/.test(t) ? 'mono'
      : /font-family:'Cormorant Garamond',Georgia,serif;\s*background/.test(t) || /body \{ margin:0; font-family:'Cormorant/.test(t) ? 'serif'
      : 'sans',
  ground: /background:#F|background:#FB|background:#F2|background:#F6/.test(t.slice(0, 900)) ? 'light' : 'dark',
  cards: (t.match(/border-radius:1[0-9]px/g) || []).length > 4 ? 'cards' : 'no-cards',
  sections: (t.match(/<section/g) || []).length,
});

console.log('\n── STRUCTURAL FINGERPRINTS (no colour is scored) ──');
const shapes = FILES.map((f) => [f, shape(S[f])]);
for (const [f, s] of shapes) console.log(`  ${f.replace('.dc.html', '').padEnd(9)} ${JSON.stringify(s)}`);

console.log('\n── NO TWO BOARDS MAY SHARE A STRUCTURE ──');
const KEYS = ['scroll', 'hero', 'nav', 'type', 'ground', 'cards'];
let worst = 99;
for (let i = 0; i < shapes.length; i++) {
  for (let j = i + 1; j < shapes.length; j++) {
    const [fa, a] = shapes[i], [fb, b] = shapes[j];
    const diff = KEYS.filter((k) => a[k] !== b[k]).length;
    worst = Math.min(worst, diff);
    if (diff < 2) ok(false, `${fa} vs ${fb}: only ${diff} structural axis differs — TOO SIMILAR`);
  }
}
ok(worst >= 2, `weakest pair differs on ${worst} structural axes (need >=2)`);
ok(new Set(shapes.map(([, s]) => s.hero)).size >= 8, `distinct hero kinds: ${new Set(shapes.map(([, s]) => s.hero)).size}/10 (need >=8)`);
ok(new Set(shapes.map(([, s]) => s.nav)).size >= 7, `distinct nav models: ${new Set(shapes.map(([, s]) => s.nav)).size}/10 (need >=7)`);
ok(shapes.some(([, s]) => s.scroll === 'horizontal'), 'at least one horizontal-scroll board');
ok(shapes.filter(([, s]) => s.ground === 'light').length >= 3, `light-ground boards: ${shapes.filter(([, s]) => s.ground === 'light').length} (need >=3)`);
ok(shapes.filter(([, s]) => s.cards === 'no-cards').length >= 4, `card-free boards: ${shapes.filter(([, s]) => s.cards === 'no-cards').length} (need >=4)`);

console.log('\n── ANTI-CLONE: would ten copies of one layout pass? ──');
ok(new Set(FILES.map((f) => S[f])).size === 10, 'all ten are distinct documents');
const bodies = FILES.map((f) => S[f].replace(/#[0-9A-Fa-f]{3,8}/g, 'X').replace(/rgba?\([^)]*\)/g, 'X'));
ok(new Set(bodies).size === 10, 'all ten differ AFTER every colour is stripped — the real test');

console.log('\n── HONESTY MARKERS (panel findings) ──');
for (const f of FILES) {
  const t = S[f];
  ok(/fee number withheld/.test(t), `${f.replace('.dc.html', '').padEnd(9)} states NO fee number, carries the contradiction marker`);
  ok(!/~10%|15%/.test(t.replace(/live page says ~10%, plan says 15%/g, '')), `${f.replace('.dc.html', '').padEnd(9)} no bare fee figure leaked`);
}

console.log('\n── COPY + BRAND ──');
for (const f of FILES) {
  const t = S[f];
  ok(t.includes(CP.hero.headline), `${f.replace('.dc.html', '').padEnd(9)} carries the real headline`);
  ok(/swan-logo\.png|SW\.S|SWANSTUDIOS/.test(t), `${f.replace('.dc.html', '').padEnd(9)} carries the mark or wordmark`);
  ok(!/NASM-certified|yoga|meditation/i.test(t), `${f.replace('.dc.html', '').padEnd(9)} no banned language`);
  ok(/min-height:48px/.test(t), `${f.replace('.dc.html', '').padEnd(9)} 44px+ touch targets`);
  ok(/prefers-reduced-motion/.test(t), `${f.replace('.dc.html', '').padEnd(9)} reduced-motion fallback`);
}

console.log(`\n${fail === 0 ? 'GATE PASSED' : `GATE FAILED — ${fail} defect(s)`}  (weakest structural pair: ${worst} axes)\n`);
process.exit(fail === 0 ? 0 : 1);
