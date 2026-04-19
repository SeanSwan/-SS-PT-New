/**
 * Phase 16 (2026-04-16) — dailyWorkoutFormRoutes reader null-guards
 * ===================================================================
 * Source-text lock for the reader-side companion to T1. Writer truth
 * without reader truth is a regression: once the writer starts
 * persisting null intensity, any reader that does `intensity || 5` or
 * `intensity || 0` produces wrong data — phantom 5 in the first case,
 * a trend dragged toward 0 in the second.
 *
 * Codex Round 1 flagged three reader sites at `dailyWorkoutFormRoutes.mjs`:
 *   - workoutHistory map (was: `|| 5`)
 *   - sessionIntensity map (was: `|| 0`)
 *   - the MCP payload pass-through (was already null-safe, no fix)
 *
 * This file locks the writer-truth + reader-safety invariant as a
 * pair so future engineers can't accidentally re-introduce either
 * phantom-fill pattern.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_SOURCE = readFileSync(
  resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

describe('Phase 16 — dailyWorkoutFormRoutes readers handle null', () => {
  it('workoutHistory reader does NOT `|| 5` the overallIntensity column', () => {
    // Slice a window around the workoutHistory builder (before the
    // sessionIntensity builder). The phantom fallback must be absent.
    const workoutHistoryIdx = ROUTE_SOURCE.indexOf('workoutHistory = forms.map');
    expect(workoutHistoryIdx).toBeGreaterThan(0);
    const sliceEnd = ROUTE_SOURCE.indexOf('formTrends', workoutHistoryIdx);
    const slice = ROUTE_SOURCE.slice(workoutHistoryIdx, sliceEnd);

    expect(slice).not.toMatch(/form\.formData\?\.overallIntensity\s*\|\|\s*5/);
  });

  it('sessionIntensity reader does NOT `|| 0` the overallIntensity column', () => {
    const sessionIntensityIdx = ROUTE_SOURCE.indexOf('sessionIntensity = forms.map');
    expect(sessionIntensityIdx).toBeGreaterThan(0);
    const sliceEnd = ROUTE_SOURCE.indexOf('Build response', sessionIntensityIdx);
    const slice = ROUTE_SOURCE.slice(sessionIntensityIdx, sliceEnd);

    expect(slice).not.toMatch(/form\.formData\?\.overallIntensity\s*\|\|\s*0/);
  });

  it('readers carry an explicit Phase 16 null-safety docstring', () => {
    // Either reader context block should mention Phase 16 so future
    // engineers know WHY the `|| 5` / `|| 0` patterns are forbidden.
    expect(ROUTE_SOURCE).toMatch(/Phase 16/i);
  });

  it('stale "defaults to 5 in the writer" caveat comment is gone', () => {
    // The pre-Phase-16 comment at ~line 1442 described the writer's
    // phantom behavior. Now that the writer is null-honest, this
    // caveat is outdated and misleading.
    expect(ROUTE_SOURCE).not.toMatch(
      /overallIntensity defaults to 5 in the writer/i,
    );
  });
});
