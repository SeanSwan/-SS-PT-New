/**
 * L3 (2026-05-02) — exportPopulatedPlanPDF regression tests
 * ===========================================================
 *
 * Locks in:
 *   1. Save call is fired with a SwanStudios-prefixed filename.
 *   2. Filename embeds horizon-months and a sanitized client name.
 *   3. Move Fitness co-brand mark renders ONLY when clientSource is
 *      'move_fitness' (text-based for now per receipt §G8 - logo image
 *      asset is a non-engineering blocker).
 *   4. Empty weeks[] does not crash; mesocycles + recommendations still
 *      render so pre-L1 plans get a reasonable export.
 *   5. Per-day exercise tables are emitted for each populated day
 *      (asserted via autoTable invocation count).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture jsPDF + autoTable invocations via mock.
const { savedFilenames, autoTableCalls, textCalls } = vi.hoisted(() => ({
  savedFilenames: [] as string[],
  autoTableCalls: [] as Array<{ head: string[][]; bodyRows: number }>,
  textCalls: [] as string[],
}));

vi.mock('jspdf', () => {
  class MockJsPDF {
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };
    lastAutoTable = { finalY: 100 };
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    rect() {}
    line() {}
    text(value: string | string[]) {
      if (Array.isArray(value)) textCalls.push(...value);
      else textCalls.push(String(value));
    }
    splitTextToSize(value: string) { return [value]; }
    getTextWidth() { return 1; }
    addPage() {}
    setPage() {}
    getNumberOfPages() { return 1; }
    save(filename: string) { savedFilenames.push(filename); }
  }
  return { jsPDF: MockJsPDF };
});

vi.mock('jspdf-autotable', () => {
  const recordTable = (doc: { lastAutoTable?: { finalY: number } }, opts: { head?: string[][]; body?: unknown[][] }) => {
    autoTableCalls.push({
      head: opts.head ?? [],
      bodyRows: Array.isArray(opts.body) ? opts.body.length : 0,
    });
    if (doc.lastAutoTable) doc.lastAutoTable.finalY += 10;
    else doc.lastAutoTable = { finalY: 100 };
  };

  return {
    default: recordTable,
    autoTable: recordTable,
    applyPlugin: () => undefined,
  };
});

import { exportPopulatedPlanPDF, exportWorkoutLoggerPDF, type PDFPopulatedPlan } from './pdfExportService';

const buildPlan = (overrides: Partial<PDFPopulatedPlan> = {}): PDFPopulatedPlan => ({
  planSummary: {
    durationWeeks: 8,
    sessionsPerWeek: 3,
    totalSessions: 24,
    primaryGoal: 'general_fitness',
    startingPhase: 1,
  },
  mesocycles: [
    { mesocycle: 1, weeks: '1-4', nasmPhase: 1, phaseName: 'Stabilization Endurance', focus: 'foundation', params: { sets: '3', reps: '12-15', intensity: 'low', tempo: '4-2-1', rest: '60s' } },
    { mesocycle: 2, weeks: '5-8', nasmPhase: 2, phaseName: 'Strength Endurance', focus: 'strength endurance', params: { sets: '3', reps: '8-12', intensity: 'mod', tempo: '2-0-2', rest: '60s' } },
  ],
  weeks: Array.from({ length: 8 }, (_, wIdx) => ({
    weekNumber: wIdx + 1,
    focus: wIdx < 4 ? 'foundation' : 'strength endurance',
    days: Array.from({ length: 3 }, (_, dIdx) => ({
      dayNumber: dIdx + 1,
      name: `W${wIdx + 1}D${dIdx + 1}`,
      focus: 'full body',
      exercises: [
        { exerciseId: 'a', exerciseName: 'Goblet Squat', sets: 3, targetReps: '12', restSeconds: 60 },
        { exerciseId: 'b', exerciseName: 'Push-Up', sets: 3, targetReps: '10', restSeconds: 45 },
      ],
    })),
  })),
  recommendations: [
    'Stay hydrated and prioritize sleep recovery.',
    'Track RPE on every working set.',
  ],
  ...overrides,
});

beforeEach(() => {
  savedFilenames.length = 0;
  autoTableCalls.length = 0;
  textCalls.length = 0;
});

describe('exportPopulatedPlanPDF — file naming', () => {
  it('emits a SwanStudios horizon-token Plan filename for custom durations', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Test Client');
    expect(savedFilenames).toHaveLength(1);
    // 8 weeks maps to the closest SwanStudios horizon token.
    expect(savedFilenames[0]).toBe('SwanStudios-3mo-Plan-Test-Client.pdf');
  });

  it('falls back to "Plan" when no client name is supplied', () => {
    exportPopulatedPlanPDF(buildPlan({ planSummary: {
      durationWeeks: 24, sessionsPerWeek: 4, totalSessions: 96, primaryGoal: 'hypertrophy', startingPhase: 2,
    }}));
    expect(savedFilenames[0]).toBe('SwanStudios-6mo-Plan-Plan.pdf');
  });
});

describe('exportPopulatedPlanPDF — Move Fitness co-branding', () => {
  it('renders the MF co-brand text mark when clientSource is move_fitness', () => {
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', 'move_fitness');
    expect(textCalls.some(t => t.includes('MOVE FITNESS'))).toBe(true);
  });

  it('normalizes human-formatted Move Fitness source values before co-branding', () => {
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', ' Move Fitness ');
    expect(textCalls.some(t => t.includes('MOVE FITNESS'))).toBe(true);

    textCalls.length = 0;
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', 'move-fitness');
    expect(textCalls.some(t => t.includes('MOVE FITNESS'))).toBe(true);
  });

  it('does NOT render the MF mark for swanstudios clients', () => {
    exportPopulatedPlanPDF(buildPlan(), 'SS Client', 'swanstudios');
    expect(textCalls.some(t => t.includes('MOVE FITNESS'))).toBe(false);
  });

  it('does NOT render the MF mark when clientSource is undefined', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Unknown');
    expect(textCalls.some(t => t.includes('MOVE FITNESS'))).toBe(false);
  });
});

describe('exportPopulatedPlanPDF — per-day exercise tables', () => {
  it('emits one autoTable per populated day plus the mesocycle summary table', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Test');
    // 8 weeks × 3 days = 24 day-tables, plus 1 mesocycle summary table = 25.
    expect(autoTableCalls.length).toBe(25);
    // The first table is the Mesocycle summary (8 cols including # / Phase).
    expect(autoTableCalls[0].head[0]).toContain('Phase');
    // Day tables use the Exercise/Sets/Reps/Rest/Notes columns.
    expect(autoTableCalls[1].head[0]).toEqual(['Exercise', 'Sets', 'Reps', 'Rest', 'Notes']);
  });

  it('renders each day\'s exercises as table rows', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Test');
    const dayTables = autoTableCalls.filter(c =>
      Array.isArray(c.head[0]) && c.head[0][0] === 'Exercise');
    // Each day has 2 exercises → 2 rows per day table.
    expect(dayTables.every(t => t.bodyRows === 2)).toBe(true);
  });
});

describe('exportPopulatedPlanPDF — empty weeks edge case', () => {
  it('still produces a PDF when weeks[] is empty (pre-L1 plan)', () => {
    const plan = buildPlan({ weeks: [] });
    exportPopulatedPlanPDF(plan, 'Test');
    expect(savedFilenames).toHaveLength(1);
    // Mesocycle summary table still emitted.
    const heads = autoTableCalls.map(c => c.head[0]?.join(','));
    expect(heads.some(h => h?.includes('Phase'))).toBe(true);
    // No Exercise tables since there are no days.
    expect(autoTableCalls.every(c =>
      !Array.isArray(c.head[0]) || c.head[0][0] !== 'Exercise')).toBe(true);
  });

  it('handles weeks with empty days/sessions gracefully', () => {
    const plan = buildPlan({ weeks: [{ weekNumber: 1, focus: 'rest week', days: [] }] });
    exportPopulatedPlanPDF(plan, 'Test');
    expect(savedFilenames).toHaveLength(1);
    expect(textCalls.some(t => t.includes('no sessions populated'))).toBe(true);
  });
});

describe('exportPopulatedPlanPDF — recommendations', () => {
  it('emits recommendation bullets when present', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Test');
    expect(textCalls.some(t => t.includes('Stay hydrated'))).toBe(true);
    expect(textCalls.some(t => t.includes('Track RPE'))).toBe(true);
  });

  it('omits the recommendations section when array is empty', () => {
    exportPopulatedPlanPDF(buildPlan({ recommendations: [] }), 'Test');
    // The "AI Recommendations" section title should NOT be emitted.
    expect(textCalls.some(t => t.includes('AI Recommendations'))).toBe(false);
  });
});

describe('exportWorkoutLoggerPDF autoTable integration', () => {
  it('uses the jspdf-autotable function export instead of requiring doc.autoTable mutation', () => {
    exportWorkoutLoggerPDF({
      clientName: 'Test Client',
      trainerName: 'Coach Swan',
      date: '2026-05-24',
      sessionNotes: 'Solid control.',
      overallIntensity: 7,
      exercises: [
        {
          exerciseId: 'push-up',
          exerciseName: 'Push-Up',
          formRating: 4,
          painLevel: 0,
          sets: [
            {
              setNumber: 1,
              weight: 0,
              reps: 12,
              rpe: 7,
              restTime: 60,
              formQuality: 4,
            },
          ],
        },
      ],
    });

    expect(autoTableCalls.length).toBeGreaterThan(0);
    expect(savedFilenames[0]).toBe('SwanStudios-Workout-Test-Client-2026-05-24.pdf');
  });
});
