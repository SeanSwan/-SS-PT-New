/**
 * Associations Model-Registry Parity Lock
 * =======================================
 * associations.mjs has TWO return literals (an early-return served when
 * critical associations already exist, and the full-setup return). On
 * 2026-07-14 the full return was missing TrainerCommission — which made
 * getModel('TrainerCommission') THROW at runtime and silently disabled
 * ALL commission creation in production (0 rows ever written). The early
 * return was missing 12 newer models (Subscription, Lead, WearableData…).
 *
 * This lock reads the source and fails if the two literals ever list a
 * different set of model identifiers again.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, '../../models/associations.mjs'), 'utf8');

const stripComments = (block) => block.replace(/\/\/[^\n]*/g, '');
const identifiers = (block) =>
  new Set([...stripComments(block).matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)].map((m) => m[1]));

describe('associations.mjs return-literal parity', () => {
  it('early-return and full-setup return expose the SAME model set', () => {
    const earlyStart = src.indexOf('return {', src.indexOf('Only return early if ALL critical'));
    const earlyEnd = src.indexOf('};', earlyStart);
    const fullStart = src.lastIndexOf('return {');
    const fullEnd = src.indexOf('};', fullStart);

    expect(earlyStart).toBeGreaterThan(-1);
    expect(fullStart).toBeGreaterThan(earlyStart);

    const early = identifiers(src.slice(earlyStart, earlyEnd));
    const full = identifiers(src.slice(fullStart, fullEnd));

    const earlyOnly = [...early].filter((x) => !full.has(x));
    const fullOnly = [...full].filter((x) => !early.has(x));

    expect(earlyOnly, 'models present only in the early-return literal').toEqual([]);
    expect(fullOnly, 'models present only in the full-setup literal (add them to the early return too)').toEqual([]);
  });

  it('both literals include the trainer pay ledger (TrainerCommission)', () => {
    const matches = [...src.matchAll(/\bTrainerCommission\b/g)].length;
    expect(matches).toBeGreaterThanOrEqual(2);
    // Full-setup literal must name it explicitly
    const fullStart = src.lastIndexOf('return {');
    expect(src.slice(fullStart, src.indexOf('};', fullStart))).toContain('TrainerCommission');
  });
});
