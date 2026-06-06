/**
 * Workout Planner PDF source adapter.
 *
 * Converts the exact saved `planData` payload into a compact SwanStudios PDF
 * file for upload. This keeps attached PDFs tied to saved plan truth, not a
 * stale UI preview snapshot.
 */

import type { jsPDF as PdfDoc } from 'jspdf';
import type { PlannerClient } from './WorkoutPlannerTypes';

interface PdfPlanFallbacks {
  goal: string;
  nasmPhase: number;
  durationWeeks: number;
}

interface BuildPlanPdfFileInput extends PdfPlanFallbacks {
  planData: unknown;
  selectedClient: PlannerClient | null | undefined;
}

interface PrintableExercise {
  exerciseName?: string;
  name?: string;
  sets?: number | unknown[];
  reps?: string | number;
  targetReps?: string | number;
  tempo?: string;
  restTime?: number;
  restSeconds?: number;
}

interface PrintableDay {
  dayNumber?: number;
  name?: string;
  dayName?: string;
  focus?: string;
  exercises?: PrintableExercise[];
}

interface PrintableWeek {
  weekNumber?: number;
  focus?: string;
  days?: PrintableDay[];
  sessions?: PrintableDay[];
}

interface PrintablePlan {
  planSummary: {
    durationWeeks: number;
    sessionsPerWeek: number;
    totalSessions: number;
    primaryGoal: string;
    startingPhase: number;
  };
  weeks: PrintableWeek[];
  recommendations: string[];
}

const BRAND = {
  midnight: [0, 32, 96] as [number, number, number],
  royal: [0, 48, 128] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  gold: [198, 168, 75] as [number, number, number],
  frost: [224, 236, 244] as [number, number, number],
  ink: [31, 41, 55] as [number, number, number],
  muted: [91, 103, 122] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const toPositiveInteger = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];

const getWeekDays = (week: unknown): unknown[] => {
  const raw = toRecord(week);
  if (Array.isArray(raw.days)) return raw.days;
  if (Array.isArray(raw.sessions)) return raw.sessions;
  return [];
};

const countSessions = (weeks: unknown[]): number =>
  weeks.reduce<number>((total, week) => total + getWeekDays(week).length, 0);

const inferSessionsPerWeek = (weeks: unknown[]) =>
  Math.max(1, ...weeks.map((week) => getWeekDays(week).length));

const getClientDisplayName = (selectedClient: PlannerClient | null | undefined) => {
  if (!selectedClient) return 'Client';
  return `${selectedClient.firstName} ${selectedClient.lastName}`.trim() || 'Client';
};

const safeFilenamePart = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'Client';

const getExerciseName = (exercise: PrintableExercise) =>
  exercise.exerciseName || exercise.name || 'Exercise';

const getExerciseDose = (exercise: PrintableExercise) => {
  const sets = Array.isArray(exercise.sets) ? exercise.sets.length : (exercise.sets || 3);
  const reps = exercise.targetReps ?? exercise.reps ?? '8-12';
  const rest = exercise.restSeconds ?? exercise.restTime;
  const restText = rest ? `, ${rest}s rest` : '';
  const tempo = exercise.tempo ? `, tempo ${exercise.tempo}` : '';
  return `${sets} sets x ${reps}${restText}${tempo}`;
};

const buildPdfPlanFromPlanData = (
  planData: unknown,
  fallback: PdfPlanFallbacks,
): PrintablePlan | null => {
  const raw = toRecord(planData);
  const weeks = Array.isArray(raw.weeks) ? raw.weeks : [];
  if (weeks.length === 0) return null;

  const summary = toRecord(raw.planSummary);
  const durationWeeks = toPositiveInteger(summary.durationWeeks, fallback.durationWeeks);
  const sessionsPerWeek = toPositiveInteger(summary.sessionsPerWeek, inferSessionsPerWeek(weeks));
  const totalSessions = toPositiveInteger(summary.totalSessions, countSessions(weeks));
  const primaryGoal = String(summary.primaryGoal || raw.goal || fallback.goal || 'general_fitness');
  const startingPhase = toPositiveInteger(summary.startingPhase, fallback.nasmPhase);

  return {
    planSummary: {
      durationWeeks,
      sessionsPerWeek,
      totalSessions,
      primaryGoal,
      startingPhase,
    },
    weeks: weeks as PrintableWeek[],
    recommendations: toStringArray(raw.recommendations),
  };
};

const addPageIfNeeded = (doc: PdfDoc, y: number, needed = 12) => {
  if (y + needed <= doc.internal.pageSize.getHeight() - 18) return y;
  doc.addPage();
  return 18;
};

const addWrappedText = (doc: PdfDoc, text: string, x: number, y: number, maxWidth: number, lineHeight = 5) => {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

const addSectionTitle = (doc: PdfDoc, title: string, y: number) => {
  const pageW = doc.internal.pageSize.getWidth();
  y = addPageIfNeeded(doc, y, 12);
  doc.setFillColor(...BRAND.frost);
  doc.rect(14, y - 5, pageW - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.midnight);
  doc.text(title, 16, y);
  return y + 10;
};

const addFooter = (doc: PdfDoc) => {
  const totalPages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BRAND.frost);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    doc.text('Generated by SwanStudios', 14, pageH - 6);
    doc.text(`Page ${page} of ${totalPages}`, pageW - 14, pageH - 6, { align: 'right' });
  }
};

const renderPlanPdfBlob = (doc: PdfDoc, plan: PrintablePlan, clientName: string, clientSource?: string) => {
  const pageW = doc.internal.pageSize.getWidth();
  let y = 24;

  doc.setFillColor(...BRAND.midnight);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFillColor(...BRAND.purple);
  doc.rect(0, 18, pageW, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.white);
  doc.text('SwanStudios', 14, 12);
  doc.setFontSize(9);
  doc.text('WORKOUT PLAN PDF', pageW - 14, 9, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.frost);
  doc.text(clientName, pageW - 14, 14, { align: 'right' });

  if (clientSource === 'move_fitness') {
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.gold);
    doc.text('IN PARTNERSHIP WITH MOVE FITNESS', pageW - 14, 21, { align: 'right' });
  }

  y = addSectionTitle(doc, 'Plan Summary', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.ink);
  [
    `Duration: ${plan.planSummary.durationWeeks} weeks`,
    `Sessions per week: ${plan.planSummary.sessionsPerWeek}`,
    `Total sessions: ${plan.planSummary.totalSessions}`,
    `Primary goal: ${plan.planSummary.primaryGoal}`,
    `Starting NASM phase: Phase ${plan.planSummary.startingPhase}`,
  ].forEach((line) => {
    y = addWrappedText(doc, line, 16, y, pageW - 32);
  });

  if (plan.recommendations.length > 0) {
    y += 2;
    y = addSectionTitle(doc, 'Coach Recommendations', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.ink);
    plan.recommendations.slice(0, 8).forEach((recommendation) => {
      y = addPageIfNeeded(doc, y, 10);
      y = addWrappedText(doc, `- ${recommendation}`, 18, y, pageW - 36, 4.5);
    });
  }

  y += 2;
  y = addSectionTitle(doc, 'Weekly Plan', y);
  plan.weeks.forEach((week, weekIndex) => {
    const weekNumber = week.weekNumber || weekIndex + 1;
    y = addPageIfNeeded(doc, y, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.purple);
    y = addWrappedText(doc, `Week ${weekNumber}${week.focus ? ` - ${week.focus}` : ''}`, 16, y, pageW - 32, 5);

    const days = (week.days?.length ? week.days : week.sessions) || [];
    days.forEach((day, dayIndex) => {
      y = addPageIfNeeded(doc, y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.royal);
      const dayName = day.name || day.dayName || `Day ${day.dayNumber || dayIndex + 1}`;
      y = addWrappedText(doc, dayName, 18, y, pageW - 36, 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.ink);
      const exercises = Array.isArray(day.exercises) ? day.exercises : [];
      exercises.slice(0, 12).forEach((exercise) => {
        y = addPageIfNeeded(doc, y, 9);
        y = addWrappedText(doc, `${getExerciseName(exercise)} - ${getExerciseDose(exercise)}`, 22, y, pageW - 42, 4.5);
      });
      if (exercises.length > 12) {
        y = addWrappedText(doc, `+ ${exercises.length - 12} more exercises`, 22, y, pageW - 42, 4.5);
      }
      y += 1;
    });
  });

  addFooter(doc);
  return doc.output('blob');
};

export const buildPlanPdfFileFromPlanData = async ({
  planData,
  selectedClient,
  goal,
  nasmPhase,
  durationWeeks,
}: BuildPlanPdfFileInput): Promise<File | null> => {
  if (typeof File === 'undefined') return null;

  const pdfPlan = buildPdfPlanFromPlanData(planData, { goal, nasmPhase, durationWeeks });
  if (!pdfPlan) return null;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const clientName = getClientDisplayName(selectedClient);
  const blob = renderPlanPdfBlob(doc, pdfPlan, clientName, selectedClient?.clientSource);
  const months = Math.max(1, Math.ceil(pdfPlan.planSummary.durationWeeks / 4));
  const filename = `SwanStudios-${months}mo-Plan-${safeFilenamePart(clientName)}.pdf`;

  return new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
};
