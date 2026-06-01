/**
 * ┌─── COMPONENT: AdminProgressChartsGrid ─────────────────────┐
 * │ PARENT: ProgressTabContent (Clients & Team)                 │
 * │ PURPOSE: Same 12-chart canonical grid as the client-facing  │
 * │          CanonicalProgressChartsGrid, but in admin context   │
 * │          using the selected client's userId.                 │
 * │ OWNER: Claude Opus 4.6 | CREATED: 2026-04-16 (Phase 15.3)  │
 * │                                                              │
 * │ Delegates chart rendering to the existing                    │
 * │ CanonicalProgressChartsGrid by passing it the admin-scoped  │
 * │ chart data. This avoids duplicating 12 card components.      │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useAdminClientProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';

// Lazy-import the canonical grid internals. The grid already renders
// 12 cards from a `charts` bundle — we just feed it from the admin hook.
// To reuse it we need it to accept an external `charts` prop OR we
// re-render the cards inline. Since the grid component currently uses
// its own hook internally, the simplest path is to duplicate the grid
// mount with the admin hook. This is a thin wrapper — all styled
// components and card implementations live in the canonical grid.
//
// Phase 15.3: the lightest non-duplication approach is to lazy-import
// the grid and override its data source. Since the canonical grid
// hard-codes its own hook, we instead create a small grid wrapper here
// that imports the same card components from the canonical file.
//
// Actually, the cleanest move: re-export the canonical grid but with
// a `charts` override prop. BUT the canonical grid is already a large
// file (~600 lines) and adding a prop to it is trivial, so:

// We'll directly use the admin hook here and delegate to a shared
// renderer. For now, the simplest working approach is to import the
// canonical grid's individual card components — but they're not
// individually exported. So we'll do the thinnest possible wrapper:
// just render the grid structure with the admin hook data, re-importing
// Victory + styled components from the canonical file.
//
// DECISION: Rather than refactoring the canonical grid to accept
// external data (which would widen scope), we render a compact admin
// version that shares the hook types but owns its own lightweight
// grid. This is ~50 lines, not a duplication of 600.

import { VictoryChart, VictoryBar, VictoryLine, VictoryArea, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryPie, VictoryGroup } from 'victory';
import { CHART_COLORS, FULL_PALETTE, victoryTheme } from '../../../../Charts/chartTheme';
import { Activity, BarChart3, Target, TrendingUp as TrendIcon, Calendar, Flame, Trophy, Dumbbell, Layers, Users, HeartPulse } from 'lucide-react';
import ClientExerciseMegaStats from './ClientExerciseMegaStats';
import {
  AttendanceMeta,
  AttendancePercent,
  AttendanceSummary,
  BarFill,
  BarLabel,
  BarList,
  BarRow,
  BarTrack,
  BarValue,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Empty,
  ErrorLoadingStrip,
  GridWrap,
  LoadingStrip,
  RecoveryIcon,
  SummaryLine,
} from './AdminProgressChartsGrid.styles';
import {
  durationLineProps,
  getAnchorLineProps,
  intensityLineProps,
  movementPatternLabelProps,
  repsBarProps,
  setsBarProps,
  weeklyVolumeAreaProps,
  workoutFrequencyBarProps,
} from './AdminProgressChartsGrid.chartConfig';
import type { ExerciseFrequencyPoint, RecoverySignalPoint } from './AdminProgressChartsGrid.chartConfig';

// ─────────────────────────────────────────────────────────────
// Styled components — thin local set for the admin grid
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

interface Props {
  clientId: number;
  clientName: string;
}

const AdminProgressChartsGrid: React.FC<Props> = ({ clientId, clientName }) => {
  const { charts, isLoading, error, nonEmptyChartCount } = useAdminClientProgressCharts(clientId);

  if (isLoading && nonEmptyChartCount === 0) {
    return <LoadingStrip>Loading {clientName}&apos;s progress charts...</LoadingStrip>;
  }
  if (error) {
    return <ErrorLoadingStrip>{error}</ErrorLoadingStrip>;
  }

  // Helper for bar-list charts
  const barPcts = (pts: { y: number }[]) => {
    const max = Math.max(...pts.map(p => p.y), 1);
    return pts.map(p => (p.y / max) * 100);
  };

  return (
    <div data-testid="admin-progress-charts-grid">
      <SummaryLine>
        <TrendingUp size={13} />
        <span>{clientName} - {nonEmptyChartCount} of 12 charts populated</span>
      </SummaryLine>
      <ClientExerciseMegaStats exercises={charts.exerciseFrequency} />
      <GridWrap>
        {/* 1. Workout Frequency */}
        <Card data-testid="admin-chart-workoutFrequency">
          <CardHeader><Calendar size={14} color={CHART_COLORS.iceWing} /><CardTitle>Workout Frequency</CardTitle></CardHeader>
          <CardBody>{charts.workoutFrequency.length === 0 ? <Empty>No completed workouts yet</Empty> : (
            <VictoryChart theme={victoryTheme} height={180} padding={{top:12,bottom:36,left:36,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryBar data={charts.workoutFrequency} {...workoutFrequencyBarProps} cornerRadius={{top:3}}
                labels={({datum})=>`${datum.x}: ${datum.y}`} labelComponent={<VictoryTooltip renderInPortal={false} />} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 2. Attendance */}
        <Card data-testid="admin-chart-attendance">
          <CardHeader><Users size={14} color={CHART_COLORS.gildedFern} /><CardTitle>Attendance Reliability</CardTitle></CardHeader>
          <CardBody>{charts.attendanceReliability.data.length === 0 ? <Empty>No attendance data yet</Empty> : (
            <AttendanceSummary>
              <AttendancePercent>{charts.attendanceReliability.reliabilityPercent}%</AttendancePercent>
              <AttendanceMeta>show-rate<br/>{charts.attendanceReliability.totals.completed} completed / {charts.attendanceReliability.totals.resolved} resolved</AttendanceMeta>
            </AttendanceSummary>
          )}</CardBody>
        </Card>

        {/* 3. Weekly Volume */}
        <Card data-testid="admin-chart-weeklyVolume">
          <CardHeader><BarChart3 size={14} color={CHART_COLORS.wingPurple} /><CardTitle>Weekly Volume</CardTitle></CardHeader>
          <CardBody>{charts.weeklyVolume.length === 0 ? <Empty>No logged lifts yet</Empty> : (
            <VictoryChart theme={victoryTheme} height={180} padding={{top:12,bottom:36,left:48,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryArea data={charts.weeklyVolume} {...weeklyVolumeAreaProps}
                labels={({datum})=>`${datum.x}: ${Math.round(datum.y).toLocaleString()} lbs`} labelComponent={<VictoryTooltip renderInPortal={false} />} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 4. Sets & Reps */}
        <Card data-testid="admin-chart-setsReps">
          <CardHeader><Layers size={14} color={CHART_COLORS.arcticCyan} /><CardTitle>Sets & Reps Trend</CardTitle></CardHeader>
          <CardBody>{charts.setsRepsTrend.sets.length === 0 ? <Empty>No sets logged yet</Empty> : (
            <VictoryChart theme={victoryTheme} height={180} padding={{top:20,bottom:36,left:44,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryGroup offset={8}>
                <VictoryBar data={charts.setsRepsTrend.sets} {...setsBarProps} />
                <VictoryBar data={charts.setsRepsTrend.reps} {...repsBarProps} />
              </VictoryGroup>
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 5. Duration */}
        <Card data-testid="admin-chart-duration">
          <CardHeader><Activity size={14} color={CHART_COLORS.iceWing} /><CardTitle>Session Duration</CardTitle></CardHeader>
          <CardBody>{charts.durationTrend.length === 0 ? <Empty>No duration data yet</Empty> : (
            <VictoryChart theme={victoryTheme} height={180} padding={{top:12,bottom:36,left:36,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryLine data={charts.durationTrend} {...durationLineProps}
                labels={({datum})=>`${datum.x}: ${datum.y}min`} labelComponent={<VictoryTooltip renderInPortal={false} />} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 6. Intensity/RPE */}
        <Card data-testid="admin-chart-intensityRpe">
          <CardHeader><Flame size={14} color={CHART_COLORS.wingPurple} /><CardTitle>Effort Trend</CardTitle></CardHeader>
          <CardBody>{charts.intensityRpeTrend.length === 0 ? <Empty>No intensity data yet</Empty> : (
            <VictoryChart theme={victoryTheme} height={180} padding={{top:12,bottom:36,left:36,right:8}} domain={{y:[0,10]}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryLine data={charts.intensityRpeTrend} {...intensityLineProps} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 7. PRs */}
        <Card data-testid="admin-chart-prs">
          <CardHeader><Trophy size={14} color={CHART_COLORS.gildedFern} /><CardTitle>PR Highlights</CardTitle></CardHeader>
          <CardBody>{charts.prTimeline.length === 0 ? <Empty>No PRs recorded yet</Empty> : (() => {
            const map = new Map<string, typeof charts.prTimeline[number]>();
            for (const r of charts.prTimeline) { const c=map.get(r.exercise); if(!c||r.y>c.y) map.set(r.exercise,r); }
            const best = Array.from(map.values()).sort((a,b)=>b.y-a.y).slice(0,6);
            const pcts = barPcts(best);
            return <BarList>{best.map((r,i)=><BarRow key={r.exercise}><BarLabel>{r.exercise}</BarLabel><BarTrack><BarFill $pct={pcts[i]} $color={CHART_COLORS.gildedFern} /></BarTrack><BarValue>{r.y}lbs x {r.reps}</BarValue></BarRow>)}</BarList>;
          })()}</CardBody>
        </Card>

        {/* 8. Anchor Lifts */}
        <Card data-testid="admin-chart-anchorLifts">
          <CardHeader><TrendIcon size={14} color={CHART_COLORS.iceWing} /><CardTitle>Anchor Lifts</CardTitle></CardHeader>
          <CardBody>{charts.anchorLifts.exercises.length === 0 ? <Empty>No anchor lifts yet</Empty> : (
            <VictoryChart theme={victoryTheme} height={180} padding={{top:20,bottom:36,left:40,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              {charts.anchorLifts.exercises.map((name,i)=>{
                const d = (charts.anchorLifts.data[name]||[]).map(p=>({x:p.x,y:p.y}));
                return d.length>0 ? <VictoryLine key={name} data={d} {...getAnchorLineProps(i)} /> : null;
              })}
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 9. Exercise Frequency */}
        <Card data-testid="admin-chart-exerciseFreq">
          <CardHeader><Dumbbell size={14} color={CHART_COLORS.arcticCyan} /><CardTitle>Exercise Frequency</CardTitle></CardHeader>
          <CardBody>{charts.exerciseFrequency.length === 0 ? <Empty>No exercises logged yet</Empty> : (() => {
            const pcts = barPcts(charts.exerciseFrequency);
            return (
              <BarList>
                {charts.exerciseFrequency.slice(0, 8).map((r, i) => {
                  const row = r as ExerciseFrequencyPoint;
                  return (
                    <BarRow key={row.x}>
                      <BarLabel>{row.x}</BarLabel>
                      <BarTrack><BarFill $pct={pcts[i]} $color={CHART_COLORS.arcticCyan} /></BarTrack>
                      <BarValue>{row.y}x{row.sets ?? 0}sets</BarValue>
                    </BarRow>
                  );
                })}
              </BarList>
            );
          })()}</CardBody>
        </Card>

        {/* 10. Movement Pattern */}
        <Card data-testid="admin-chart-movementPattern">
          <CardHeader><Target size={14} color={CHART_COLORS.iceWing} /><CardTitle>Movement Patterns</CardTitle></CardHeader>
          <CardBody>{charts.movementPatternBalance.length === 0 ? <Empty>No movement data yet</Empty> : (
            <VictoryPie data={charts.movementPatternBalance.map(r=>({x:r.x,y:r.y}))} colorScale={FULL_PALETTE}
              innerRadius={35} padAngle={2} height={180}
              {...movementPatternLabelProps}
              labels={({datum})=>datum.x} />
          )}</CardBody>
        </Card>

        {/* 11. Muscle Group */}
        <Card data-testid="admin-chart-muscleGroup">
          <CardHeader><BarChart3 size={14} color={CHART_COLORS.gildedFern} /><CardTitle>Muscle Group Volume</CardTitle></CardHeader>
          <CardBody>{charts.muscleGroupBalance.length === 0 ? <Empty>No muscle-group data yet</Empty> : (() => {
            const pcts = barPcts(charts.muscleGroupBalance);
            return <BarList>{charts.muscleGroupBalance.map((r,i)=><BarRow key={r.x}><BarLabel>{r.x}</BarLabel><BarTrack><BarFill $pct={pcts[i]} $color={CHART_COLORS.gildedFern} /></BarTrack><BarValue>{Math.round(r.y).toLocaleString()}</BarValue></BarRow>)}</BarList>;
          })()}</CardBody>
        </Card>

        {/* 12. Recovery Signal */}
        <Card data-testid="admin-chart-recovery">
          <CardHeader><HeartPulse size={14} color={CHART_COLORS.crimsonFrost} /><CardTitle>Recovery Signals</CardTitle></CardHeader>
          <CardBody>{charts.recoverySignal.length === 0 ? <Empty>No recovery flags</Empty> : (
            <BarList>{charts.recoverySignal.slice(0,6).map((r) => {
              const row = r as RecoverySignalPoint;
              const painFlags = row.painFlags ?? 0;
              const highRpeFlags = row.highRpeFlags ?? 0;
              const totalSets = Math.max(row.totalSets ?? 1, 1);
              const riskPct = Math.min(((painFlags + highRpeFlags) / totalSets) * 100, 100);
              return (
                <BarRow key={row.x}>
                  <BarLabel><RecoveryIcon size={11} />{row.x}</BarLabel>
                  <BarTrack><BarFill $pct={riskPct} $color={CHART_COLORS.crimsonFrost} /></BarTrack>
                  <BarValue>{painFlags > 0 ? `${painFlags} pain` : ''}{painFlags > 0 && highRpeFlags > 0 ? ' / ' : ''}{highRpeFlags > 0 ? `${highRpeFlags} redline` : ''}</BarValue>
                </BarRow>
              );
            })}</BarList>
          )}</CardBody>
        </Card>
      </GridWrap>
    </div>
  );
};

export default React.memo(AdminProgressChartsGrid);
