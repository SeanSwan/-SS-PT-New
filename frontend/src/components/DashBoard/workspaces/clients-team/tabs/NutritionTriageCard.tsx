import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Apple, CheckCircle2 } from 'lucide-react';
import apiService from '../../../../../services/api.service';
import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from '../nutritionDate';
import { getNumericClientId } from './clientTabId';
import {
  BentoCard,
  CardHeader,
  CardIcon,
  CardSubtext,
  CardTitle,
  CardValue,
  TriageFlag,
  TriageFlagList,
  TriageMetaGrid,
  TriageMetaItem,
  TriageMetaLabel,
  TriageMetaValue,
} from './OverviewTabContent.styles';
import {
  buildNutritionTriage,
  type MacroSummary,
  type WeeklyMacroDay,
} from './NutritionTriageCard.logic';

interface NutritionTriageCardProps {
  clientId: number | string;
}

type LoadState = 'loading' | 'ready' | 'error' | 'identity-error';

const getSummary = async (numericClientId: number, today: string): Promise<MacroSummary> => {
  const params = new URLSearchParams({ date: today, userId: String(numericClientId) });
  const response = await apiService.get(`/api/macros/summary?${params.toString()}`);
  const summary = response.data?.summary;
  if (!response.data?.success || !summary) {
    throw new Error('Nutrition summary response was not successful');
  }
  return summary;
};

const getWeeklyDays = async (numericClientId: number, weekStart: string, today: string): Promise<WeeklyMacroDay[]> => {
  const params = new URLSearchParams({ start: weekStart, end: today, userId: String(numericClientId) });
  const response = await apiService.get(`/api/macros/weekly?${params.toString()}`);
  const days = response.data?.days;
  if (!response.data?.success || !Array.isArray(days)) {
    throw new Error('Nutrition weekly response was not successful');
  }
  return days;
};

const NutritionTriageCard: React.FC<NutritionTriageCardProps> = ({ clientId }) => {
  const numericClientId = useMemo(() => getNumericClientId(clientId), [clientId]);
  const [state, setState] = useState<LoadState>(() => (numericClientId ? 'loading' : 'identity-error'));
  const [summary, setSummary] = useState<MacroSummary | null>(null);
  const [weeklyDays, setWeeklyDays] = useState<WeeklyMacroDay[]>([]);

  useEffect(() => {
    if (!numericClientId) {
      setState('identity-error');
      return;
    }

    let cancelled = false;
    const today = formatLocalCalendarDate();
    const weekStart = getLocalCalendarDateDaysAgo(6);
    setState('loading');

    Promise.all([
      getSummary(numericClientId, today),
      getWeeklyDays(numericClientId, weekStart, today),
    ])
      .then(([nextSummary, nextWeeklyDays]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setWeeklyDays(nextWeeklyDays);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [numericClientId]);

  const triage = useMemo(() => (
    summary ? buildNutritionTriage({ summary, weeklyDays }) : null
  ), [summary, weeklyDays]);

  return (
    <BentoCard $span={2} $heroAccent="var(--accent-gold, #C6A84B)">
      <CardHeader>
        <CardIcon $color="var(--accent-gold, #C6A84B)">
          <Apple size={18} aria-hidden="true" />
        </CardIcon>
        <CardTitle>Nutrition Triage</CardTitle>
      </CardHeader>

      {state === 'identity-error' && (
        <CardSubtext role="status">Nutrition identity unavailable</CardSubtext>
      )}

      {state === 'loading' && (
        <CardSubtext role="status">Loading nutrition triage...</CardSubtext>
      )}

      {state === 'error' && (
        <CardSubtext role="alert">Nutrition triage unavailable</CardSubtext>
      )}

      {state === 'ready' && triage && (
        <>
          <CardValue>{triage.statusLabel}</CardValue>
          <CardSubtext>{triage.proteinLabel}</CardSubtext>
          <TriageMetaGrid aria-label="Nutrition triage metrics">
            <TriageMetaItem>
              <TriageMetaLabel>Fiber</TriageMetaLabel>
              <TriageMetaValue>{triage.fiberLabel}</TriageMetaValue>
            </TriageMetaItem>
            <TriageMetaItem>
              <TriageMetaLabel>Rhythm</TriageMetaLabel>
              <TriageMetaValue>{triage.weeklyLabel}</TriageMetaValue>
            </TriageMetaItem>
            <TriageMetaItem>
              <TriageMetaLabel>Average</TriageMetaLabel>
              <TriageMetaValue>{triage.averageLabel}</TriageMetaValue>
            </TriageMetaItem>
          </TriageMetaGrid>

          <TriageFlagList aria-label="Nutrition triage flags">
            {triage.flags.length === 0 ? (
              <TriageFlag $tone="default">
                <CheckCircle2 size={13} aria-hidden="true" />
                No attention flags
              </TriageFlag>
            ) : (
              triage.flags.map((flag) => (
                <TriageFlag key={flag.id} $tone={flag.tone} title={flag.detail}>
                  <AlertTriangle size={13} aria-hidden="true" />
                  {flag.label}
                </TriageFlag>
              ))
            )}
          </TriageFlagList>
        </>
      )}
    </BentoCard>
  );
};

export default NutritionTriageCard;
