/**
 * MODULE: progressShareCard
 * PURPOSE: Build safe, truthful share-card copy from already-rendered chart data.
 * OWNER: Client Dashboard / Progress Proof.
 * DATA POLICY: Never reads raw client records or row-level identity fields.
 */

import type {
  ProgressChartCsvRow,
  ProgressChartPulse,
  ProgressChartPulseTone,
} from './progressChartActions';

export interface ProgressShareMetric {
  label: string;
  value: string;
}

export interface ProgressShareCard {
  caption: string;
  detail: string;
  isShareable: boolean;
  kicker: string;
  metrics: ProgressShareMetric[];
  proofLine: string;
  title: string;
  tone: ProgressChartPulseTone;
}

interface BuildProgressShareCardInput {
  chartTitle: string;
  csvRows: ProgressChartCsvRow[];
  pulse?: ProgressChartPulse;
  rangeLabel: string;
  summary: string;
}

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;

const cleanShareText = (value: string): string => (
  value
    .replace(EMAIL_PATTERN, '[redacted]')
    .replace(PHONE_PATTERN, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
);

const rowCountLabel = (count: number): string => (
  `${count} verified chart row${count === 1 ? '' : 's'}`
);

const buildMetrics = (
  pulse: ProgressChartPulse | undefined,
  rangeLabel: string,
  rowCount: number,
): ProgressShareMetric[] => {
  const metrics: ProgressShareMetric[] = [
    { label: 'Range', value: cleanShareText(rangeLabel) },
    { label: 'Verified rows', value: String(rowCount) },
  ];

  if (pulse && pulse.tone !== 'empty') {
    metrics.unshift({ label: pulse.label, value: cleanShareText(pulse.value) });
  }

  return metrics;
};

const buildEmptyCard = (
  title: string,
  rangeLabel: string,
  rowCount: number,
): ProgressShareCard => ({
  caption: [
    `Progress Proof: ${title}`,
    `Waiting on verified chart rows for ${cleanShareText(rangeLabel)}.`,
  ].join('\n'),
  detail: 'No verified workout chart rows exist for this share card yet.',
  isShareable: false,
  kicker: 'Progress Proof Studio',
  metrics: buildMetrics(undefined, rangeLabel, rowCount),
  proofLine: 'Log real workouts to unlock a shareable proof card.',
  title,
  tone: 'empty',
});

const hasShareablePulse = (
  pulse: ProgressChartPulse | undefined,
  rowCount: number,
): pulse is ProgressChartPulse => Boolean(pulse) && pulse?.tone !== 'empty' && rowCount > 0;

const proofLineForPulse = (pulse: ProgressChartPulse, rowCount: number): string => (
  pulse.target ? cleanShareText(pulse.target) : rowCountLabel(rowCount)
);

const buildShareableCard = (
  title: string,
  pulse: ProgressChartPulse,
  rangeLabel: string,
  summary: string,
  rowCount: number,
): ProgressShareCard => {
  const pulseLabel = cleanShareText(pulse.label);
  const pulseValue = cleanShareText(pulse.value);
  const pulseDetail = cleanShareText(pulse.detail);
  const safeSummary = cleanShareText(summary);

  return {
    caption: [
      `Progress Proof: ${title}`,
      `${pulseLabel}: ${pulseValue}`,
      pulseDetail,
      safeSummary,
      rowCountLabel(rowCount),
      '#SwanProgress #ProgressProof',
    ].join('\n'),
    detail: pulseDetail,
    isShareable: true,
    kicker: 'Progress Proof Studio',
    metrics: buildMetrics(pulse, rangeLabel, rowCount),
    proofLine: proofLineForPulse(pulse, rowCount),
    title,
    tone: pulse.tone,
  };
};

export function buildProgressShareCard({
  chartTitle,
  csvRows,
  pulse,
  rangeLabel,
  summary,
}: BuildProgressShareCardInput): ProgressShareCard {
  const title = cleanShareText(chartTitle);
  const rowCount = csvRows.length;

  if (!hasShareablePulse(pulse, rowCount)) {
    return buildEmptyCard(title, rangeLabel, rowCount);
  }

  return buildShareableCard(title, pulse, rangeLabel, summary, rowCount);
}
