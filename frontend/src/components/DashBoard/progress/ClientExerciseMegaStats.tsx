/**
 * ============================================================================
 * FILE: ClientExerciseMegaStats.tsx
 * PURPOSE: Full ranked exercise history board for client progress surfaces.
 * OWNER: Codex | LAST MODIFIED: 2026-06-07
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows every tracked exercise in rank order so clients,
 * trainers, and admins can scan what a client does most and least without
 * opening individual charts.
 *
 * HOW IT FITS IN THE APP: Client/admin progress dashboards -> this board ->
 * 12 canonical progress charts.
 */

import React, { useMemo } from 'react';
import { Dumbbell, Target, Trophy } from 'lucide-react';
import {
  Bar,
  Board,
  CountPill,
  Empty,
  ExerciseName,
  Eyebrow,
  Fill,
  Header,
  InsightGrid,
  InsightItem,
  InsightLabel,
  InsightMeta,
  InsightValue,
  List,
  Rank,
  Row,
  Title,
  TitleBlock,
  Value,
} from './ClientExerciseMegaStats.styles';
import {
  getExerciseMegaStatRowKey,
  sanitizeExerciseMegaStats,
  type ExerciseMegaStatPoint,
} from './ClientExerciseMegaStats.logic';

interface ClientExerciseMegaStatsProps {
  exercises: ExerciseMegaStatPoint[];
}

const ClientExerciseMegaStats: React.FC<ClientExerciseMegaStatsProps> = ({ exercises }) => {
  const ranked = useMemo(
    () => sanitizeExerciseMegaStats(exercises).sort((a, b) => b.y - a.y || a.x.localeCompare(b.x)),
    [exercises]
  );
  const maxCount = Math.max(...ranked.map((item) => item.y), 1);
  const topExercise = ranked[0];
  const focusExercise = ranked[ranked.length - 1];

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
        <>
          <InsightGrid role="group" aria-label="Exercise diary insights">
            <InsightItem>
              <InsightLabel>
                <Trophy size={13} />
                Most trained
              </InsightLabel>
              <InsightValue title={topExercise.x}>{topExercise.x}</InsightValue>
              <InsightMeta>{topExercise.y} logs / {topExercise.sets ?? 0} sets</InsightMeta>
            </InsightItem>
            <InsightItem>
              <InsightLabel>
                <Target size={13} />
                Needs attention
              </InsightLabel>
              <InsightValue title={focusExercise.x}>{focusExercise.x}</InsightValue>
              <InsightMeta>{focusExercise.y} logs / {focusExercise.sets ?? 0} sets</InsightMeta>
            </InsightItem>
          </InsightGrid>
          <List>
            {ranked.map((exercise, index) => (
              <Row key={getExerciseMegaStatRowKey(exercise)}>
                <Rank>#{index + 1}</Rank>
                <ExerciseName title={exercise.x}>{exercise.x}</ExerciseName>
                <Value>{exercise.y} logs / {exercise.sets ?? 0} sets</Value>
                <Bar aria-hidden="true">
                  <Fill $pct={(exercise.y / maxCount) * 100} />
                </Bar>
              </Row>
            ))}
          </List>
        </>
      )}
    </Board>
  );
};

export default ClientExerciseMegaStats;
