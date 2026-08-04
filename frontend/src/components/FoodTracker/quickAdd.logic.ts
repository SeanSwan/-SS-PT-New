/**
 * FILE: quickAdd.logic.ts
 * PURPOSE: Phase 4C data logic for QuickAddFab — load recent diary entries
 *          and build the "Repeat yesterday" review draft.
 * HOW IT FITS: QuickAddFab sheet -> loadQuickAddData on open; taps convert
 *          entries to review drafts that NutritionReviewDrawer saves
 *          atomically (verified:false, review-first — same contract as the
 *          Today panel repeat action).
 * KEY DECISIONS: REUSES repeatMacroEntryToNutritionDraft from
 *          NutritionTodayPanel.repeatMeal.ts (per-entry conversion is NOT
 *          reimplemented). "Repeat yesterday" composes those per-entry
 *          drafts into one multi-food draft — foods[] is the draft
 *          contract's native multi-item shape.
 */
import {
  repeatMacroEntryToNutritionDraft,
  type RepeatMacroEntry,
} from '../DashBoard/workspaces/NutritionTodayPanel.repeatMeal';
import { daysAgoIso, todayIso } from '../DashBoard/workspaces/NutritionTodayPanel.logic';
import type { NutritionEntryDraft } from './nutritionDraft.types';

interface MacroEntriesResponse {
  data?: { entries?: unknown };
}

export interface MacroEntriesApi {
  get: (url: string) => Promise<MacroEntriesResponse>;
}

export interface QuickAddData {
  /** Yesterday's repeatable entries, diary order. */
  yesterday: RepeatMacroEntry[];
  /** Up to `RECENT_MEAL_LIMIT` repeatable entries, most recent first. */
  recent: RepeatMacroEntry[];
}

export const RECENT_MEAL_LIMIT = 5;

const isRepeatable = (entry: RepeatMacroEntry): boolean =>
  typeof entry?.description === 'string' && entry.description.trim().length > 0;

const entriesFrom = (response: MacroEntriesResponse): RepeatMacroEntry[] =>
  Array.isArray(response?.data?.entries)
    ? (response.data.entries as RepeatMacroEntry[]).filter(isRepeatable)
    : [];

const fetchDay = async (api: MacroEntriesApi, date: string): Promise<RepeatMacroEntry[]> => {
  try {
    return entriesFrom(await api.get(`/api/macros?date=${date}`));
  } catch {
    // A failed day never blocks the sheet — it just has fewer options.
    return [];
  }
};

export const loadQuickAddData = async (
  api: MacroEntriesApi,
  fromDate = new Date(),
): Promise<QuickAddData> => {
  const [today, yesterday] = await Promise.all([
    fetchDay(api, todayIso(fromDate)),
    fetchDay(api, daysAgoIso(1, fromDate)),
  ]);
  // Diary order is oldest-first; most recent meals surface first in the sheet.
  const recent = [...today].reverse().concat([...yesterday].reverse()).slice(0, RECENT_MEAL_LIMIT);
  return { yesterday, recent };
};

/**
 * One review draft covering ALL of yesterday's repeatable meals. Each entry
 * goes through the existing single-entry repeat converter; their foods merge
 * into one draft so the drawer's normal atomic save applies. Null when
 * yesterday has nothing repeatable.
 */
export const buildRepeatYesterdayDraft = (
  yesterdayEntries: RepeatMacroEntry[],
): NutritionEntryDraft | null => {
  const drafts = yesterdayEntries
    .map((entry) => repeatMacroEntryToNutritionDraft(entry))
    .filter((draft): draft is NutritionEntryDraft => draft !== null);
  if (drafts.length === 0) return null;

  const base = drafts[0];
  if (drafts.length === 1) return base;

  return {
    ...base,
    id: `repeat-yesterday-${Date.now().toString(36)}`,
    title: 'Review yesterday\'s meals',
    sourceLabel: 'Repeat: yesterday\'s diary',
    reviewNotes: ['Confirm each serving still matches what you are eating today.'],
    foods: drafts.flatMap((draft, draftIndex) =>
      // Suffix ids so two source entries without external ids can never
      // collide inside the merged draft.
      draft.foods.map((food) => ({ ...food, id: `${food.id}-y${draftIndex}` })),
    ),
  };
};
