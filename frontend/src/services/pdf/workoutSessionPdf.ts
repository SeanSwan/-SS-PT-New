/**
 * workoutSessionPdf
 * =================
 * Branded workout session log (Phase P6) - the set-level truth of one
 * training day (or a whole week) as a studio document: one striped table
 * per session with exercise, set, reps, weight, and RPE columns, on the
 * shared Swan kit. What a client hands a coach or keeps as a receipt.
 */
import type { jsPDF as PdfDoc } from 'jspdf';
import { addAutoTable, getLastAutoTableY } from '../pdfAutoTable';
import {
  SWAN_PDF_BRAND,
  addBrandFooter,
  addBrandHeader,
  addPageIfNeeded,
  addSectionTitle,
  addWrappedText,
  createSwanPdfDoc,
} from './swanPdfKit';
import { resolveBrandIdentity } from './brandIdentity';

export interface SessionPdfSet {
  reps: number | null;
  weight: number | null;
  rpe: number | null;
}

export interface SessionPdfExercise {
  name: string;
  sets: SessionPdfSet[];
}

export interface SessionPdfSession {
  startTime?: string | null;
  duration?: number | null;
  exercises: SessionPdfExercise[];
}

export interface SessionPdfDay {
  dateLabel: string;
  sessions: SessionPdfSession[];
}

export interface WorkoutSessionPdfInput {
  clientName: string;
  /** Document title line, e.g. "Workout - 7/7" or "Week of 6/30". */
  title: string;
  days: SessionPdfDay[];
  /** Client's source — drives white-label branding (move_fitness -> Move Fitness only). */
  clientSource?: string | null;
}

const safeFilenamePart = (value: string): string =>
  value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'Session';

const sessionMetaLine = (session: SessionPdfSession): string => {
  const start = session.startTime?.trim() || 'Session';
  return session.duration != null ? `${start} - ${session.duration} min` : start;
};

const sessionTableBody = (session: SessionPdfSession): string[][] =>
  session.exercises.flatMap((exercise) =>
    // An exercise with no logged sets still HAPPENED — one placeholder row
    // keeps it on the receipt instead of silently vanishing from the PDF.
    exercise.sets.length === 0
      ? [[exercise.name, '-', '-', '-', '-']]
      : exercise.sets.map((set, index) => [
        index === 0 ? exercise.name : '',
        `#${index + 1}`,
        set.reps != null ? String(set.reps) : '-',
        set.weight != null ? `${set.weight} lb` : '-',
        set.rpe != null ? String(set.rpe) : '-',
      ]),
  );

export const renderWorkoutSessionPdf = (doc: PdfDoc, input: WorkoutSessionPdfInput): Blob => {
  const pageW = doc.internal.pageSize.getWidth();
  const brand = resolveBrandIdentity(input.clientSource);
  let y = addBrandHeader(doc, { docLabel: 'WORKOUT SESSION LOG', metaLine: input.clientName }, brand);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SWAN_PDF_BRAND.midnight);
  y = addWrappedText(doc, input.title, 16, y, pageW - 32, 5.5);
  y += 2;

  const totalSessions = input.days.reduce((sum, day) => sum + day.sessions.length, 0);
  if (totalSessions === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SWAN_PDF_BRAND.ink);
    addWrappedText(doc, 'No logged exercise detail in this window.', 16, y, pageW - 32);
  }

  input.days.forEach((day) => {
    if (day.sessions.length === 0) return;
    y = addPageIfNeeded(doc, y, 24);
    y = addSectionTitle(doc, day.dateLabel, y);

    day.sessions.forEach((session) => {
      y = addPageIfNeeded(doc, y, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...SWAN_PDF_BRAND.royal);
      y = addWrappedText(doc, sessionMetaLine(session), 16, y, pageW - 32, 4.5);

      if (session.exercises.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...SWAN_PDF_BRAND.muted);
        y = addWrappedText(doc, 'Session logged without exercise detail.', 16, y, pageW - 32, 4.5);
        y += 2;
        return;
      }

      addAutoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['Exercise', 'Set', 'Reps', 'Weight', 'RPE']],
        body: sessionTableBody(session),
        styles: { font: 'helvetica', fontSize: 8, textColor: SWAN_PDF_BRAND.ink, cellPadding: 1.6 },
        headStyles: { fillColor: SWAN_PDF_BRAND.royal, textColor: SWAN_PDF_BRAND.white, fontSize: 7.5 },
        alternateRowStyles: { fillColor: [244, 248, 252] },
        theme: 'striped',
      });
      y = getLastAutoTableY(doc, y) + 6;
    });
  });

  addBrandFooter(doc, brand);
  return doc.output('blob');
};

export const buildWorkoutSessionPdfFile = async (input: WorkoutSessionPdfInput): Promise<File | null> => {
  if (typeof File === 'undefined') return null;
  const doc = await createSwanPdfDoc();
  const blob = renderWorkoutSessionPdf(doc, input);
  const brand = resolveBrandIdentity(input.clientSource);
  const filename = `${brand.filenamePrefix}-Session-${safeFilenamePart(input.title)}.pdf`;
  return new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
};

/**
 * Approval Vault payload (A3): the exact bytes to preview AND download, plus the
 * resolved brand wordmark for the vault's branding-safety chip. Preview == print.
 */
export const buildWorkoutSessionPdfPreview = async (
  input: WorkoutSessionPdfInput,
): Promise<{ blob: Blob; filename: string; brandWordmark: string } | null> => {
  const file = await buildWorkoutSessionPdfFile(input);
  if (!file) return null;
  return { blob: file, filename: file.name, brandWordmark: resolveBrandIdentity(input.clientSource).wordmark };
};

export const downloadWorkoutSessionPdf = async (input: WorkoutSessionPdfInput): Promise<boolean> => {
  const file = await buildWorkoutSessionPdfFile(input);
  if (!file || typeof document === 'undefined') return false;
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
};
