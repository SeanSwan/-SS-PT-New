/**
 * Dashboards v2 — TrendChart (KIMI-DASHBOARDS §2.4). Victory only, themed by the SHIPPED
 * resolveLensVictoryTheme (Chart-Charter deferral honored: primary series follows --world-accent,
 * chrome stays Swan-fixed). SVG can't carry var(), so colors are RESOLVED from a host ref inside
 * the lens frame and re-resolved on world switch. Resolved colors flow through Victory's `theme`
 * prop (cascades to the marks) — NOT per-mark `style=` (which the DOM-inline-style ban forbids).
 * `animate` comes from the density's motion tier.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { VictoryArea, VictoryAxis, VictoryBar, VictoryChart, VictoryLine, type VictoryThemeDefinition } from 'victory';
import type { ChartSeries } from '../types';
import { resolveLensVictoryTheme } from '../lensBindings';
import { useWorldKey } from '../useWorldKey';

export interface TrendChartProps {
  series: ChartSeries;
  variant: 'line' | 'area' | 'bar';
  height: number;
  animate?: boolean;
}

export function TrendChart({ series, variant, height, animate = false }: TrendChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldKey = useWorldKey();
  const [bundle, setBundle] = useState(() => resolveLensVictoryTheme(null));

  useLayoutEffect(() => {
    setBundle(resolveLensVictoryTheme(hostRef.current));
  }, [worldKey]);

  const { theme } = bundle;
  const data = series.values.map((y, i) => ({ x: series.labels[i] ?? String(i), y }));
  const stroke = theme.palette.qualitative[0];
  const axis = {
    style: {
      axis: { stroke: theme.axis.style.axis.stroke },
      grid: { stroke: theme.axis.style.grid.stroke },
      ticks: theme.axis.style.ticks,
      tickLabels: { fill: theme.axis.style.tickLabels.fill, fontSize: 10 },
    },
  };
  // Victory theme (resolved colors cascade to the marks) — the charting API, not DOM inline style.
  const victoryTheme = {
    axis,
    line: { style: { data: { stroke } } },
    area: { style: { data: { fill: stroke, fillOpacity: 0.18, stroke } } },
    bar: { style: { data: { fill: stroke } } },
  } as unknown as VictoryThemeDefinition;
  const anim = animate ? { duration: 300, onLoad: { duration: 300 } } : (false as const);

  return (
    <div ref={hostRef} data-testid="dash-trend" aria-label={`${series.unit} trend`}>
      <VictoryChart
        theme={victoryTheme}
        height={height}
        padding={{ top: 8, bottom: 24, left: 36, right: 8 }}
        domainPadding={{ x: variant === 'bar' ? 16 : 4 }}
      >
        <VictoryAxis fixLabelOverlap />
        <VictoryAxis dependentAxis />
        {variant === 'bar' ? (
          <VictoryBar data={data} animate={anim} />
        ) : variant === 'area' ? (
          <VictoryArea data={data} interpolation="monotoneX" animate={anim} />
        ) : (
          <VictoryLine data={data} interpolation="monotoneX" animate={anim} />
        )}
      </VictoryChart>
    </div>
  );
}
