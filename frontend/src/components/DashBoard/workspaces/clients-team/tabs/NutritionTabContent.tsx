import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../../../services/api.service';
import { useAuth } from '../../../../../context/AuthContext';
import { formatLocalCalendarDate } from '../nutritionDate';
import { getNumericClientId } from './clientTabId';
import {
  buildNutritionProvenanceSummary,
  buildNutritionTimelineRows,
  type NutritionTimelineEntry,
  type NutritionTimelineRow,
} from './NutritionTabContent.logic';
import {
  NutritionProvenanceCard,
  NutritionProvenanceCopy,
  NutritionProvenanceGrid,
  NutritionProvenanceLabel,
  NutritionProvenanceMetric,
  NutritionProvenanceTitle,
  NutritionTimelineActions,
  NutritionTimelineBadge,
  NutritionTimelineBadges,
  NutritionTimelineClient,
  NutritionTimelineDate,
  NutritionTimelineDescription,
  NutritionTimelineHeader,
  NutritionTimelineList,
  NutritionTimelineMeal,
  NutritionTimelineMeta,
  NutritionTimelineRowCard,
  NutritionTimelineRowHeader,
  NutritionTimelineShell,
  NutritionTimelineState,
  NutritionTimelineTime,
  NutritionTimelineTitle,
  NutritionTimelineTitleGroup,
  NutritionTimelineVerifyButton,
  SetTargetsButton,
} from './NutritionTabContent.styles';

interface NutritionTabContentProps {
  clientId: number | string;
  clientName?: string;
}

type TimelineState = 'loading' | 'loaded' | 'error';

interface TimelineResponse {
  data?: {
    success?: boolean;
    entries?: NutritionTimelineEntry[];
  };
}

interface TimelineVerifyResponse {
  data?: {
    success?: boolean;
    entry?: NutritionTimelineEntry;
  };
}

const getEntriesFromResponse = (response: TimelineResponse): NutritionTimelineEntry[] => {
  if (!response.data?.success || !Array.isArray(response.data.entries)) {
    throw new Error('Nutrition timeline response was not successful');
  }
  return response.data.entries;
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
  const [entries, setEntries] = useState<NutritionTimelineEntry[]>([]);
  const [status, setStatus] = useState<TimelineState>('loading');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | string | null>(null);
  const date = useMemo(() => formatLocalCalendarDate(), []);
  const rows = useMemo(() => buildNutritionTimelineRows(entries), [entries]);

  useEffect(() => {
    if (!numericClientId) return;
    let cancelled = false;

    const loadTimeline = async () => {
      setStatus('loading');
      setVerifyError(null);
      try {
        const params = new URLSearchParams({ date, userId: String(numericClientId) });
        const response = await apiService.get(`/api/macros/client-timeline?${params.toString()}`);
        if (cancelled) return;
        setEntries(getEntriesFromResponse(response as TimelineResponse));
        setStatus('loaded');
      } catch {
        if (cancelled) return;
        setEntries([]);
        setStatus('error');
      }
    };

    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [date, numericClientId]);

  const handleVerify = async (row: NutritionTimelineRow) => {
    if (!row.canVerify || verifyingId !== null) return;
    setVerifyError(null);
    setVerifyingId(row.id);

    try {
      const response = await apiService.patch(`/api/macros/client-timeline/${encodeURIComponent(String(row.id))}/verify`);
      const verifiedEntry = getVerifiedEntryFromResponse(response as TimelineVerifyResponse);
      setEntries((currentEntries) => currentEntries.map((entry) =>
        String(entry.id) === String(row.id) ? { ...entry, ...verifiedEntry, verified: true } : entry
      ));
    } catch {
      setVerifyError('Nutrition verification unavailable');
    } finally {
      setVerifyingId(null);
    }
  };

  if (!numericClientId) {
    return <NutritionTimelineState>Nutrition identity unavailable</NutritionTimelineState>;
  }

  const stateMessage = status === 'loading'
    ? 'Loading nutrition timeline...'
    : status === 'error'
      ? 'Nutrition timeline unavailable'
      : rows.length === 0
        ? 'No meals logged for this date'
        : null;
  const provenanceSummary = buildNutritionProvenanceSummary(entries);

  return (
    <NutritionTimelineShell aria-busy={status === 'loading'}>
      <NutritionTimelineHeader>
        <NutritionTimelineTitleGroup>
          <NutritionTimelineTitle>Nutrition Timeline</NutritionTimelineTitle>
          <NutritionTimelineClient>{clientName}</NutritionTimelineClient>
        </NutritionTimelineTitleGroup>
        {canSetTargets && numericClientId && (
          <SetTargetsButton
            type="button"
            onClick={() => navigate(`/dashboard/${user?.role}/nutrition/${numericClientId}`)}
            aria-label={`Set nutrition targets for ${clientName}`}
          >
            <Target size={14} aria-hidden="true" />
            Set targets
          </SetTargetsButton>
        )}
        <NutritionTimelineDate>{date}</NutritionTimelineDate>
      </NutritionTimelineHeader>

      {status === 'loaded' ? (
        <NutritionProvenanceCard role="region" aria-label="Nutrition provenance">
          <NutritionProvenanceTitle>Provenance</NutritionProvenanceTitle>
          <NutritionProvenanceGrid>
            <NutritionProvenanceMetric>
              <NutritionProvenanceLabel>Verification</NutritionProvenanceLabel>
              <strong>{provenanceSummary.verificationLine}</strong>
            </NutritionProvenanceMetric>
            <NutritionProvenanceMetric>
              <NutritionProvenanceLabel>Sources</NutritionProvenanceLabel>
              <strong>{provenanceSummary.sourceLine}</strong>
            </NutritionProvenanceMetric>
          </NutritionProvenanceGrid>
          <NutritionProvenanceCopy>Source and verification status only</NutritionProvenanceCopy>
        </NutritionProvenanceCard>
      ) : null}

      {verifyError ? (
        <NutritionTimelineState role="alert">{verifyError}</NutritionTimelineState>
      ) : null}

      {stateMessage ? (
        <NutritionTimelineState role={status === 'error' ? 'alert' : 'status'}>{stateMessage}</NutritionTimelineState>
      ) : (
        <NutritionTimelineList>
          {rows.map((row) => (
            <NutritionTimelineRowCard key={row.id}>
              <NutritionTimelineRowHeader>
                <NutritionTimelineMeal>{row.title}</NutritionTimelineMeal>
                <NutritionTimelineTime>{row.createdAtLabel}</NutritionTimelineTime>
              </NutritionTimelineRowHeader>
              <NutritionTimelineDescription>{row.description}</NutritionTimelineDescription>
              <NutritionTimelineMeta>{row.macroLine} / {row.sourceLabel}</NutritionTimelineMeta>
              <NutritionTimelineBadges aria-label={`${row.title} review status`}>
                {row.reviewLabels.map((label) => (
                  <NutritionTimelineBadge key={label} $attention={label === 'Needs review'}>
                    {label}
                  </NutritionTimelineBadge>
                ))}
              </NutritionTimelineBadges>
              {row.canVerify ? (
                <NutritionTimelineActions>
                  <NutritionTimelineVerifyButton
                    type="button"
                    aria-label={`Mark ${row.title} verified`}
                    disabled={verifyingId !== null}
                    aria-busy={verifyingId === row.id}
                    onClick={() => handleVerify(row)}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Mark verified
                  </NutritionTimelineVerifyButton>
                </NutritionTimelineActions>
              ) : null}
            </NutritionTimelineRowCard>
          ))}
        </NutritionTimelineList>
      )}
    </NutritionTimelineShell>
  );
};

export default NutritionTabContent;
