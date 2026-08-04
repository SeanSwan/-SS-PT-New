/**
 * ============================================================================
 * FILE: NutritionTabContent.tsx
 * PURPOSE: Phase 4A coach nutrition tab orchestrator — composes the HY3
 *          30-second IA: status header -> adherence hero -> actual-vs-target
 *          -> date stepper (+7-day range) -> trend -> verifiable diary.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * DATA CONTRACT (S1.2/S1.3): GET /api/macros/client-timeline supports
 * ?userId&date=YYYY-MM-DD OR ?userId&start&end (<=31 days) and returns
 * { entries, target|null, adherence } — target/adherence parsed defensively.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../../../services/api.service';
import { useAuth } from '../../../../../context/AuthContext';
import { formatLocalCalendarDate } from '../nutritionDate';
import { getNumericClientId } from './clientTabId';
import {
  buildNutritionTimelineRows,
  type NutritionTimelineEntry,
  type NutritionTimelineRow,
} from './NutritionTabContent.logic';
import {
  buildActualVsTargetRows,
  buildAdherenceHeroView,
  buildLastLogView,
  buildNutritionRangeParams,
  buildNutritionTrendPoints,
  stepNutritionDate,
  type NutritionAdherenceSummary,
  type NutritionTargetSummary,
} from './NutritionCoachTab.logic';
import CoachClientNutritionHeader from './CoachClientNutritionHeader';
import NutritionAdherenceHero from './NutritionAdherenceHero';
import NutritionActualVsTargetGrid from './NutritionActualVsTargetGrid';
import NutritionDateStepper from './NutritionDateStepper';
import NutritionTrendPanel from './NutritionTrendPanel';
import NutritionDiaryList from './NutritionDiaryList';
import {
  NutritionTimelineShell,
  NutritionTimelineState,
} from './NutritionTabContent.styles';
import {
  NutritionErrorCard,
  NutritionErrorCopy,
  NutritionRetryButton,
  NutritionSkeletonBlock,
  NutritionSkeletonStack,
} from './NutritionCoachTab.styles';

interface NutritionTabContentProps {
  clientId: number | string;
  clientName?: string;
}

type TimelineState = 'loading' | 'loaded' | 'error';

interface TimelineResponse {
  data?: {
    success?: boolean;
    entries?: NutritionTimelineEntry[];
    target?: NutritionTargetSummary | null;
    adherence?: NutritionAdherenceSummary | null;
  };
}

interface TimelineVerifyResponse {
  data?: {
    success?: boolean;
    entry?: NutritionTimelineEntry;
  };
}

interface TimelinePayload {
  entries: NutritionTimelineEntry[];
  target: NutritionTargetSummary | null;
  adherence: NutritionAdherenceSummary | null;
}

const getPayloadFromResponse = (response: TimelineResponse): TimelinePayload => {
  if (!response.data?.success || !Array.isArray(response.data.entries)) {
    throw new Error('Nutrition timeline response was not successful');
  }
  return {
    entries: response.data.entries,
    target: response.data.target && typeof response.data.target === 'object' ? response.data.target : null,
    adherence: response.data.adherence && typeof response.data.adherence === 'object' ? response.data.adherence : null,
  };
};

const getVerifiedEntryFromResponse = (response: TimelineVerifyResponse): NutritionTimelineEntry => {
  if (!response.data?.success || !response.data.entry) {
    throw new Error('Nutrition verify response was not successful');
  }
  return { ...response.data.entry, verified: true };
};

const NutritionTabContent: React.FC<NutritionTabContentProps> = ({ clientId, clientName = 'Selected client' }) => {
  const numericClientId = useMemo(() => getNumericClientId(clientId), [clientId]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSetTargets = user?.role === 'admin' || user?.role === 'trainer';
  const todayIso = useMemo(() => formatLocalCalendarDate(), []);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [rangeMode, setRangeMode] = useState(false);
  const [payload, setPayload] = useState<TimelinePayload>({ entries: [], target: null, adherence: null });
  const [status, setStatus] = useState<TimelineState>('loading');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const range = useMemo(() => buildNutritionRangeParams(selectedDate, 7), [selectedDate]);

  useEffect(() => {
    if (!numericClientId) return;
    let cancelled = false;

    const loadTimeline = async () => {
      setStatus('loading');
      setVerifyError(null);
      try {
        const params = rangeMode
          ? new URLSearchParams({ start: range.start, end: range.end, userId: String(numericClientId) })
          : new URLSearchParams({ date: selectedDate, userId: String(numericClientId) });
        const response = await apiService.get(`/api/macros/client-timeline?${params.toString()}`);
        if (cancelled) return;
        setPayload(getPayloadFromResponse(response as TimelineResponse));
        setStatus('loaded');
      } catch {
        if (cancelled) return;
        setPayload({ entries: [], target: null, adherence: null });
        setStatus('error');
      }
    };

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [numericClientId, selectedDate, rangeMode, range, reloadKey]);

  const rows = useMemo(
    () => buildNutritionTimelineRows(payload.entries, { withDateLabels: rangeMode }),
    [payload.entries, rangeMode],
  );
  const heroView = useMemo(
    () => buildAdherenceHeroView(payload.adherence, rangeMode ? 'range' : 'day'),
    [payload.adherence, rangeMode],
  );
  const targetResult = useMemo(
    () => buildActualVsTargetRows(payload.entries, payload.target, rangeMode ? 'range' : 'day'),
    [payload.entries, payload.target, rangeMode],
  );
  const trendPoints = useMemo(
    () => buildNutritionTrendPoints(payload.entries, range.start, range.end),
    [payload.entries, range],
  );
  const lastLog = useMemo(() => buildLastLogView(payload.entries, todayIso), [payload.entries, todayIso]);

  const handleVerify = async (row: NutritionTimelineRow) => {
    if (!row.canVerify || verifyingId !== null) return;
    setVerifyError(null);
    setVerifyingId(row.id);

    try {
      const response = await apiService.patch(`/api/macros/client-timeline/${encodeURIComponent(String(row.id))}/verify`);
      const verifiedEntry = getVerifiedEntryFromResponse(response as TimelineVerifyResponse);
      setPayload((current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          String(entry.id) === String(row.id) ? { ...entry, ...verifiedEntry, verified: true } : entry
        ),
      }));
    } catch {
      setVerifyError('Nutrition verification unavailable');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetTargets = () => {
    navigate(`/dashboard/${user?.role}/nutrition/${numericClientId}`);
  };

  if (!numericClientId) {
    return <NutritionTimelineState>Nutrition identity unavailable</NutritionTimelineState>;
  }

  return (
    <NutritionTimelineShell aria-busy={status === 'loading'}>
      <CoachClientNutritionHeader
        clientName={clientName}
        lastLog={lastLog}
        canSetTargets={canSetTargets}
        onSetTargets={handleSetTargets}
      />

      {status === 'loading' ? (
        <NutritionSkeletonStack role="status" aria-label="Loading nutrition timeline">
          <NutritionSkeletonBlock $height={84} />
          <NutritionSkeletonBlock $height={148} />
          <NutritionSkeletonBlock $height={64} />
        </NutritionSkeletonStack>
      ) : status === 'error' ? (
        <NutritionErrorCard role="alert">
          <NutritionErrorCopy>The swan lost its way — nutrition timeline unavailable.</NutritionErrorCopy>
          <NutritionRetryButton type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Retry
          </NutritionRetryButton>
        </NutritionErrorCard>
      ) : (
        <>
          <NutritionAdherenceHero view={heroView} />
          <NutritionActualVsTargetGrid
            result={targetResult}
            canSetTargets={canSetTargets}
            onSetTargets={handleSetTargets}
          />
          <NutritionDateStepper
            dateIso={selectedDate}
            todayIso={todayIso}
            rangeMode={rangeMode}
            onStep={(delta) => setSelectedDate((current) => stepNutritionDate(current, delta, todayIso))}
            onToggleRange={() => setRangeMode((current) => !current)}
          />
          {rangeMode ? (
            <NutritionTrendPanel
              points={trendPoints}
              targetCalories={
                payload.target && typeof payload.target.dailyCalories === 'number' && payload.target.dailyCalories > 0
                  ? payload.target.dailyCalories
                  : null
              }
            />
          ) : null}

          {verifyError ? (
            <NutritionTimelineState role="alert">{verifyError}</NutritionTimelineState>
          ) : null}

          {rows.length === 0 ? (
            <NutritionTimelineState role="status">
              {rangeMode ? 'No meals logged in this range' : 'No meals logged for this date'}
            </NutritionTimelineState>
          ) : (
            <NutritionDiaryList rows={rows} verifyingId={verifyingId} onVerify={handleVerify} />
          )}
        </>
      )}
    </NutritionTimelineShell>
  );
};

export default NutritionTabContent;
