/**
 * COMPONENT: PrCelebration
 * PURPOSE: The "new personal record" moment on the Progress Proof share card.
 *   Fires only when the pulse tone is `record`. A GPU-safe crystalline burst
 *   (gold flash + eight shards) with a "NEW RECORD" ribbon. Purely decorative
 *   overlay (pointer-events: none) that clips inside the card.
 * A11Y: shards/flash are aria-hidden; a polite live region announces the record.
 * MOTION: honors prefers-reduced-motion — shards + flash are suppressed and only
 *   the static gold ribbon shows (Rule 25). Transform/opacity only (Rule: GPU-safe).
 */

import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Sparkles } from 'lucide-react';

const SHARD_COUNT = 8;

const goldFlash = keyframes`
  0%   { opacity: 0; transform: scale(0.4); }
  22%  { opacity: 0.9; }
  100% { opacity: 0; transform: scale(1.9); }
`;

const shardBurst = keyframes`
  0%   { opacity: 0; transform: rotate(var(--pr-angle, 0deg)) translateY(0) scale(0.2); }
  30%  { opacity: 1; }
  100% { opacity: 0; transform: rotate(var(--pr-angle, 0deg)) translateY(-70px) scale(1); }
`;

const ribbonPop = keyframes`
  0%   { opacity: 0; transform: translateY(6px) scale(0.86); }
  60%  { opacity: 1; transform: translateY(0) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const Layer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
`;

const Flash = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140px;
  height: 140px;
  margin: -70px 0 0 -70px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 70%, transparent),
    transparent 68%
  );
  animation: ${goldFlash} 900ms ease-out both;
  @media (prefers-reduced-motion: reduce) { display: none; }
`;

const Shard = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 16px;
  margin: -8px 0 0 -1.5px;
  border-radius: 2px;
  background: linear-gradient(
    var(--accent-gold, #C6A84B),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent)
  );
  transform-origin: center bottom;
  animation: ${shardBurst} 1000ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
  ${Array.from({ length: SHARD_COUNT }, (_, i) => `
    &:nth-child(${i + 1}) {
      --pr-angle: ${(360 / SHARD_COUNT) * i}deg;
      animation-delay: ${i * 18}ms;
    }
  `).join('')}
  @media (prefers-reduced-motion: reduce) { display: none; }
`;

/* Persistent badge - pinned TOP-RIGHT so it clears the left-aligned kicker (phone
   widths) and the card metrics below. */
const Ribbon = styled.span`
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font: 800 0.74rem/1 'Sora', sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--bg-base, #0A0A0F);
  background: linear-gradient(
    135deg,
    var(--accent-gold, #C6A84B),
    color-mix(in srgb, var(--accent-gold, #C6A84B) 70%, var(--frost-white, #E0ECF4))
  );
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent);
  animation: ${ribbonPop} 520ms ease-out both;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 1; }
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;

interface PrCelebrationProps {
  /** Optional label; defaults to the record announcement. */
  label?: string;
}

const PrCelebration: React.FC<PrCelebrationProps> = ({ label = 'New Record' }) => {
  // Populate the live region AFTER mount so screen readers reliably announce it
  // (a region rendered already-populated is commonly dropped by VO/JAWS).
  const [announced, setAnnounced] = useState('');
  useEffect(() => { setAnnounced('New personal record reached.'); }, []);

  return (
    <Layer data-testid="pr-celebration" aria-hidden={false}>
      <Flash aria-hidden="true" />
      {Array.from({ length: SHARD_COUNT }, (_, i) => (
        <Shard key={i} aria-hidden="true" />
      ))}
      <Ribbon>
        <Sparkles size={14} aria-hidden="true" />
        {label}
      </Ribbon>
      <SrOnly role="status">{announced}</SrOnly>
    </Layer>
  );
};

export default React.memo(PrCelebration);