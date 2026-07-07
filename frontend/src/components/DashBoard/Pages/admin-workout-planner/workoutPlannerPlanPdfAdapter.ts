/**
 * Workout Planner PDF source adapter.
 *
 * Converts the exact saved `planData` payload into a compact SwanStudios PDF
 * file for upload. This keeps attached PDFs tied to saved plan truth, not a
 * stale UI preview snapshot.
 */
import type { jsPDF as PdfDoc } from 'jspdf';
import { normalizeClientSource } from '../../../../utils/clientSource';
import { workoutPlanHorizonForKey } from '../../../../utils/workoutPlanHorizonTokens';
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

const renderPlanPdfBlob = (doc: PdfDoc, plan: PrintablePlan, clientName: string, clientSource?: string) => {
  const pageW = doc.internal.pageSize.getWidth();
  let y = addBrandHeader(doc, {
    docLabel: 'WORKOUT PLAN PDF',
    metaLine: clientName,
    accentLine: normalizeClientSource(clientSource) === 'move_fitness'
      ? 'IN PARTNERSHIP WITH MOVE FITNESS'
      : undefined,
  });

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

  addBrandFooter(doc);
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
  const blob = renderPlanPdfBlob(doc, pdfPlan, clientName, selectedClient?.clientSource);
  const horizonToken = workoutPlanHorizonForKey(horizonKey, pdfPlan.planSummary.durationWeeks).token;
  const filename = `SwanStudios-${horizonToken}-Plan-${safeFilenamePart(clientName)}.pdf`;

  return new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
};
