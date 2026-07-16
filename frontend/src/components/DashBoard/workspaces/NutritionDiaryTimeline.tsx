/**
 * FILE: NutritionDiaryTimeline.tsx
 * PURPOSE: Real-data Today diary with provenance, review state, and review-first repeat.
 * DATA FLOW: GET /api/macros -> safe display facts -> NutritionEntryDraft review.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ShieldCheck, Utensils } from 'lucide-react';
import apiService from '../../../services/api.service';
import type { NutritionEntryDraft } from '../../FoodTracker/nutritionDraft.types';
import { repeatMacroEntryToNutritionDraft, todayIso, type RepeatMacroEntry } from './NutritionTodayPanel.logic';
import {
  DiaryCard,
  DiaryCardHeader,
  DiaryChip,
  DiaryChips,
  DiaryDescription,
  DiaryList,
  DiaryMacroLine,
  DiaryMeal,
  DiaryRepeatButton,
  DiaryState,
  DiaryTimeline,
  DiaryTimelineHeader,
  DiaryTimelineMeta,
  DiaryTimelineTitle,
  RetryButton,
} from './NutritionDiaryTimeline.styles';

interface NutritionDiaryEntry extends RepeatMacroEntry {
  id: number | string;
  verified?: boolean | null;
  confidenceScore?: number | string | null;
  reviewStatus?: string | null;
  reviewReason?: string | null;
  reconciliationStatus?: string | null;
}

interface NutritionDiaryTimelineProps {
  gentleMode: boolean;
  refreshKey: string;
  onReviewDraft?: (draft: NutritionEntryDraft) => void;
}

type LoadState = 'loading' | 'ready' | 'error';

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;
const SOURCE_LABELS: Record<string, string> = {
  'ai-chat': 'Swan Coach',
  ai_chat: 'Swan Coach',
  barcode: 'Barcode',
  'food-scanner': 'Photo estimate',
  manual: 'Manual',
  photo: 'Photo estimate',
  usda_lookup: 'Food search',
  voice: 'Voice estimate',
};
const REVIEW_REASONS: Record<string, string> = {
  barcode_unmatched: 'Barcode not matched',
  client_requested: 'Client requested review',
  edited_after_review: 'Edited after coach review',
  metabolic_deviation: 'Calories differ from 4-4-9',
  provider_estimate: 'Provider estimate',
  unverified_estimate: 'Unverified estimate',
};
const RECONCILIATION: Record<string, string> = {
  calculated_only: 'Calculated from macros',
  metabolic_deviation: 'Metabolic deviation',
  not_applicable: '4-4-9 check unavailable',
  within_tolerance: '4-4-9 aligned',
};

const safeText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const strictNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const titleCase = (value: unknown): string => {
  const text = safeText(value) || 'meal';
  return text.split(/[\s_-]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};
const sourceLabel = (entry: NutritionDiaryEntry) =>
  SOURCE_LABELS[safeText(entry.source).toLowerCase()] || 'Legacy entry';
const reviewLabel = (entry: NutritionDiaryEntry) => {
  if (entry.verified) return 'Trainer verified';
  if (entry.reviewStatus === 'needs_review') return 'Coach review';
  if (entry.reviewStatus === 'client_confirmed') return 'Client reviewed';
  return 'Unverified estimate';
};
const servingLabel = (entry: NutritionDiaryEntry) => {
  const quantity = strictNumber(entry.servingQuantity);
  const unit = safeText(entry.servingUnit);
  return quantity !== null && quantity > 0 && unit
    ? 'Serving: ' + quantity + ' ' + unit
    : 'Serving not recorded';
};
const confidenceLabel = (value: unknown) => {
  const confidence = strictNumber(value);
  return confidence !== null && confidence <= 1
    ? Math.round(confidence * 100) + '% confidence'
    : 'Confidence not recorded';
};
const macroLine = (entry: NutritionDiaryEntry, gentleMode: boolean) => {
  if (gentleMode) return 'Nutrition numbers hidden';
  const calories = strictNumber(entry.calories);
  const protein = strictNumber(entry.protein);
  const facts: string[] = [];
  if (calories !== null) facts.push(Math.round(calories) + ' kcal');
  if (protein !== null) facts.push(Math.round(protein) + 'g protein');
  return facts.length > 0 ? facts.join(' | ') : 'Nutrition totals not recorded';
};
const entriesFromResponse = (response: unknown): NutritionDiaryEntry[] => {
  const data = (response as { data?: { success?: boolean; entries?: unknown } })?.data;
  if (data?.success === false || !Array.isArray(data?.entries)) throw new Error('Invalid diary response');
  return data.entries.filter((entry): entry is NutritionDiaryEntry =>
    Boolean(entry && typeof entry === 'object' && ('id' in entry)));
};

const NutritionDiaryTimeline: React.FC<NutritionDiaryTimelineProps> = ({
  gentleMode,
  refreshKey,
  onReviewDraft,
}) => {
  const [state, setState] = useState<LoadState>('loading');
  const [entries, setEntries] = useState<NutritionDiaryEntry[]>([]);

  const loadDiary = useCallback(async (active?: { current: boolean }) => {
    setState('loading');
    try {
      const response = await apiService.get('/api/macros?date=' + todayIso());
      if (active && !active.current) return;
      setEntries(entriesFromResponse(response));
      setState('ready');
    } catch {
      if (active && !active.current) return;
      setEntries([]);
      setState('error');
    }
  }, []);

  useEffect(() => {
    const active = { current: true };
    loadDiary(active);
    return () => { active.current = false; };
  }, [loadDiary, refreshKey]);

  const reviewRepeat = (entry: NutritionDiaryEntry) => {
    if (!onReviewDraft) return;
    const draft = repeatMacroEntryToNutritionDraft(entry);
    if (draft) onReviewDraft(draft);
  };

  return (
    <DiaryTimeline aria-labelledby="nutrition-diary-timeline-title" aria-busy={state === 'loading'}>
      <DiaryTimelineHeader>
        <div>
          <DiaryTimelineTitle id="nutrition-diary-timeline-title">
            <Utensils size={18} /> Today&apos;s diary timeline
          </DiaryTimelineTitle>
          <DiaryTimelineMeta>Source, serving, confidence, and review state stay visible.</DiaryTimelineMeta>
        </div>
        {state === 'ready' && <DiaryTimelineMeta>{entries.length} saved</DiaryTimelineMeta>}
      </DiaryTimelineHeader>

      {state === 'loading' && <DiaryState role="status">Loading today&apos;s diary...</DiaryState>}
      {state === 'error' && (
        <DiaryState role="alert" $error>
          <AlertTriangle size={16} /> Today diary is temporarily unavailable.
          <RetryButton type="button" onClick={() => loadDiary()}>
            <RefreshCw size={16} /> Retry
          </RetryButton>
        </DiaryState>
      )}
      {state === 'ready' && entries.length === 0 && (
        <DiaryState role="status">No meals saved for today yet.</DiaryState>
      )}
      {state === 'ready' && entries.length > 0 && (
        <DiaryList>
          {entries.map((entry) => {
            const description = safeText(entry.description) || 'Nutrition entry';
            const reason = REVIEW_REASONS[safeText(entry.reviewReason).toLowerCase()];
            const reconciliation = RECONCILIATION[safeText(entry.reconciliationStatus).toLowerCase()];
            return (
              <DiaryCard key={String(entry.id)}>
                <DiaryCardHeader>
                  <DiaryMeal>{titleCase(entry.mealType)}</DiaryMeal>
                  <DiaryChip><ShieldCheck size={13} /> {reviewLabel(entry)}</DiaryChip>
                </DiaryCardHeader>
                <DiaryDescription>{description}</DiaryDescription>
                <DiaryMacroLine>{macroLine(entry, gentleMode)}</DiaryMacroLine>
                <DiaryChips>
                  <DiaryChip>{sourceLabel(entry)}</DiaryChip>
                  <DiaryChip>{servingLabel(entry)}</DiaryChip>
                  {!gentleMode && <DiaryChip>{confidenceLabel(entry.confidenceScore)}</DiaryChip>}
                  {reason && <DiaryChip>Reason: {reason}</DiaryChip>}
                  {reconciliation && <DiaryChip>{reconciliation}</DiaryChip>}
                </DiaryChips>
                {onReviewDraft && (
                  <DiaryRepeatButton
                    type="button"
                    aria-label={'Review and repeat ' + description}
                    onClick={() => reviewRepeat(entry)}
                  >
                    <RotateCcw size={16} /> Review and repeat
                  </DiaryRepeatButton>
                )}
              </DiaryCard>
            );
          })}
        </DiaryList>
      )}
    </DiaryTimeline>
  );
};

export default NutritionDiaryTimeline;
