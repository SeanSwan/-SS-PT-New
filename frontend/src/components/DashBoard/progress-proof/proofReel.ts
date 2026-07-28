/**
 * MODULE: proofReel
 * PURPOSE: Sequences a client's REAL proof moments into an ordered, shareable "reel" — the
 *   celebratory, community-trophy format the progress deck feeds into. Each slide is a
 *   genuine fact from logged data (proof level, a personal record, the biggest recent gain).
 * DATA POLICY: zero fabrication. A slide appears ONLY when the underlying real data exists;
 *   an early-stage client with nothing to celebrate gets an empty reel (the strip then
 *   renders nothing). shareCaption reuses the existing truthful buildChartMomentCaption.
 * SCOPE (honest, Rule 74/75): this is a montage of the client's OWN real proof cards — it is
 *   NOT an AI-generated video. A Seedance-rendered video export is a genuine FUTURE backend
 *   hook (Seedance -> R2 pipeline), deliberately not built here and not faked.
 */

import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import { buildProgressProofSummary } from './progressProofSummary';
import { buildMovementDigest } from './chartMovementDigest';
import { buildChartMomentCaption } from './progressSocialShare';

export type ProofReelKind = 'level' | 'pr' | 'gain';

export interface ProofReelSlide {
  key: string;
  kind: ProofReelKind;
  headline: string;
  detail: string;
  /** Truthful, text-only share caption (or null if it couldn't be built). */
  shareCaption: string | null;
}

const KIND_LABEL: Record<ProofReelKind, string> = { level: 'Proof', pr: 'PR', gain: 'Gain' };

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const captionFor = (kind: ProofReelKind, headline: string, detail: string): string | null =>
  buildChartMomentCaption({ title: headline, pulse: { label: KIND_LABEL[kind], value: detail } });

const makeSlide = (kind: ProofReelKind, headline: string, detail: string): ProofReelSlide => ({
  key: kind,
  kind,
  headline,
  detail,
  shareCaption: captionFor(kind, headline, detail),
});

/**
 * Ordered reel of real proof moments for the given chart bundle + verified populated count.
 * Celebratory first (proof level), then a personal record, then the biggest recent gain.
 * Only slides backed by real data are included.
 */
export const buildProofReel = (
  charts: CanonicalProgressCharts,
  nonEmptyChartCount: number,
): ProofReelSlide[] => {
  const slides: ProofReelSlide[] = [];

  // 1) Proof level — only once at least one chart is populated from logged workouts.
  const summary = buildProgressProofSummary({ nonEmptyChartCount });
  if (summary.populated > 0) {
    slides.push(makeSlide(
      'level',
      `${summary.proofLevel} proof`,
      `${summary.populated} of ${summary.totalCharts} charts verified`,
    ));
  }

  // 2) Personal record — the top PR moment, when one exists.
  const bestPr = Array.isArray(charts?.prTimeline) ? charts.prTimeline[0] : undefined;
  if (bestPr && Number.isFinite(bestPr.y) && bestPr.exercise) {
    const reps = Number.isFinite(bestPr.reps) ? ` (${bestPr.reps} reps)` : '';
    slides.push(makeSlide('pr', 'Personal record', `${bestPr.exercise} — ${bestPr.y}${reps}`));
  }

  // 3) Biggest recent gain — the improved-direction mover with the largest percent change.
  const gains = buildMovementDigest(charts).rows
    .filter((r) => r.improved === true)
    .sort((a, b) => (b.pctChange ?? -Infinity) - (a.pctChange ?? -Infinity));
  const topGain = gains[0];
  if (topGain) {
    const pct = topGain.pctChange !== null ? ` (${signed(topGain.pctChange)}%)` : '';
    slides.push(makeSlide('gain', 'Biggest gain', `${topGain.label} ${signed(topGain.delta)}${topGain.unit}${pct}`));
  }

  return slides;
};
