// backend/services/clientProgress/comparisonAnalyticsReadModel.mjs

import { mean, toPercentScore, unwrapRow, unwrapRows } from './progressScoring.mjs';

export const COMPARISON_LEVEL_FIELDS = [
  { name: 'Overall Level', field: 'overallLevel' },
  { name: 'Core Level', field: 'coreLevel' },
  { name: 'Balance Level', field: 'balanceLevel' },
  { name: 'Stability Level', field: 'stabilityLevel' },
  { name: 'Flexibility Level', field: 'flexibilityLevel' },
];

const COMPARISON_TYPES = new Set(['average', 'clients', 'historical', 'goals']);
const EMPTY_COMPARISON_COPY = {
  historical: {
    title: 'Personal History',
    subtitle: 'Historical comparison requires stored progress snapshots; none are available yet.',
  },
  goals: {
    title: 'Target Goals',
    subtitle: 'Goal comparison requires client goal targets; none were returned for this client yet.',
  },
};
const TITLE_BY_TYPE = {
  clients: 'Client Cohort Comparison',
  average: 'Average Performance',
};

const parseComparisonType = (value) => {
  const normalized = String(value || 'average').toLowerCase();
  return COMPARISON_TYPES.has(normalized) ? normalized : 'average';
};

const percentileFor = (clientScore, scores) => {
  const clean = scores.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  const atOrBelow = clean.filter((value) => value <= clientScore).length;
  return Math.max(1, Math.min(99, Math.round((atOrBelow / clean.length) * 100)));
};

const valueOrDefault = (value, fallback) => (value ? value : fallback);

const titleForType = (type) => TITLE_BY_TYPE[type] || TITLE_BY_TYPE.average;

const emptyComparison = (type, timeframe, copy = {}) => ({
  comparisonType: type,
  title: valueOrDefault(copy.title, titleForType(type)),
  subtitle: valueOrDefault(copy.subtitle, 'No benchmark cohort is available yet. Add more real client progress records before comparing.'),
  metrics: [],
  insights: [],
  timeframe: String(timeframe || '3months'),
});

const buildMetric = (clientProgress, cohort, { name, field }) => {
  const client = toPercentScore(clientProgress[field]);
  const cohortScores = cohort.map((row) => toPercentScore(row[field]));
  const comparison = mean(cohortScores);
  const delta = client - comparison;
  return {
    name,
    client,
    comparison,
    percentile: percentileFor(client, [...cohortScores, client]),
    trend: delta > 0 ? 'above' : delta < 0 ? 'below' : 'equal',
    improvement: `${delta >= 0 ? '+' : ''}${delta}%`,
  };
};

const metricDelta = (metric) => metric.client - metric.comparison;

const strongestInsight = (metric) => {
  if (!metric || metric.client <= metric.comparison) return null;
  return {
    type: 'success',
    title: `${metric.name} is ahead of cohort`,
    description: `${metric.client}% vs ${metric.comparison}% cohort average.`,
    recommendation: 'Keep the current progression pattern and use it as a confidence signal.',
  };
};

const weakestInsight = (metric) => {
  if (!metric || metric.client >= metric.comparison) return null;
  return {
    type: 'warning',
    title: `${metric.name} is behind cohort`,
    description: `${metric.client}% vs ${metric.comparison}% cohort average.`,
    recommendation: 'Review recent workout logs and bias the next plan toward this category.',
  };
};

const comparisonInsights = (metrics) => {
  const strongest = [...metrics].sort((a, b) => metricDelta(b) - metricDelta(a))[0];
  const weakest = [...metrics].sort((a, b) => metricDelta(a) - metricDelta(b))[0];
  return [strongestInsight(strongest), weakestInsight(weakest)].filter(Boolean);
};

const hasBenchmark = (client, cohort) => Boolean(client) && cohort.length > 0;

const cohortRecordLabel = (count) => (count === 1 ? 'record' : 'records');

export const buildComparisonAnalytics = ({
  clientProgress,
  cohortProgress,
  comparisonType,
  timeframe,
}) => {
  const type = parseComparisonType(comparisonType);
  const specialCopy = EMPTY_COMPARISON_COPY[type];
  if (specialCopy) return emptyComparison(type, timeframe, specialCopy);

  const client = unwrapRow(clientProgress);
  const cohort = unwrapRows(cohortProgress);
  if (!hasBenchmark(client, cohort)) return emptyComparison(type, timeframe);

  const metrics = COMPARISON_LEVEL_FIELDS.map((fieldConfig) => buildMetric(client, cohort, fieldConfig));
  return {
    comparisonType: type,
    title: titleForType(type),
    subtitle: `Compared against ${cohort.length} other real client progress ${cohortRecordLabel(cohort.length)}.`,
    metrics,
    insights: comparisonInsights(metrics),
    timeframe: String(timeframe || '3months'),
  };
};
