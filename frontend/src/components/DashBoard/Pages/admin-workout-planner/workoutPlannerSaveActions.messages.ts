import type { PdfAttachResult } from './useWorkoutPlannerSaveActions.types';

export function saveStatusText(base: string, pdfResult: PdfAttachResult) {
  if (pdfResult === 'queued') return base + ' PDF generation queued.';
  if (pdfResult === 'attached') return base + ' PDF attached from the saved plan.';
  if (pdfResult === 'failed') return base + ' PDF attachment failed; update the PDF from Saved Plans.';
  return base;
}
