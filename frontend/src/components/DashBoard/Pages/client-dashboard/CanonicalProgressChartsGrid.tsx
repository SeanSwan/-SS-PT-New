/**
 * ┌─── COMPONENT: CanonicalProgressChartsGrid ─────────────────┐
 * │ PARENT: ClientProgressDashboardPage                         │
 * │ PURPOSE: 12-chart canonical client progress visualization   │
 * │ OWNER: Claude Opus 4.6 | CREATED: 2026-04-15 (Phase 14)    │
 * │                                                              │
 * │ Phase 14 rebuild. Replaces the pre-Phase-14 ProfileChartsGrid│
 * │ on the canonical /dashboard/client/progress route. The old  │
 * │ grid defaulted to a 2-chart subset (workoutFrequency +      │
 * │ weightProgression) because the other 7 default charts were │
 * │ either silently broken (PascalCase join chains returning [])│
 * │ or had no live data source (preview fallbacks). This grid  │
 * │ renders the full 12 canonical charts, always visible, all  │
 * │ reading from the truthful workout_logs + workout_sessions  │
 * │ backbone.                                                    │
 * │                                                              │
 * │ Truthful empty states — if a chart has zero data, it shows │
 * │ an honest "No workouts logged yet" / "No pain flags" card  │
 * │ instead of hiding. The empty state is itself a signal.     │
 * │                                                              │
 * │ Props: { userId }                                            │
 * │ DATA FLOW: useClientProgressCharts → /api/client/analytics  │
 * │            → 12 canonical chart payloads → grid cards       │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  VictoryChart, VictoryBar, VictoryLine, VictoryArea, VictoryAxis,
  VictoryTooltip, VictoryVoronoiContainer, VictoryPie, VictoryLegend,
  VictoryGroup,
} from 'victory';
import {
  Activity, BarChart3, Target, TrendingUp, Calendar, Flame,
  Trophy, Dumbbell, Layers, Users, AlertTriangle, HeartPulse,
} from 'lucide-react';
import {
  useClientProgressCharts,
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import {
  CHART_COLORS, FULL_PALETTE, victoryTheme, hexAlpha,
} from '../../../Charts/chartTheme';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 0.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem 1.25rem 1.25rem;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.18);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const CardIcon = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const CardSubtitle = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const ChartBody = styled.div`
  flex: 1;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1.5rem 0.5rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
`;

const EmptyLabel = styled.span`
  font-size: 0.82rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const EmptyHint = styled.span`
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
  margin-bottom: 0.25rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

// Inline row-style chart elements for simple bar-list visualizations
// (exercise frequency, recovery signal, etc.) where Victory would be
// overkill and a CSS bar chart is cleaner / more readable on a card.
const BarList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const BarRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-primary, #E0ECF4);
`;

const BarLabel = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const BarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.08);
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${({ $pct }) => Math.max(Math.min($pct, 100), 2)}%;
  background: ${({ $color }) => $color || CHART_COLORS.iceWing};
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
`;

const BarValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

const RingWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
`;

const RingNumber = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  line-height: 1;
`;

const RingLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 0.25rem;
`;

const StatStack = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  flex: 1;
`;

const StatPill = styled.div`
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const StatPillValue = styled.span<{ $color?: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
`;

const StatPillLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Shared "empty" primitive
// ─────────────────────────────────────────────────────────────

const EmptyCard: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <EmptyState>
    <EmptyLabel>{label}</EmptyLabel>
    {hint && <EmptyHint>{hint}</EmptyHint>}
  </EmptyState>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Individual chart cards (per canonical chart ID)
//
// Each card receives its slice of the canonical bundle and renders
// the strongest truthful visualization for that data. If the slice
// is empty, the card renders a scoped `EmptyCard` with an honest
// label — never a demo / preview fallback.
// ─────────────────────────────────────────────────────────────

function useNumericBarWidth(points: ChartPoint[]): number[] {
  // Shared fill-percent derivation: cap at max(points.y) so each bar is
  // scaled relative to the heaviest bar in its own card. Returns [] when
  // empty so callers can early-return.
  return useMemo(() => {
    if (!points.length) return [];
    const max = Math.max(...points.map((p) => p.y));
    if (max <= 0) return points.map(() => 0);
    return points.map((p) => (p.y / max) * 100);
  }, [points]);
}

const workoutFrequencyBarProps = {
  style: { data: { fill: CHART_COLORS.iceWing } },
};

const weeklyVolumeAreaProps = {
  style: {
    data: {
      fill: hexAlpha(CHART_COLORS.wingPurple, 0.3),
      stroke: CHART_COLORS.wingPurple,
      strokeWidth: 2,
    },
  },
};

const setsRepsLegendProps = {
  style: { labels: { fill: CHART_COLORS.textSecondary, fontSize: 10 } },
};

const setsBarProps = {
  style: { data: { fill: CHART_COLORS.arcticCyan } },
};

const repsBarProps = {
  style: { data: { fill: CHART_COLORS.gildedFern } },
};

const durationLineProps = {
  style: { data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2 } },
};

const intensityLineProps = {
  style: { data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2 } },
};

const anchorLegendProps = {
  style: { labels: { fill: CHART_COLORS.textSecondary, fontSize: 9 } },
};

const lineStyleProps = (color: string) => ({
  style: { data: { stroke: color, strokeWidth: 2 } },
});

const movementPieProps = {
  style: {
    labels: {
      fill: CHART_COLORS.textSecondary,
      fontFamily: "'Fira Code', monospace",
      fontSize: 9,
    },
  },
};

const RecoveryAlertIcon = styled(AlertTriangle)`
  vertical-align: -2px;
  margin-right: 4px;
  color: ${CHART_COLORS.crimsonFrost};
`;

// #1 — Workout Frequency
const WorkoutFrequencyCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => (
  <ChartCard data-testid="chart-card-workoutFrequency">
    <CardHeader>
      <CardIcon><Calendar size={16} /></CardIcon>
      <CardTitle>Workout Frequency</CardTitle>
      <CardSubtitle>12 weeks</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No completed workouts yet" hint="Log your first session to start the streak." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis tickFormat={(t) => String(t)} />
          <VictoryAxis dependentAxis />
          <VictoryBar
            data={data}
            {...workoutFrequencyBarProps}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
            cornerRadius={{ top: 3 }}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

// #2 — Attendance Reliability
const AttendanceReliabilityCard: React.FC<{
  bundle: CanonicalProgressCharts['attendanceReliability'];
}> = ({ bundle }) => (
  <ChartCard data-testid="chart-card-attendanceReliability">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.gildedFern}><Users size={16} /></CardIcon>
      <CardTitle>Attendance Reliability</CardTitle>
      <CardSubtitle>90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {bundle.data.length === 0 ? (
        <EmptyCard label="No attendance data yet" hint="Booked sessions will appear here." />
      ) : (
        <RingWrap>
          <div>
            <RingNumber>{bundle.reliabilityPercent}%</RingNumber>
            <RingLabel>Show-rate</RingLabel>
          </div>
          <StatStack>
            <StatPill>
              <StatPillValue $color={CHART_COLORS.auroraGreen}>
                {bundle.totals.completed}
              </StatPillValue>
              <StatPillLabel>Completed</StatPillLabel>
            </StatPill>
            <StatPill>
              <StatPillValue $color={CHART_COLORS.warning}>
                {bundle.totals.skipped}
              </StatPillValue>
              <StatPillLabel>Skipped</StatPillLabel>
            </StatPill>
            <StatPill>
              <StatPillValue $color={CHART_COLORS.crimsonFrost}>
                {bundle.totals.cancelled}
              </StatPillValue>
              <StatPillLabel>Cancelled</StatPillLabel>
            </StatPill>
            <StatPill>
              <StatPillValue>{bundle.totals.resolved}</StatPillValue>
              <StatPillLabel>Resolved</StatPillLabel>
            </StatPill>
          </StatStack>
        </RingWrap>
      )}
    </ChartBody>
  </ChartCard>
);

// #3 — Weekly Training Volume
const WeeklyVolumeCard: React.FC<{
  data: CanonicalProgressCharts['weeklyVolume'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-weeklyVolume">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.wingPurple}><BarChart3 size={16} /></CardIcon>
      <CardTitle>Weekly Training Volume</CardTitle>
      <CardSubtitle>lbs · 12 weeks</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No logged lifts yet" hint="Sets × reps × weight will populate once workouts are logged." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 52, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryArea
            data={data}
            {...weeklyVolumeAreaProps}
            labels={({ datum }) => `${datum.x}: ${Math.round(datum.y).toLocaleString()} lbs`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

// #4 — Sets & Reps Trend
const SetsRepsTrendCard: React.FC<{
  bundle: CanonicalProgressCharts['setsRepsTrend'];
}> = ({ bundle }) => (
  <ChartCard data-testid="chart-card-setsRepsTrend">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.arcticCyan}><Layers size={16} /></CardIcon>
      <CardTitle>Total Sets &amp; Reps</CardTitle>
      <CardSubtitle>12 weeks</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {bundle.sets.length === 0 ? (
        <EmptyCard label="No sets logged yet" />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 24, bottom: 40, left: 50, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryLegend
            x={50}
            y={0}
            orientation="horizontal"
            gutter={16}
            {...setsRepsLegendProps}
            data={[
              { name: 'Sets', symbol: { fill: CHART_COLORS.arcticCyan } },
              { name: 'Reps', symbol: { fill: CHART_COLORS.gildedFern } },
            ]}
          />
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryGroup offset={8}>
            <VictoryBar
              data={bundle.sets}
              {...setsBarProps}
              labels={({ datum }) => `Sets ${datum.x}: ${datum.y}`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
            />
            <VictoryBar
              data={bundle.reps}
              {...repsBarProps}
              labels={({ datum }) => `Reps ${datum.x}: ${datum.y}`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
            />
          </VictoryGroup>
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

// #5 — Session Duration Trend
const DurationTrendCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => (
  <ChartCard data-testid="chart-card-durationTrend">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.iceWing}><Activity size={16} /></CardIcon>
      <CardTitle>Session Duration</CardTitle>
      <CardSubtitle>minutes · 90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No duration data yet" hint="Logged sessions with a recorded duration will appear here." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryLine
            data={data}
            {...durationLineProps}
            labels={({ datum }) => `${datum.x}: ${datum.y}min`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

// #6 — Intensity / RPE Trend
const IntensityRpeCard: React.FC<{
  data: CanonicalProgressCharts['intensityRpeTrend'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-intensityRpeTrend">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.wingPurple}><Flame size={16} /></CardIcon>
      <CardTitle>Effort Trend</CardTitle>
      <CardSubtitle>RPE ▸ intensity</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No intensity data yet" hint="Add RPE to sets, or rate the session intensity 1–10." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          domain={{ y: [0, 10] }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryLine
            data={data}
            {...intensityLineProps}
            labels={({ datum }) => `${datum.x}: ${datum.y} (${datum.source})`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

// #7 — PR Timeline
const PRTimelineCard: React.FC<{
  data: CanonicalProgressCharts['prTimeline'];
}> = ({ data }) => {
  // Render as a compact list of the most recent PR-by-exercise rows.
  // The hook's data is a flat array of best-set-per-day; for the card
  // we filter to the single best set per exercise (all-time max in
  // the 180-day window), sorted by weight desc.
  const bestByExercise = useMemo(() => {
    const map = new Map<string, typeof data[number]>();
    for (const row of data) {
      const cur = map.get(row.exercise);
      if (!cur || row.y > cur.y) map.set(row.exercise, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.y - a.y)
      .slice(0, 6);
  }, [data]);
  const fills = useNumericBarWidth(bestByExercise.map((r) => ({ x: r.exercise, y: r.y })));

  return (
    <ChartCard data-testid="chart-card-prTimeline">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><Trophy size={16} /></CardIcon>
        <CardTitle>PR Highlights</CardTitle>
        <CardSubtitle>180 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {bestByExercise.length === 0 ? (
          <EmptyCard label="No PRs recorded yet" hint="Log lifts with weight to see PRs surface here." />
        ) : (
          <BarList>
            {bestByExercise.map((row, i) => (
              <BarRow key={row.exercise}>
                <BarLabel title={row.exercise}>{row.exercise}</BarLabel>
                <BarTrack>
                  <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.gildedFern} />
                </BarTrack>
                <BarValue>{row.y} lbs × {row.reps}</BarValue>
              </BarRow>
            ))}
          </BarList>
        )}
      </ChartBody>
    </ChartCard>
  );
};

// #8 — Anchor Lifts
const AnchorLiftsCard: React.FC<{
  bundle: CanonicalProgressCharts['anchorLifts'];
}> = ({ bundle }) => {
  // Flatten each anchor lift's series into a Victory-friendly line set.
  const series = useMemo(() => {
    return bundle.exercises.map((name, i) => ({
      name,
      color: FULL_PALETTE[i % FULL_PALETTE.length],
      data: (bundle.data[name] || []).map((p) => ({ x: p.x, y: p.y, name })),
    })).filter((s) => s.data.length > 0);
  }, [bundle]);

  return (
    <ChartCard data-testid="chart-card-anchorLifts">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.iceWing}><TrendingUp size={16} /></CardIcon>
        <CardTitle>Anchor Lift Progression</CardTitle>
        <CardSubtitle>top 3 · 90 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {series.length === 0 ? (
          <EmptyCard label="No anchor lifts yet" hint="Repeat 2–3 main lifts across sessions to surface progression." />
        ) : (
          <VictoryChart
            theme={victoryTheme as any}
            height={200}
            padding={{ top: 24, bottom: 40, left: 44, right: 12 }}
            containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
          >
            <VictoryLegend
              x={44}
              y={0}
              orientation="horizontal"
              gutter={10}
              {...anchorLegendProps}
              data={series.map((s) => ({ name: s.name, symbol: { fill: s.color } }))}
            />
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            {series.map((s) => (
              <VictoryLine
                key={s.name}
                data={s.data}
                {...lineStyleProps(s.color)}
              />
            ))}
          </VictoryChart>
        )}
      </ChartBody>
    </ChartCard>
  );
};

// #9 — Exercise Frequency
const ExerciseFrequencyCard: React.FC<{
  data: CanonicalProgressCharts['exerciseFrequency'];
}> = ({ data }) => {
  const fills = useNumericBarWidth(data as ChartPoint[]);
  return (
    <ChartCard data-testid="chart-card-exerciseFrequency">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.arcticCyan}><Dumbbell size={16} /></CardIcon>
        <CardTitle>Exercise Frequency</CardTitle>
        <CardSubtitle>top 10 · 90 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No exercises logged yet" />
        ) : (
          <BarList>
            {data.slice(0, 8).map((row, i) => (
              <BarRow key={row.x}>
                <BarLabel title={row.x}>{row.x}</BarLabel>
                <BarTrack>
                  <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.arcticCyan} />
                </BarTrack>
                <BarValue>{row.y} × {row.sets} sets</BarValue>
              </BarRow>
            ))}
          </BarList>
        )}
      </ChartBody>
    </ChartCard>
  );
};

// #10 — Movement Pattern Balance
const MovementPatternBalanceCard: React.FC<{
  data: CanonicalProgressCharts['movementPatternBalance'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-movementPatternBalance">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.iceWing}><Target size={16} /></CardIcon>
      <CardTitle>Movement Pattern Balance</CardTitle>
      <CardSubtitle>volume · 90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No movement data yet" hint="Squat, hinge, push, pull, carry, core — logged over 90 days." />
      ) : (
        <VictoryPie
          data={data.map((r) => ({ x: r.x, y: r.y }))}
          colorScale={FULL_PALETTE}
          innerRadius={40}
          padAngle={2}
          height={200}
          {...movementPieProps}
          labels={({ datum }) => `${datum.x}`}
        />
      )}
    </ChartBody>
  </ChartCard>
);

// #11 — Muscle Group Volume Balance
const MuscleGroupBalanceCard: React.FC<{
  data: CanonicalProgressCharts['muscleGroupBalance'];
}> = ({ data }) => {
  const fills = useNumericBarWidth(data as ChartPoint[]);
  return (
    <ChartCard data-testid="chart-card-muscleGroupBalance">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><BarChart3 size={16} /></CardIcon>
        <CardTitle>Muscle Group Volume</CardTitle>
        <CardSubtitle>lbs · 90 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No muscle-group data yet" />
        ) : (
          <BarList>
            {data.map((row, i) => (
              <BarRow key={row.x}>
                <BarLabel>{row.x}</BarLabel>
                <BarTrack>
                  <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.gildedFern} />
                </BarTrack>
                <BarValue>{Math.round(row.y).toLocaleString()}</BarValue>
              </BarRow>
            ))}
          </BarList>
        )}
      </ChartBody>
    </ChartCard>
  );
};

// #12 — Recovery Signal
const RecoverySignalCard: React.FC<{
  data: CanonicalProgressCharts['recoverySignal'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-recoverySignal">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.crimsonFrost}><HeartPulse size={16} /></CardIcon>
      <CardTitle>Recovery Signals</CardTitle>
      <CardSubtitle>pain + RPE ≥ 9 · 90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard
          label="No recovery flags"
          hint="No pain notes or redline sets — keep it up."
        />
      ) : (
        <BarList>
          {data.slice(0, 6).map((row) => (
            <BarRow key={row.x}>
              <BarLabel title={row.x}>
                <RecoveryAlertIcon size={11} />
                {row.x}
              </BarLabel>
              <BarTrack>
                <BarFill
                  $pct={Math.min((row.y / Math.max(row.totalSets, 1)) * 100, 100)}
                  $color={CHART_COLORS.crimsonFrost}
                />
              </BarTrack>
              <BarValue>
                {row.painFlags > 0 ? `${row.painFlags} pain` : ''}
                {row.painFlags > 0 && row.highRpeFlags > 0 ? ' · ' : ''}
                {row.highRpeFlags > 0 ? `${row.highRpeFlags} redline` : ''}
              </BarValue>
            </BarRow>
          ))}
        </BarList>
      )}
    </ChartBody>
  </ChartCard>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Grid entry point
// ─────────────────────────────────────────────────────────────

const LoadingStrip = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

const ErrorLoadingStrip = styled(LoadingStrip)`
  color: ${CHART_COLORS.crimsonFrost};
`;

interface CanonicalProgressChartsGridProps {
  /** Currently unused — the hook pulls userId from JWT — but kept on
   *  the API surface for parity with the old ProfileChartsGrid so call
   *  sites don't need to diff by prop shape during the Phase 14 rollout. */
  userId?: number | string;
}

const CanonicalProgressChartsGrid: React.FC<CanonicalProgressChartsGridProps> = () => {
  const { charts, isLoading, error, nonEmptyChartCount } = useClientProgressCharts();

  if (isLoading && nonEmptyChartCount === 0) {
    return <LoadingStrip>Loading progress charts...</LoadingStrip>;
  }
  if (error) {
    return (
      <ErrorLoadingStrip>
        {error}
      </ErrorLoadingStrip>
    );
  }

  return (
    <div data-testid="canonical-progress-charts-grid">
      <SectionHeader>
        <TrendingUp size={13} />
        <span>Progress overview · {nonEmptyChartCount} of 12 charts populated</span>
      </SectionHeader>
      <GridWrap>
        <WorkoutFrequencyCard data={charts.workoutFrequency} />
        <AttendanceReliabilityCard bundle={charts.attendanceReliability} />
        <WeeklyVolumeCard data={charts.weeklyVolume} />
        <SetsRepsTrendCard bundle={charts.setsRepsTrend} />
        <DurationTrendCard data={charts.durationTrend} />
        <IntensityRpeCard data={charts.intensityRpeTrend} />
        <PRTimelineCard data={charts.prTimeline} />
        <AnchorLiftsCard bundle={charts.anchorLifts} />
        <ExerciseFrequencyCard data={charts.exerciseFrequency} />
        <MovementPatternBalanceCard data={charts.movementPatternBalance} />
        <MuscleGroupBalanceCard data={charts.muscleGroupBalance} />
        <RecoverySignalCard data={charts.recoverySignal} />
      </GridWrap>
    </div>
  );
};

export default React.memo(CanonicalProgressChartsGrid);
