/**
 * LENS: signal-board (§5.2 #10) — telemetry hero. Exactly ONE Victory chart
 * (law: Victory only, rule 10), lazy-loaded so the lens chunk stays lean;
 * planned sessions-per-week series today, upgraded to plan-vs-actual deltas
 * when S25's logger reads land. Purple stays Coach-only, gold stays earned —
 * the chart rides Arctic Cyan (data-only, per palette law). Builder is
 * secondary; compact density; zero motion.
 */
import React from 'react';
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';
import { usePlannerData } from '../../../plannerContexts/PlannerDataContext';
import { PlannerEmpty } from '../../../PlannerStateViews';

const Board = styled.div` display: flex; flex-direction: column; gap: 14px; font-size: 0.85rem; `;

const ChartCard = styled.section`
  padding: 14px; border-radius: 14px;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
`;

const ChartTitle = styled.h3`
  margin: 0 0 8px; font-family: 'Sora', sans-serif; font-size: 0.85rem; font-weight: 800;
  color: var(--world-text, var(--text-primary, #E0ECF4));
`;

const Split = styled.div<{ $teach: boolean }>`
  display: grid; gap: 12px;
  grid-template-columns: ${({ $teach }) => ($teach ? '1fr minmax(240px, 300px) minmax(220px, 280px)' : '1fr minmax(240px, 300px)')};
  @media (max-width: 1279px) { grid-template-columns: 1fr; }
`;

const LazyWeeklyChart = React.lazy(async () => {
  const victory = await import('victory');
  const { VictoryBar, VictoryChart, VictoryAxis } = victory;
  const WeeklyChart: React.FC<{ series: Array<{ week: number; sessions: number }> }> = ({ series }) => (
    <VictoryChart height={180} padding={{ top: 12, bottom: 32, left: 44, right: 12 }}>
      <VictoryAxis tickFormat={(week: number) => `W${week}`} style={{ tickLabels: { fill: 'var(--text-secondary, #9fb3c8)', fontSize: 9 } }} />
      <VictoryAxis dependentAxis style={{ tickLabels: { fill: 'var(--text-secondary, #9fb3c8)', fontSize: 9 } }} />
      <VictoryBar data={series} x="week" y="sessions" style={{ data: { fill: 'var(--chart-data, #50A0F0)' } }} />
    </VictoryChart>
  );
  return { default: WeeklyChart };
});

const SignalBoard: PlannerLensComponent = ({ rolodex, builder, teach, coachDock, teachModeOpen }) => {
  const { generatedPlan } = usePlannerData().local;
  const series = generatedPlan
    ? Array.from({ length: generatedPlan.planSummary.durationWeeks }, (_, i) => ({
        week: i + 1,
        sessions: generatedPlan.planSummary.sessionsPerWeek,
      }))
    : [];

  return (
    <Board>
      <ChartCard aria-label="Program signal">
        <ChartTitle>Planned sessions per week</ChartTitle>
        {series.length === 0 ? (
          <PlannerEmpty title="No program signal yet" body="Generate a multi-week program to light this board up. Plan-vs-actual deltas arrive with the logger link-up." />
        ) : (
          <React.Suspense fallback={null}>
            <LazyWeeklyChart series={series} />
          </React.Suspense>
        )}
      </ChartCard>
      <Split $teach={teachModeOpen}>
        {builder}
        {rolodex}
        {teach}
      </Split>
      {coachDock}
    </Board>
  );
};

export default SignalBoard;
