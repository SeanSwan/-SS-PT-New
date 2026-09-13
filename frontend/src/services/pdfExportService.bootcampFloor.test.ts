/**
 * ============================================================================
 * FILE: pdfExportService.bootcampFloor.test.ts — R-H16 (H16), the floor-script PDF.
 *
 * THE REGISTER'S CRITERION (15-audit-findings-and-fix-register.md:57, row R-H16):
 *   "Floor PDF preserves main/alternative/low-impact board semantics, timing, rounds
 *    and one finisher occurrence"
 * and the frontend contract adds the evidence it wants: "actual rendered synthetic PDF QA"
 * (14-frontend-repair-contract.md:542, step FE17).
 *
 * WHAT WAS TRUE BEFORE THIS FILE, read from the code rather than assumed:
 *   * the finisher clause was already satisfied — `pdfExportService.ts:406-422` prints ONE
 *     "Cardio Finishers" section from `exercises.filter(isCardioFinisher)`, so a finisher cannot
 *     multiply per round or per station. Nothing pinned that.
 *   * the alternatives were already satisfied — the station table head (`:385`) carries
 *     `Easy Var.` / `Hard Var.` columns. Nothing pinned that either.
 *   * **rounds were NOT carried at all**: the Class Overview (`:345-351`) printed Format, Day Type,
 *     Duration, Stations and Participants, and neither `PDFBootcampPlan` nor the adapter knew about
 *     `rounds`/`exercisesPerStation`, so the document could not state how many times a circuit
 *     repeats. That is the RED below.
 *
 * DRIVEN THROUGH THE ADAPTER (`exportBootcampTemplatePDF`) on purpose: the mapping from the generated
 * class to the PDF's input is part of the defect, so a test that called the service with a
 * hand-built plan would have missed it.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  textCalls: [] as string[],
  tables: [] as Array<{ head: string[][]; body: unknown[][] }>,
  savedFilenames: [] as string[],
}));

vi.mock('jspdf', () => {
  class MockJsPDF {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    lastAutoTable = { finalY: 100 };
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    rect() {}
    line() {}
    text(value: string | string[]) {
      if (Array.isArray(value)) captured.textCalls.push(...value.map(String));
      else captured.textCalls.push(String(value));
    }
    splitTextToSize(value: string) { return [value]; }
    getTextWidth() { return 1; }
    addPage() {}
    setPage() {}
    getNumberOfPages() { return 1; }
    save(filename: string) { captured.savedFilenames.push(filename); }
    output() { return new Blob(['%PDF-mock'], { type: 'application/pdf' }); }
  }
  return { jsPDF: MockJsPDF };
});

vi.mock('jspdf-autotable', () => {
  const recordTable = (
    doc: { lastAutoTable?: { finalY: number } },
    opts: { head?: string[][]; body?: unknown[][] },
  ) => {
    // The whole BODY is captured here, not just its length: the finisher-once clause is a statement
    // about content, and the existing PDF test's row-count mock could not have checked it.
    captured.tables.push({ head: opts.head ?? [], body: opts.body ?? [] });
    if (doc.lastAutoTable) doc.lastAutoTable.finalY += 10;
    else doc.lastAutoTable = { finalY: 100 };
  };
  return { default: recordTable, autoTable: recordTable, applyPlugin: () => undefined };
});

import type { GeneratedBootcamp } from '../hooks/useBootcampAPI';
import { exportBootcampTemplatePDF } from '../components/BootcampBuilder/BootcampBuilderPdfExport';

const FINISHER = 'Finisher Burnout';

const bootcamp = (): GeneratedBootcamp => ({
  name: 'Floor Script Circuit',
  classFormat: 'stations_4x',
  dayType: 'full_body',
  stationCount: 2,
  exercisesPerStation: 2,
  rounds: 3,
  targetDuration: 50,
  totalWorkoutMin: 32,
  totalClassMin: 45,
  expectedParticipants: 10,
  stations: [
    { stationNumber: 1, stationName: 'Station One', equipmentNeeded: 'Dumbbells', sortOrder: 1 },
    { stationNumber: 2, stationName: 'Station Two', equipmentNeeded: null, sortOrder: 2 },
  ],
  exercises: [
    {
      exerciseName: 'Goblet Squat', durationSec: 45, restSec: 15, sortOrder: 1, stationIndex: 0,
      isCardioFinisher: false, muscleTargets: 'quadriceps', easyVariation: 'Bodyweight Squat',
      hardVariation: 'Front Rack Squat', mediumVariation: null, equipmentRequired: 'Dumbbells',
    },
    {
      exerciseName: 'Push Up', durationSec: 40, restSec: 20, sortOrder: 2, stationIndex: 1,
      isCardioFinisher: false, muscleTargets: 'chest', easyVariation: 'Incline Push Up',
      hardVariation: 'Decline Push Up', mediumVariation: null, equipmentRequired: null,
    },
    {
      exerciseName: FINISHER, durationSec: 60, restSec: 0, sortOrder: 3, stationIndex: 0,
      isCardioFinisher: true, muscleTargets: 'full_body', easyVariation: null,
      hardVariation: null, mediumVariation: null, equipmentRequired: null,
    },
  ],
  overflowPlan: null,
} as unknown as GeneratedBootcamp);

/** Every string the document wrote, whether as free text or inside a table cell. */
const allWrittenText = () => [
  ...captured.textCalls,
  ...captured.tables.flatMap((table) => [
    ...table.head.flat().map(String),
    ...table.body.flat().map((cell) => String(cell)),
  ]),
];

beforeEach(() => {
  captured.textCalls.length = 0;
  captured.tables.length = 0;
  captured.savedFilenames.length = 0;
});

describe('R-H16 — the floor script states the facts a trainer needs on the floor', () => {
  it('states how many rounds and how many exercises per station', () => {
    exportBootcampTemplatePDF(bootcamp());

    const written = allWrittenText();
    // The class repeats 3 times with 2 exercises per station; without these the printed script
    // cannot tell a trainer how long a circuit actually runs. `addKeyValue` writes the label as
    // `label + ':'` in its own text call (`pdfExportService.ts:98-105`), so the element is 'Rounds:'.
    expect(written).toContain('Rounds:');
    expect(written).toContain('3');
    expect(written).toContain('Exercises per Station:');
    expect(written).toContain('2');
  });

  it('prints a cardio finisher exactly once, never per round or per station', () => {
    exportBootcampTemplatePDF(bootcamp());

    const occurrences = allWrittenText().filter((value) => value === FINISHER).length;
    expect(occurrences).toBe(1);
  });

  it('keeps the easier/harder alternatives on the station rows', () => {
    exportBootcampTemplatePDF(bootcamp());

    const stationTable = captured.tables.find((table) => table.head[0]?.includes('Easy Var.'));
    expect(stationTable).toBeDefined();
    expect(stationTable!.head[0]).toContain('Hard Var.');
    const row = stationTable!.body.find((cells) => cells.includes('Goblet Squat'));
    expect(row).toContain('Bodyweight Squat');
    expect(row).toContain('Front Rack Squat');
  });

  it('prints the per-exercise timing, so the script matches the generated class', () => {
    exportBootcampTemplatePDF(bootcamp());

    const stationTable = captured.tables.find((table) => table.head[0]?.includes('Duration'));
    const row = stationTable!.body.find((cells) => cells.includes('Goblet Squat'));
    expect(row).toContain('45s');
    expect(row).toContain('15s');
  });
});
