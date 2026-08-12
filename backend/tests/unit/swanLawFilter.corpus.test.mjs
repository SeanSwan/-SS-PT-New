/**
 * MUST-PASS CORPUS — the anti-disable insurance.
 *
 * The adversarial suite proves the filter blocks bad prompts. This file proves
 * it does NOT block good ones, which is the higher-damage failure: a filter that
 * rejects legitimate work gets routed around or switched off, and then it
 * protects nothing at all.
 *
 * Every entry is a prompt fragment a designer could plausibly write for a Swan
 * surface, drawn from the shipped palette, the B7 substrate, the photographic
 * vocabulary, and the C13 cinematic patterns. If a change to the filter breaks
 * one of these, the change is wrong until proven otherwise.
 *
 * Added after a hostile review found that "golden hour light" — arguably the
 * most on-brand photographic phrase Swan has — was being blocked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLaws } from '../../../shared/swanLawFilter.mjs';

const MUST_PASS = [
  // ── Light and time of day ─────────────────────────────────────────────────
  ['golden hour light through Baltic amber', 'light'],
  ['blue hour, city lights just igniting', 'light'],
  ['overcast Baltic noon, flat even illumination', 'light'],
  ['cold rim light from below, deep falloff', 'light'],
  ['a soft glow at the horizon line', 'light'],
  ['window-blind light striping the floor', 'light'],
  ['single hard key, most of the frame in shadow', 'light'],

  // ── Optics ────────────────────────────────────────────────────────────────
  ['tilt-shift lens, aperture 1.2, shallow plane of focus', 'optics'],
  ['telephoto compression flattening the ridge line', 'optics'],
  ['fish-eye lens close to the surface', 'optics'],
  ['35mm, available light, unstaged', 'optics'],
  ['Kodak Portra 400, fine grain', 'optics'],
  ['CineStill 50, halation around highlights', 'optics'],

  // ── Composition ───────────────────────────────────────────────────────────
  ["bird's-eye view of the frozen surface", 'composition'],
  ["worm's-eye view up the column", 'composition'],
  ['low-vantage point view, strict symmetry', 'composition'],
  ['crane shot over the fjord', 'composition'],
  ['radial composition, single focal element', 'composition'],
  ['extreme macro, subject fills the frame', 'composition'],
  ['golden ratio grid underlying the layout', 'composition'],

  // ── Material and optics-as-nature (LAW 4 compliant) ───────────────────────
  ['caustic light through crystal, real refraction', 'material'],
  ['spectral dispersion, red outside violet inside', 'material'],
  ['thin-film interference banding on wet stone', 'material'],
  ['frost bloom, dendritic ice growth', 'material'],
  ['cathedral glass panels, leaded tracery', 'material'],
  ['crown molding catching the caustic light', 'material'],
  ['sealed concrete floor, matte and cold', 'material'],
  ['dust motes lit by a shaft of window light', 'material'],
  ['faceted crystalline surfaces, internal reflection', 'material'],

  // ── Palette (Crystalline Swan) ────────────────────────────────────────────
  ['midnight sapphire dominant, ice wing cyan accent', 'palette'],
  ['frost white text over obsidian black', 'palette'],
  ['monochrome, full tonal range, no colour cast', 'palette'],
  ['warm ember tones over obsidian, no metallics', 'palette'],

  // ── Sanctioned gold (LAW 2 allowlist) ─────────────────────────────────────
  ['gold bloom on the PR numeral and its delta', 'palette'],
  ['a 1px gold filigree line at the seam', 'material'],
  ['gold focus ring on the active control', 'material'],

  // ── LAW 4 sanctioned occluder ─────────────────────────────────────────────
  ['a swan as a dark occluder in a caustic field', 'subject'],
  ['dark shape in the light field, silhouetted against dispersion', 'subject'],

  // ── Content law compliant ─────────────────────────────────────────────────
  ['a stretching and flexibility session at dawn', 'intent'],
  ['26+ years of coaching experience', 'intent'],

  // ── Motion / cinematic ────────────────────────────────────────────────────
  ['a single continuous 8-second extreme macro journey', 'intent'],
  ['scroll-scrubbed frame sequence, 60fps', 'abstraction'],
  ['atmospheric perspective, far layers losing contrast', 'composition'],
];

test(`MUST-PASS CORPUS: ${MUST_PASS.length} legitimate Swan prompts are never blocked`, () => {
  const rejected = [];
  for (const [text, slot] of MUST_PASS) {
    const r = applyLaws({ [slot]: text });
    if (!r.passed) rejected.push(`${slot}: "${text}" -> [${r.violations[0].law}] ${r.violations[0].detail}`);
  }
  assert.deepEqual(rejected, [], `\nFALSE POSITIVES — the filter rejected legitimate work:\n  ${rejected.join('\n  ')}\n`);
});

test('the corpus is large enough to be meaningful', () => {
  // A token corpus provides token insurance. Keep this honest.
  assert.ok(MUST_PASS.length >= 40, `corpus is only ${MUST_PASS.length} entries`);
});

test('corpus entries are realistic — each names a real slot', () => {
  const validSlots = new Set(['intent', 'subject', 'medium', 'styleAnchor', 'composition',
    'optics', 'light', 'palette', 'material', 'abstraction', 'negative', 'output']);
  for (const [, slot] of MUST_PASS) {
    assert.ok(validSlots.has(slot), `corpus uses unknown slot "${slot}"`);
  }
});
