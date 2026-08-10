#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-doctor.test.mjs
 * PURPOSE: Lock sanitized read-only lifecycle state diagnostics.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises pure state classification and receipt text.
 * HOW IT FITS IN THE APP: Manager status/doctor commands -> diagnostic helper.
 * KEY DECISIONS: Diagnostics expose counts and reasons, never raw identifiers.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

async function doctorModule() {
  return import('./mcp-lifecycle-doctor.mjs').catch(() => ({}));
}

test('doctor classifies active, expired, dirty, tombstoned, and ambiguous state', async () => {
  const doctor = await doctorModule();
  assert.equal(typeof doctor.buildDoctorReport, 'function');
  const report = doctor.buildDoctorReport({
    dirty: true, tombstones: [{ reason: 'audit-ended' }], leases: [{ sessionId: 'secret' }],
    pending: [{ expiresAt: 900 }, { expiresAt: 1100 }], ambiguity: 1, now: 1000,
  });
  assert.deepEqual(report, {
    dirty: 1, leases: 1, pendingActive: 1, pendingExpired: 1,
    tombstones: 1, ambiguous: 1, cleanForRearm: false,
  });
  const text = doctor.formatDoctorReport(report);
  assert.match(text, /dirty=1/);
  assert.doesNotMatch(text, /secret|sessionId/);
});

test('doctor allows rearm only when dirty is the sole remaining condition', async () => {
  const doctor = await doctorModule();
  const report = doctor.buildDoctorReport({
    dirty: true, tombstones: [], leases: [], pending: [], ambiguity: 0, now: 1000,
  });
  assert.equal(report.cleanForRearm, true);
});

test('doctor collection converts malformed readers into fail-closed ambiguity', async () => {
  const doctor = await doctorModule();
  const report = doctor.collectDoctorReport({
    readDirty: () => { throw new Error('secret'); }, readTombstones: () => [],
    readLeases: () => [], readPending: () => [], now: 1000,
  });
  assert.equal(report.dirty, 1);
  assert.equal(report.ambiguous, 1);
  assert.equal(report.cleanForRearm, false);
});
