/**
 * MODULE: progressProofSummary
 * OWNER: Dashboard Progress / Client Hub
 * PURPOSE: Builds share-safe proof copy from canonical progress chart counts.
 */

import { getProgressProofStatusText } from '../../../utils/progressProofStatusText';
import { CANONICAL_CHART_IDS } from '../../../hooks/analytics/useClientProgressCharts.types';

// G5 drift fix (2026-07-24): single-source the deck size from the canonical id
// list (15), not a hardcoded 12. The old constant made the readiness meter clamp
// at 12/15 and award "Legendary" prematurely — it lied about a full deck. Derived
// here so the count can never drift from the real charts again.
export const TOTAL_PROGRESS_PROOF_CHARTS = CANONICAL_CHART_IDS.length;

export type ProgressProofAudience = 'client' | 'admin';
export type ProgressProofTone = 'empty' | 'building' | 'full' | 'unavailable';

export interface ProgressProofSummaryInput {
  nonEmptyChartCount: number;
  unavailableChartCount?: number;
  audience?: ProgressProofAudience;
}

export interface ProgressProofSummary {
  populated: number;
  unavailable: number;
  remaining: number;
  readinessPercent: number;
  totalCharts: number;
  tone: ProgressProofTone;
  proofLevel: string;
  nextUnlock: string;
  headline: string;
  qualityLabel: string;
  statusText: string;
  guidance: string;
  copyText: string;
}

const toChartCount = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(Number(value)), TOTAL_PROGRESS_PROOF_CHARTS));
};

const getTone = (populated: number, unavailable: number): ProgressProofTone => {
  if (unavailable > 0) return 'unavailable';
  if (populated === 0) return 'empty';
  if (populated === TOTAL_PROGRESS_PROOF_CHARTS) return 'full';
  return 'building';
};

const headlineByTone: Record<ProgressProofTone, string> = {
  empty: 'Proof deck is waiting on logged workouts',
  building: 'Progress proof is building',
  full: 'Progress proof is share-ready',
  unavailable: 'Progress proof needs a feed check',
};

const qualityByTone: Record<ProgressProofTone, string> = {
  empty: 'Log workouts to unlock',
  building: 'Verified data in progress',
  full: 'Verified chart deck',
  unavailable: 'Some feeds unavailable',
};

// Single-sourced proof-tier ladder. Both getProofLevel (current-level text) and
// the Proof Facet Rail (the earned-collection view) derive from THIS one array,
// so the tier thresholds can never drift between the two surfaces (Rule 58).
export const PROOF_LEVELS = [
  { min: TOTAL_PROGRESS_PROOF_CHARTS, label: 'Legendary' },
  { min: 8, label: 'Apex' },
  { min: 4, label: 'Momentum' },
  { min: 1, label: 'Spark' },
  { min: 0, label: 'Locked' },
] as const;

const getProofLevel = (populated: number): string => (
  PROOF_LEVELS.find((level) => populated >= level.min)?.label || 'Locked'
);

const getNextUnlock = (remaining: number): string => {
  if (remaining === 0) return 'Full deck unlocked';
  const chartLabel = remaining === 1 ? 'chart' : 'charts';
  return `${remaining} ${chartLabel} to full proof`;
};

const getGuidance = (audience: ProgressProofAudience): string => (
  audience === 'admin'
    ? 'Use this as a coach review layer before sharing wins. AI-estimated historical imports should be reviewed and saved before they count here.'
    : 'Share wins from verified logged workouts. AI-estimated historical imports should be reviewed and saved before they count here.'
);

export const buildProgressProofSummary = ({
  nonEmptyChartCount,
  unavailableChartCount = 0,
  audience = 'client',
}: ProgressProofSummaryInput): ProgressProofSummary => {
  const populated = toChartCount(nonEmptyChartCount);
  const unavailable = toChartCount(unavailableChartCount);
  const remaining = Math.max(TOTAL_PROGRESS_PROOF_CHARTS - populated, 0);
  const readinessPercent = Math.round((populated / TOTAL_PROGRESS_PROOF_CHARTS) * 100);
  const tone = getTone(populated, unavailable);
  const statusText = getProgressProofStatusText(populated, unavailable);
  const guidance = getGuidance(audience);

  return {
    populated,
    unavailable,
    remaining,
    readinessPercent,
    totalCharts: TOTAL_PROGRESS_PROOF_CHARTS,
    tone,
    proofLevel: getProofLevel(populated),
    nextUnlock: getNextUnlock(remaining),
    headline: headlineByTone[tone],
    qualityLabel: qualityByTone[tone],
    statusText,
    guidance,
    copyText: [
      `SwanStudios progress proof: ${statusText}.`,
      `Proof level: ${getProofLevel(populated)}.`,
      'Only verified logged workouts count in this proof deck.',
      'AI-estimated historical imports should be reviewed and saved before they count.',
    ].join(' '),
  };
};

export const buildProgressProofSocialDraft = (
  summary: ProgressProofSummary,
): string => [
  `Progress proof level: ${summary.proofLevel}.`,
  `${summary.populated}/${summary.totalCharts} SwanStudios charts are populated from verified logged workouts.`,
  summary.nextUnlock === 'Full deck unlocked'
    ? 'Full proof deck unlocked.'
    : `Next unlock: ${summary.nextUnlock}.`,
  '#ProgressProof #SwanProgress #SwanStudios',
].join(' ');
