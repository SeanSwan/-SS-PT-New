/**
 * Historical workout import preview service.
 *
 * Converts uploaded history text into review-only draft candidates. This
 * service never persists workouts; callers must route every candidate through
 * explicit trainer/admin review before saving.
 */

import { parseWorkoutTranscript } from './workoutLogParserService.mjs';
import { isRealIsoDate } from '../utils/isoDateOnly.mjs';

const MAX_PREVIEW_DRAFTS = 12;
const MAX_MISSING_REQUESTS = 36;

const MONTHS = new Map([
  ['jan', 1],
  ['january', 1],
  ['feb', 2],
  ['february', 2],
  ['mar', 3],
  ['march', 3],
  ['apr', 4],
  ['april', 4],
  ['may', 5],
  ['jun', 6],
  ['june', 6],
  ['jul', 7],
  ['july', 7],
  ['aug', 8],
  ['august', 8],
  ['sep', 9],
  ['sept', 9],
  ['september', 9],
  ['oct', 10],
  ['october', 10],
  ['nov', 11],
  ['november', 11],
  ['dec', 12],
  ['december', 12],
]);

const DATE_PREFIX =
  /^\s*(?:date\s*[:,-]?\s*)?((?:\d{4}-\d{1,2}-\d{1,2})|(?:\d{1,2}[/-]\d{1,2}[/-](?:\d{4}|\d{2}))|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}))\s*(?:[-:,]\s*)?/i;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function normalizeDateParts(year, month, day) {
  const iso = `${year}-${pad2(month)}-${pad2(day)}`;
  return isRealIsoDate(iso) ? iso : null;
}

export function normalizeHistoricalDate(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (isRealIsoDate(raw.slice(0, 10))) return raw.slice(0, 10);

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return normalizeDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slash) {
    const year = slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3]);
    return normalizeDateParts(year, Number(slash[1]), Number(slash[2]));
  }

  const monthName = raw.replace('.', '').match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthName) {
    const month = MONTHS.get(monthName[1].toLowerCase());
    return month ? normalizeDateParts(Number(monthName[3]), month, Number(monthName[2])) : null;
  }

  return null;
}

function normalizeDateList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(normalizeHistoricalDate).filter(Boolean))].sort();
}

function redactContactDetails(notes) {
  return String(notes || '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .trim();
}

export function extractDatedWorkoutSections(transcript) {
  const lines = String(transcript || '').split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(DATE_PREFIX);
    if (match) {
      const date = normalizeHistoricalDate(match[1]);
      if (date) {
        if (current && current.text.trim().length >= 10) sections.push(current);
        current = { date, text: line.slice(match[0].length).trim() };
        continue;
      }
    }
    if (current) current.text = `${current.text}\n${line}`.trim();
  }

  if (current && current.text.trim().length >= 10) sections.push(current);
  return sections;
}

function buildDraftId(clientId, date, index) {
  return `history-${clientId}-${date}-${index + 1}`;
}

function buildMissingPrompt({ clientId, date, sourceLabel, lastWorkoutNotes }) {
  const notes = redactContactDetails(lastWorkoutNotes) || 'No trainer anchor notes were provided.';
  return [
    `Create an editable AI-estimated historical filler draft for client #${clientId} on ${date}.`,
    `Source: ${sourceLabel || 'External historical import'}.`,
    'Do not present this as a verified performance record.',
    'Require trainer/admin review before it can affect charts, streaks, or progress proof.',
    `Trainer anchor notes: ${notes}`,
  ].join('\n');
}

export async function previewHistoricalWorkoutImport({
  transcript,
  clientId,
  trainerId,
  knownDates = [],
  missingDates = [],
  sourceLabel = 'External historical import',
  lastWorkoutNotes = '',
  parseWorkout = parseWorkoutTranscript,
}) {
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    throw new Error('Valid clientId is required');
  }
  if (!Number.isSafeInteger(trainerId) || trainerId <= 0) {
    throw new Error('Valid trainer identity is required');
  }
  if (!transcript || String(transcript).trim().length < 10) {
    throw new Error('History transcript is too short to preview');
  }

  const known = new Set(normalizeDateList(knownDates));
  const sections = extractDatedWorkoutSections(transcript);
  const skippedKnownDates = [];
  const candidates = [];

  for (const section of sections) {
    if (known.has(section.date)) {
      skippedKnownDates.push(section.date);
    } else {
      candidates.push(section);
    }
  }

  const limitedCandidates = candidates.slice(0, MAX_PREVIEW_DRAFTS);
  const drafts = [];
  for (const [index, section] of limitedCandidates.entries()) {
    const parsedWorkout = await parseWorkout({
      transcript: section.text,
      clientId,
      trainerId,
      date: section.date,
    });
    drafts.push({
      draftId: buildDraftId(clientId, section.date, index),
      date: section.date,
      source: sourceLabel || 'External historical import',
      status: 'review_required',
      draftOnly: true,
      confidence: parsedWorkout?.confidence ?? null,
      parsedWorkout: { ...parsedWorkout, date: section.date },
      warnings: [],
    });
  }

  const parsedDates = new Set(drafts.map((draft) => draft.date));
  const missingDraftRequests = normalizeDateList(missingDates)
    .filter((date) => !known.has(date) && !parsedDates.has(date))
    .slice(0, MAX_MISSING_REQUESTS)
    .map((date) => ({
      date,
      status: 'needs_coach_draft',
      prompt: buildMissingPrompt({ clientId, date, sourceLabel, lastWorkoutNotes }),
    }));

  return {
    draftOnly: true,
    drafts,
    missingDraftRequests,
    parsedEntryCount: sections.length,
    skippedKnownDates: [...new Set(skippedKnownDates)].sort(),
    truncated: candidates.length > limitedCandidates.length,
  };
}
