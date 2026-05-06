/**
 * plaudTranscriptSplitterService.mjs
 * ==================================
 * Deterministic PLAUD transcript pre-splitter. This service groups a merged
 * transcript into date-scoped workout candidates before Swan Coach interprets
 * exercises. It owns date anchoring and future-date guardrails; it does not
 * resolve clients, call an LLM, or write workout logs.
 */
const DEFAULT_TIME_ZONE = 'America/Los_Angeles';
const DEFAULT_REFERENCE_SOURCE = 'server_now';
const WEEKDAY_INDEX = new Map([
  ['sunday', 0],
  ['monday', 1],
  ['tuesday', 2],
  ['wednesday', 3],
  ['thursday', 4],
  ['friday', 5],
  ['saturday', 6],
]);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatYmd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function ymdToUtcDate(ymd) {
  const [year, month, day] = String(ymd).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function buildValidYmd(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const parsed = ymdToUtcDate(formatYmd(year, month, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return formatYmd(year, month, day);
}

function addDays(ymd, dayDelta) {
  const parsed = ymdToUtcDate(ymd);
  parsed.setUTCDate(parsed.getUTCDate() + dayDelta);
  return formatYmd(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
}

function compareYmd(a, b) {
  return String(a).localeCompare(String(b));
}

function localYmdForIso(referenceIso, timeZone) {
  const parsed = new Date(referenceIso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('referenceIso must be a valid ISO timestamp.');
  }

  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(parsed);
  } catch (err) {
    throw new Error(`Invalid time zone "${timeZone}".`);
  }

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  return buildValidYmd(
    Number(partMap.get('year')),
    Number(partMap.get('month')),
    Number(partMap.get('day')),
  );
}

function resolveLastWeekday(weekdayName, referenceYmd) {
  const targetIndex = WEEKDAY_INDEX.get(String(weekdayName || '').toLowerCase());
  if (targetIndex == null) return null;

  const referenceDayIndex = ymdToUtcDate(referenceYmd).getUTCDay();
  let delta = (referenceDayIndex - targetIndex + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(referenceYmd, -delta);
}

function normalizeSlashYear(rawYear, referenceYmd) {
  if (!rawYear) return Number(referenceYmd.slice(0, 4));
  const parsed = Number(rawYear);
  if (rawYear.length === 2) return parsed < 70 ? 2000 + parsed : 1900 + parsed;
  return parsed;
}

function marker(date, dateSource, evidence, boundaryStrength = 'strong') {
  return {
    date,
    dateSource,
    evidence,
    boundaryStrength,
    dateConfidence: 'high',
    needsDateConfirmation: false,
  };
}

function detectExplicitIso(line) {
  const match = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(line);
  if (!match) return null;
  const date = buildValidYmd(Number(match[1]), Number(match[2]), Number(match[3]));
  return marker(date, date ? 'explicit:iso' : 'invalid_date', match[0], 'strong');
}

function detectSlashDate(line, referenceYmd) {
  const contextMatch = /^\s*(?:date|session|workout|on)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i.exec(line);
  const leadingMarkerMatch = /^\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?::|-)/i.exec(line);
  const match = contextMatch || leadingMarkerMatch;
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = normalizeSlashYear(match[3], referenceYmd);
  const date = buildValidYmd(year, month, day);
  return marker(date, date ? 'explicit:us_date' : 'invalid_date', match[0].trim(), 'strong');
}

function detectRelativeDate(line, referenceYmd, { allowLoose = false } = {}) {
  const prefix = '(?:workout|session|date|day|clip|recording|for|on)?';
  const boundaryRegex = new RegExp(`^\\s*${prefix}\\s*(today|yesterday|tomorrow)\\b`, 'i');
  const boundaryLastWeekday = new RegExp(`^\\s*${prefix}\\s*last\\s+(${[...WEEKDAY_INDEX.keys()].join('|')})\\b`, 'i');
  const strongSimple = boundaryRegex.exec(line);
  if (strongSimple) {
    const phrase = strongSimple[1];
    const lower = phrase.toLowerCase();
    const delta = lower === 'yesterday' ? -1 : (lower === 'tomorrow' ? 1 : 0);
    return marker(addDays(referenceYmd, delta), `phrase:${lower}`, phrase, 'strong');
  }
  const strongWeekday = boundaryLastWeekday.exec(line);
  if (strongWeekday) {
    const evidence = strongWeekday[0].trim();
    return marker(resolveLastWeekday(strongWeekday[1], referenceYmd), 'phrase:last_weekday', evidence, 'strong');
  }
  if (!allowLoose) return null;
  const looseSimple = /\b(today|yesterday|tomorrow)\b/i.exec(line);
  if (looseSimple) {
    const phrase = looseSimple[1];
    const lower = phrase.toLowerCase();
    const delta = lower === 'yesterday' ? -1 : (lower === 'tomorrow' ? 1 : 0);
    return marker(addDays(referenceYmd, delta), `phrase:${lower}`, phrase, 'loose');
  }

  const looseWeekday = new RegExp(`\\blast\\s+(${[...WEEKDAY_INDEX.keys()].join('|')})\\b`, 'i').exec(line);
  if (looseWeekday) {
    return marker(resolveLastWeekday(looseWeekday[1], referenceYmd), 'phrase:last_weekday', looseWeekday[0], 'loose');
  }

  return null;
}

function detectDateMarker(line, referenceYmd, { allowLoose = false } = {}) {
  return (
    detectExplicitIso(line)
    || detectSlashDate(line, referenceYmd)
    || detectRelativeDate(line, referenceYmd, { allowLoose })
  );
}

function fallbackMarker(referenceYmd) {
  return {
    date: referenceYmd,
    dateSource: 'reference_timeline',
    evidence: null,
    boundaryStrength: 'fallback',
    dateConfidence: 'low',
    needsDateConfirmation: true,
  };
}

function finalizeSegment(draft, context) {
  const selectedMarker = draft.marker || fallbackMarker(context.referenceYmd);
  const resolvedDate = selectedMarker.date || context.referenceYmd;
  const futureDateBlocked = compareYmd(resolvedDate, context.referenceYmd) > 0;
  const needsDateConfirmation = Boolean(
    selectedMarker.needsDateConfirmation
    || futureDateBlocked
    || selectedMarker.dateSource === 'invalid_date'
  );

  return {
    segmentId: `segment-${draft.index}`,
    segmentIndex: draft.index,
    date: resolvedDate,
    dateSource: selectedMarker.dateSource,
    dateConfidence: selectedMarker.dateSource === 'invalid_date'
      ? 'invalid_date'
      : (futureDateBlocked ? 'blocked_future' : selectedMarker.dateConfidence),
    needsDateConfirmation,
    futureDateBlocked,
    evidence: selectedMarker.evidence,
    referenceDate: context.referenceYmd,
    referenceSource: context.referenceSource,
    timeZone: context.timeZone,
    startLine: draft.lines[0]?.lineNumber || null,
    endLine: draft.lines[draft.lines.length - 1]?.lineNumber || null,
    text: draft.lines.map((line) => line.text).join('\n'),
  };
}

/**
 * Split one PLAUD transcript into date-scoped workout candidates.
 *
 * @param {{
 *   transcript: string,
 *   referenceIso?: string,
 *   timeZone?: string,
 *   referenceSource?: string
 * }} params
 * @returns {{
 *   referenceDate: string,
 *   timeZone: string,
 *   referenceSource: string,
 *   segmentCount: number,
 *   needsDateReviewCount: number,
 *   futureDateBlockedCount: number,
 *   segments: Array<object>
 * }}
 */
export function splitPlaudTranscriptIntoWorkoutCandidates({
  transcript,
  referenceIso = new Date().toISOString(),
  timeZone = DEFAULT_TIME_ZONE,
  referenceSource = DEFAULT_REFERENCE_SOURCE,
} = {}) {
  const referenceYmd = localYmdForIso(referenceIso, timeZone || DEFAULT_TIME_ZONE);
  const context = { referenceYmd, referenceSource, timeZone: timeZone || DEFAULT_TIME_ZONE };
  const lines = String(transcript || '')
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), lineNumber: index + 1 }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0) {
    return {
      referenceDate: referenceYmd,
      timeZone: context.timeZone,
      referenceSource,
      segmentCount: 0,
      needsDateReviewCount: 0,
      futureDateBlockedCount: 0,
      segments: [],
    };
  }

  const drafts = [];
  let current = null;

  for (const line of lines) {
    const markerForLine = detectDateMarker(line.text, referenceYmd, { allowLoose: !current || !current.marker });
    const startsNewSegment = markerForLine && (markerForLine.boundaryStrength === 'strong' || !current);

    if (startsNewSegment && current?.lines?.length) {
      drafts.push(current);
      current = null;
    }

    if (!current) {
      current = { index: drafts.length + 1, marker: markerForLine, lines: [] };
    } else if (markerForLine && !current.marker) {
      current.marker = markerForLine;
    }

    current.lines.push(line);
  }

  if (current?.lines?.length) drafts.push(current);

  const segments = drafts.map((draft) => finalizeSegment(draft, context));
  return {
    referenceDate: referenceYmd,
    timeZone: context.timeZone,
    referenceSource,
    segmentCount: segments.length,
    needsDateReviewCount: segments.filter((segment) => segment.needsDateConfirmation).length,
    futureDateBlockedCount: segments.filter((segment) => segment.futureDateBlocked).length,
    segments,
  };
}

export const _internal = {
  addDays,
  buildValidYmd,
  compareYmd,
  detectDateMarker,
  localYmdForIso,
  resolveLastWeekday,
};
