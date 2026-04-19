/**
 * Phase 16 (2026-04-16) — sessionController auto-complete truthfulness
 * ====================================================================
 * Locks the Phase 16 fix on `sessionController.mjs:950-965`: when a
 * scheduled session is marked complete, the auto-created placeholder
 * `WorkoutSession` row no longer seeds `intensity: 5`. It stamps null,
 * so `AVG(ws.intensity)` in the canonical intensity chart correctly
 * excludes these auto-placeholder rows from the trend.
 *
 * Source-text lock (same rationale as T1): the sessionController has a
 * heavy dependency surface (auth, session model, gamification,
 * social auto-post, XP awards, etc.). Behavioral coverage for the
 * "null intensity actually persists" contract lives on T2 — the
 * model-level guarantee that passing null intensity to the service
 * results in a DB null column. Together they cover the lane:
 * controller sends null → service persists null → DB stores null.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTROLLER_SOURCE = readFileSync(
  resolve(__dirname, '../../controllers/sessionController.mjs'),
  'utf8',
);

describe('Phase 16 — sessionController auto-complete is null-honest', () => {
  it('auto-create WorkoutSession does NOT seed intensity: 5', () => {
    // Locate the auto-create block.
    const autoCreateIdx = CONTROLLER_SOURCE.indexOf('Auto-created WorkoutSession');
    expect(autoCreateIdx).toBeGreaterThan(0);

    // Slice a window large enough to include the create-block above the log line.
    const windowStart = Math.max(0, autoCreateIdx - 1000);
    const windowSlice = CONTROLLER_SOURCE.slice(windowStart, autoCreateIdx);

    expect(windowSlice).not.toMatch(/intensity:\s*5\b/);
  });

  it('auto-create WorkoutSession explicitly sets intensity: null', () => {
    expect(CONTROLLER_SOURCE).toMatch(/intensity:\s*null/);
  });

  it('carries a Phase 16 docstring anchoring the null-honest contract', () => {
    // Make the change loud in the codebase — future engineers reading
    // the block need to see why we stopped seeding 5.
    const autoCreateIdx = CONTROLLER_SOURCE.indexOf('intensity: null');
    expect(autoCreateIdx).toBeGreaterThan(0);
    // Wider window to cover the full Phase 16 rationale block above
    // the intensity: null line. The docstring explains the "why"
    // directly above the auto-create call; a 1500-char window
    // comfortably covers it in either code style.
    const windowStart = Math.max(0, autoCreateIdx - 1500);
    const windowSlice = CONTROLLER_SOURCE.slice(windowStart, autoCreateIdx);
    expect(windowSlice).toMatch(/Phase 16/i);
  });
});
