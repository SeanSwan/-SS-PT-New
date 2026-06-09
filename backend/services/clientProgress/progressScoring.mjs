// backend/services/clientProgress/progressScoring.mjs

export const unwrapRow = (row) => (row?.toJSON ? row.toJSON() : row);

export const unwrapRows = (rows) => (Array.isArray(rows) ? rows.map(unwrapRow) : []);

export const toMetricNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toPositiveMetric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const toPercentScore = (value) => {
  const parsed = toMetricNumber(value);
  return Math.max(0, Math.min(100, Math.round(parsed / 10)));
};

export const mean = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length
    ? Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length)
    : 0;
};

export const clampScore = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
};

export const toIsoDateTime = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const formatBodyRegion = (value) => String(value || 'body region')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
