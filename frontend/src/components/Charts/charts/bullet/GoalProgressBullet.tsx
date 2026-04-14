import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, CHART_COLORS, hexAlpha } from '../../chartTheme';

interface BulletMetric { label: string; current: number; target: number; max: number; color: string }

const DEMO_DATA: BulletMetric[] = [
  { label: 'Weight Loss', current: 8, target: 12, max: 15, color: CHART_COLORS.iceWing },
  { label: 'Strength', current: 85, target: 100, max: 120, color: CHART_COLORS.wingPurple },
  { label: 'Cardio', current: 7, target: 10, max: 10, color: CHART_COLORS.arcticCyan },
  { label: 'Flexibility', current: 6, target: 8, max: 10, color: CHART_COLORS.gildedFern },
];

const Wrap = styled.div`display:flex;flex-direction:column;gap:20px;flex:1;justify-content:center;padding:16px;`;
const Row = styled.div`display:flex;flex-direction:column;gap:4px;`;
const Label = styled.div`font-family:'Sora',sans-serif;font-size:0.75rem;color:${CHART_COLORS.textSecondary};display:flex;justify-content:space-between;`;
const Track = styled.div`position:relative;height:24px;background:${hexAlpha(CHART_COLORS.iceWing,0.1)};border-radius:6px;overflow:hidden;`;
const Fill = styled.div<{$p:number;$c:string;$isDemo:boolean}>`position:absolute;left:0;top:0;height:100%;width:${({$p})=>Math.min($p,100)}%;background:${({$c})=>$c};border-radius:6px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);opacity:${({$isDemo})=>$isDemo ? 0.5 : 1};`;
const Target = styled.div<{$pos:number}>`position:absolute;left:${({$pos})=>$pos}%;top:-2px;width:3px;height:calc(100% + 4px);background:${CHART_COLORS.frostWhite};border-radius:2px;z-index:1;`;

interface Props {
  data?: BulletMetric[];
}

// canonical-surface-audit 2026-04-13: DEMO_DATA fallback is gated to dev only.
// When this chart is mounted on a canonical user surface (e.g. /dashboard/client/progress
// via ProfileChartsGrid) and no real `data` prop is passed, production MUST render
// the empty state — never the hardcoded "(Preview)" goals. Rule-34 fake-data breach.
const GoalProgressBullet: React.FC<Props> = ({ data }) => {
  const hasRealData = !!(data && data.length > 0);
  const allowDemoFallback = !hasRealData && import.meta.env.DEV;
  const chartData = hasRealData ? data! : (allowDemoFallback ? DEMO_DATA : []);

  if (chartData.length === 0) {
    return (
      <ChartCard role="region" aria-label="Goal progress bullet chart" tabIndex={0}>
        <ChartHeader>
          <div>
            <ChartTitle>Goal Progress</ChartTitle>
            <ChartSubtitle>No goals set yet</ChartSubtitle>
          </div>
        </ChartHeader>
      </ChartCard>
    );
  }

  return (
    <ChartCard role="region" aria-label="Goal progress bullet chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Goal Progress{allowDemoFallback ? ' (Dev Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Current vs target for key fitness metrics</ChartSubtitle>
        </div>
      </ChartHeader>
      <Wrap>
        {chartData.map(m => (
          <Row key={m.label}>
            <Label><span>{m.label}</span><span>{m.current}/{m.target}</span></Label>
            <Track>
              <Fill $p={(m.current/m.max)*100} $c={m.color} $isDemo={allowDemoFallback} />
              <Target $pos={(m.target/m.max)*100} />
            </Track>
          </Row>
        ))}
      </Wrap>
    </ChartCard>
  );
};

export default React.memo(GoalProgressBullet);
