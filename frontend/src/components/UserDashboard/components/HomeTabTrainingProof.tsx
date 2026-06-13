/**
 * ============================================================================
 * FILE: HomeTabTrainingProof.tsx
 * PURPOSE: Real workout-progress strip for the V3 dashboard Home (workstream
 *          N4 — the Product Core Loop on this surface). Reads logged workout
 *          sessions only: this week's count + minutes, a REAL 4-week trend,
 *          the last session, and a one-tap "Share progress" that prefills the
 *          quick composer (the smart-hashtag system types and tags it).
 * DATA TRUTH: every number derives from /api/workout/sessions via
 *          buildHomeTrainingProof — no fabricated bars, honest empty state.
 * ============================================================================
 */
import React from 'react';
import styled from 'styled-components';
import { Dumbbell, Share2, TrendingDown, TrendingUp } from 'lucide-react';
import { Eyebrow } from './HomeTabVision.styles';
import { ButtonRow, Chip, GlassButton } from './HomeTabVisionCards.styles';
import type { HomeTrainingProof } from './HomeTabViewModel';

const ProofHeader = styled(ButtonRow)`
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const ProofRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ProofStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  strong {
    font-size: 1.4rem;
    color: var(--text-primary, #E0ECF4);
  }

  span {
    font-size: 0.75rem;
    color: var(--vision-soft);
  }
`;

const TrendBars = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  height: 48px;
`;

const TrendBar = styled.div<{ $pct: number; $current?: boolean }>`
  width: 14px;
  min-height: 4px;
  height: ${({ $pct }) => Math.max(4, Math.round($pct * 0.48))}px;
  border-radius: 4px 4px 2px 2px;
  background: ${({ $current }) => $current
    ? 'var(--gilded-fern, #C6A84B)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 65%, transparent)'};
`;

const LastSessionLine = styled.p`
  margin: 0.6rem 0 0;
  font-size: 0.82rem;
  color: var(--vision-soft);
`;

const EmptyCopy = styled.p`
  margin: 0;
  color: var(--vision-soft);
  line-height: 1.5;
`;

interface HomeTabTrainingProofProps {
  proof: HomeTrainingProof;
  onShareProgress: (line: string) => void;
}

const HomeTabTrainingProof: React.FC<HomeTabTrainingProofProps> = ({ proof, onShareProgress }) => {
  const maxCount = Math.max(1, ...proof.weeklyCounts);

  return (
    <>
      <ProofHeader>
        <Eyebrow>
          <Dumbbell size={14} aria-hidden="true" />
          Training Proof
        </Eyebrow>
        <ButtonRow>
          {/* O3 weekly recap: the real week-over-week delta, worn proudly. */}
          {proof.weekDelta !== null && proof.weekDelta !== 0 && (
            <Chip $tone={proof.weekDelta > 0 ? 'gold' : 'cyan'}>
              {proof.weekDelta > 0
                ? <TrendingUp size={12} aria-hidden="true" />
                : <TrendingDown size={12} aria-hidden="true" />}
              {proof.weekDelta > 0 ? `+${proof.weekDelta}` : proof.weekDelta} vs last week
            </Chip>
          )}
          {proof.thisWeekCount > 0 && <Chip $tone="gold">{proof.thisWeekCount} this week</Chip>}
        </ButtonRow>
      </ProofHeader>
      {proof.weeklyCounts.some((count) => count > 0) ? (
        <>
          <ProofRow>
            <ProofStat>
              <strong>{proof.thisWeekCount}</strong>
              <span>workouts this week</span>
            </ProofStat>
            {proof.minutesThisWeek > 0 && (
              <ProofStat>
                <strong>{proof.minutesThisWeek}</strong>
                <span>minutes logged</span>
              </ProofStat>
            )}
            <TrendBars aria-label={`Workouts per week, last 4 weeks: ${proof.weeklyCounts.join(', ')}`}>
              {proof.weeklyCounts.map((count, index) => (
                <TrendBar
                  key={`week-${index}`}
                  $pct={(count / maxCount) * 100}
                  $current={index === 3}
                  title={`${count} workout${count === 1 ? '' : 's'}`}
                />
              ))}
            </TrendBars>
          </ProofRow>
          {proof.lastSession && (
            <LastSessionLine>
              Last: {proof.lastSession.title} · {proof.lastSession.when}
            </LastSessionLine>
          )}
          {proof.shareLine && (
            <ButtonRow style={{ marginTop: '0.75rem' }}>
              {/* O3: shares post as a REAL workout post — the parent attaches
                  the latest session link (workoutSessionId) to the payload. */}
              <GlassButton type="button" $variant="primary" onClick={() => onShareProgress(proof.shareLine!)}>
                <Share2 size={15} aria-hidden="true" />
                Share my week
              </GlassButton>
            </ButtonRow>
          )}
        </>
      ) : (
        <EmptyCopy>
          No logged workouts yet — your training proof builds here with every session you log.
        </EmptyCopy>
      )}
    </>
  );
};

export default HomeTabTrainingProof;
