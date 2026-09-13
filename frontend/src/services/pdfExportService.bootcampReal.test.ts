// Real jsPDF and autotable rendering. Only the browser download sink is replaced.
import { writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
const capture = vi.hoisted(() => ({ bytes: null as ArrayBuffer | null }));
vi.mock('jspdf', async importOriginal => {
  const actual = await importOriginal<typeof import('jspdf')>();
  function CapturedPDF(options: ConstructorParameters<typeof actual.jsPDF>[0]) {
    const doc = new actual.jsPDF(options);
    doc.save = () => { capture.bytes = doc.output('arraybuffer'); return doc; };
    return doc;
  }
  CapturedPDF.API = actual.jsPDF.API;
  return { ...actual, jsPDF: CapturedPDF };
});
import { exportBootcampPDF, type PDFBootcampPlan } from './pdfExportService';

describe('Bootcamp real PDF serialization', () => {
  it('serializes full-group main work, separate alternatives and a single finisher', () => {
    const row = { durationSec: 35, restSec: 0, sortOrder: 0, isCardioFinisher: false, muscleTargets: 'quads',
      easyVariation: null, mediumVariation: null, hardVariation: null, equipmentRequired: null };
    const data: PDFBootcampPlan = { name: 'Synthetic Review Class', classFormat: 'full_group', dayType: 'full_body', stationCount: 0,
      targetDuration: 20, totalWorkoutMin: 12, totalClassMin: 20, expectedParticipants: 8, stations: [],
      exercises: [
        { ...row, exerciseName: 'Main movement', board: 'main' },
        { ...row, exerciseName: 'Optional replacement', sourceExerciseName: 'Main movement', board: 'alternative' },
        { ...row, exerciseName: 'Single finisher', isCardioFinisher: true, board: 'main' },
      ] };
    exportBootcampPDF(data);
    expect(capture.bytes?.byteLength).toBeGreaterThan(5000);
    const text = new TextDecoder().decode(capture.bytes!);
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text.match(/Single finisher/g)).toHaveLength(1);
    expect(text).toContain('Not Additional Work');
    if (process.env.SWAN_PDF_QA_OUTPUT) writeFileSync(process.env.SWAN_PDF_QA_OUTPUT, Buffer.from(capture.bytes!));
  });
});
