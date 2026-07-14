/**
 * Workout Planner PDF source adapter.
 *
 * Converts the exact saved `planData` payload into a compact SwanStudios PDF
 * file for upload. This keeps attached PDFs tied to saved plan truth, not a
 * stale UI preview snapshot.
 */
import type { jsPDF as PdfDoc } from 'jspdf';
import { workoutPlanHorizonForKey } from '../../../../utils/workoutPlanHorizonTokens';
import { resolveBrandIdentity, type BrandIdentity } from '../../../../services/pdf/brandIdentity';
import {
  SWAN_PDF_BRAND as BRAND,
  addBrandFooter,
  addBrandHeader,
  addPageIfNeeded,
  addSectionTitle,
  addWrappedText,
} from '../../../../services/pdf/swanPdfKit';
import type { BuildPlanPdfFileInput, PrintablePlan } from './workoutPlannerPlanPdfData';
import {
  buildPdfPlanFromPlanData,
  clientSafePdfString,
  getClientDisplayName,
  getExerciseDose,
  getExerciseName,
  safeFilenamePart,
} from './workoutPlannerPlanPdfData';
import { renderPlanningSignalLines } from './workoutPlannerPlanPdfSignals';

const renderPlanPdfBlob = (doc: PdfDoc, plan: PrintablePlan, clientName: string, brand: BrandIdentity) => {
  const pageW = doc.internal.pageSize.getWidth();
  // Brand-resolved header/footer: Move Fitness clients see "Sean Swan at
  // Move Fitness" and zero SwanStudios marks (white-label, Sean 2026-07-14).
  let y = addBrandHeader(doc, {
    docLabel: 'WORKOUT PLAN PDF',
    metaLine: clientName,
  }, brand);

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

  y = renderPlanningSignalLines({
    doc, lines: plan.planningSignalLines, y, pageW, ink: BRAND.ink, addSectionTitle, addWrappedText,
  });

  if (plan.recommendations.length > 0) {
    y += 2;
    y = addSectionTitle(doc, 'Coach Recommendations', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.ink);
    // fallow-ignore-next-line complexity
    plan.recommendations.forEach((recommendation) => {
      y = addPageIfNeeded(doc, y, 10);
      y = addWrappedText(doc, `- ${recommendation}`, 18, y, pageW - 36, 4.5);
    });
  }

  y += 2;
  y = addSectionTitle(doc, 'Weekly Plan', y);
  // fallow-ignore-next-line complexity
  plan.weeks.forEach((week, weekIndex) => {
    const weekNumber = week.weekNumber || weekIndex + 1;
    y = addPageIfNeeded(doc, y, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.purple);
    const weekFocus = clientSafePdfString(week.focus, '', 120);
    y = addWrappedText(doc, `Week ${weekNumber}${weekFocus ? ` - ${weekFocus}` : ''}`, 16, y, pageW - 32, 5);

    const days = (week.days?.length ? week.days : week.sessions) || [];
    // fallow-ignore-next-line complexity
    days.forEach((day, dayIndex) => {
      y = addPageIfNeeded(doc, y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.royal);
      const dayName = clientSafePdfString(day.name || day.dayName, `Day ${day.dayNumber || dayIndex + 1}`, 140);
      y = addWrappedText(doc, dayName, 18, y, pageW - 36, 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.ink);
      const exercises = Array.isArray(day.exercises) ? day.exercises : [];
      // fallow-ignore-next-line complexity
      exercises.forEach((exercise) => {
        y = addPageIfNeeded(doc, y, 9);
        y = addWrappedText(doc, `${getExerciseName(exercise)} - ${getExerciseDose(exercise)}`, 22, y, pageW - 42, 4.5);
      });
      y += 1;
    });
  });

  // Exercise Guide appendix: every unique movement + the best YouTube search
  // to learn it, until the SwanStudios video library covers them all. The
  // richer per-exercise how-to (steps + cues + hosted video) rides the
  // server-generated attached PDF, which has Exercise-DB access.
  const uniqueNames: string[] = [];
  const seen = new Set<string>();
  plan.weeks.forEach((week) => {
    ((week.days?.length ? week.days : week.sessions) || []).forEach((day) => {
      (Array.isArray(day.exercises) ? day.exercises : []).forEach((exercise) => {
        const name = getExerciseName(exercise);
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return;
        seen.add(key);
        uniqueNames.push(name);
      });
    });
  });
  if (uniqueNames.length > 0) {
    y += 2;
    y = addSectionTitle(doc, 'Exercise Guide - Learn Each Movement', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.ink);
    uniqueNames.slice(0, 60).forEach((name) => {
      y = addPageIfNeeded(doc, y, 9);
      y = addWrappedText(doc, `${name} - YouTube search: "${name} exercise proper form tutorial"`, 18, y, pageW - 36, 4.5);
    });
  }

  addBrandFooter(doc, brand);
  return doc.output('blob');
};

export const buildPlanPdfFileFromPlanData = async ({
  planData,
  selectedClient,
  goal,
  nasmPhase,
  durationWeeks,
  horizonKey,
}: BuildPlanPdfFileInput): Promise<File | null> => {
  if (typeof File === 'undefined') return null;

  const pdfPlan = buildPdfPlanFromPlanData(planData, { goal, nasmPhase, durationWeeks });
  if (!pdfPlan) return null;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const clientName = getClientDisplayName(selectedClient);
  const brand = resolveBrandIdentity(selectedClient?.clientSource);
  const blob = renderPlanPdfBlob(doc, pdfPlan, clientName, brand);
  const horizonToken = workoutPlanHorizonForKey(horizonKey, pdfPlan.planSummary.durationWeeks).token;
  const filename = `${brand.filenamePrefix}-${horizonToken}-Plan-${safeFilenamePart(clientName)}.pdf`;

  return new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
};
