/**
 * UniversalThemeToggle.styles.ts — data-driven theme changer styles
 * ==================================================================
 * Every color arrives via transient props derived from the ACTIVE theme
 * object, so all registered themes (and any future ones) style the control
 * correctly with zero per-theme switch statements.
 * Motion is gated by prefers-reduced-motion AND html[data-motion='off'].
 */
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

const orbit = keyframes`
  0% { transform: rotate(0deg) translateX(20px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
`;

export const ToggleRoot = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const SwatchButton = styled(motion.button)<{
  $bg: string;
  $accent: string;
  $secondary: string;
  $text: string;
}>`
  position: relative;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: ${({ $text }) => $text};
  background: ${({ $bg, $accent }) => `linear-gradient(135deg, ${$bg} 0%, ${$bg} 55%, ${$accent} 130%)`};
  border: 2px solid ${({ $accent }) => `color-mix(in srgb, ${$accent} 42%, transparent)`};
  box-shadow: 0 0 18px ${({ $accent }) => `color-mix(in srgb, ${$accent} 30%, transparent)`};
  transition: box-shadow 0.35s ease, border-color 0.35s ease, transform 0.35s ease;

  &:hover {
    transform: scale(1.08);
    border-color: ${({ $accent }) => `color-mix(in srgb, ${$accent} 70%, transparent)`};
    box-shadow:
      0 0 26px ${({ $accent }) => `color-mix(in srgb, ${$accent} 45%, transparent)`},
      0 0 52px ${({ $secondary }) => `color-mix(in srgb, ${$secondary} 22%, transparent)`};
  }

  &:focus-visible {
    outline: 2px solid ${({ $accent }) => $accent};
    outline-offset: 3px;
  }

  &:active { transform: scale(0.95); }

  /* Orbiting accent particle — the button's signature life sign */
  &::before {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${({ $secondary }) => $secondary};
    animation: ${css`${orbit}`} 3.6s linear infinite;
    opacity: 0.85;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
    &::before { animation: none; opacity: 0; }
  }

  html[data-motion='off'] & {
    &::before { animation: none; opacity: 0; }
  }
`;

export const IconHalo = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  pointer-events: none;
  filter: drop-shadow(0 0 6px currentColor);
`;

export const Panel = styled(motion.div)<{ $bg: string; $line: string }>`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(340px, calc(100vw - 24px));
  max-height: min(520px, 70vh);
  overflow-y: auto;
  border-radius: 16px;
  padding: 0.9rem;
  z-index: var(--z-dropdown, 1260);
  background: ${({ $bg }) => `color-mix(in srgb, ${$bg} 92%, transparent)`};
  border: 1px solid ${({ $line }) => `color-mix(in srgb, ${$line} 30%, transparent)`};
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.55),
    0 0 32px ${({ $line }) => `color-mix(in srgb, ${$line} 14%, transparent)`};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb {
    background: ${({ $line }) => `color-mix(in srgb, ${$line} 40%, transparent)`};
    border-radius: 3px;
  }
`;

export const PanelHeader = styled.div<{ $line: string; $text: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.15rem 0.35rem 0.75rem;
  border-bottom: 1px solid ${({ $line }) => `color-mix(in srgb, ${$line} 22%, transparent)`};
  margin-bottom: 0.6rem;

  h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: ${({ $text }) => $text};
  }
`;

export const MotionSwitch = styled.button<{ $on: boolean; $accent: string; $text: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 0.6rem;
  border-radius: 10px;
  border: 1px solid ${({ $accent }) => `color-mix(in srgb, ${$accent} 35%, transparent)`};
  background: ${({ $on, $accent }) => ($on ? `color-mix(in srgb, ${$accent} 18%, transparent)` : 'transparent')};
  color: ${({ $text }) => $text};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:focus-visible {
    outline: 2px solid ${({ $accent }) => $accent};
    outline-offset: 2px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $on, $accent }) => ($on ? $accent : 'transparent')};
    border: 1.5px solid ${({ $accent }) => $accent};
  }
`;

export const GroupLabel = styled.div<{ $muted: string }>`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: ${({ $muted }) => $muted};
  padding: 0.55rem 0.35rem 0.35rem;
`;

export const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;

  /* Phone width: one readable column — two columns truncate most theme names */
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const SwatchItem = styled.button<{
  $active: boolean;
  $accent: string;
  $text: string;
}>`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.35rem 0.5rem;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  background: ${({ $active, $accent }) => ($active ? `color-mix(in srgb, ${$accent} 16%, transparent)` : 'transparent')};
  border: 1px solid ${({ $active, $accent }) =>
    $active ? `color-mix(in srgb, ${$accent} 55%, transparent)` : 'transparent'};
  color: ${({ $text }) => $text};
  font-size: 0.8rem;
  font-weight: 500;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ $accent }) => `color-mix(in srgb, ${$accent} 10%, transparent)`};
    border-color: ${({ $accent }) => `color-mix(in srgb, ${$accent} 30%, transparent)`};
  }

  &:focus-visible {
    outline: 2px solid ${({ $accent }) => $accent};
    outline-offset: 1px;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const ShowAllButton = styled.button<{ $accent: string; $text: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 44px;
  margin-top: 0.6rem;
  border-radius: 10px;
  border: 1px dashed ${({ $accent }) => `color-mix(in srgb, ${$accent} 32%, transparent)`};
  background: transparent;
  color: ${({ $text }) => $text};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: ${({ $accent }) => `color-mix(in srgb, ${$accent} 10%, transparent)`};
    border-color: ${({ $accent }) => `color-mix(in srgb, ${$accent} 55%, transparent)`};
  }

  &:focus-visible {
    outline: 2px solid ${({ $accent }) => $accent};
    outline-offset: 2px;
  }
`;

export const SwatchChip = styled.span<{ $bg: string; $primary: string; $accent: string }>`
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  position: relative;
  background: ${({ $bg, $primary }) => `linear-gradient(135deg, ${$bg} 0%, ${$bg} 52%, ${$primary} 52%, ${$primary} 100%)`};
  border: 1px solid ${({ $primary }) => `color-mix(in srgb, ${$primary} 55%, transparent)`};

  &::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $accent }) => $accent};
    border: 1px solid rgba(0, 0, 0, 0.35);
  }
`;

export const StudioLoadingState = styled.div`
  position: fixed;
  top: 76px;
  right: 12px;
  z-index: var(--z-dropdown, 1260);
  min-width: 260px;
  min-height: 52px;
  display: grid;
  place-items: center;
  padding: 12px 18px;
  border: 1px solid color-mix(in srgb, var(--ice-wing, #60c0f0) 34%, transparent);
  border-radius: 16px;
  background: var(--graphite, #1a1a24);
  color: var(--frost-white, #e0ecf4);
  font: 700 13px/1.3 'Sora', sans-serif;
`;
