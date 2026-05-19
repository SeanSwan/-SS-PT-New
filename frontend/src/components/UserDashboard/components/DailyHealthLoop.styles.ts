/**
 * ============================================================================
 * FILE: DailyHealthLoop.styles.ts
 * PURPOSE: Styled-components for the Home daily health loop surface.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-07
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Holds the responsive layout and interaction styling for
 * DailyHealthLoop so the component file stays focused on behavior and copy.
 *
 * HOW IT FITS IN THE APP: Imported only by DailyHealthLoop.tsx.
 *
 * KEY DECISIONS:
 * - Styled-components only; no Tailwind or MUI.
 * - Crystalline Swan token fallbacks for visible color values.
 * - 44px minimum interactive targets with reduced-motion-safe hover states.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export const LoopShell = styled(motion.section)`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(240px, 0.8fr);
  gap: 0.875rem;
  width: 100%;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const MissionPanel = styled.div`
  position: relative;
  overflow: hidden;
  min-height: 212px;
  padding: 1.25rem;
  border-radius: 18px;
  background:
    radial-gradient(
      circle at top left,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent),
      transparent 34%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--surface-primary, #003080) 76%, transparent),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  box-shadow:
    0 14px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent);
  backdrop-filter: blur(18px);

  @media (max-width: 414px) {
    min-height: 0;
    padding: 1rem;
    border-radius: 16px;
  }
`;

export const RailPanel = styled.div`
  display: grid;
  gap: 0.75rem;
`;

export const MicroCard = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  min-height: 82px;
  padding: 0.875rem;
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-primary, #003080) 68%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-soft, #E0ECF4) 9%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: inherit;
  text-align: left;
`;

export const IconWell = styled.div<{ $tone?: 'gold' | 'purple' }>`
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'purple'
        ? 'var(--accent-purple, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'};
  background: color-mix(in srgb, currentColor 11%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
`;

export const Eyebrow = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.65rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
`;

export const MissionTitle = styled.h2`
  max-width: 780px;
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.25rem, 2.6vw, 2.05rem);
  line-height: 1.08;
  color: var(--text-primary, #E0ECF4);
`;

export const MissionCopy = styled.p`
  max-width: 660px;
  margin: 0.75rem 0 1rem;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.92rem;
  line-height: 1.55;
`;

export const ResultRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

export const ResultPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 34px;
  padding: 0.35rem 0.625rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 46%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
`;

export const PrimaryAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 46px;
  padding: 0 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 14px;
  background: var(--button-primary-bg, #002060);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-purple, #8B5CF6) 24%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 30px color-mix(in srgb, var(--accent-purple, #8B5CF6) 34%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-purple, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: box-shadow 0.18s ease;

    &:hover {
      transform: none;
    }
  }
`;

export const MicroText = styled.span`
  min-width: 0;
`;

export const MicroTitle = styled.span`
  display: block;
  margin-bottom: 0.18rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
`;

export const MicroSub = styled.span`
  display: block;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.76rem;
  line-height: 1.35;
`;

export const Arrow = styled(ArrowRight)`
  color: var(--text-muted, #64748b);
`;
