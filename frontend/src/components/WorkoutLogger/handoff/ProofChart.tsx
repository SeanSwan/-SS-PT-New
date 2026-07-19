/**
 * ProofChart.tsx — the "proof" Victory chart for the Post-Save Handoff.
 * Renders the estimated-1RM trend from REAL logged sessions (data-truth). Victory only.
 * Charts use data-accent (Arctic Cyan) exclusively — never a button/glow color.
 * Today's point is the Flight Point (Ice Wing); on a PR it becomes the Gilded Point (gold).
 * Width is responsive (Victory viewBox scales to the container); `height` defaults to 220px.
 * Wrapped in role="img" + aria-label so assistive tech gets the trend, not a bare SVG.
 */
import React, { useMemo } from 'react';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryLine, VictoryScatter } from 'victory';
import type { ProofPoint } from './workoutHandoff.types';

interface ProofChartProps {
  points: ProofPoint[];
  pr: boolean;
  height?: number;
  ariaLabel?: string;
}

const DATA_ACCENT = 'var(--data-accent, #50A0F0)';
const ICE_WING = 'var(--accent-primary, #60C0F0)';
const GOLD = 'var(--accent-gold, #C6A84B)';
const AXIS = 'var(--text-primary-40, rgba(224, 236, 244, 0.4))';
const GRID = 'var(--chart-grid, rgba(224, 236, 244, 0.06))';
const GOLD_HALO = 'var(--glow-gold-strong, rgba(198, 168, 75, 0.55))';
const CYAN_HALO = 'var(--glow-cyan-soft, rgba(96, 192, 240, 0.5))';

const ProofChart: React.FC<ProofChartProps> = ({ points, pr, height = 220, ariaLabel }) => {
  const data = useMemo(
    () => points.map((p, i) => ({ x: i + 1, y: p.e1rm, isToday: !!p.isToday, pending: !!p.isPendingSync })),
    [points],
  );
  // Highlight ONLY a real today point — never mark a prior session as "today".
  const todayDatum = data.find((d) => d.isToday) ?? null;
  // A single point draws no area/line; still plot the lone dot (neutral) so the chart is never blank.
  const soloDatum = data.length === 1 ? data[0] : null;
  const markDatum = todayDatum ?? soloDatum;
  const markIsPr = !!(markDatum && markDatum.isToday && pr);

  if (data.length === 0) return null;

  const ys = data.map((d) => d.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = Math.max(5, Math.round((max - min) * 0.2) || 5);

  return (
    <div role="img" aria-label={ariaLabel || 'Estimated one-rep max trend from your logged sessions'} style={{ width: '100%' }}>
      <VictoryChart
        height={height}
        width={560}
        padding={{ top: 16, bottom: 28, left: 44, right: 16 }}
        domainPadding={{ x: data.length === 1 ? 60 : 12, y: 8 }}
        domain={{ y: [Math.max(0, min - pad), max + pad] }}
      >
        <VictoryAxis
          dependentAxis
          tickFormat={(t: number) => `${t}`}
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: GRID },
            tickLabels: { fill: AXIS, fontFamily: 'Fira Code, monospace', fontSize: 9 },
          }}
        />
        <VictoryAxis
          style={{ axis: { stroke: 'transparent' }, tickLabels: { fill: 'transparent' } }}
          tickFormat={() => ''}
        />
        {data.length > 1 && (
          <VictoryArea
            data={data}
            interpolation="monotoneX"
            style={{ data: { fill: ICE_WING, fillOpacity: 0.16, stroke: 'transparent' } }}
          />
        )}
        {data.length > 1 && (
          <VictoryLine
            data={data}
            interpolation="monotoneX"
            style={{ data: { stroke: DATA_ACCENT, strokeWidth: 2.5 } }}
          />
        )}
        {markDatum && (
          <VictoryScatter
            data={[markDatum]}
            size={markIsPr ? 8 : 7}
            style={{
              data: {
                fill: markIsPr ? GOLD : ICE_WING,
                stroke: markIsPr ? GOLD_HALO : CYAN_HALO,
                strokeWidth: markIsPr ? 6 : 4,
              },
            }}
          />
        )}
      </VictoryChart>
    </div>
  );
};

export default ProofChart;
