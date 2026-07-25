/**
 * COMPONENT: NextMilestoneGravity
 * PURPOSE: Turns the pulse's "next target" text into a visual next-best-action pull —
 *   a slim track whose glowing fill reaches toward a gold milestone node, with the
 *   remaining gap as the caption ("8 lb to your best"). Every chart nudges the client
 *   toward the next win (Product Core Loop). Informational, not interactive.
 * A11Y: exposes a progressbar role with valuenow/min/max + label. The pulse-glow is
 *   suppressed under prefers-reduced-motion (Rule 25); tokens-with-fallback (Rule 6).
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Target } from 'lucide-react';

const pull = keyframes`
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
`;

const Wrap = styled.div`
  display: grid;
  gap: 0.3rem;
  margin-top: 0.4rem;
`;

const Track = styled.div`
  position: relative;
  height: 7px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-graphite, #1A1A24) 84%, var(--accent-primary, #60C0F0));
`;

const Fill = styled.span<{ $value: number }>`
  display: block;
  height: 100%;
  width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent);
  animation: ${pull} 2.4s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Node = styled.span`
  position: absolute;
  top: 50%;
  right: 1px;
  width: 8px;
  height: 8px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: var(--accent-gold, #C6A84B);
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent-gold, #C6A84B) 60%, transparent);
`;

const Caption = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 700 0.68rem/1.2 'Sora', sans-serif;
  svg { color: var(--accent-gold, #C6A84B); flex: 0 0 auto; }
`;

interface NextMilestoneGravityProps {
  progressToNext: number;
  remainingLabel?: string;
  atPeak?: boolean;
}

const NextMilestoneGravity: React.FC<NextMilestoneGravityProps> = ({
  progressToNext,
  remainingLabel,
  atPeak = false,
}) => {
  const percent = Math.round(Math.max(0, Math.min(1, progressToNext)) * 100);
  const caption = atPeak || !remainingLabel
    ? 'Peak reached - protect it'
    : `${remainingLabel} to your best`;

  return (
    <Wrap data-testid="next-milestone-gravity">
      <Track
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Progress to next milestone: ${percent}%`}
      >
        <Fill $value={percent} />
        <Node aria-hidden="true" />
      </Track>
      <Caption>
        <Target size={12} aria-hidden="true" />
        {caption}
      </Caption>
    </Wrap>
  );
};

export default React.memo(NextMilestoneGravity);
