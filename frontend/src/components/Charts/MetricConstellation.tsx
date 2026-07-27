/**
 * COMPONENT: MetricConstellation
 * PURPOSE: Surfaces which of a client's OWN logged metrics move together - the "aha,
 *   my habits connect" beat. Reads the canonical charts bundle, computes honest pairwise
 *   correlations (correlationInsights), and renders the strongest few as plain-language
 *   insight rows with a strength meter.
 * DATA POLICY: correlation, NOT causation. The copy says "move together", never "causes";
 *   the module drops flat series / thin overlap / weak |r|, so this panel simply does not
 *   appear until there is a real, well-sampled relationship to show.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Sparkles } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../hooks/analytics/useClientProgressCharts';
import { computeCorrelations, type CorrelationInsight, type MetricSeries } from './correlationInsights';

interface Props {
  charts: CanonicalProgressCharts;
  /** How many insight rows to show (default 3). */
  limit?: number;
}

// The directly-correlatable ChartPoint[] series in the canonical bundle + friendly names.
const CORRELATABLE: ReadonlyArray<{ key: keyof CanonicalProgressCharts; label: string }> = [
  { key: 'workoutFrequency', label: 'Workout Frequency' },
  { key: 'weeklyVolume', label: 'Training Volume' },
  { key: 'durationTrend', label: 'Session Duration' },
  { key: 'intensityRpeTrend', label: 'Intensity (RPE)' },
  { key: 'recoverySignal', label: 'Recovery' },
  { key: 'weightTrend', label: 'Body Weight' },
  { key: 'bodyFatTrend', label: 'Body Fat' },
];

const toSeries = (charts: CanonicalProgressCharts): MetricSeries[] =>
  CORRELATABLE
    .map(({ key, label }) => {
      const points = charts[key];
      return { key: String(key), label, points: Array.isArray(points) ? (points as MetricSeries['points']) : [] };
    })
    .filter((s) => s.points.length > 0);

const phrase = (i: CorrelationInsight): string => (
  i.direction === 'together'
    ? `${i.aLabel} and ${i.bLabel} rise and fall together`
    : `${i.aLabel} and ${i.bLabel} move in opposite directions`
);

const Panel = styled.section`
  margin: 1rem 0;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent), transparent 40%),
    var(--bg-elevated, #141419);
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.9rem/1.2 'Sora', sans-serif;
  svg { color: var(--accent-secondary, #8B5CF6); flex: 0 0 auto; }
`;

const Micro = styled.p`
  margin: 0.25rem 0 0.75rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 650 0.68rem/1.4 'Sora', sans-serif;
`;

const Row = styled.div`
  display: grid;
  gap: 0.3rem;
  padding: 0.5rem 0;
  & + & { border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent); }
`;

const Phrase = styled.span`
  min-width: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font: 700 0.74rem/1.35 'Sora', sans-serif;
`;

const Meter = styled.div`
  position: relative;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-graphite, #1A1A24) 84%, var(--accent-secondary, #8B5CF6));
`;

const Fill = styled.span<{ $pct: number; $inverse: boolean }>`
  display: block;
  height: 100%;
  width: ${({ $pct }) => `${Math.max(0, Math.min(100, $pct))}%`};
  border-radius: inherit;
  background: ${({ $inverse }) => ($inverse
    ? 'linear-gradient(90deg, var(--accent-gold, #C6A84B), var(--warning, #F59E0B))'
    : 'linear-gradient(90deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))')};
`;

const Meta = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent));
  font: 700 0.62rem/1 'Sora', sans-serif;
`;

const MetricConstellation: React.FC<Props> = ({ charts, limit = 3 }) => {
  const insights = useMemo(
    () => computeCorrelations(toSeries(charts)).slice(0, limit),
    [charts, limit],
  );

  if (insights.length === 0) return null;

  return (
    <Panel data-testid="metric-constellation" aria-label="How your metrics connect">
      <Head><Sparkles size={16} aria-hidden="true" />How your metrics connect</Head>
      <Micro>Patterns in your own logs. This is correlation - these metrics move together, not proof that one causes the other.</Micro>
      {insights.map((i) => (
        <Row key={`${i.aKey}-${i.bKey}`}>
          <Phrase>{phrase(i)}</Phrase>
          <Meter aria-hidden="true"><Fill $pct={Math.round(Math.abs(i.r) * 100)} $inverse={i.direction === 'inverse'} /></Meter>
          <Meta>{i.strength} link · {Math.round(Math.abs(i.r) * 100)}% aligned · {i.sampleSize} shared points</Meta>
        </Row>
      ))}
    </Panel>
  );
};

export default React.memo(MetricConstellation);
