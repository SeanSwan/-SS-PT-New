/**
 * FILE: useClientPlanPdfViewer.ts
 * PURPOSE: Own protected workout-plan PDF viewing state for client overview.
 */

import { useCallback } from 'react';
import apiService from '../../../../../services/api.service';
import {
  useProtectedPlanPdfViewer,
  type ProtectedPlanPdfAuthClient,
} from '../../../shared/plan-pdf/useProtectedPlanPdfViewer';
import type { ClientTrainingPlanSlot } from './useCurrentClientWorkout';

const PDF_ERROR = 'Unable to open this workout plan PDF.';

export function useClientPlanPdfViewer() {
  const {
    viewer,
    error,
    openPlanPdf: openProtectedPlanPdf,
    closePlanPdf,
    openPlanPdfExternal,
  } = useProtectedPlanPdfViewer(
    apiService as ProtectedPlanPdfAuthClient,
    { errorMessage: PDF_ERROR },
  );

  const openPlanPdf = useCallback(async (slot: ClientTrainingPlanSlot) => {
    return openProtectedPlanPdf({
      pdfFile: slot.pdfFile,
      planName: slot.planTitle || `${slot.label} Plan`,
      fileName: slot.pdfFile?.fileName || `${slot.label} Workout Plan.pdf`,
      horizonLabel: slot.label,
      nasmPhase: null,
      planningSystem: null,
    });
  }, [openProtectedPlanPdf]);

  return {
    viewer,
    error,
    openPlanPdf,
    closePlanPdf,
    openPlanPdfExternal,
  };
}
