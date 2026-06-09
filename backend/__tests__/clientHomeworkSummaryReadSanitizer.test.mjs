/**
 * Client homework summary read sanitizer tests.
 * =================================================
 *
 * Locks the Swan Coach homework summary to safe accountability context:
 * IDs, counts, dates, and action guidance only. No client PII or freeform notes
 * are allowed through this boundary.
 */
import { describe, expect, it } from 'vitest';

import { summarizeHomeworkSummary } from '../services/ai/dispatchers/clientHomeworkSummaryReadSanitizer.mjs';

describe('clientHomeworkSummaryReadSanitizer', () => {
  it('adds safe accountability guidance for completed homework', () => {
    const result = summarizeHomeworkSummary({
      assignmentType: 'homework',
      todayStatus: 'completed',
      todayIsCompleted: true,
      todayIsLoggable: false,
      todayShouldDeductSession: false,
      todayWeekNumber: 4,
      todayDayNumber: 2,
      todayExerciseCount: 5,
      todayFirstExerciseName: 'Split Squat',
      recentCompletedCount: 2,
      lastCompletedAt: '2026-06-07T10:15:00.000Z',
      recentCompletions: [{
        assignmentKey: 'plan-6m:w4:d2:homework',
        formId: 'daily-form-42',
        completedAt: '2026-06-07T10:15:00.000Z',
        notes: 'ClientNameMustNotLeak completed extra work',
      }],
      clientName: 'ClientNameMustNotLeak',
      email: 'client@example.test',
    });

    expect(result.accountabilityStatus).toEqual({
      key: 'completed_today',
      label: 'Completed today',
      priority: 'review',
      coachDirective: 'Review the logged homework before suggesting optional next work.',
    });
    expect(JSON.stringify(result)).not.toContain('ClientNameMustNotLeak');
    expect(JSON.stringify(result)).not.toContain('client@example.test');
    expect(JSON.stringify(result)).not.toContain('extra work');
  });

  it('marks loggable homework as due without adding write authority', () => {
    const result = summarizeHomeworkSummary({
      assignmentType: 'homework',
      todayStatus: 'planned',
      todayIsCompleted: false,
      todayIsLoggable: true,
      recentCompletedCount: 0,
    });

    expect(result.accountabilityStatus).toEqual({
      key: 'due_today',
      label: 'Due today',
      priority: 'log_prompt',
      coachDirective: 'Encourage the client to log the assigned homework; do not mark it complete.',
    });
  });
});
