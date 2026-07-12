/**
 * ClientProgramShelf.styles
 * =========================
 * "Program Shelf" (Sean's pick, 2026-07-11): the ACTIVE plan is a hero card that
 * dominates; the member's other plans sit on a sideways-scrolling shelf beneath.
 * Hierarchy carries the meaning — the orphaned 7-slot vault card failed because
 * every slot looked identical, so an active program read the same as an empty one.
 *
 * Crystalline Swan tokens only, var(--token, #fallback) everywhere (Rule 6).
 * 44px targets (Rule 2). prefers-reduced-motion honored (Rule 25).
 */
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0%   { background-position: -420px 0; }
  100% { background-position: 420px 0; }
`;

export const ShelfSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
`;

/* ── Hero: the plan they are ON ─────────────────────────────── */

export const HeroCard = styled.div`
  position: relative;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-deep, #002060) 42%, transparent) 0%,
      color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent) 62%
    );
  padding: 0.95rem 1rem;
  overflow: hidden;

  /* Signature moment: a soft Ice-Wing bloom in the corner so the active program
     reads as "lit" against the paused plans on the shelf below. */
  &::after {
    content: '';
    position: absolute;
    top: -40%;
    right: -12%;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent) 0%,
      transparent 68%
    );
    pointer-events: none;
  }
`;

export const HeroKicker = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const HeroTitle = styled.h3`
  margin: 0.3rem 0 0;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-weight: 800;
  font-size: 1.12rem;
  line-height: 1.2;
  color: var(--text-primary, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const HeroMeta = styled.p`
  margin: 0.25rem 0 0;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.76rem;
`;

/** Week N of M — the "where am I" answer, in one line. */
export const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.7rem;
  font-size: 0.72rem;
  color: var(--text-secondary, #9FB6C8);
  font-family: 'Fira Code', monospace;
`;

export const ProgressTrack = styled.div`
  position: relative;
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-secondary, #9FB6C8) 20%, transparent);
  overflow: hidden;
`;

export const ProgressFill = styled.div<{ $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--accent-secondary, #8B5CF6) 0%,
    var(--accent-primary, #60C0F0) 100%
  );
`;

/** Wraps the today strip + its CTA into ONE addressable surface (the card that
 *  absorbed TodaysAssignmentCard) — so the action always travels with the fact. */
export const TodayCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

/**
 * TODAY strip — the single most actionable fact on the card, and the surface that
 * absorbed the retired TodaysAssignmentCard. Turns Ice-Wing-green-lit when the
 * member has already logged today, so "am I done?" is answerable at a glance.
 */
export const NextUp = styled.div<{ $done?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.7rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1px solid ${({ $done }) => ($done
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)')};
  background: ${({ $done }) => ($done
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent)')};
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
  min-width: 0;

  > svg { flex: 0 0 auto; }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong { font-weight: 800; }

  small {
    margin-left: auto;
    padding-left: 0.4rem;
    color: ${({ $done }) => ($done
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #9FB6C8)')};
    font-family: 'Fira Code', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    white-space: nowrap;
  }
`;

export const HeroActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;

  @media (max-width: 420px) { flex-direction: column; }
`;

/** Primary CTA — Dual-Button Glow: purple bg -> cyan glow. */
export const PrimaryAction = styled.button`
  min-height: 44px;
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 1rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(
    135deg,
    var(--accent-secondary, #8B5CF6) 0%,
    var(--accent-primary, #60C0F0) 100%
  );
  color: var(--text-on-accent, #0A0A0F);
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  transition: box-shadow 160ms ease, transform 120ms ease;

  &:hover {
    box-shadow: 0 6px 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const SecondaryAction = styled.button`
  min-height: 44px;
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

/* ── The shelf: their other plans ───────────────────────────── */

export const ShelfHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

/**
 * Horizontal shelf. Scrolls sideways with snap so it feels native on a phone and
 * never fights the page's vertical scroll (one scroll owner per axis).
 */
export const ShelfTrack = styled.div`
  display: flex;
  gap: 0.55rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 0.15rem 0.15rem 0.4rem;
  margin: -0.15rem;
  -webkit-overflow-scrolling: touch;

  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent) transparent;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  }
`;

export const ShelfCard = styled.button`
  scroll-snap-align: start;
  flex: 0 0 auto;
  width: 190px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.7rem 0.75rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--text-secondary, #9FB6C8) 20%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, transform 120ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    transform: translateY(-2px);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const ShelfCardTitle = styled.span`
  font-weight: 700;
  font-size: 0.82rem;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const ShelfCardMeta = styled.span`
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.7rem;
  font-family: 'Fira Code', monospace;
`;

/** Read-out only — the trainer sets which plan is active (doctrine). */
export const ShelfPill = styled.span<{ $tone: 'paused' | 'ready' | 'done' }>`
  align-self: flex-start;
  margin-top: 0.1rem;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid ${({ $tone }) => ($tone === 'done'
    ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 45%, transparent)'
    : 'color-mix(in srgb, var(--text-secondary, #9FB6C8) 30%, transparent)')};
  color: ${({ $tone }) => ($tone === 'done'
    ? 'var(--accent-luxury, #C6A84B)'
    : 'var(--text-secondary, #9FB6C8)')};
`;

/* ── Non-active states (the card is ALWAYS present) ─────────── */

export const EmptyCard = styled.div`
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 55%, transparent);
  padding: 1.1rem 1rem;
  text-align: center;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.86rem;

  p { margin: 0.3rem 0 0; color: var(--text-secondary, #9FB6C8); font-size: 0.76rem; }
  svg { color: var(--accent-primary, #60C0F0); }
`;

export const SkeletonCard = styled.div`
  height: 168px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent) 25%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent) 50%,
    color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent) 75%
  );
  background-size: 420px 100%;
  animation: ${shimmer} 1.2s linear infinite;

  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.7; }
`;
