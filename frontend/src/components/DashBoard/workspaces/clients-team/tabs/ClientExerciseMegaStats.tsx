/**
 * ============================================================================
 * FILE: ClientExerciseMegaStats.tsx
 * PURPOSE: Full ranked exercise history board for selected-client progress.
 * OWNER: Codex | LAST MODIFIED: 2026-05-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows every tracked exercise in rank order so trainers
 * can scan what a client does most and least without opening individual charts.
 *
 * HOW IT FITS IN THE APP: AdminProgressChartsGrid -> this board -> 12 charts.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Dumbbell, Trophy } from 'lucide-react';
import { CHART_COLORS } from '../../../../Charts/chartTheme';

export interface ExerciseMegaStatPoint {
  x: string;
  y: number;
  sets?: number;
}

interface ClientExerciseMegaStatsProps {
  exercises: ExerciseMegaStatPoint[];
}

const Board = styled.section`
  margin: 0 0 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 16%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-elevated, #141419) 92%, var(--accent-primary, #60c0f0) 5%),
      color-mix(in srgb, var(--bg-base, #0a0a0f) 90%, var(--accent-secondary, #8b5cf6) 6%));
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;

  @media (max-width: 620px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const TitleBlock = styled.div`
  min-width: 0;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60c0f0);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h4`
  margin: 0.2rem 0 0;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
`;

const CountPill = styled.div`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.65rem;
  border-radius: 9px;
  border: 1px solid var(--border-soft, rgba(198, 168, 75, 0.16));
  color: var(--accent-gold, #c6a84b);
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 82%, var(--accent-gold, #c6a84b) 7%);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
`;

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Row = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  min-height: 48px;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 82%, transparent);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
`;

const Rank = styled.span`
  width: 2rem;
  color: var(--accent-primary, #60c0f0);
  font-family: 'Fira Code', monospace;
  font-size: 0.76rem;
  font-weight: 800;
`;

const ExerciseName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
`;

const Bar = styled.span`
  position: relative;
  grid-column: 2 / 4;
  height: 7px;
  border-radius: 999px;
  background: var(--chart-track-bg, rgba(96, 192, 240, 0.08));
  overflow: hidden;
`;

const Fill = styled.span<{ $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => Math.max(Math.min($pct, 100), 3)}%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--accent-primary, ${CHART_COLORS.iceWing}),
    var(--accent-secondary, ${CHART_COLORS.wingPurple})
  );
`;

const Value = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  white-space: nowrap;
`;

const Empty = styled.div`
  min-height: 90px;
  display: grid;
  place-items: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  text-align: center;
`;

const ClientExerciseMegaStats: React.FC<ClientExerciseMegaStatsProps> = ({ exercises }) => {
  const ranked = useMemo(
    () => [...exercises].sort((a, b) => b.y - a.y || a.x.localeCompare(b.x)),
    [exercises]
  );
  const maxCount = Math.max(...ranked.map((item) => item.y), 1);

  return (
    <Board aria-label="Client exercise mega stats">
      <Header>
        <TitleBlock>
          <Eyebrow>
            <Dumbbell size={14} />
            Exercise diary
          </Eyebrow>
          <Title>Every tracked exercise, ranked</Title>
        </TitleBlock>
        <CountPill>
          <Trophy size={14} />
          {ranked.length} exercises tracked
        </CountPill>
      </Header>

      {ranked.length === 0 ? (
        <Empty>No exercise history yet</Empty>
      ) : (
        <List>
          {ranked.map((exercise, index) => (
            <Row key={`${exercise.x}-${index}`}>
              <Rank>#{index + 1}</Rank>
              <ExerciseName title={exercise.x}>{exercise.x}</ExerciseName>
              <Value>{exercise.y} logs / {exercise.sets ?? 0} sets</Value>
              <Bar aria-hidden="true">
                <Fill $pct={(exercise.y / maxCount) * 100} />
              </Bar>
            </Row>
          ))}
        </List>
      )}
    </Board>
  );
};

export default ClientExerciseMegaStats;
