#!/usr/bin/env node
/**
 * gate-8run.mjs — structural divergence gate on the RENDERED artboards.
 *
 * WHY THIS EXISTS: v1's fingerprint gate read `skeletons-8run.json` and reported
 * "8 distinct grids, 0 collisions" while the generator emitted ONE template eight
 * times. The gate measured the description; Sean looked at the artifact and saw
 * eight copies of the same page. A gate that never opens the output is not a gate.
 *
 * Exit 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pack = JSON.parse(fs.readFileSync(path.join(here, 'copy-pack.json'), 'utf8'));
// Sean's kill pass 2026-08-19: six directions killed, B1 + D2 survive.
// Sean picked D2 outright 2026-08-20 ("I like d two"); it lives in Main.dc.html now and
// VegasMile.dc.html was removed. ButtonLab.dc.html is checked separately below.
const FILES = ['Main.dc.html'];
const LAB = 'ButtonLab.dc.html';
// Instruction gates added at the kill pass (each was an explicit Sean requirement):
const REQUIRE = {
  header: 'REPLICATED FROM components/Header',   // 1. keep his header, adapt to it
  heroVideo: 'swans-hero-frame.jpg',             // 4. hero is the swans video he already has
  movieAreas: 2,                                 // 3. at least two H3 movie areas between sections
  minStages: 4,                                  // 2. more parallax than just the hero
};

const read = (f) => fs.readFileSync(path.join(here, f), 'utf8');
const count = (s, re) => (s.match(re) || []).length;
const uniq = (s, re) => [...new Set((s.match(re) || []))].sort().join('|');

/** Structural axes measured on the OUTPUT, not on any description of it. */
function profile(src) {
  return {
    gridTemplates: uniq(src, /grid-template-columns:\s*[^;"]+/g),
    depthLayers: count(src, /translateZ\(/g),
    stages: count(src, /perspective:\s*\d/g),
    stickies: count(src, /position:\s*sticky/g),
    navs: count(src, /<nav\b/g),
    asides: count(src, /<aside\b/g),
    sections: count(src, /<section\b/g),
    svgs: count(src, /<svg\b/g),
    h1size: (src.match(/<h1[^>]*font-size:\s*(\d+)px/) || [])[1] || '?',
    // tag sequence shape — the strongest single signal that two pages are the same page
    shape: (src.match(/<(section|nav|aside|main|header|footer|div|h1|h2)\b/g) || []).join(',').slice(0, 900),
    bytes: src.length,
  };
}

const profiles = FILES.map((f) => ({ f, p: profile(read(f)) }));
let fail = 0;

console.log('── STRUCTURAL PROFILE (measured on rendered HTML) ──');
console.log('file                          grids depth stage stick nav aside sect svg  h1  bytes');
for (const { f, p } of profiles) {
  const g = p.gridTemplates ? p.gridTemplates.split('|').length : 0;
  console.log(`${f.padEnd(29)} ${String(g).padStart(4)} ${String(p.depthLayers).padStart(5)} ${String(p.stages).padStart(5)} ${String(p.stickies).padStart(5)} ${String(p.navs).padStart(3)} ${String(p.asides).padStart(5)} ${String(p.sections).padStart(4)} ${String(p.svgs).padStart(3)} ${String(p.h1size).padStart(3)} ${String(p.bytes).padStart(6)}`);
}

// 1 — every PAIR must differ on >= 3 structural axes, and never share the tag shape.
const AXES = ['gridTemplates', 'depthLayers', 'stickies', 'navs', 'asides', 'sections', 'svgs', 'h1size', 'shape'];
console.log('\n── PAIRWISE DIVERGENCE (28 pairs, need >=3 differing axes + distinct shape) ──');
if (profiles.length < 2) console.log('  n/a - a single winner remains (D2). Divergence was the SELECTION gate; the selection is made.');
let worst = 99, worstPair = '';
for (let i = 0; i < profiles.length; i++) {
  for (let j = i + 1; j < profiles.length; j++) {
    const a = profiles[i], b = profiles[j];
    const diff = AXES.filter((k) => a.p[k] !== b.p[k]);
    if (diff.length < worst) { worst = diff.length; worstPair = `${a.f} vs ${b.f}`; }
    if (diff.length < 3) { console.log(`  FAIL only ${diff.length} axes differ: ${a.f} vs ${b.f}`); fail++; }
    if (a.p.shape === b.p.shape) { console.log(`  FAIL identical tag shape: ${a.f} vs ${b.f}`); fail++; }
  }
}
console.log(`  weakest pair: ${worstPair} (${worst} axes differ)`);

// 2 — REAL parallax must exist in every board (this is what v1 claimed and never had).
console.log('\n── PARALLAX (v1 claimed it and shipped zero layers) ──');
for (const { f, p } of profiles) {
  const ok = p.stages >= 1 && p.depthLayers >= 4;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${f.padEnd(29)} stages=${p.stages} layers=${p.depthLayers}`);
  if (!ok) fail++;
}

// 3 — copy is material: every verbatim string present in EVERY board, byte-identical.
console.log('\n── COPY IS MATERIAL (verbatim + creative) ──');
const need = { ...pack.verbatim, ...pack.creative };
const enc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SKIP = new Set(['programs_title', 'golf_title']); // moved off-page by D10
for (const f of FILES) {
  const src = read(f).replace(/\s+/g, ' ');
  const missing = Object.entries(need).filter(([k, v]) => !SKIP.has(k) && !src.includes(enc(v).replace(/\s+/g, ' ')));
  if (missing.length) { console.log(`  FAIL ${f}: missing ${missing.map(([k]) => k).join(', ')}`); fail++; }
  else console.log(`  ok   ${f.padEnd(29)} all ${Object.keys(need).length - SKIP.size} strings verbatim`);
}

// 4 — the creative disciplines must be visible, not just fitness.
console.log('\n── CREATIVE DISCIPLINES PRESENT ──');
for (const f of FILES) {
  const src = read(f);
  const hits = ['Dance', 'Art &amp; Visual Expression', 'Vocal &amp; Sound Work', 'Photography', 'Graphic Design'].filter((t) => src.includes(t));
  const ok = hits.length >= 4;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${f.padEnd(29)} ${hits.length}/5 disciplines`);
  if (!ok) fail++;
}

// 4b — HARVEST: boards must use Sean's SHIPPED brand art, not art drawn in the generator.
//      v1 and v2 both invented visuals while 10 finished parallax plates and the crystalline
//      logo sat in frontend/public. A gate that does not demand the real asset invites a third repeat.
console.log(String.fromCharCode(10) + '── HARVESTED BRAND ART (not drawn here) ──');
const ART_RE = /src="([a-z0-9-]+\.(?:jpg|png))"/g;
for (const f of FILES) {
  const src = read(f);
  const refs = [...new Set((src.match(ART_RE) || []))];
  const hasPlate = refs.some((r) => /-bg\.jpg/.test(r));
  const hasLogo = src.includes('swan-logo.png');
  const ok = hasPlate && hasLogo;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${f.padEnd(29)} plate=${hasPlate} logo=${hasLogo}`);
  if (!ok) fail++;
}
// every board must use a DIFFERENT plate — otherwise the art stops being a differentiator
const plates = FILES.map((f) => ((read(f).match(/src="([a-z0-9-]+-bg\.jpg)"/) || [])[1]));
const dupes = plates.filter((p, i) => p && plates.indexOf(p) !== i);
console.log(`  ${dupes.length ? 'FAIL' : 'ok  '} distinct plate per board: ${new Set(plates).size}/8`);
if (dupes.length) fail++;

// 4c — SEAN'S KILL-PASS INSTRUCTIONS (each was an explicit requirement, so each is a gate).
console.log(String.fromCharCode(10) + '── KILL-PASS INSTRUCTIONS ──');
for (const f of FILES) {
  const src = read(f);
  const hdr = src.includes(REQUIRE.header);
  const hero = src.includes(REQUIRE.heroVideo);
  const movies = count(src, /MOVIE AREA/g);
  const stages = count(src, /perspective:\s*\d/g);
  const ok = hdr && hero && movies >= REQUIRE.movieAreas && stages >= REQUIRE.minStages;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${f.padEnd(20)} header=${hdr} swansVideo=${hero} movieAreas=${movies} parallaxStages=${stages}`);
  if (!ok) fail++;
}


// 6 - BUTTON LAB: the recovered glow button's MECHANISM must survive, not just its colours.
//     Handoff Law 4: values matching is not the thing matching.
if (fs.existsSync(path.join(here, LAB))) {
  console.log(String.fromCharCode(10) + '-- BUTTON LAB, mechanism not palette --');
  const lab = read(LAB).split(String.fromCharCode(10)).join('');
  const MECH = [
    ['rotating circle (border-radius 50%)', 'border-radius:50%'],
    ['circle sizing (padding-bottom 100%)', 'padding-bottom:100%'],
    ['lifted 44px + scaled 1.05', 'scale(1.05) translateY(-44px)'],
    ['rotation keyframe to 360deg', 'rotate(360deg)'],
    ['animation 2s infinite linear', 'animation:swanRotate linear 2s infinite'],
    ['radial mask', '-webkit-mask-image:-webkit-radial-gradient'],
    ['pointer-tracked glow var', 'translate(var(--pointer-x)'],
    ['LIVE pointer handler', 'getBoundingClientRect'],
    ['onMouseMove bound', 'onMouseMove'],
    ['whitened glow core', 'rgba(255,255,255,.92)'],
  ];
  for (const [name, needle] of MECH) {
    const ok = lab.includes(needle);
    console.log('  ' + (ok ? 'ok  ' : 'FAIL') + ' ' + name);
    if (!ok) fail++;
  }
  const btns = (lab.match(/class="gbtn"/g) || []).length;
  console.log('  ' + (btns >= 14 ? 'ok  ' : 'FAIL') + ' ' + btns + ' swatches (6 originals + 8 metallic)');
  if (btns < 14) fail++;
}

// 5 — format integrity.
console.log('\n── FORMAT ──');
for (const f of FILES) {
  const src = read(f);
  const ok = src.includes('<script src="./support.js"></script>') && src.includes('<x-dc>') && src.includes('extends DCLogic');
  if (!ok) { console.log(`  FAIL ${f}`); fail++; }
}
console.log(fail ? '' : '  ok   all 8 carry support.js + x-dc + DCLogic');

console.log(`\n${fail ? `GATE FAILED — ${fail} failure(s)` : 'GATE PASSED'}`);
process.exit(fail ? 1 : 0);
