/**
 * FILE: NutritionTodayPanel.tsx
 * PURPOSE: Phase 2.1 client nutrition Today diary surface.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle2, Droplets, HeartPulse, Mic, PieChart, RefreshCw, Search, Utensils } from 'lucide-react';
import apiService from '../../../services/api.service';
import { useHydration } from '../../../hooks/useHydration';
import type { MacroSummary } from '../../../hooks/useMacroSummary';
import {
  calculateNutritionStreak,
  buildNutritionInsights,
  buildRepeatMacroPayload,
  cleanWholeNumber,
  daysAgoIso,
  getHydrationProgress,
  getMacroMetrics,
  getNextNutritionAction,
  todayIso,
  type RepeatMacroEntry,
  type NutritionWeekDay,
  type NutritionTodayTarget,
} from './NutritionTodayPanel.logic';
import {
  gentleMetrics,
  getInsightActionLabel,
  getInsightActionName,
  getNutritionCareMilestone,
  getNutritionTodayViewModel,
} from './NutritionTodayPanel.viewModel';
import {
  ActionButton,
  ActionRow,
  CalorieRing,
  Eyebrow,
  HeroCopy,
  HeroText,
  HeroTitle,
  HydrationMeter,
  InlineStatus,
  InsightItem,
  InsightList,
  InsightTitle,
  MeterFill,
  MeterTrack,
  MetricGrid,
  MetricLabel,
  MetricPanel,
  MetricValue,
  MilestoneCopy,
  MilestoneLabel,
  MilestoneNote,
  MilestoneTitle,
  RailPanel,
  RailText,
  RailTitle,
  RingLabel,
  RingText,
  RingValue,
  SideRail,
  TodayHero,
  TodayShell,
} from './NutritionTodayPanel.styles';

interface NutritionTodayPanelProps {
  summary: MacroSummary | null;
  loading?: boolean;
  onNavigate: (target: NutritionTodayTarget) => void;
  onLogged?: () => void;
  gentleMode?: boolean;
  onAskCoach?: () => void;
  trainingDay?: boolean;
}
const ringDash = 283;
const insightIcons = { hydration: Droplets, log: Utensils, macros: PieChart, search: Search, voice: Mic };

const NutritionTodayPanel: React.FC<NutritionTodayPanelProps> = ({
  summary,
  loading = false,
  onNavigate,
  onLogged,
  gentleMode = false,
  onAskCoach,
  trainingDay = false,
}) => {
  const [streakDays, setStreakDays] = useState(0);
  const [latestEntry, setLatestEntry] = useState<RepeatMacroEntry | null>(null);
  const [weekDays, setWeekDays] = useState<NutritionWeekDay[]>([]);
  const [repeatStatus, setRepeatStatus] = useState('');
  const [repeatError, setRepeatError] = useState('');
  const [repeatSaving, setRepeatSaving] = useState(false);
  const repeatSavingRef = useRef(false);
  const { filled, dailyGoal, glassOz, loading: hydrationLoading, updateFilled } = useHydration();
  const hydration = getHydrationProgress({ filled, dailyGoal, glassOz });
  const hydrationForGuidance = hydrationLoading ? { ...hydration, filled: hydration.dailyGoal, percent: 100 } : hydration;
  const activeSummary = loading ? null : summary;
  const calories = cleanWholeNumber(activeSummary?.totalCalories);
  const meals = cleanWholeNumber(activeSummary?.mealCount);
  const nextAction = getNextNutritionAction(activeSummary, hydrationForGuidance);
  const macroMetrics = getMacroMetrics(activeSummary);
  const insights = loading ? [] : buildNutritionInsights({ summary: activeSummary, hydration: hydrationForGuidance, weekDays, gentleMode, trainingDay });
  const careMilestone = getNutritionCareMilestone({ gentleMode, hydration: hydrationForGuidance, meals, streakDays });
  const { heroText, heroTitle, hydrationText, primaryTarget, rhythmText } = getNutritionTodayViewModel({
    gentleMode,
    hydration: hydrationForGuidance,
    hydrationLoading,
    meals,
    nextAction,
    streakDays,
  });

  const loadLatestEntry = useCallback(async () => {
    try {
      const response = await apiService.get(`/api/macros?date=${todayIso()}`);
      const entries = Array.isArray(response?.data?.entries) ? response.data.entries : [];
      setLatestEntry(entries.length > 0 ? entries[entries.length - 1] : null);
    } catch {
      setLatestEntry(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const today = todayIso();
    apiService.get(`/api/macros/weekly?start=${daysAgoIso(6)}&end=${today}`)
      .then((response) => {
        if (!active) return;
        const days = Array.isArray(response?.data?.days) ? response.data.days : [];
        setWeekDays(days);
        setStreakDays(calculateNutritionStreak(days, today));
      })
      .catch(() => {
        if (active) {
          setWeekDays([]);
          setStreakDays(0);
        }
      });
    return () => { active = false; };
  }, [summary?.date, summary?.mealCount]);

  useEffect(() => {
    loadLatestEntry();
  }, [loadLatestEntry, summary?.date, summary?.mealCount]);

  const addWater = () => {
    if (hydrationLoading) return;
    updateFilled(Math.min(hydration.dailyGoal, hydration.filled + 1));
  };

  const repeatLatestMeal = async () => {
    if (repeatSavingRef.current || !latestEntry) return;
    const payload = buildRepeatMacroPayload(latestEntry, todayIso());
    setRepeatStatus('');
    setRepeatError('');
    if (!payload) {
      setRepeatError('Latest meal needs a food description before it can be repeated.');
      return;
    }
    repeatSavingRef.current = true;
    setRepeatSaving(true);
    try {
      await apiService.post('/api/macros', payload);
      setRepeatStatus('Repeated latest meal to today\'s log.');
      onLogged?.();
      loadLatestEntry();
    } catch {
      setRepeatError('Could not repeat that meal. Open Log Meal and review before trying again.');
    } finally {
      repeatSavingRef.current = false;
      setRepeatSaving(false);
    }
  };

  return (
    <TodayShell aria-label="Nutrition Today diary">
      <TodayHero>
        <CalorieRing role="img" aria-label={loading ? 'Nutrition totals loading' : gentleMode ? 'Gentle Mode active with nutrition numbers hidden today' : `${calories} calories logged today`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="none" stroke="color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-primary, #60C0F0)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${!loading && calories > 0 ? ringDash : 88} ${ringDash}`} />
          </svg>
          <RingText>
            <RingValue>{loading ? '--' : gentleMode ? 'Gentle' : calories}</RingValue>
            <RingLabel>{loading ? 'loading' : gentleMode ? 'numbers hidden' : 'cal logged'}</RingLabel>
          </RingText>
        </CalorieRing>

        <HeroCopy>
          <Eyebrow><CalendarCheck size={14} /> Today diary</Eyebrow>
          <HeroTitle>{loading ? 'Loading today\'s nutrition totals.' : heroTitle}</HeroTitle>
          <HeroText>{loading ? 'Hold nutrition decisions until today\'s log finishes loading.' : heroText}</HeroText>
          <MilestoneNote role="note" aria-label="Nutrition care milestone" $tone={careMilestone.tone}>
            <MilestoneLabel>{careMilestone.label}</MilestoneLabel>
            <MilestoneTitle>{careMilestone.title}</MilestoneTitle>
            <MilestoneCopy>{careMilestone.copy}</MilestoneCopy>
          </MilestoneNote>
          <ActionRow aria-label="Nutrition quick actions">
            <ActionButton type="button" $primary onClick={() => onNavigate(primaryTarget)} aria-busy={loading} disabled={loading}>
              <Utensils size={16} /> {gentleMode ? 'Gentle next step' : 'Next action'}
            </ActionButton>
            <ActionButton type="button" onClick={() => onNavigate('log')}>
              <Utensils size={16} /> Log another meal
            </ActionButton>
            <ActionButton type="button" onClick={() => onNavigate('voice')}>
              <Mic size={16} /> Speak a meal
            </ActionButton>
            <ActionButton type="button" onClick={() => onNavigate('search')}>
              <Search size={16} /> Search food
            </ActionButton>
            {latestEntry && (
              <ActionButton type="button" onClick={repeatLatestMeal} aria-busy={repeatSaving} disabled={repeatSaving}>
                <RefreshCw size={16} /> Repeat latest meal
              </ActionButton>
            )}
          </ActionRow>
          {repeatStatus && <InlineStatus role="status" aria-live="polite" aria-atomic="true"><CheckCircle2 size={14} /> {repeatStatus}</InlineStatus>}
          {repeatError && <InlineStatus role="status" aria-live="polite" aria-atomic="true" $error><AlertTriangle size={14} /> {repeatError}</InlineStatus>}
        </HeroCopy>
      </TodayHero>

      <SideRail>
        <MetricGrid aria-label={gentleMode ? 'Gentle Mode nutrition cues' : 'Macro totals logged today'}>
          {(gentleMode ? gentleMetrics : macroMetrics).map((metric) => (
            <MetricPanel key={metric.label} $tone={metric.tone}>
              <MetricValue>{loading ? '--' : metric.value}</MetricValue>
              <MetricLabel>{metric.label}</MetricLabel>
            </MetricPanel>
          ))}
        </MetricGrid>

        {gentleMode && (
          <RailPanel role="region" aria-label="Gentle recovery mode">
            <RailTitle>Gentle recovery mode</RailTitle>
            <RailText>Macro numbers are hidden while this mode is on. Use meal rhythm, hydration, and coach support without pressure.</RailText>
            <ActionRow>
              <ActionButton type="button" onClick={onAskCoach || (() => onNavigate('log'))}>
                <HeartPulse size={16} /> Ask Coach for gentle support
              </ActionButton>
            </ActionRow>
          </RailPanel>
        )}

        <RailPanel role="region" aria-label="Nutrition insights" aria-busy={loading}>
          <RailTitle>Nutrition insights</RailTitle>
          <InsightList>
            {insights.map((insight) => {
              const Icon = insightIcons[insight.target];
              const label = getInsightActionLabel(insight.target);
              return (
                <InsightItem key={insight.id} $tone={insight.tone}>
                  <InsightTitle>{insight.title}</InsightTitle>
                  <RailText>{insight.copy}</RailText>
                  <ActionButton
                    type="button"
                    aria-label={getInsightActionName(insight.target, insight.title)}
                    onClick={() => onNavigate(insight.target)}
                  >
                    <Icon size={16} />
                    {label}
                  </ActionButton>
                </InsightItem>
              );
            })}
          </InsightList>
        </RailPanel>

        <RailPanel>
          <RailTitle>Hydration</RailTitle>
          <HydrationMeter role="progressbar" aria-label="Hydration progress" aria-busy={hydrationLoading}
            aria-valuenow={hydrationLoading ? undefined : hydration.percent}
            aria-valuetext={hydrationLoading ? 'Loading hydration' : hydrationText} aria-valuemin={0} aria-valuemax={100}>
            <MeterTrack><MeterFill data-testid="hydration-meter-fill" data-state={hydrationLoading ? 'loading' : 'ready'} $loading={hydrationLoading} $percent={hydrationLoading ? 50 : hydration.percent} /></MeterTrack>
            <RailText>{hydrationText}</RailText>
          </HydrationMeter>
          <ActionRow>
            <ActionButton type="button" onClick={addWater} aria-busy={hydrationLoading} disabled={hydrationLoading}>
              <Droplets size={16} /> Add water
            </ActionButton>
            <ActionButton type="button" onClick={() => onNavigate('hydration')}><Droplets size={16} /> Open hydration</ActionButton>
          </ActionRow>
        </RailPanel>

        <RailPanel>
          <RailTitle>Logged rhythm</RailTitle>
          <RailText>{loading ? 'Loading today\'s logged rhythm...' : rhythmText}</RailText>
          <ActionRow>
            <ActionButton type="button" onClick={() => onNavigate(gentleMode ? 'log' : 'macros')}>
              {gentleMode ? <Utensils size={16} /> : <PieChart size={16} />}
              {gentleMode ? 'Open logger' : 'Review macros'}
            </ActionButton>
          </ActionRow>
        </RailPanel>
      </SideRail>
    </TodayShell>
  );
};

export default NutritionTodayPanel;
