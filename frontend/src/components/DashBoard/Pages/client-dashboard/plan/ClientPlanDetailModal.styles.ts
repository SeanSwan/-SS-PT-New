/**
 * ClientPlanDetailModal.styles
 * ============================
 * Crystalline-Swan plan viewer chrome (Design Brain C12 glass panel).
 * Graphite panel on a blurred Obsidian overlay, Frost White text, Wing-Purple
 * focus rings, Ice-Wing "you are here" accent. Tier-1 scale+fade entrance;
 * tier-3 prefers-reduced-motion collapses to opacity-only.
 * Every colour is var(--token, #fallback) — no bare hex (Rule 6).
 */
import styled, { keyframes, css } from 'styled-components';

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const panelIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* 2200 = house precedent for full-screen dialogs (WorkoutPlannerBlendDialog,
     WorkoutDayDrilldown, PdfApprovalVault). */
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  backdrop-filter: blur(8px);
  animation: ${overlayIn} 160ms ease-out;

  @media (prefers-reduced-motion: reduce) { animation: none; }
  @media (max-width: 480px) { padding: 0; align-items: flex-end; }
`;

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  width: min(880px, 96vw);
  max-height: 92vh;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  animation: ${panelIn} 200ms cubic-bezier(0.22, 1, 0.36, 1);

  @media (prefers-reduced-motion: reduce) { animation: ${overlayIn} 120ms ease-out; }
  /* Phone: full-bleed sheet from the bottom — thumb-reachable. */
  @media (max-width: 480px) {
    width: 100%;
    max-height: 94vh;
    border-radius: 16px 16px 0 0;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

export const TitleBlock = styled.div`
  min-width: 0;
  flex: 1;
`;

export const PlanTitle = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.25;
  color: var(--text-primary, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const PlanMeta = styled.p`
  margin: 0.2rem 0 0;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.76rem;
`;

/** Status pill. Deliberately NOT a control — the client reads it, the trainer sets it. */
export const StatusPill = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.4rem;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent)'
    : 'color-mix(in srgb, var(--text-secondary, #9FB6C8) 32%, transparent)')};
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
    : 'transparent')};
  color: ${({ $active }) => ($active
    ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-secondary, #9FB6C8)')};
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

/** The ONE scroll owner in this dialog — no nested scroll mazes. */
export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 1rem 1rem;
`;

export const WeekBlock = styled.section<{ $current?: boolean }>`
  margin-bottom: 0.85rem;
  border-radius: 12px;
  border: 1px solid ${({ $current }) => ($current
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)')};
  background: ${({ $current }) => ($current
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent)'
    : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 35%, transparent)')};
  overflow: hidden;
`;

export const WeekHeader = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.8rem;
  border: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  text-align: left;
  cursor: pointer;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: -2px;
  }
`;

export const WeekFocus = styled.span`
  margin-left: auto;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.72rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 45%;
`;

/** "You are here" — the single most important signal in this modal. */
export const HereBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const DayList = styled.div`
  padding: 0 0.8rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const DayCard = styled.div<{ $current?: boolean }>`
  border-radius: 10px;
  border: 1px solid ${({ $current }) => ($current
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent)'
    : 'color-mix(in srgb, var(--text-secondary, #9FB6C8) 16%, transparent)')};
  background: color-mix(in srgb, var(--bg-elevated, #141419) 62%, transparent);
  padding: 0.55rem 0.7rem;
`;

export const DayTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 0.35rem;
  flex-wrap: wrap;
`;

export const ExerciseRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.28rem 0;
  border-top: 1px solid color-mix(in srgb, var(--text-secondary, #9FB6C8) 10%, transparent);
  font-size: 0.78rem;

  &:first-of-type { border-top: 0; }

  span:first-child {
    flex: 1;
    min-width: 0;
    color: var(--text-primary, #E0ECF4);
    overflow-wrap: anywhere;
  }
`;

export const ExerciseMeta = styled.span`
  color: var(--text-secondary, #9FB6C8);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  white-space: nowrap;
`;

const centered = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  padding: 2.5rem 1.5rem;
  min-height: 30vh;
`;

export const LoadingState = styled.div`
  ${centered};
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.82rem;

  svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { svg { animation: none; } }
`;

export const EmptyState = styled.div`
  ${centered};
  color: var(--text-primary, #E0ECF4);
  font-size: 0.86rem;

  svg { color: var(--accent-primary, #60C0F0); }
  span { color: var(--text-secondary, #9FB6C8); font-size: 0.78rem; }
`;

export const ErrorState = styled.div`
  ${centered};
  color: var(--text-primary, #E0ECF4);
  font-size: 0.84rem;

  svg { color: var(--accent-warn, #C6A84B); }
  span { color: var(--text-secondary, #9FB6C8); font-size: 0.78rem; }
`;

export const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`;

export const FooterNote = styled.span`
  margin-right: auto;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.72rem;

  @media (max-width: 480px) { margin-right: 0; text-align: center; }
`;

export const GhostButton = styled.button`
  min-height: 44px;
  padding: 0 1.1rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: transparent;
  color: var(--text-secondary, #9FB6C8);
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

/** Primary CTA — Dual-Button Glow: purple bg -> cyan glow. */
export const PrimaryButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 1.3rem;
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
  font-size: 0.84rem;
  cursor: pointer;
  transition: box-shadow 160ms ease, transform 120ms ease;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) { transform: none; }
  }
`;
