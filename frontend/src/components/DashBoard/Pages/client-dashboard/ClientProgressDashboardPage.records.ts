export interface PersonalRecordView {
  key: string;
  exerciseName: string;
  valueText: string;
  detailText: string;
}

type PersonalRecordRow = Record<string, unknown>;

const isRecordRow = (value: unknown): value is PersonalRecordRow => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const toSafeText = (value: unknown) => (
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
);

const INVALID_NUMERIC_TOKEN = /\b(?:nan|[+-]?infinity)\b/i;
const SAFE_UNIT = /^[a-z%/ ]{1,12}$/i;
const POSITIVE_NUMBER_TEXT = /^\+?(?:\d+(?:\.\d+)?|\.\d+)$/;
const POSITIVE_METRIC_TEXT = /^\+?(?:\d+(?:\.\d+)?|\.\d+)\s+([a-z%/ ]{1,12})$/i;
const POSITIVE_REPS_TEXT = /^\+?(?:\d+(?:\.\d+)?|\.\d+)\s+reps?$/i;
const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const RECORD_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const formatNumber = (value: number) => (
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
);

const toSafeUnit = (value: unknown) => {
  const text = toSafeText(value);
  if (!text || INVALID_NUMERIC_TOKEN.test(text) || !SAFE_UNIT.test(text)) return null;
  return text;
};

const toSafePositiveValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? formatNumber(value) : null;
  }

  const text = toSafeText(value);
  if (!text) return null;

  const normalized = text.toLowerCase();
  if (INVALID_NUMERIC_TOKEN.test(normalized)) return null;
  if (/^-\s*\d/.test(text)) return null;

  if (POSITIVE_NUMBER_TEXT.test(text)) {
    return formatNumber(Number(text));
  }

  const metricText = text.match(POSITIVE_METRIC_TEXT);
  if (metricText && toSafeUnit(metricText[1])) {
    return text.replace(/\s+/g, ' ');
  }

  return null;
};

const toSafeRepsValue = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? formatNumber(value) : null;
  }

  const text = toSafeText(value);
  if (!text) return null;
  if (INVALID_NUMERIC_TOKEN.test(text) || /^-\s*\d/.test(text)) return null;
  if (POSITIVE_NUMBER_TEXT.test(text)) return formatNumber(Number(text));

  const repsText = text.match(POSITIVE_REPS_TEXT);
  if (!repsText) return null;

  return `${formatNumber(Number(text.replace(/\s+reps?$/i, '')))} reps`;
};

const formatRecordDate = (value: unknown) => {
  const text = toSafeText(value);
  const match = text?.match(ISO_CALENDAR_DATE);
  if (!match) return '';

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return RECORD_DATE_FORMATTER.format(date);
};

const getFirstSafeText = (row: PersonalRecordRow, fields: string[], fallback: string) => {
  for (const field of fields) {
    const text = toSafeText(row[field]);
    if (text) return text;
  }
  return fallback;
};

const formatRecordValue = (row: PersonalRecordRow) => {
  const value = toSafePositiveValue(row.weight)
    ?? toSafePositiveValue(row.estimated1RM)
    ?? toSafePositiveValue(row.value);

  if (!value) return '-';
  if (/[a-z%]/i.test(value)) return value;

  return `${value}${toSafeUnit(row.unit) ?? 'lbs'}`;
};

const formatRecordDetail = (row: PersonalRecordRow) => {
  const reps = toSafeRepsValue(row.reps);
  if (reps) return /rep/i.test(reps) ? reps : `${reps} reps`;
  return formatRecordDate(row.date);
};

export function normalizeClientPersonalRecords(records: unknown): PersonalRecordView[] {
  if (!Array.isArray(records)) return [];

  return records
    .filter(isRecordRow)
    .map((row, index) => ({
      key: `${getFirstSafeText(row, ['exerciseName', 'exercise'], 'Exercise')}-${index}`,
      exerciseName: getFirstSafeText(row, ['exerciseName', 'exercise'], 'Exercise'),
      valueText: formatRecordValue(row),
      detailText: formatRecordDetail(row),
    }));
}
