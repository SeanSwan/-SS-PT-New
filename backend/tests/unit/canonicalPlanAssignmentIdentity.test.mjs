/**
 * ============================================================================
 * FILE: canonicalPlanAssignmentIdentity.test.mjs
 * PURPOSE: Lock revision/date-aware plan assignment identity and rolling reads.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves canonical assignment keys carry the scheduled
 * date and prescribed revision while legacy keys remain accepted during rollout.
 * HOW IT FITS IN THE APP: Client read model -> workout logger metadata guard ->
 * immutable completion receipt.
 * KEY DECISIONS: Servers emit only the canonical key but dual-read an old key
 * from a browser opened before deployment.
 * NASM PROTOCOL CONTEXT: Completion identity follows the prescribed plan version.
 */

import { describe, expect, it } from 'vitest';
import { buildClientTrainingOverview } from '../../services/clientTrainingReadModelService.mjs';
import {
  assertPlannedAssignmentMatchesOverview,
  buildPlannedAssignmentFormMetadata,
  normalizePlannedWorkoutAssignmentInput,
} from '../../services/plannedWorkoutAssignmentLogService.mjs';
import { buildWorkoutPlanAssignmentIdentity } from '../../services/workoutPlanAssignmentIdentityService.mjs';

const activePlan = {
  id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  status: 'active',
  currentWeek: 1,
  currentDay: 1,
  contentRevision: 4,
  planData: {
    weeks: [{
      weekNumber: 1,
      days: [{
        dayNumber: 1,
        assignmentType: 'homework',
        exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '10' }],
      }],
    }],
  },
};

const overview = () => buildClientTrainingOverview({
  activePlan,
  plans: [activePlan],
  currentSession: {
    weekNumber: 1,
    dayNumber: 1,
    session: activePlan.planData.weeks[0].days[0],
  },
  today: '2026-07-15',
});

const normalize = (assignmentKey) => normalizePlannedWorkoutAssignmentInput({
  assignmentKey,
  planId: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  assignmentType: 'homework',
  weekNumber: 1,
  dayNumber: 1,
});

describe('canonical plan assignment identity', () => {
  it('emits date, occurrence, and prescribed revision in the assignment key', () => {
    const assignment = overview().todayAssignment;

    expect(assignment).toMatchObject({
      assignmentId: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w1:d1:2026-07-15:o1:r4',
      assignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w1:d1:2026-07-15:o1:r4',
      legacyAssignmentKey: '6ea7806d-36c8-4307-bd5d-6b04b68be849:w1:d1:homework',
      scheduledDate: '2026-07-15',
      occurrenceIndex: 1,
      prescribedRevision: 4,
    });
  });

  it('dual-reads a legacy key but canonicalizes persisted form metadata', () => {
    const assignment = overview().todayAssignment;
    const legacy = normalize(assignment.legacyAssignmentKey);
    expect(legacy.ok).toBe(true);
    expect(() => assertPlannedAssignmentMatchesOverview(
      legacy.assignment,
      assignment,
    )).not.toThrow();

    const metadata = buildPlannedAssignmentFormMetadata(legacy.assignment, assignment);
    expect(metadata).toMatchObject({
      assignmentId: assignment.assignmentId,
      assignmentKey: assignment.assignmentKey,
      scheduledDate: '2026-07-15',
      occurrenceIndex: 1,
      prescribedRevision: 4,
    });
  });

  it('continues accepting the canonical key', () => {
    const assignment = overview().todayAssignment;
    const canonical = normalize(assignment.assignmentKey);
    expect(canonical.ok).toBe(true);
    expect(() => assertPlannedAssignmentMatchesOverview(
      canonical.assignment,
      assignment,
    )).not.toThrow();
  });
  it('rejects explicit invalid occurrence and revision dimensions', () => {
    const base = {
      planId: activePlan.id,
      weekNumber: 1,
      dayNumber: 1,
      scheduledDate: '2026-07-15',
    };
    expect(buildWorkoutPlanAssignmentIdentity({ ...base, occurrenceIndex: 0 })).toBeNull();
    expect(buildWorkoutPlanAssignmentIdentity({ ...base, prescribedRevision: 0 })).toBeNull();
  });
  it('normalizes numeric plan ids from JSON assignment payloads', () => {
    const assignment = overview().todayAssignment;
    const normalized = normalizePlannedWorkoutAssignmentInput({
      assignmentKey: assignment.assignmentKey,
      planId: 6,
      assignmentType: 'homework',
      weekNumber: 1,
      dayNumber: 1,
    });

    expect(normalized).toMatchObject({
      ok: true,
      assignment: { planId: '6' },
    });
  });
});
