/**
 * PLAUD apply path — controller routing locks
 * ============================================
 * REWRITTEN 2026-09-01 (blueprint Slice 1, F1/F2). The original Slice 3.8
 * locks asserted the in-controller guarded UPDATE + compensating DELETE
 * seam — i.e. they locked the defective architecture: the UPDATE wrote a
 * workout_sessions UUID into approved_workout_form_id (FK →
 * daily_workout_forms, guaranteed violation) after logWorkoutForClient had
 * already committed its own transaction, and 'plaud_merge_segment' was not
 * handled at all.
 *
 * TEST-DELTA DISCLOSURE: every assertion that named the old seam
 * (approved_workout_form_id, DELETE FROM workout_logs/workout_sessions,
 * in-controller UPDATE plaud_merge_requests) was deliberately replaced.
 * The new invariants they guarded (ownership/status/approve-once checks,
 * cipher purge, 409 MERGE_NOT_APPROVABLE) are now enforced BEHAVIORALLY in
 * approveCaptureWorkoutService.test.mjs — this file only locks the
 * controller's routing contract.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC = readFileSync(
  resolve(__dirname, '../../controllers/adminWorkoutLoggerController.mjs'), 'utf8',
);

describe('PLAUD apply path — adminWorkoutLogger controller routing', () => {
  it('reads optional source + mergeRequestId from request body', () => {
    expect(SRC).toMatch(/source[\s\S]{0,40}mergeRequestId/);
  });

  it('routes BOTH plaud_merge and plaud_merge_segment through the one-transaction service (F2)', () => {
    expect(SRC).toMatch(/source\s*===\s*['"]plaud_merge['"]/);
    expect(SRC).toMatch(/source\s*===\s*['"]plaud_merge_segment['"]/);
    expect(SRC).toMatch(/approvePlaudMergeWorkout\(/);
    expect(SRC).toMatch(/finalizeMerge:\s*isPlaudMergeApply/);
  });

  it('rejects malformed mergeRequestId for PLAUD sources', () => {
    expect(SRC).toMatch(/\/\^\[0-9a-fA-F-\]\{36\}\$\//);
    expect(SRC).toMatch(/mergeRequestId is required and must be a UUID/);
  });

  it('F1 regression: the controller no longer touches plaud_merge_requests or the retired FK column', () => {
    expect(SRC).not.toMatch(/UPDATE\s+plaud_merge_requests/);
    expect(SRC).not.toMatch(/approved_workout_form_id/);
    expect(SRC).not.toMatch(/formId/);
  });

  it('F1 regression: the fragile compensating DELETE is gone (rollback replaces it)', () => {
    expect(SRC).not.toMatch(/DELETE\s+FROM\s+workout_logs/);
    expect(SRC).not.toMatch(/DELETE\s+FROM\s+workout_sessions/);
  });

  it('maps MergeApprovalError to 409 MERGE_NOT_APPROVABLE', () => {
    expect(SRC).toMatch(/MergeApprovalError/);
    expect(SRC).toMatch(/status\(409\)/);
    expect(SRC).toMatch(/MERGE_NOT_APPROVABLE/);
  });

  it('non-PLAUD apply path is unchanged (existing logWorkoutForClient still called directly)', () => {
    expect(SRC).toMatch(/logWorkoutForClient/);
    expect(SRC).toMatch(/isPlaudMergeApply/);
  });

  it('successful whole-merge apply returns plaudMergeApproved:true; segment apply is flagged too', () => {
    expect(SRC).toMatch(/plaudMergeApproved:\s*true/);
    expect(SRC).toMatch(/plaudSegmentLogged/);
  });

  it('logger.info on successful approval (audit trail)', () => {
    expect(SRC).toMatch(/logger\.info\([\s\S]{0,80}merge_request[\s\S]{0,80}approved/);
  });
});
