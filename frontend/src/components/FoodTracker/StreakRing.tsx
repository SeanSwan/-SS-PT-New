/**
 * FILE: StreakRing.tsx
 * PURPOSE: Phase 4C — small SVG ring showing the current logging streak with
 *          an Ice Wing glow. Arc fills toward the next milestone (3/7/30).
 * HOW IT FITS: NutritionWorkspace header, next to the title, only when
 *          streak > 0 and Gentle Mode is off (caller enforces both).
 * ED-SAFE LAW: renders NOTHING at streak 0 — no shame state, no
 *          broken-streak copy anywhere in this file.
 * KEY DECISIONS: reduced-motion → static ring (no dash animation); glow is a
 *          static drop-shadow filter so it needs no keyframes at all.
 */
import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { nextStreakMilestone } from './nutritionStreakMilestones';

const RING_SIZE = 48;
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ringDraw = keyframes`
  from { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
`;

const RingShell = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: ${RING_SIZE}px;
  height: ${RING_SIZE}px;
  flex-shrink: 0;

  svg {
    display: block;
    filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent));
  }
`;

const ProgressCircle = styled.circle<{ $reduceMotion: boolean }>`
  ${({ $reduceMotion }) => !$reduceMotion && css`animation: ${ringDraw} 0.9s ease-out;`}
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const RingCenter = styled.span`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--accent-primary, #60C0F0);
  font: 800 0.82rem/1 var(--font-data, 'Fira Code', monospace);
`;

interface StreakRingProps {
  streak: number;
  reduceMotion?: boolean;
}

const StreakRing: React.FC<StreakRingProps> = ({ streak, reduceMotion = false }) => {
  if (!Number.isFinite(streak) || streak <= 0) return null;

  const milestone = nextStreakMilestone(streak);
  const progress = milestone ? Math.min(streak / milestone, 1) : 1;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <RingShell role="img" aria-label={`${streak}-day logging streak`} title={`${streak}-day logging streak`}>
      <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} width={RING_SIZE} height={RING_SIZE} aria-hidden="true">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)"
          strokeWidth="4"
        />
        <ProgressCircle
          $reduceMotion={reduceMotion}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--ice-wing, #60C0F0)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </svg>
      <RingCenter aria-hidden="true">{streak}</RingCenter>
    </RingShell>
  );
};

export default StreakRing;
