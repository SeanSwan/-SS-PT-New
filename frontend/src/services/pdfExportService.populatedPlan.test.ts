/**
 * L3 (2026-05-02) — exportPopulatedPlanPDF regression tests
 * ===========================================================
 *
 * Locks in:
 *   1. Save call fires with a brand-prefixed filename (SwanStudios, or
 *      MoveFitness for a fully white-labeled Move Fitness client).
 *   2. Filename embeds horizon-months and a sanitized client name.
 *   3. Client-type white-label (A1a): a move_fitness client's plan shows
 *      Move Fitness branding and ZERO SwanStudios anywhere (header, footer,
 *      filename, recommendations heading); swanstudios / external / unknown
 *      fail safe to SwanStudios and never white-label to Move Fitness.
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
    output() { return new Blob(['%PDF-mock'], { type: 'application/pdf' }); }
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

import { buildPopulatedPlanPdfBlob, exportPopulatedPlanPDF, exportWorkoutLoggerPDF, type PDFPopulatedPlan } from './pdfExportService';

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

  it('white-labels the filename for Move Fitness clients (no SwanStudios in the saved name)', () => {
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', 'move_fitness');
    expect(savedFilenames[0]).toBe('MoveFitness-3mo-Plan-MF-Client.pdf');
    expect(savedFilenames[0]).not.toContain('SwanStudios');
  });
});

describe('exportPopulatedPlanPDF — client-type branding (white-label)', () => {
  it('fully white-labels a Move Fitness client: Move Fitness wordmark + credit, zero SwanStudios', () => {
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', 'move_fitness');
    // Header wordmark + footer credit read Move Fitness...
    expect(textCalls.some(t => t.includes('Move Fitness'))).toBe(true);
    expect(textCalls.some(t => t.includes('Generated by Move Fitness'))).toBe(true);
    // ...the recommendations heading is brand-neutral (no "Swan Coach")...
    expect(textCalls.some(t => t.includes('Coaching Recommendations'))).toBe(true);
    expect(textCalls.some(t => t.includes('Swan Coach'))).toBe(false);
    // ...and NOTHING SwanStudios (nor the retired all-caps co-brand accent) reaches an MF member.
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(false);
    expect(textCalls.some(t => t.toLowerCase().includes('in partnership'))).toBe(false);
  });

  it('white-labels normalized Move Fitness source values (spacing / hyphen)', () => {
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', ' Move Fitness ');
    expect(textCalls.some(t => t.includes('Generated by Move Fitness'))).toBe(true);
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(false);

    textCalls.length = 0;
    exportPopulatedPlanPDF(buildPlan(), 'MF Client', 'move-fitness');
    expect(textCalls.some(t => t.includes('Generated by Move Fitness'))).toBe(true);
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(false);
  });

  it('brands a swanstudios client as SwanStudios with no Move Fitness mark', () => {
    exportPopulatedPlanPDF(buildPlan(), 'SS Client', 'swanstudios');
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(true);
    expect(textCalls.some(t => t.includes('Swan Coach Recommendations'))).toBe(true);
    expect(textCalls.some(t => t.includes('Move Fitness'))).toBe(false);
  });

  it('fails safe to SwanStudios for an external client (never white-labels to Move Fitness)', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Ext Client', 'external');
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(true);
    expect(textCalls.some(t => t.includes('Move Fitness'))).toBe(false);
  });

  it('fails safe to SwanStudios when clientSource is undefined', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Unknown');
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(true);
    expect(textCalls.some(t => t.includes('Move Fitness'))).toBe(false);
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
  it('emits recommendation bullets under the Swan Coach heading when present', () => {
    exportPopulatedPlanPDF(buildPlan(), 'Test');
    // Client-facing branding rule: never surface "AI"; use Swan Coach.
    expect(textCalls.some(t => t.includes('Swan Coach Recommendations'))).toBe(true);
    expect(textCalls.some(t => t.includes('AI Recommendations'))).toBe(false);
    expect(textCalls.some(t => t.includes('Stay hydrated'))).toBe(true);
    expect(textCalls.some(t => t.includes('Track RPE'))).toBe(true);
  });

  it('omits the recommendations section when array is empty', () => {
    exportPopulatedPlanPDF(buildPlan({ recommendations: [] }), 'Test');
    // The "Swan Coach Recommendations" section title should NOT be emitted.
    expect(textCalls.some(t => t.includes('Swan Coach Recommendations'))).toBe(false);
  });
});

describe('buildPopulatedPlanPdfBlob — Approval Vault preview (A3)', () => {
  it('returns a PDF blob + brand-prefixed filename without downloading (no save call)', () => {
    const result = buildPopulatedPlanPdfBlob(buildPlan(), 'Test Client', 'swanstudios');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe('application/pdf');
    expect(result.filename).toBe('SwanStudios-3mo-Plan-Test-Client.pdf');
    expect(result.brandWordmark).toBe('SwanStudios');
    // Preview must NOT trigger the browser download path.
    expect(savedFilenames).toHaveLength(0);
  });

  it('white-labels the preview blob for a Move Fitness client (wordmark + filename)', () => {
    const result = buildPopulatedPlanPdfBlob(buildPlan(), 'MF Client', 'move_fitness');
    expect(result.filename).toBe('MoveFitness-3mo-Plan-MF-Client.pdf');
    expect(result.filename).not.toContain('SwanStudios');
    expect(result.brandWordmark).toBe('Move Fitness');
    // Header/footer text is white-labeled just like the download path.
    expect(textCalls.some(t => t.includes('Generated by Move Fitness'))).toBe(true);
    expect(textCalls.some(t => t.includes('SwanStudios'))).toBe(false);
  });

  it('fails safe to SwanStudios branding when the source is undefined', () => {
    const result = buildPopulatedPlanPdfBlob(buildPlan(), 'Unknown');
    expect(result.brandWordmark).toBe('SwanStudios');
    expect(result.filename).toContain('SwanStudios');
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
