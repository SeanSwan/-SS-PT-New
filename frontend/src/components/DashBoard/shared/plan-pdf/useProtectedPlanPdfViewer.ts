/**
 * FILE: useProtectedPlanPdfViewer.ts
 * PURPOSE: Shared authenticated workout-plan PDF viewer state for dashboard plan surfaces.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const PROTECTED_PDF_PATH = /^\/api\/workout-plans\/[^/]+\/pdf\/content\.pdf$/;
const DEFAULT_PDF_ERROR = 'Unable to open this workout plan PDF.';

export interface ProtectedPlanPdfFile {
  url: string;
  fileName?: string | null;
  contentType?: string | null;
  updatedAt?: string | null;
}

export interface ProtectedPlanPdfAuthClient {
  get: (url: string, config?: { responseType?: 'blob' }) => Promise<{ data?: Blob | BlobPart }>;
}

export interface ProtectedPlanPdfViewerState {
  objectUrl: string;
  planName: string;
  fileName: string;
  horizonLabel?: string | null;
  nasmPhase?: number | null;
  planningSystem?: string | null;
}

export interface ProtectedPlanPdfOpenRequest {
  pdfFile?: ProtectedPlanPdfFile | null;
  planName: string;
  fileName?: string | null;
  horizonLabel?: string | null;
  nasmPhase?: number | null;
  planningSystem?: string | null;
}

export const createProtectedPlanPdfObjectUrl = async (
  apiClient: ProtectedPlanPdfAuthClient,
  pdfFile: ProtectedPlanPdfFile,
) => {
  if (!PROTECTED_PDF_PATH.test(pdfFile.url)) {
    throw new Error('Protected workout plan PDF URL required');
  }

  const response = await apiClient.get(pdfFile.url, { responseType: 'blob' });
  const data = response.data;
  const blob = data instanceof Blob ? data : new Blob(
    data === undefined ? [] : [data],
    { type: pdfFile.contentType || 'application/pdf' },
  );
  return URL.createObjectURL(blob);
};

function revokeViewer(viewer: ProtectedPlanPdfViewerState | null) {
  if (viewer?.objectUrl && typeof URL !== 'undefined') {
    URL.revokeObjectURL(viewer.objectUrl);
  }
}

export function useProtectedPlanPdfViewer(
  apiClient: ProtectedPlanPdfAuthClient | null | undefined,
  options: { errorMessage?: string } = {},
) {
  const [viewer, setViewer] = useState<ProtectedPlanPdfViewerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<ProtectedPlanPdfViewerState | null>(null);
  const errorMessage = options.errorMessage || DEFAULT_PDF_ERROR;

  const setNextViewer = useCallback((nextViewer: ProtectedPlanPdfViewerState | null) => {
    revokeViewer(viewerRef.current);
    viewerRef.current = nextViewer;
    setViewer(nextViewer);
  }, []);

  useEffect(() => () => {
    revokeViewer(viewerRef.current);
    viewerRef.current = null;
  }, []);

  const openPlanPdf = useCallback(async (request: ProtectedPlanPdfOpenRequest) => {
    if (!apiClient || !request.pdfFile || typeof URL === 'undefined') {
      setError(errorMessage);
      return null;
    }

    try {
      const objectUrl = await createProtectedPlanPdfObjectUrl(apiClient, request.pdfFile);
      const nextViewer = {
        objectUrl,
        planName: request.planName,
        fileName: request.fileName || request.pdfFile.fileName || `${request.planName}.pdf`,
        horizonLabel: request.horizonLabel ?? null,
        nasmPhase: request.nasmPhase ?? null,
        planningSystem: request.planningSystem ?? null,
      };
      setNextViewer(nextViewer);
      setError(null);
      return nextViewer;
    } catch {
      setError(errorMessage);
      return null;
    }
  }, [apiClient, errorMessage, setNextViewer]);

  const closePlanPdf = useCallback(() => {
    setNextViewer(null);
  }, [setNextViewer]);

  const openPlanPdfExternal = useCallback((objectUrl: string) => {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return {
    viewer,
    error,
    openPlanPdf,
    closePlanPdf,
    openPlanPdfExternal,
  };
}
