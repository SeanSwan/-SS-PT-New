/**
 * COMPONENT: LatestMovementDigest
 * PURPOSE: A one-glance "what moved recently" card so the client sees the story across all
 *   tracked metrics without scanning every chart (Product Core Loop: next-best-action).
 *   Each row is the honest latest-vs-previous delta from the real chart bundle.
 * DATA POLICY: only metrics with >= 2 logged points appear; direction color is a good/bad
 *   verdict ONLY for metrics with a known good direction (green up-good / amber wrong-way),
 *   neutral metrics (weight/intensity/duration) stay informational — never falsely "good".
 *   Renders nothing until there is real movement to show.
 * A11Y: semantic list; each row's SrText states the metric, value, and change verbally.
 *   Arrows are decorative. All color via --token,#fallback (Rule 6).
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Activity, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import { buildMovementDigest, type MovementRow } from './chartMovementDigest';

interface Props {
  charts: CanonicalProgressCharts;
}

/** Semantic color for a row: good move (green), wrong-way (amber), neutral/flat (informational). */
const toneColor = (r: MovementRow): string => {
  if (r.improved === true) return 'var(--success, #34D399)';
  if (r.improved === false) return 'var(--warning, #F59E0B)';
  return 'var(--accent-primary, #60C0F0)';
};

const Panel = styled.section`
  margin: 1rem 0;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background:
    radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 11%, transparent), transparent 40%),
    var(--bg-elevated, #141419);
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.9rem/1.2 'Sora', sans-serif;
  svg { color: var(--accent-primary, #60C0F0); flex: 0 0 auto; }
`;

const Count = styled.span`
  margin-left: auto;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 700 0.66rem/1 'Sora', sans-serif;
`;

const Micro = styled.p`
  margin: 0.25rem 0 0.6rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 56%, transparent));
  font: 650 0.66rem/1.4 'Sora', sans-serif;
`;

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.15rem;
`;

const RowLi = styled.li`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.42rem 0;
  & + & { border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent); }
`;

const Label = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 80%, transparent));
  font: 700 0.74rem/1.3 'Sora', sans-serif;
`;

const Value = styled.span`
  flex-shrink: 0;
  color: var(--text-primary, #E0ECF4);
  font: 700 0.74rem/1 'Fira Code', monospace;
`;

const Delta = styled.span<{ $color: string }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 5.2rem;
  justify-content: flex-end;
  color: ${({ $color }) => $color};
  font: 700 0.72rem/1 'Fira Code', monospace;
  svg { flex: 0 0 auto; }
`;

const SrText = styled.span`
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
`;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const arrowFor = (d: MovementRow['direction']) => (d === 'up' ? ArrowUp : d === 'down' ? ArrowDown : Minus);
const dirWord = (d: MovementRow['direction']) => (d === 'up' ? 'up' : d === 'down' ? 'down' : 'unchanged');

const LatestMovementDigest: React.FC<Props> = ({ charts }) => {
  const digest = useMemo(() => buildMovementDigest(charts), [charts]);

  if (!digest.hasData) return null;

  return (
    <Panel data-testid="latest-movement-digest" aria-label="Latest movement across your metrics">
      <Head>
        <Activity size={16} aria-hidden="true" />
        Latest movement
        <Count>{digest.metricsMoved} of {digest.rows.length} moved</Count>
      </Head>
      <Micro>Your most recent change on each tracked metric, from verified logs.</Micro>
      <List>
        {digest.rows.map((r) => {
          const Arrow = arrowFor(r.direction);
          const color = toneColor(r);
          const pct = r.pctChange !== null && r.direction !== 'flat' ? ` (${signed(r.pctChange)}%)` : '';
          return (
            <RowLi key={r.key}>
              <Label>{r.label}</Label>
              <Value>{r.latest}{r.unit}</Value>
              <Delta $color={color}>
                <Arrow size={13} aria-hidden="true" />
                {r.direction === 'flat' ? 'even' : `${signed(r.delta)}${r.unit}${pct}`}
              </Delta>
              <SrText>
                {r.label}: {r.latest}{r.unit}, {dirWord(r.direction)}
                {r.direction !== 'flat' ? ` ${signed(r.delta)}${r.unit} since your previous entry` : ' since your previous entry'}
                {r.improved === true ? ' (improving)' : r.improved === false ? ' (moving the wrong way)' : ''}
              </SrText>
            </RowLi>
          );
        })}
      </List>
    </Panel>
  );
};

export default React.memo(LatestMovementDigest);
