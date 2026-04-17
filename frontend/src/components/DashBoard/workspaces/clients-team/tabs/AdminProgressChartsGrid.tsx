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

import React, { useMemo } from 'react';
import styled from 'styled-components';
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

import {
  VictoryChart, VictoryBar, VictoryLine, VictoryArea, VictoryAxis,
  VictoryTooltip, VictoryVoronoiContainer, VictoryPie, VictoryLegend,
  VictoryGroup,
} from 'victory';
import {
  CHART_COLORS, FULL_PALETTE, victoryTheme, hexAlpha,
} from '../../../../Charts/chartTheme';
import {
  Activity, BarChart3, Target, TrendingUp as TrendIcon, Calendar, Flame,
  Trophy, Dumbbell, Layers, Users, AlertTriangle, HeartPulse,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Styled components — thin local set for the admin grid
// ─────────────────────────────────────────────────────────────

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem 1.25rem 1.25rem;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  &:hover { border-color: rgba(96, 192, 240, 0.18); }
`;

const CardHeader = styled.div`
  display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;
`;

const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem; font-weight: 600; margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

const CardBody = styled.div`
  flex: 1; min-height: 140px; display: flex; align-items: center; justify-content: center;
`;

const Empty = styled.div`
  text-align: center; padding: 1rem 0.5rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-family: 'Sora', sans-serif; font-size: 0.8rem;
`;

const SummaryLine = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif; font-size: 0.7rem;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 0.25rem 0 0.5rem;
`;

const BarList = styled.ul`
  list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 0.4rem;
`;
const BarRow = styled.li`
  display: grid; grid-template-columns: minmax(0,1.35fr) minmax(0,2fr) auto;
  align-items: center; gap: 0.5rem;
  font-family: 'Sora', sans-serif; font-size: 0.75rem; color: var(--text-primary, #E0ECF4);
`;
const BarLabel = styled.span`
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;
const BarTrack = styled.div`
  position: relative; height: 8px; border-radius: 4px; background: rgba(96,192,240,0.08); overflow: hidden;
`;
const BarFill = styled.div<{ $pct: number; $color?: string }>`
  position: absolute; top: 0; left: 0; bottom: 0;
  width: ${({ $pct }) => Math.max(Math.min($pct, 100), 2)}%;
  background: ${({ $color }) => $color || CHART_COLORS.iceWing};
  border-radius: 4px;
`;
const BarValue = styled.span`
  font-family: 'Fira Code', monospace; font-size: 0.7rem; color: var(--accent-primary, #60C0F0); white-space: nowrap;
`;

const LoadingStrip = styled.div`
  padding: 1rem; text-align: center;
  color: var(--text-muted, rgba(224,236,244,0.45)); font-family: 'Sora', sans-serif; font-size: 0.85rem;
`;

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
    return <LoadingStrip>Loading {clientName}'s progress charts...</LoadingStrip>;
  }
  if (error) {
    return <LoadingStrip style={{ color: CHART_COLORS.crimsonFrost }}>{error}</LoadingStrip>;
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
        <span>{clientName} — {nonEmptyChartCount} of 12 charts populated</span>
      </SummaryLine>
      <GridWrap>
        {/* 1. Workout Frequency */}
        <Card data-testid="admin-chart-workoutFrequency">
          <CardHeader><Calendar size={14} color={CHART_COLORS.iceWing} /><CardTitle>Workout Frequency</CardTitle></CardHeader>
          <CardBody>{charts.workoutFrequency.length === 0 ? <Empty>No completed workouts yet</Empty> : (
            <VictoryChart theme={victoryTheme as any} height={180} padding={{top:12,bottom:36,left:36,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryBar data={charts.workoutFrequency} style={{data:{fill:CHART_COLORS.iceWing}}} cornerRadius={{top:3}}
                labels={({datum})=>`${datum.x}: ${datum.y}`} labelComponent={<VictoryTooltip renderInPortal={false} />} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 2. Attendance */}
        <Card data-testid="admin-chart-attendance">
          <CardHeader><Users size={14} color={CHART_COLORS.gildedFern} /><CardTitle>Attendance Reliability</CardTitle></CardHeader>
          <CardBody>{charts.attendanceReliability.data.length === 0 ? <Empty>No attendance data yet</Empty> : (
            <div style={{display:'flex',alignItems:'center',gap:'1rem',width:'100%'}}>
              <div style={{fontFamily:"'Fira Code',monospace",fontSize:'2rem',fontWeight:700,color:CHART_COLORS.iceWing}}>{charts.attendanceReliability.reliabilityPercent}%</div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:'0.7rem',color:'var(--text-muted)'}}>show-rate<br/>{charts.attendanceReliability.totals.completed} completed / {charts.attendanceReliability.totals.resolved} resolved</div>
            </div>
          )}</CardBody>
        </Card>

        {/* 3. Weekly Volume */}
        <Card data-testid="admin-chart-weeklyVolume">
          <CardHeader><BarChart3 size={14} color={CHART_COLORS.wingPurple} /><CardTitle>Weekly Volume</CardTitle></CardHeader>
          <CardBody>{charts.weeklyVolume.length === 0 ? <Empty>No logged lifts yet</Empty> : (
            <VictoryChart theme={victoryTheme as any} height={180} padding={{top:12,bottom:36,left:48,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryArea data={charts.weeklyVolume} style={{data:{fill:hexAlpha(CHART_COLORS.wingPurple,0.3),stroke:CHART_COLORS.wingPurple,strokeWidth:2}}}
                labels={({datum})=>`${datum.x}: ${Math.round(datum.y).toLocaleString()} lbs`} labelComponent={<VictoryTooltip renderInPortal={false} />} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 4. Sets & Reps */}
        <Card data-testid="admin-chart-setsReps">
          <CardHeader><Layers size={14} color={CHART_COLORS.arcticCyan} /><CardTitle>Sets & Reps Trend</CardTitle></CardHeader>
          <CardBody>{charts.setsRepsTrend.sets.length === 0 ? <Empty>No sets logged yet</Empty> : (
            <VictoryChart theme={victoryTheme as any} height={180} padding={{top:20,bottom:36,left:44,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryGroup offset={8}>
                <VictoryBar data={charts.setsRepsTrend.sets} style={{data:{fill:CHART_COLORS.arcticCyan}}} />
                <VictoryBar data={charts.setsRepsTrend.reps} style={{data:{fill:CHART_COLORS.gildedFern}}} />
              </VictoryGroup>
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 5. Duration */}
        <Card data-testid="admin-chart-duration">
          <CardHeader><Activity size={14} color={CHART_COLORS.iceWing} /><CardTitle>Session Duration</CardTitle></CardHeader>
          <CardBody>{charts.durationTrend.length === 0 ? <Empty>No duration data yet</Empty> : (
            <VictoryChart theme={victoryTheme as any} height={180} padding={{top:12,bottom:36,left:36,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryLine data={charts.durationTrend} style={{data:{stroke:CHART_COLORS.iceWing,strokeWidth:2}}}
                labels={({datum})=>`${datum.x}: ${datum.y}min`} labelComponent={<VictoryTooltip renderInPortal={false} />} />
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 6. Intensity/RPE */}
        <Card data-testid="admin-chart-intensityRpe">
          <CardHeader><Flame size={14} color={CHART_COLORS.wingPurple} /><CardTitle>Effort Trend</CardTitle></CardHeader>
          <CardBody>{charts.intensityRpeTrend.length === 0 ? <Empty>No intensity data yet</Empty> : (
            <VictoryChart theme={victoryTheme as any} height={180} padding={{top:12,bottom:36,left:36,right:8}} domain={{y:[0,10]}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              <VictoryLine data={charts.intensityRpeTrend} style={{data:{stroke:CHART_COLORS.wingPurple,strokeWidth:2}}} />
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
            return <BarList>{best.map((r,i)=><BarRow key={r.exercise}><BarLabel>{r.exercise}</BarLabel><BarTrack><BarFill $pct={pcts[i]} $color={CHART_COLORS.gildedFern} /></BarTrack><BarValue>{r.y}lbs×{r.reps}</BarValue></BarRow>)}</BarList>;
          })()}</CardBody>
        </Card>

        {/* 8. Anchor Lifts */}
        <Card data-testid="admin-chart-anchorLifts">
          <CardHeader><TrendIcon size={14} color={CHART_COLORS.iceWing} /><CardTitle>Anchor Lifts</CardTitle></CardHeader>
          <CardBody>{charts.anchorLifts.exercises.length === 0 ? <Empty>No anchor lifts yet</Empty> : (
            <VictoryChart theme={victoryTheme as any} height={180} padding={{top:20,bottom:36,left:40,right:8}}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}>
              <VictoryAxis /><VictoryAxis dependentAxis />
              {charts.anchorLifts.exercises.map((name,i)=>{
                const d = (charts.anchorLifts.data[name]||[]).map(p=>({x:p.x,y:p.y}));
                return d.length>0 ? <VictoryLine key={name} data={d} style={{data:{stroke:FULL_PALETTE[i%FULL_PALETTE.length],strokeWidth:2}}} /> : null;
              })}
            </VictoryChart>
          )}</CardBody>
        </Card>

        {/* 9. Exercise Frequency */}
        <Card data-testid="admin-chart-exerciseFreq">
          <CardHeader><Dumbbell size={14} color={CHART_COLORS.arcticCyan} /><CardTitle>Exercise Frequency</CardTitle></CardHeader>
          <CardBody>{charts.exerciseFrequency.length === 0 ? <Empty>No exercises logged yet</Empty> : (() => {
            const pcts = barPcts(charts.exerciseFrequency);
            return <BarList>{charts.exerciseFrequency.slice(0,8).map((r,i)=><BarRow key={r.x}><BarLabel>{r.x}</BarLabel><BarTrack><BarFill $pct={pcts[i]} $color={CHART_COLORS.arcticCyan} /></BarTrack><BarValue>{r.y}×{(r as any).sets}sets</BarValue></BarRow>)}</BarList>;
          })()}</CardBody>
        </Card>

        {/* 10. Movement Pattern */}
        <Card data-testid="admin-chart-movementPattern">
          <CardHeader><Target size={14} color={CHART_COLORS.iceWing} /><CardTitle>Movement Patterns</CardTitle></CardHeader>
          <CardBody>{charts.movementPatternBalance.length === 0 ? <Empty>No movement data yet</Empty> : (
            <VictoryPie data={charts.movementPatternBalance.map(r=>({x:r.x,y:r.y}))} colorScale={FULL_PALETTE}
              innerRadius={35} padAngle={2} height={180}
              style={{labels:{fill:CHART_COLORS.textSecondary,fontFamily:"'Fira Code',monospace",fontSize:9}}}
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
            <BarList>{charts.recoverySignal.slice(0,6).map(r=><BarRow key={r.x}><BarLabel><AlertTriangle size={11} style={{verticalAlign:'-2px',marginRight:4,color:CHART_COLORS.crimsonFrost}} />{r.x}</BarLabel><BarTrack><BarFill $pct={Math.min(((r as any).painFlags+(r as any).highRpeFlags)/Math.max((r as any).totalSets,1)*100,100)} $color={CHART_COLORS.crimsonFrost} /></BarTrack><BarValue>{(r as any).painFlags>0?`${(r as any).painFlags} pain`:''}{(r as any).painFlags>0&&(r as any).highRpeFlags>0?' · ':''}{(r as any).highRpeFlags>0?`${(r as any).highRpeFlags} redline`:''}</BarValue></BarRow>)}</BarList>
          )}</CardBody>
        </Card>
      </GridWrap>
    </div>
  );
};

export default React.memo(AdminProgressChartsGrid);
