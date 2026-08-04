/**
 * useEquipmentGapReport — data hook for the Equipment IQ panel (Slice S8)
 * =======================================================================
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md §10a #4/#11
 *
 * Mirrors the S6 contract exactly (verified against
 * backend/routes/equipmentInsightsRoutes.mjs + services/equipmentGapReport.mjs):
 *   GET /api/equipment-insights/profile/:profileId/gap-report
 *     -> { success: true, report: EquipmentGapReport }
 * A null profileId is the idle state: no fetch fires, everything stays empty.
 */
import { useCallback, useEffect, useState } from 'react';
import apiService from '../../services/api.service';

export interface GapReportPattern {
  pattern: string;
  /** 0..1 (round2 on the server). */
  coverage: number;
  itemCount: number;
  exampleItems: string[];
}

export interface GapReportSuggestion {
  addition: string;
  unlocksPatterns: string[];
  reason: string;
}

export interface EquipmentGapReport {
  profileId: number;
  patterns: GapReportPattern[];
  overallCoverage: number;
  weakestPattern: string;
  suggestions: GapReportSuggestion[];
}

export interface UseEquipmentGapReportResult {
  report: EquipmentGapReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEquipmentGapReport(
  profileId: number | null,
): UseEquipmentGapReportResult {
  const [report, setReport] = useState<EquipmentGapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    if (profileId == null) {
      setReport(null);
      setError(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const response = await apiService.get(
          `/api/equipment-insights/profile/${profileId}/gap-report`,
        );
        if (cancelled) return;
        if (response.data?.success && response.data.report) {
          setReport(response.data.report as EquipmentGapReport);
        } else {
          setReport(null);
          setError('Could not load Equipment IQ.');
        }
      } catch {
        if (!cancelled) {
          setReport(null);
          setError('Could not load Equipment IQ.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId, fetchNonce]);

  const refetch = useCallback(() => setFetchNonce((n) => n + 1), []);

  return { report, loading, error, refetch };
}

export default useEquipmentGapReport;
