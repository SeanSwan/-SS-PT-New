/**
 * NutritionWorkspace.macroCharts.tsx — the "My Macros" tab
 * ==========================================================
 * BP02 §5.1 (launch charter): this tab previously showed only COMPOSITION
 * (donut) — the one thing it never answered was "am I hitting MY targets?".
 * It now renders real logged-vs-target adherence from the user's
 * ClientNutritionPlan (+ a 7-day calorie-adherence strip), with an honest
 * no-targets state. Gentle Mode hides every macro number, including these.
 */
import React, { lazy } from 'react';
import styled from 'styled-components';
import { HeartPulse } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useHydration } from '../../../hooks/useHydration';
import useNutritionAdherence from '../../../hooks/useNutritionAdherence';
import {
  computeMacroAdherence,
  computeWeeklyAdherence,
} from '../../../utils/nutritionAdherence';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import {
  MacroGrid,
  MacroHiddenPanel,
  MacroHiddenText,
  MacroHiddenTitle,
} from './NutritionWorkspace.styles';

const MacroDonut = lazy(() => import('../../Charts/charts/pie/MacroDonut'));
const NutritionBalanceRadar = lazy(() => import('../../Charts/charts/radar/NutritionBalanceRadar'));
const OUNCES_TO_ML = 29.5735;

/* ── Adherence UI (tokens + fallbacks; low-motion data-card class) ── */

const AdherencePanel = styled.section`
  grid-column: 1 / -1;
  background: var(--surface-elevated, #141419);
  border: 1px solid var(--border-subtle, #1a1a24);
  border-radius: 14px;
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const AdherenceTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-primary, #e0ecf4);
`;

const AdherenceRowShell = styled.div`
  display: grid;
  grid-template-columns: minmax(64px, 90px) 1fr minmax(96px, auto);
  align-items: center;
  gap: 0.625rem;
  min-height: 32px;
  font-size: 0.85rem;
  color: var(--text-primary, #e0ecf4);
`;

const BarTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: var(--bg-base, #0a0a0f);
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $over: boolean }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ $over }) =>
    $over ? 'var(--accent-gold, #c6a84b)' : 'var(--accent-data, #50a0f0)'};
`;

const RowFigures = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  color: var(--text-secondary, #9fb3c8);
  text-align: right;
`;

const WeekStrip = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const DayDot = styled.span<{ $state: 'hit' | 'partial' | 'gap' }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #e0ecf4);
  background: ${({ $state }) =>
    $state === 'hit'
      ? 'color-mix(in srgb, var(--accent-data, #50a0f0) 45%, transparent)'
      : $state === 'partial'
        ? 'color-mix(in srgb, var(--accent-data, #50a0f0) 20%, transparent)'
        : 'transparent'};
  border: 1px solid var(--border-subtle, #2a2a36);
`;

const SoftNote = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-secondary, #9fb3c8);
  line-height: 1.5;
`;

interface MacroChartsPanelProps {
  summary: MacroSummary | null;
  loading: boolean;
  gentleMode: boolean;
}

const dayInitial = (iso: string): string =>
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${iso}T12:00:00`).getDay()] ?? '·';

const MacroChartsPanel: React.FC<MacroChartsPanelProps> = ({ summary, loading, gentleMode }) => {
  const { user } = useAuth();
  const numericUserId = Number(user?.id);
  const adherence = useNutritionAdherence(
    Number.isFinite(numericUserId) && numericUserId > 0 ? numericUserId : undefined
  );
  const { filled, dailyGoal, glassOz, loading: hydrationLoading } = useHydration();
  const hydrationMl = Math.round(filled * glassOz * OUNCES_TO_ML);
  const hydrationTargetMl = Math.round(dailyGoal * glassOz * OUNCES_TO_ML);

  if (gentleMode) {
    return (
      <MacroHiddenPanel role="region" aria-label="Gentle mode macro charts hidden">
        <HeartPulse size={28} aria-hidden="true" />
        <MacroHiddenTitle>Gentle Mode is on</MacroHiddenTitle>
        <MacroHiddenText>
          Macro charts are hidden while you use Today for meal rhythm, hydration, and coach support.
        </MacroHiddenText>
      </MacroHiddenPanel>
    );
  }

  const rows =
    adherence.status === 'ready'
      ? computeMacroAdherence(adherence.targets, {
          calories: summary?.totalCalories,
          protein: summary?.totalProtein,
          carbs: summary?.totalCarbs,
          fat: summary?.totalFat,
        })
      : [];
  const weekStrip =
    adherence.status === 'ready' ? computeWeeklyAdherence(adherence.targets, adherence.week) : [];
  const isTrainerOrAdmin = user?.role === 'trainer' || user?.role === 'admin';

  return (
    <MacroGrid>
      {adherence.status === 'ready' && rows.length > 0 && (
        <AdherencePanel aria-label="Today versus your nutrition targets">
          <AdherenceTitle>
            Today vs your targets{adherence.planName ? ` — ${adherence.planName}` : ''}
          </AdherenceTitle>
          {rows.map((row) => (
            <AdherenceRowShell key={row.key}>
              <span>{row.label}</span>
              <BarTrack aria-hidden="true">
                <BarFill $pct={row.barPct} $over={row.pct > 100} />
              </BarTrack>
              <RowFigures>
                {Math.round(row.logged)}/{row.target} {row.unit} · {row.pct}%
              </RowFigures>
            </AdherenceRowShell>
          ))}
          {weekStrip.length > 0 && (
            <WeekStrip aria-label="Seven day calorie adherence">
              {weekStrip.map((day) => (
                <DayDot
                  key={day.date}
                  title={day.pct === null ? `${day.date}: no meals logged` : `${day.date}: ${day.pct}%`}
                  $state={day.pct === null ? 'gap' : day.pct >= 80 ? 'hit' : 'partial'}
                >
                  {dayInitial(day.date)}
                </DayDot>
              ))}
            </WeekStrip>
          )}
        </AdherencePanel>
      )}
      {adherence.status === 'no-targets' && (
        <AdherencePanel aria-label="No nutrition targets set">
          <AdherenceTitle>No nutrition targets yet</AdherenceTitle>
          <SoftNote>
            {isTrainerOrAdmin
              ? 'Set daily calorie and macro targets in the Nutrition Plan Builder to unlock logged-vs-target adherence here.'
              : 'Ask your trainer to set your daily calorie and macro targets — once they do, this tab shows exactly how your logged meals stack up.'}
          </SoftNote>
        </AdherencePanel>
      )}
      {adherence.status === 'loading' && (
        <AdherencePanel aria-label="Checking your nutrition targets">
          <AdherenceTitle>Today vs your targets</AdherenceTitle>
          <SoftNote>Checking your targets…</SoftNote>
        </AdherencePanel>
      )}
      {adherence.status === 'error' && (
        <AdherencePanel aria-label="Nutrition targets unavailable">
          <AdherenceTitle>Today vs your targets</AdherenceTitle>
          <SoftNote>Couldn&apos;t load your targets right now — they&apos;ll be back on the next refresh.</SoftNote>
        </AdherencePanel>
      )}
      <MacroDonut
        protein={summary?.totalProtein}
        carbs={summary?.totalCarbs}
        fat={summary?.totalFat}
        totalCalories={summary?.totalCalories}
        loading={loading}
      />
      <NutritionBalanceRadar
        protein={summary?.totalProtein}
        carbs={summary?.totalCarbs}
        fat={summary?.totalFat}
        fiber={summary?.totalFiber}
        hydrationMl={hydrationMl}
        hydrationTargetMl={hydrationTargetMl}
        loading={loading || hydrationLoading}
      />
    </MacroGrid>
  );
};

export default MacroChartsPanel;
