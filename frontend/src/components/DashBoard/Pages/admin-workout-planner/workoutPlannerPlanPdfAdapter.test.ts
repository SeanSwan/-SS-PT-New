import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlanPdfFileFromPlanData } from './workoutPlannerPlanPdfAdapter';

const mocks = vi.hoisted(() => ({
  pdfText: [] as string[],
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };

    setFillColor() {}
    setDrawColor() {}
    rect() {}
    line() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    getTextWidth(text: string) { return text.length; }
    addPage() {}
    setPage() {}
    getNumberOfPages() { return 1; }
    splitTextToSize(text: string) { return [text]; }
    text(value: string | string[]) {
      mocks.pdfText.push(...(Array.isArray(value) ? value : [value]));
    }
    output() {
      return new Blob([mocks.pdfText.join('\n')], { type: 'application/pdf' });
    }
  },
}));

const selectedClient = {
  id: 42,
  firstName: 'Client',
  lastName: 'FortyTwo',
  username: 'client42',
  clientSource: ' Move Fitness ' as const,
};

describe('workout planner PDF source adapter', () => {
  beforeEach(() => {
    mocks.pdfText.length = 0;
  });

  it('builds a PDF file from the same generated planData payload being saved', async () => {
    const file = await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'general_fitness',
      nasmPhase: 1,
      durationWeeks: 1,
      planData: {
        planSummary: {
          durationWeeks: 26,
          sessionsPerWeek: 3,
          totalSessions: 78,
          primaryGoal: 'strength',
          startingPhase: 2,
        },
        weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }] }],
        recommendations: ['Progress only when tempo is consistent.'],
      },
    });

    expect(file?.name).toBe('SwanStudios-6mo-Plan-Client-FortyTwo.pdf');
    expect(mocks.pdfText).toEqual(expect.arrayContaining([
      'Duration: 26 weeks',
      'Total sessions: 78',
      'IN PARTNERSHIP WITH MOVE FITNESS',
      '- Progress only when tempo is consistent.',
      'Split Squat - Sets: 3 | Reps: 8-12 | Tempo: - | Rest: - | Notes: -',
    ]));
  });

  it('adapts manual builder planData into a printable plan summary', async () => {
    const file = await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 1,
      horizonKey: 'one_day',
      planData: {
        goal: 'fat_loss',
        weeks: [
          {
            weekNumber: 1,
            days: [{
              dayNumber: 1,
              name: 'Strength Endurance Workout',
              exercises: [{ exerciseName: 'Step Up', sets: 3, reps: '10' }],
            }],
          },
        ],
      },
    });

    expect(file?.name).toBe('SwanStudios-1d-Plan-Client-FortyTwo.pdf');
    expect(mocks.pdfText).toEqual(expect.arrayContaining([
      'Duration: 1 weeks',
      'Primary goal: fat_loss',
      'Starting NASM phase: Phase 2',
      'Step Up - Sets: 3 | Reps: 10 | Tempo: - | Rest: - | Notes: -',
    ]));
  });

  it('prints safe Swan Coach planning signals without raw fingerprint identity fields', async () => {
    await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 26,
      planData: {
        planSummary: {
          durationWeeks: 26,
          sessionsPerWeek: 3,
          totalSessions: 78,
          primaryGoal: 'strength',
          startingPhase: 2,
        },
        weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Cable Row' }] }] }],
        swanCoachPlanning: {
          dataCategoriesUsed: ['workout history', 'pain/injury entries', 'movement analysis'],
          missingDataCategories: ['nutrition/macros'],
          nasmDomainsApplied: ['OPT', 'Corrective Exercise', 'Behavior Change'],
          safetyGate: {
            status: 'review_required',
            reviewMessage: 'Shoulder surgery history needs coach review before assignment.',
          },
          clientName: 'Private Person',
          email: 'private@example.test',
        },
      },
    });

    expect(mocks.pdfText).toEqual(expect.arrayContaining([
      'Swan Coach Planning Signals',
      'Data used: workout history, readiness profile, movement analysis',
      'Missing data: nutrition/macros',
      'NASM domains: OPT, Corrective Exercise, Behavior Change',
      'Review gate: review_required',
      'Coach review required before assignment.',
    ]));
    expect(mocks.pdfText.join('\n')).not.toMatch(/Private Person|private@example\.test|surgery|injury/i);
  });

  it('returns null when saved planData has no printable weeks', async () => {
    await expect(buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 4,
      planData: { recommendations: ['No schedule yet'] },
    })).resolves.toBeNull();

    expect(mocks.pdfText).toEqual([]);
  });

  it('prints every exercise with tempo and privacy-safe client recommendations', async () => {
    await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 1,
      planData: {
        planSummary: {
          durationWeeks: 1,
          sessionsPerWeek: 1,
          totalSessions: 1,
          primaryGoal: 'strength',
          startingPhase: 2,
        },
        recommendations: [
          'Because of your shoulder surgery and arthritis history, avoid overhead pressing.',
          'Based on your readiness profile, use controlled tempo before adding load.',
        ],
        weeks: [{
          weekNumber: 1,
          days: [{
            dayNumber: 1,
            name: 'Week 1 Day 1',
            exercises: Array.from({ length: 16 }, (_, index) => ({
              exerciseName: `Exercise ${index + 1}`,
              sets: 3,
              targetReps: `${index + 8}`,
              tempo: '3-1-1',
              restSeconds: 45,
              notes: index === 15 ? 'Keep shoulder packed and smooth.' : undefined,
            })),
          }],
        }],
      },
    });

    const text = mocks.pdfText.join('\n');
    expect(text).toContain('Exercise 16');
    expect(text).toContain('Tempo: 3-1-1');
    expect(text).toContain('Notes: Keep shoulder packed and smooth.');
    expect(text).toContain('Based on your readiness profile');
    expect(text).not.toMatch(/surgery|arthritis|history/i);
    expect(text).not.toContain('+ 4 more exercises');
  });
  it('sanitizes private history outside recommendations and renders plans beyond 52 weeks', async () => {
    await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'post-surgery strength',
      nasmPhase: 2,
      durationWeeks: 53,
      planData: {
        planSummary: {
          durationWeeks: 53,
          sessionsPerWeek: 1,
          totalSessions: 53,
          primaryGoal: 'post-surgery strength',
          startingPhase: 2,
        },
        recommendations: [],
        weeks: Array.from({ length: 53 }, (_, index) => ({
          weekNumber: index + 1,
          focus: index === 52 ? 'arthritis rehab focus' : `Week ${index + 1} strength`,
          days: [{
            dayNumber: 1,
            name: index === 52 ? 'Shoulder surgery day' : `Week ${index + 1} Day 1`,
            exercises: [{
              exerciseName: index === 52 ? 'Arthritis rehab press' : `Exercise ${index + 1}`,
              sets: 3,
              targetReps: '10',
              tempo: '3-1-1',
              restSeconds: 45,
              readinessNote: 'Diagnosis history requires conservative loading.',
            }],
          }],
        })),
      },
    });

    const text = mocks.pdfText.join('\n');
    expect(text).toContain('Week 53');
    expect(text).toContain('Trainer modification noted.');
    expect(text).not.toMatch(/surgery|arthritis|injury|diagnosis|history|rehab/i);
  });
});
