/**
 * FILE: NutritionTodayPanel.latestMeal.ts
 * PURPOSE: Finds a repeatable recent nutrition row for the Today diary.
 *
 * DATA FLOW:
 * - Checks today's log first, then walks backward through recent local dates.
 * - Returns only an existing macro entry; it never invents a meal.
 * - Caller re-saves through /api/macros, which forces verified:false.
 */
import { daysAgoIso, todayIso, type RepeatMacroEntry } from './NutritionTodayPanel.logic';

interface MacroEntriesResponse {
  data?: {
    entries?: unknown;
  };
}

interface MacroEntriesApi {
  get: (url: string) => Promise<MacroEntriesResponse>;
}

const RECENT_REPEAT_LOOKBACK_DAYS = 6;

const entriesFromResponse = (response: MacroEntriesResponse): RepeatMacroEntry[] =>
  Array.isArray(response?.data?.entries) ? response.data.entries as RepeatMacroEntry[] : [];

const hasRepeatableDescription = (entry: RepeatMacroEntry): boolean =>
  typeof entry?.description === 'string' && entry.description.trim().length > 0;

export async function loadRecentRepeatMealEntry(
  api: MacroEntriesApi,
  fromDate = new Date(),
): Promise<RepeatMacroEntry | null> {
  const dates = [
    todayIso(fromDate),
    ...Array.from({ length: RECENT_REPEAT_LOOKBACK_DAYS }, (_, index) => daysAgoIso(index + 1, fromDate)),
  ];

  for (const date of dates) {
    try {
      const response = await api.get(`/api/macros?date=${date}`);
      const entries = entriesFromResponse(response).filter(hasRepeatableDescription);
      if (entries.length > 0) return entries[entries.length - 1];
    } catch {
      // A missing recent day should not block the rest of the lookback window.
    }
  }

  return null;
}
