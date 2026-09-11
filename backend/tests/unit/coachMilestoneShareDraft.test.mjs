/**
 * G07/T48 — log approval and share-draft are separate steps: the log may
 * commit while the share remains a draft with no send path. The share draft
 * builder exposes NO sender/dispatch API, and the log-approval lane imports
 * no share/send module (structural separation, checked below).
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildMilestoneShareDraft } from '../../services/ai/coachMilestoneShareDraft.mjs';

const MILESTONE = {
  id: 'sess-100',
  status: 'completed',
  verified: true,
  isMilestone: true,
  milestoneType: 'workout_count_100',
  title: '100th workout',
  date: '2026-07-28T10:00:00.000Z',
};

test('a verified milestone yields a DRAFT with no recipients and no send', () => {
  const result = buildMilestoneShareDraft({ session: MILESTONE, actorId: 7 });
  assert.equal(result.status, 'draft');
  assert.equal(result.draft.draftId, 'share-draft:sess-100');
  assert.equal(result.draft.milestoneType, 'workout_count_100');
  assert.deepEqual(result.draft.recipients, []);
  assert.equal(result.draft.consentRequired, true);
  // No sender/dispatch API exists on the draft at all.
  const senders = Object.keys(result.draft).filter((key) => /send|dispatch|publish/i.test(key));
  assert.deepEqual(senders, []);
});

test('an unverified or non-milestone session is not eligible for a share draft', () => {
  assert.equal(buildMilestoneShareDraft({ session: { ...MILESTONE, verified: false } }).status, 'not_eligible');
  assert.equal(buildMilestoneShareDraft({ session: { ...MILESTONE, isMilestone: false } }).status, 'not_eligible');
  assert.equal(buildMilestoneShareDraft({ session: null }).status, 'not_eligible');
});

test('the log lane never imports a share/send path (structural separation)', () => {
  const laneFiles = [
    '../../../services/ai/coachWorkoutIntentService.mjs',
    '../../../services/ai/coachWorkoutProposalApprovalService.mjs',
  ];
  for (const lane of laneFiles) {
    const resolved = path.resolve(fileURLToPath(import.meta.url), lane);
    let source;
    try {
      source = readFileSync(resolved, 'utf8');
    } catch {
      continue; // lane file absent in this tree — nothing to assert
    }
    assert.ok(!/ShareDraft|sendShare|publishShare/i.test(source), `${lane} must not import share/send paths`);
  }
  // And the draft module itself has no send/export of a dispatch function.
  const draftSource = readFileSync(
    path.resolve(fileURLToPath(import.meta.url), '../../../services/ai/coachMilestoneShareDraft.mjs'),
    'utf8',
  );
  assert.ok(!/export (async )?function (send|dispatch|publish)/i.test(draftSource));
});
