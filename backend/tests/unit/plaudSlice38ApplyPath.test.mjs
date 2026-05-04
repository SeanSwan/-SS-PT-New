/**
 * Phase 3 Slice 3.8 — apply path augmentation locks
 * ===================================================
 * Source-text locks for the markApproved guarded UPDATE in
 * adminWorkoutLoggerController. Codex Round 2 CRIT #4 + Round 4 HIGH
 * atomic-finalization invariants.
 *
 * Behavioral test of the full apply→approve cycle runs in slice 3.14
 * Playwright (where the merge endpoint creates a real merge_request +
 * the apply endpoint hits markApproved against a real DB).
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

describe('Slice 3.8 — adminWorkoutLogger apply path augmentation', () => {
  it('reads optional source + mergeRequestId from request body', () => {
    expect(SRC).toMatch(/source[\s\S]{0,40}mergeRequestId/);
  });

  it('rejects malformed mergeRequestId when source=plaud_merge', () => {
    expect(SRC).toMatch(/source\s*===\s*['"]plaud_merge['"]/);
    expect(SRC).toMatch(/\/\^\[0-9a-fA-F-\]\{36\}\$\//);
    expect(SRC).toMatch(/mergeRequestId is required and must be a UUID/);
  });

  it('markApproved guarded UPDATE has ALL invariants in WHERE (Codex Round 2 CRIT #4 + Round 4 HIGH)', () => {
    // The UPDATE must require: matching merge_request_id, matching client_id,
    // status='completed', (admin role OR matching user_id), and approved_workout_form_id IS NULL
    expect(SRC).toMatch(/UPDATE\s+plaud_merge_requests/);
    expect(SRC).toMatch(/merge_request_id\s*=\s*:mergeRequestId/);
    expect(SRC).toMatch(/client_id\s*=\s*:clientId/);
    expect(SRC).toMatch(/status\s*=\s*'completed'/);
    expect(SRC).toMatch(/:role\s*=\s*'admin'\s+OR\s+user_id\s*=\s*:actingUserId/);
    expect(SRC).toMatch(/approved_workout_form_id\s+IS\s+NULL/);
  });

  it('approval flips status=approved + records approved_workout_form_id + approved_at', () => {
    expect(SRC).toMatch(/status\s*=\s*'approved'/);
    expect(SRC).toMatch(/approved_workout_form_id\s*=\s*:formId/);
    expect(SRC).toMatch(/approved_at\s*=\s*NOW\(\)/);
  });

  it('approval purges cipher fields (privacy: drop transcript+payload after approve)', () => {
    expect(SRC).toMatch(/payload_cipher\s*=\s*NULL/);
    expect(SRC).toMatch(/payload_iv\s*=\s*NULL/);
    expect(SRC).toMatch(/payload_tag\s*=\s*NULL/);
    expect(SRC).toMatch(/cipher_purged_at\s*=\s*NOW\(\)/);
  });

  it('approval invariant failure rolls back workout session', () => {
    expect(SRC).toMatch(/DELETE\s+FROM\s+"WorkoutSessions"\s+WHERE\s+id\s*=\s*:sessionId/);
  });

  it('approval invariant failure returns 409 MERGE_NOT_APPROVABLE', () => {
    expect(SRC).toMatch(/status\(409\)/);
    expect(SRC).toMatch(/MERGE_NOT_APPROVABLE/);
  });

  it('non-PLAUD apply path is unchanged (existing logWorkoutForClient still called)', () => {
    expect(SRC).toMatch(/logWorkoutForClient/);
    // The new code wraps in a `if (isPlaudMergeApply)` block - non-PLAUD
    // requests skip the markApproved logic entirely
    expect(SRC).toMatch(/isPlaudMergeApply/);
  });

  it('successful PLAUD apply returns plaudMergeApproved:true in response', () => {
    expect(SRC).toMatch(/plaudMergeApproved:\s*true/);
  });

  it('logger.info on successful approval (audit trail)', () => {
    expect(SRC).toMatch(/logger\.info\([\s\S]{0,80}merge_request[\s\S]{0,80}approved/);
  });
});
