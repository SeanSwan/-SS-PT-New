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
  clientSource: 'move_fitness' as const,
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
          durationWeeks: 24,
          sessionsPerWeek: 3,
          totalSessions: 72,
          primaryGoal: 'strength',
          startingPhase: 2,
        },
        weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }] }],
        recommendations: ['Progress only when tempo is consistent.'],
      },
    });

    expect(file?.name).toBe('SwanStudios-6mo-Plan-Client-FortyTwo.pdf');
    expect(mocks.pdfText).toEqual(expect.arrayContaining([
      'Duration: 24 weeks',
      'Total sessions: 72',
      '- Progress only when tempo is consistent.',
      'Split Squat - 3 sets x 8-12',
    ]));
  });

  it('adapts manual builder planData into a printable plan summary', async () => {
    await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 1,
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

    expect(mocks.pdfText).toEqual(expect.arrayContaining([
      'Duration: 1 weeks',
      'Primary goal: fat_loss',
      'Starting NASM phase: Phase 2',
      'Step Up - 3 sets x 10',
    ]));
  });

  it('prints safe Swan Coach planning signals without raw fingerprint identity fields', async () => {
    await buildPlanPdfFileFromPlanData({
      selectedClient,
      goal: 'strength',
      nasmPhase: 2,
      durationWeeks: 24,
      planData: {
        planSummary: {
          durationWeeks: 24,
          sessionsPerWeek: 3,
          totalSessions: 72,
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
            reviewMessage: 'Coach review required before assignment.',
          },
          clientName: 'Private Person',
          email: 'private@example.test',
        },
      },
    });

    expect(mocks.pdfText).toEqual(expect.arrayContaining([
      'Swan Coach Planning Signals',
      'Data used: workout history, pain/injury entries, movement analysis',
      'Missing data: nutrition/macros',
      'NASM domains: OPT, Corrective Exercise, Behavior Change',
      'Review gate: review_required',
      'Coach review required before assignment.',
    ]));
    expect(mocks.pdfText.join('\n')).not.toMatch(/Private Person|private@example\.test/i);
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
});
