/**
 * COMPONENT: WorkoutDayDrilldown.styles
 * OWNER: Client Dashboard / Progress (Slice 8.4 — chart drill-down)
 * PURPOSE: Crystalline Swan modal styling for the exact-workout view.
 */

import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* 2200 matches the PostMediaLightbox house precedent for full-screen
     dialogs: it must clear the fixed header (--z-header: 1250), dropdowns
     (1260), and toasts (1300). 1200 shipped the header ON TOP of this
     dialog — caught in the post-deploy hostile review 2026-07-02. */
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Panel = styled.div`
  width: min(100%, 460px);
  max-height: min(80vh, 640px);
  overflow-y: auto;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--surface-primary, #002060) 55%, var(--bg-elevated, #141419)),
    var(--bg-elevated, #141419) 70%);
  padding: 1.25rem;
  animation: ${slideUp} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

export const PanelTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
`;

export const PanelSub = styled.span`
  display: block;
  margin-top: 0.2rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

export const CloseButton = styled.button`
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover {
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

/** Same 44px chrome as CloseButton; sits beside it for the session-PDF export. */
export const PdfExportButton = styled(CloseButton)`
  color: var(--text-secondary, #9FB6C8);

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

export const SessionBlock = styled.div`
  padding: 0.85rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);

  & + & { margin-top: 0.75rem; }
`;

export const SessionMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const ExerciseName = styled.div`
  margin: 0.5rem 0 0.25rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
`;

export const SetRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.2rem 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
`;

export const SetIndex = styled.span`
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent);
  font-size: 0.68rem;
  min-width: 3.2ch;
`;

export const DayHeading = styled.h4`
  margin: 0.85rem 0 0.4rem;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  &:first-of-type { margin-top: 0; }
`;

export const StateNote = styled.p`
  margin: 0;
  padding: 1rem 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent);
  font-size: 0.85rem;
  text-align: center;
`;

export const DrillSkeleton = styled.div`
  height: 120px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
`;
