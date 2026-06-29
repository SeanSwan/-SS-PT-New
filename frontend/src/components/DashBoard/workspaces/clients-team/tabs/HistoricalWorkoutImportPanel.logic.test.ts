import {
  appendHistoricalPreviewToCoachPrompt,
  buildHistoricalImportPlan,
  buildHistoricalPreviewFormFields,
  knownWorkoutDateSet,
} from './HistoricalWorkoutImportPanel.logic';

describe('HistoricalWorkoutImportPanel logic', () => {
  it('builds expected training dates and excludes already logged workout dates', () => {
    const knownDates = [...knownWorkoutDateSet([
      { date: '2026-01-05T12:00:00.000Z' },
      { completedAt: '2026-01-09' },
    ])];

    const plan = buildHistoricalImportPlan({
      clientId: 42,
      endDate: '2026-01-10',
      knownDates,
      lastWorkoutNotes: 'Lower body strength, tolerated knee work.',
      sessionsPerWeek: 3,
      sourceLabel: 'Move Fitness historical import',
      startDate: '2026-01-01',
    });

    expect(plan.expectedDates).toEqual([
      '2026-01-02',
      '2026-01-05',
      '2026-01-07',
      '2026-01-09',
    ]);
    expect(plan.missingDates).toEqual(['2026-01-02', '2026-01-07']);
  });

  it('routes filler generation through Swan Coach with free-tracking and edit-before-save instructions', () => {
    const plan = buildHistoricalImportPlan({
      clientId: 99,
      endDate: '2026-02-07',
      knownDates: [],
      lastWorkoutNotes: '',
      sessionsPerWeek: 2,
      sourceLabel: 'Move Fitness historical import',
      startDate: '2026-02-01',
    });

    expect(plan.coachPrompt).toContain('Swan Coach historical workout import planning.');
    expect(plan.coachPrompt).toContain('Client: #99.');
    expect(plan.coachPrompt).toContain('free-tracking; do not deduct paid sessions');
    expect(plan.coachPrompt).toContain('AI-estimated historical filler');
    expect(plan.coachPrompt).toContain('edit before saving');
    expect(plan.coachPrompt).toContain('verified performance records');
    expect(plan.coachPrompt).toContain('believable progression story');
    expect(plan.coachPrompt).toContain('regress load, volume, density, and exercise complexity');
  });

  it('redacts common contact details from freeform trainer notes before Coach handoff', () => {
    const plan = buildHistoricalImportPlan({
      clientId: 101,
      endDate: '2026-02-02',
      knownDates: [],
      lastWorkoutNotes: 'Call 555-123-4567 or email client@example.com after upper-body day.',
      sessionsPerWeek: 1,
      sourceLabel: 'External historical import',
      startDate: '2026-02-02',
    });

    expect(plan.coachPrompt).toContain('[redacted-phone]');
    expect(plan.coachPrompt).toContain('[redacted-email]');
    expect(plan.coachPrompt).not.toContain('555-123-4567');
    expect(plan.coachPrompt).not.toContain('client@example.com');
  });

  it('builds redacted history-preview form fields for the draft-only upload endpoint', () => {
    const fields = buildHistoricalPreviewFormFields({
      clientId: 42,
      knownDates: ['2026-01-05T12:00:00.000Z', 'bad-date'],
      lastWorkoutNotes: 'Last session had sled work. Text 555-123-4567 or client@example.com.',
      missingDates: ['2026-01-07'],
      sourceLabel: 'Move Fitness historical import',
    });

    expect(fields).toEqual({
      clientId: '42',
      knownDates: '["2026-01-05"]',
      lastWorkoutNotes: 'Last session had sled work. Text [redacted-phone] or [redacted-email].',
      missingDates: '["2026-01-07"]',
      sourceLabel: 'Move Fitness historical import',
    });
  });

  it('adds uploaded preview draft summaries to the Coach handoff prompt without creating saved records', () => {
    const prompt = appendHistoricalPreviewToCoachPrompt({
      basePrompt: 'Base historical import prompt.',
      drafts: [{
        date: '2026-01-07',
        confidence: 0.82,
        parsedWorkout: {
          exercises: [
            { exerciseName: 'Bench Press' },
            { exerciseName: 'Seated Row' },
          ],
        },
      }],
      missingDraftRequests: [{ date: '2026-01-09' }],
    });

    expect(prompt).toContain('Base historical import prompt.');
    expect(prompt).toContain('Uploaded history preview draft candidates:');
    expect(prompt).toContain('2026-01-07');
    expect(prompt).toContain('Bench Press, Seated Row');
    expect(prompt).toContain('Missing-date draft prompts still needed: 2026-01-09.');
    expect(prompt).toContain('review-gated');
    expect(prompt).not.toContain('saved records');
  });
});
