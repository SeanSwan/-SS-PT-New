/**
 * ============================================================================
 * FILE: SwanCoachActionLauncher.styles.ts
 * PURPOSE: Styled-components for the Home Swan Coach action launcher.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-07
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the responsive, accessible styling for the
 * local voice/text action draft surface rendered on the user dashboard Home tab.
 *
 * HOW IT FITS IN THE APP: Imported by SwanCoachActionLauncher.tsx only.
 *
 * KEY DECISIONS:
 * - No Tailwind or MUI; styled-components only.
 * - Crystalline Swan token fallbacks for visible colors.
 * - 44px minimum touch targets and reduced-motion-safe interaction states.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const LauncherShell = styled(motion.section)`
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(280px, 1fr);
  gap: 0.875rem;
  padding: 1rem;
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--surface-primary, #003080) 74%, transparent),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 90%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 22%, transparent);
  box-shadow:
    0 14px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  backdrop-filter: blur(18px);

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 414px) {
    padding: 0.875rem;
    border-radius: 16px;
  }
`;

export const LauncherIntro = styled.div`
  display: flex;
  gap: 0.875rem;
  min-width: 0;
`;

export const CoachMark = styled.div<{ $listening: boolean }>`
  width: 46px;
  height: 46px;
  min-width: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: ${({ $listening }) =>
    $listening ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  background: color-mix(in srgb, currentColor 11%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  box-shadow: 0 0 22px color-mix(in srgb, currentColor 18%, transparent);
`;

export const IntroCopy = styled.div`
  min-width: 0;
`;

export const Eyebrow = styled.p`
  margin: 0 0 0.35rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const Title = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  line-height: 1.15;
`;

export const Description = styled.p`
  margin: 0.5rem 0 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.84rem;
  line-height: 1.5;
`;

export const ActionForm = styled.form`
  display: grid;
  gap: 0.625rem;
`;

export const InputRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  gap: 0.625rem;
  align-items: stretch;

  @media (max-width: 414px) {
    grid-template-columns: 1fr;
  }
`;

export const DraftInput = styled.textarea`
  width: 100%;
  min-height: 86px;
  resize: vertical;
  padding: 0.8rem 0.875rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  line-height: 1.45;

  &::placeholder {
    color: var(--text-muted, #64748b);
  }

  &:focus {
    outline: 2px solid var(--accent-purple, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const MicButton = styled.button<{ $listening: boolean }>`
  display: inline-grid;
  place-items: center;
  min-width: 48px;
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid
    ${({ $listening }) =>
      $listening
        ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 44%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent)'};
  background: ${({ $listening }) =>
    $listening
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'};
  color: ${({ $listening }) =>
    $listening ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 22px color-mix(in srgb, currentColor 18%, transparent);
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

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 13px;
  background: var(--button-primary-bg, #002060);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent-purple, #8B5CF6) 22%, transparent);
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  cursor: pointer;
`;

export const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  border-radius: 13px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 44%, transparent);
  color: var(--text-secondary, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  cursor: pointer;
`;

export const StatusLine = styled.p`
  min-height: 1.25rem;
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.76rem;
  line-height: 1.35;
`;

export const Receipt = styled.div`
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);
`;

export const ReceiptTitle = styled.strong`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
`;

export const ReceiptCopy = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  line-height: 1.42;
`;
