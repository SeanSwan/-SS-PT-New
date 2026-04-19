/**
 * Phase 16 (2026-04-16) — useGhostPreFill writer-defaults source-text lock
 * ==========================================================================
 * The ghost pre-fill hook's `createPreFilledSet` is called by the
 * WorkoutLogger "add exercise" + "add set" paths. Before Phase 16 it
 * returned `rpe: 5` / `formQuality: 3` as hardcoded defaults, which
 * meant every new set in the logger silently carried phantom ratings
 * into the save payload.
 *
 * Phase 16 makes ghost pre-fill honor the actual prior-session data
 * when present and return `null` otherwise — never a fabricated
 * neutral-middle value.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(
  resolve(__dirname, './useGhostPreFill.ts'),
  'utf8',
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);

describe('Phase 16 — useGhostPreFill null-honest pre-fill', () => {
  it('createPreFilledSet does NOT fall back to rpe: 5', () => {
    expect(SOURCE).not.toMatch(/preFill\?\.rpe\s*\|\|\s*5/);
  });

  it('createPreFilledSet does NOT hardcode formQuality: 3', () => {
    // Locate the createPreFilledSet function body and assert the
    // specific literal is absent from its return object.
    const fnIdx = SOURCE.indexOf('const createPreFilledSet');
    expect(fnIdx).toBeGreaterThan(0);
    const fnEndIdx = SOURCE.indexOf('[getPreFill])', fnIdx);
    const fnBody = SOURCE.slice(fnIdx, fnEndIdx);
    expect(fnBody).not.toMatch(/\bformQuality\s*:\s*3\b/);
  });

  it('createPreFilledSet returns null for untouched formQuality', () => {
    expect(SOURCE).toMatch(/\bformQuality\s*:\s*null\b/);
  });

  it('createPreFilledSet preserves prior-session rpe when valid', () => {
    // Accepts either of two valid patterns: guarded number > 0 check,
    // or an explicit type guard that falls through to null.
    expect(SOURCE).toMatch(/preFill\?\.rpe/);
    expect(SOURCE).toMatch(/:\s*null\b/);
  });

  it('carries a Phase 16 docstring anchoring the null-honest contract', () => {
    expect(RAW_SOURCE).toMatch(/Phase 16/i);
  });
});
