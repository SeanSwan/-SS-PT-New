/**
 * @swan/forge — instrument validation (audit-contrast + drift-lint).
 * Standing law (learning corpus 2026-08-23): a gate nobody validated detects nothing.
 * These tests prove the instruments measure what they claim before the gate is trusted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contrastRatio, hexToRgb, parseTokens, resolveChain, auditPack, SEMANTIC_NAMES,
} from '../scripts/audit-contrast.mjs';
import { lintText, loadExceptions } from '../scripts/drift-lint.mjs';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));

// ── contrast math against known WCAG reference values ────────────────
test('contrast: black on white is exactly 21:1', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
});
test('contrast: #767676 on white ≈ 4.54:1 (the canonical WCAG boundary gray)', () => {
  const r = contrastRatio('#767676', '#FFFFFF');
  assert.ok(r > 4.5 && r < 4.6, `got ${r}`);
});
test('contrast: order-independent and 3-digit hex accepted', () => {
  assert.equal(contrastRatio('#FFF', '#000'), contrastRatio('#000000', '#FFFFFF'));
  assert.equal(hexToRgb('#abc')?.join(','), '170,187,204');
  assert.equal(hexToRgb('not-a-color'), null);
});

// ── token parsing + resolution order (§11.A4) ────────────────────────
test('resolution order: component-override wins over pack semantic', () => {
  const tokens = parseTokens(':root{--sw-text-inverse: #FFFFFF; --sw-btn-primary-text: #E0ECF4;}');
  assert.equal(resolveChain(tokens, ['--sw-btn-primary-text', '--sw-text-inverse']), '#E0ECF4');
  assert.equal(resolveChain(tokens, ['--sw-btn-accent-text', '--sw-text-inverse']), '#FFFFFF', 'absent override falls through');
});

// ── the REAL packs pass their own gate ───────────────────────────────
for (const pack of ['crystalline-swan.css', 'swanguard-editorial.css']) {
  test(`pack ${pack}: defines all ${SEMANTIC_NAMES.length} semantic names and no unwaived pair fails`, () => {
    const css = readFileSync(join(PKG, 'tokens', 'packs', pack), 'utf8');
    const { missing, results } = auditPack(pack, css);
    assert.deepEqual(missing, [], `missing semantic names: ${missing.join(', ')}`);
    const hardFails = results.filter((r) => r.status === 'FAIL' || r.status === 'UNRESOLVED');
    assert.deepEqual(hardFails.map((r) => `${r.label}:${r.ratio?.toFixed(2)}`), [], 'unwaived contrast failures');
  });
}

// ── drift-lint rules fire on known-bad fixtures and stay quiet on good ─
test('drift-lint R1: raw hex in Forge css flagged; token references clean', () => {
  assert.equal(lintText('css/x.css', '.sw-x { color: #FF0000; }', { isForgeCss: true }).length, 1);
  assert.equal(lintText('css/x.css', '.sw-x { color: var(--sw-text-primary); }', { isForgeCss: true }).length, 0);
});
test('drift-lint R3: reorder properties in packs flagged (§11.A2)', () => {
  const bad = ':root{ }\n.x { flex-direction: row-reverse; }\n.y { order: 2; }';
  const findings = lintText('tokens/packs/p.css', bad, { isPack: true });
  assert.equal(findings.filter((f) => f.rule === 'R3').length, 2);
});
test('drift-lint R2/R4: consumer override + legacy import detected', () => {
  const consumer = [
    'import GlowButton from "../ui/buttons/GlowButton";',
    '.sw-btn { padding: 0 !important; }',
  ].join('\n');
  const rules = lintText('app/x.tsx', consumer, { isConsumer: true }).map((f) => f.rule).sort();
  assert.deepEqual(rules, ['R2', 'R4']);
});
test('drift-lint: comment lines never flag (doc examples stay legal)', () => {
  assert.equal(lintText('css/x.css', ' * example: color: #FF0000;', { isForgeCss: true }).length, 0);
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
