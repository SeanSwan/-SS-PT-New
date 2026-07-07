import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWorkoutSessionPdfFile } from './workoutSessionPdf';
import type { AutoTableOptions } from '../pdfAutoTable';

const mocks = vi.hoisted(() => ({
  pdfText: [] as string[],
  tables: [] as AutoTableOptions[],
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    setFillColor() {}
    setDrawColor() {}
    rect() {}
    line() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    addPage() {}
    setPage() {}
    getNumberOfPages() { return 1; }
    splitTextToSize(text: string) { return [text]; }
    text(value: string | string[]) {
      mocks.pdfText.push(...(Array.isArray(value) ? value : [value]));
    }
    output() { return new Blob([mocks.pdfText.join('\n')], { type: 'application/pdf' }); }
  },
}));

vi.mock('../pdfAutoTable', () => ({
  addAutoTable: (_doc: unknown, options: AutoTableOptions) => { mocks.tables.push(options); },
  getLastAutoTableY: (_doc: unknown, fallbackY: number) => fallbackY + 20,
}));

describe('workoutSessionPdf', () => {
  beforeEach(() => {
    mocks.pdfText.length = 0;
    mocks.tables.length = 0;
  });

  it('renders set-level truth as one table per session, exercise named on its first set only', async () => {
    const file = await buildWorkoutSessionPdfFile({
      clientName: 'Client FortyTwo',
      title: 'Workout — 07/01',
      days: [{
        dateLabel: '2026-07-01',
        sessions: [{
          startTime: '10:00',
          duration: 45,
          exercises: [
            { name: 'Bench Press', sets: [{ reps: 8, weight: 135, rpe: 7 }, { reps: 8, weight: 140, rpe: null }] },
            { name: 'TRX Row', sets: [{ reps: 12, weight: null, rpe: 6 }] },
          ],
        }],
      }],
    });

    expect(file?.name).toBe('SwanStudios-Session-Workout-07-01.pdf');
    expect(mocks.pdfText).toContain('SwanStudios');
    expect(mocks.pdfText).toContain('WORKOUT SESSION LOG');
    expect(mocks.pdfText).toContain('2026-07-01');
    expect(mocks.pdfText).toContain('10:00 - 45 min');
    expect(mocks.tables).toHaveLength(1);
    expect(mocks.tables[0].head).toEqual([['Exercise', 'Set', 'Reps', 'Weight', 'RPE']]);
    expect(mocks.tables[0].body).toEqual([
      ['Bench Press', '#1', '8', '135 lb', '7'],
      ['', '#2', '8', '140 lb', '-'],
      ['TRX Row', '#1', '12', '-', '6'],
    ]);
  });

  it('is honest about sessions without detail and fully empty windows', async () => {
    await buildWorkoutSessionPdfFile({
      clientName: 'C',
      title: 'Workout — 07/02',
      days: [{ dateLabel: '2026-07-02', sessions: [{ exercises: [] }] }],
    });
    expect(mocks.tables).toHaveLength(0);
    expect(mocks.pdfText.join(' ')).toContain('Session logged without exercise detail');

    mocks.pdfText.length = 0;
    await buildWorkoutSessionPdfFile({ clientName: 'C', title: 'Week of 06/30', days: [] });
    expect(mocks.pdfText.join(' ')).toContain('No logged exercise detail in this window');
  });
});
