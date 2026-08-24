/**
 * @swan/forge — instrument validation (audit-contrast + drift-lint).
 * Standing law (learning corpus 2026-08-23): a gate nobody validated detects nothing.
 * Round 2 (GLM code review): the gate's FAILURE paths are now exercised too —
 * a gate whose only tested behavior is passing has never been seen detecting.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contrastRatio, hexToRgb, parseTokens, resolveChain, auditPack,
  SEMANTIC_NAMES, PAIRS, waiverApplies,
} from '../scripts/audit-contrast.mjs';
import { lintText, loadExceptions, stripComments } from '../scripts/drift-lint.mjs';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));

// ── contrast math against known WCAG reference values ────────────────
test('contrast: black on white is exactly 21:1', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
});
test('contrast: #767676 on white ≈ 4.54:1 (the canonical WCAG boundary gray)', () => {
  const r = contrastRatio('#767676', '#FFFFFF');
  assert.ok(r > 4.5 && r < 4.6, `got ${r}`);
});
test('contrast: order-independent; 3-digit accepted; alpha hex rejected loudly', () => {
  assert.equal(contrastRatio('#FFF', '#000'), contrastRatio('#000000', '#FFFFFF'));
  assert.equal(hexToRgb('#abc')?.join(','), '170,187,204');
  assert.equal(hexToRgb('#8B5CF6CC'), null, '8-digit alpha hex must NOT silently resolve');
  assert.equal(hexToRgb('not-a-color'), null);
});

// ── token parsing + resolution order (§11.A4) ────────────────────────
test('resolution order: component-override wins over pack semantic', () => {
  const { tokens } = parseTokens(':root{--sw-text-inverse: #FFFFFF; --sw-btn-primary-text: #E0ECF4;}');
  assert.equal(resolveChain(tokens, ['--sw-btn-primary-text', '--sw-text-inverse']), '#E0ECF4');
  assert.equal(resolveChain(tokens, ['--sw-btn-accent-text', '--sw-text-inverse']), '#FFFFFF', 'absent override falls through');
});

// ── evasion defense: duplicate audited tokens are a hard fail ────────
test('audit: duplicate declaration of an audited token (media-query evasion) FAILS', () => {
  const evil = `:root{--sw-text-primary: #333344; --sw-bg-base: #FFFFFF;}
    @media (min-width: 99999px){ :root{ --sw-text-primary: #000000; } }`;
  const { duplicates } = auditPack('evil.css', evil);
  assert.ok(duplicates.includes('--sw-text-primary'), 'duplicate audited token must be flagged');
});
test('audit: duplicate of a NON-audited token (e.g. --sw-motion reduced-motion block) is allowed', () => {
  const fine = ':root{--sw-motion: 1;} @media (prefers-reduced-motion: reduce){ :root{--sw-motion: 0;} }';
  const { duplicates } = auditPack('fine.css', fine);
  assert.deepEqual(duplicates, []);
});

// ── the gate's FAIL paths, exercised ─────────────────────────────────
test('audit: a genuinely failing pair reports FAIL (not silently absent)', () => {
  const bad = ':root{--sw-text-primary: #777777; --sw-bg-base: #888888;}';
  const { results } = auditPack('bad.css', bad);
  const r = results.find((x) => x.label === 'body text / page');
  assert.equal(r.status, 'FAIL');
});
test('audit: missing semantic names are reported', () => {
  const { missing } = auditPack('empty.css', ':root{}');
  assert.equal(missing.length, SEMANTIC_NAMES.length);
});
test('audit: unresolvable pair (var()/color-mix value) reports UNRESOLVED', () => {
  const css = ':root{--sw-text-primary: var(--nope); --sw-bg-base: #FFFFFF;}';
  const { results } = auditPack('unres.css', css);
  assert.equal(results.find((x) => x.label === 'body text / page').status, 'UNRESOLVED');
});

// ── Ox F1: a waiver must NEVER mask instrument failure ───────────────
test('audit: corrupt hex on a WAIVED pair is a blocking FAIL, not WAIVED-FAIL', () => {
  const corrupt = ':root{--sw-text-inverse: #FFFFFF; --sw-color-accent: #GGGGGG;}';
  const { results } = auditPack('crystalline-swan.css', corrupt, new Date('2026-09-01'));
  const accent = results.find((x) => x.label === 'button accent label');
  assert.equal(accent.status, 'FAIL', 'null ratio on a waived pair must fail loudly');
});

// ── Ox F2: commented-out tokens must not satisfy the gate ────────────
test('audit: a token that exists only inside /* */ does NOT count as defined', () => {
  const sneaky = ':root{ /* --sw-text-primary: #FFFFFF; */ --sw-bg-base: #000000;}';
  const { missing } = auditPack('sneaky.css', sneaky);
  assert.ok(missing.includes('--sw-text-primary'), 'commented declaration must stay missing');
});
test('audit: a commented duplicate does not trip the duplicate gate', () => {
  const ok = ':root{--sw-text-primary: #FFFFFF; /* --sw-text-primary: #000000; */ }';
  const { duplicates } = auditPack('ok.css', ok);
  assert.deepEqual(duplicates, []);
});

// ── waiver governance: pack-scoped + time-boxed ──────────────────────
test('waiver: applies only to listed pack and only before expiry', () => {
  const accentPair = PAIRS.find((p) => p.label === 'button accent label');
  assert.ok(accentPair.waiver.owner && accentPair.waiver.expiry, 'waiver must carry owner + expiry');
  assert.equal(waiverApplies(accentPair, 'crystalline-swan.css', new Date('2026-09-01')), true);
  assert.equal(waiverApplies(accentPair, 'some-new-pack.css', new Date('2026-09-01')), false, 'non-listed pack gets NO free pass');
  assert.equal(waiverApplies(accentPair, 'crystalline-swan.css', new Date('2027-01-01')), false, 'expired waiver = real failure');
});
test('audit: crystalline accent pair is WAIVED-FAIL today (asserted, not incidental)', () => {
  const css = readFileSync(join(PKG, 'tokens', 'packs', 'crystalline-swan.css'), 'utf8');
  const { results } = auditPack('crystalline-swan.css', css, new Date('2026-09-01'));
  assert.equal(results.find((x) => x.label === 'button accent label').status, 'WAIVED-FAIL');
});

// ── the REAL packs pass their own gate ───────────────────────────────
for (const pack of ['crystalline-swan.css', 'swanguard-editorial.css']) {
  test(`pack ${pack}: all ${SEMANTIC_NAMES.length} names, no duplicates of audited tokens, no unwaived fails`, () => {
    const css = readFileSync(join(PKG, 'tokens', 'packs', pack), 'utf8');
    const { missing, duplicates, results } = auditPack(pack, css, new Date('2026-09-01'));
    assert.deepEqual(missing, [], `missing: ${missing.join(', ')}`);
    assert.deepEqual(duplicates, [], `duplicated audited tokens: ${duplicates.join(', ')}`);
    const hardFails = results.filter((r) => r.status === 'FAIL' || r.status === 'UNRESOLVED');
    assert.deepEqual(hardFails.map((r) => `${r.label}:${r.ratio?.toFixed(2)}`), []);
  });
}

// ── SEMANTIC_NAMES must equal the contract document (no hand-sync drift) ──
test('SEMANTIC_NAMES matches tokens/semantic.contract.md exactly', () => {
  const md = readFileSync(join(PKG, 'tokens', 'semantic.contract.md'), 'utf8');
  const inDoc = new Set([...md.matchAll(/`(--sw-(?!p-)[\w-]+)`/g)].map((m) => m[1]));
  for (const n of SEMANTIC_NAMES) assert.ok(inDoc.has(n), `${n} missing from contract doc`);
  for (const n of inDoc) {
    if (n.startsWith('--sw-btn-') || n.startsWith('--sw-card-') || n.startsWith('--sw-input-')) continue; // component-tier examples
    assert.ok(SEMANTIC_NAMES.includes(n), `${n} in contract doc but not in SEMANTIC_NAMES`);
  }
});

// ── drift-lint rules fire on known-bad fixtures and stay quiet on good ─
test('drift-lint R1: raw hex (incl. 8-digit alpha) in Forge css flagged; tokens clean', () => {
  assert.equal(lintText('css/x.css', '.sw-x { color: #FF0000; }', { isForgeCss: true }).length, 1);
  assert.equal(lintText('css/x.css', '.sw-x { color: #8B5CF6CC; }', { isForgeCss: true }).length, 1, '8-digit alpha hex must flag');
  assert.equal(lintText('css/x.css', '.sw-x { color: var(--sw-text-primary); }', { isForgeCss: true }).length, 0);
});
test('drift-lint R3: reorder properties flagged, case-insensitively, incl. grid-area', () => {
  const bad = '.x { FLEX-DIRECTION: ROW-REVERSE; }\n.y { order: 2; }\n.z { grid-area: 2 / 1; }';
  assert.equal(lintText('tokens/packs/p.css', bad, { isPack: true }).filter((f) => f.rule === 'R3').length, 3);
});
test('drift-lint R5: pack redefining a primitive floor is flagged; referencing one is not', () => {
  assert.equal(lintText('tokens/packs/p.css', ':root{ --sw-p-target-min: 20px; }', { isPack: true }).filter((f) => f.rule === 'R5').length, 1);
  assert.equal(lintText('tokens/packs/p.css', ':root{ --sw-x: var(--sw-p-target-min); }', { isPack: true }).filter((f) => f.rule === 'R5').length, 0);
});
test('drift-lint R2/R4: consumer override + legacy import detected', () => {
  const consumer = [
    'import GlowButton from "../ui/buttons/GlowButton";',
    '.sw-btn { padding: 0 !important; }',
  ].join('\n');
  const rules = lintText('app/x.tsx', consumer, { isConsumer: true }).map((f) => f.rule).sort();
  assert.deepEqual(rules, ['R2', 'R4']);
});
test('drift-lint: comments never flag AND never hide (Ox F7, both directions)', () => {
  assert.equal(lintText('css/x.css', ' * example: color: #FF0000;', { isForgeCss: true }).length, 0);
  assert.equal(lintText('css/x.css', 'see GlowButton import */', { isConsumer: true }).length, 0, 'block-comment continuation line must not flag R4');
  assert.equal(lintText('css/x.css', '/* brand: #FF0000 */\n.x { color: var(--sw-border); }', { isForgeCss: true }).length, 0, 'inline block comment must not flag R1');
  const hidden = lintText('css/x.css', '.x { color: #FF0000; } /* legit note */', { isForgeCss: true });
  assert.equal(hidden.length, 1, 'violation BEFORE a trailing comment must still flag');
});
test('drift-lint: stripComments preserves line numbers', () => {
  const out = stripComments('a\n/* two\nthree */\nb');
  assert.equal(out.split('\n').length, 4);
  assert.equal(out.split('\n')[3], 'b');
});
test('drift-lint R3: direction ltr flagged too (reordering in an RTL document)', () => {
  assert.equal(lintText('tokens/packs/p.css', '.x { direction: ltr; }', { isPack: true }).filter((f) => f.rule === 'R3').length, 1);
});

// ── exception ledger: unexpired suppresses, expired does not ─────────
test('exceptions: expiry is enforced by the parser', () => {
  const ledger = [
    '| path-substring | rule | owner | expiry | reason |',
    '| Legacy.css | R2 | sean | 2099-01-01 | live |',
    '| Old.css | R2 | sean | 2020-01-01 | expired |',
  ].join('\n');
  const rows = loadExceptions(ledger, new Date('2026-08-24'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].pathSub, 'Legacy.css');
});
