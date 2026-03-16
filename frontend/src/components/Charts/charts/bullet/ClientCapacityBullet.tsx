import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, CHART_COLORS, hexAlpha } from '../../chartTheme';

interface BulletMetric { label: string; current: number; target: number; max: number; color: string }

const metrics: BulletMetric[] = [
  { label: 'Sean', current: 18, target: 25, max: 30, color: CHART_COLORS.iceWing },
  { label: 'Maria', current: 22, target: 25, max: 30, color: CHART_COLORS.wingPurple },
  { label: 'Jake', current: 15, target: 20, max: 30, color: CHART_COLORS.arcticCyan },
  { label: 'Lisa', current: 19, target: 20, max: 30, color: CHART_COLORS.gildedFern },
];

const Wrap = styled.div`display:flex;flex-direction:column;gap:20px;flex:1;justify-content:center;padding:16px;`;
const Row = styled.div`display:flex;flex-direction:column;gap:4px;`;
const Label = styled.div`font-family:'Sora',sans-serif;font-size:0.75rem;color:${CHART_COLORS.textSecondary};display:flex;justify-content:space-between;`;
const Track = styled.div`position:relative;height:24px;background:${hexAlpha(CHART_COLORS.iceWing,0.1)};border-radius:6px;overflow:hidden;`;
const Fill = styled.div<{$p:number;$c:string}>`position:absolute;left:0;top:0;height:100%;width:${({$p})=>Math.min($p,100)}%;background:${({$c})=>$c};border-radius:6px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);`;
const Target = styled.div<{$pos:number}>`position:absolute;left:${({$pos})=>$pos}%;top:-2px;width:3px;height:calc(100% + 4px);background:${CHART_COLORS.frostWhite};border-radius:2px;z-index:1;`;

const ClientCapacityBullet: React.FC = () => (
  <ChartCard role="region" aria-label="Client capacity per trainer bullet chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Client Capacity</ChartTitle>
        <ChartSubtitle>Current clients vs max capacity per trainer</ChartSubtitle>
      </div>
    </ChartHeader>
    <Wrap>
      {metrics.map(m => (
        <Row key={m.label}>
          <Label><span>{m.label}</span><span>{m.current}/{m.target}</span></Label>
          <Track>
            <Fill $p={(m.current/m.max)*100} $c={m.color} />
            <Target $pos={(m.target/m.max)*100} />
          </Track>
        </Row>
      ))}
    </Wrap>
  </ChartCard>
);

export default ClientCapacityBullet;
