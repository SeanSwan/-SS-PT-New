/**
 * ============================================================================
 * FILE: BootcampRunnerClock.styles.ts
 * PURPOSE: 20-foot-legible live clock and station cue band.
 * MOTION: Progress transform only; no ambient animation.
 * ============================================================================
 */
import styled from 'styled-components';
import type { BootcampRunnerPhase } from './BootcampRunner.logic';
export const ClockShell = styled.section`
  margin-bottom: 16px;
  padding: clamp(14px, 2vw, 24px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: var(--world-panel-radius, 18px);
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--surface-elevated, #003080) 58%, transparent), transparent 62%),
    var(--bg-base, #0A0A0F);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
  @media (max-width: 430px) {
    margin-bottom: 10px;
    padding: 12px;
    border-radius: 12px;
  }
  @media (prefers-reduced-motion: reduce) {
    &, & * {
      animation: none !important;
      scroll-behavior: auto !important;
      transition: none !important;
    }
  }
`;
export const ClockHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  @media (max-width: 680px) {
    flex-direction: column;
    gap: 8px;
  }
`;
export const ClockLabel = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: clamp(0.75rem, 1vw, 1rem);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;
export const ClockCue = styled.h2`
  margin: 4px 0 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.35rem, 2.5vw, 2.75rem);
  line-height: 1.08;
`;
export const ClockEnds = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  span {
    padding: 6px 9px;
    border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-card, #141419) 82%, transparent);
  }
  strong {
    color: var(--text-primary, #E0ECF4);
  }
  @media (max-width: 680px) {
    justify-content: flex-start;
  }
`;
export const SlipBadge = styled.em`
  margin-left: 6px;
  color: var(--danger, #E5484D);
  font-style: normal;
  font-weight: 800;
`;
export const ClockBand = styled.div<{ $phase: BootcampRunnerPhase }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(16px, 4vw, 48px);
  padding: clamp(14px, 2vw, 24px);
  border: 1px solid ${({ $phase }) => {
    if ($phase === 'rest') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 52%, transparent)';
    if ($phase === 'transition') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 58%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent)';
  }};
  border-radius: 16px;
  background: ${({ $phase }) => {
    if ($phase === 'rest') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, var(--bg-base, #0A0A0F))';
    if ($phase === 'transition') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, var(--bg-base, #0A0A0F))';
    return 'color-mix(in srgb, var(--primary, #002060) 62%, var(--bg-base, #0A0A0F))';
  }};
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
export const ClockFace = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: clamp(4.5rem, 12vw, 11rem);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: -0.08em;
  line-height: 0.86;
  text-shadow: 0 0 34px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  @media (max-width: 430px) {
    font-size: clamp(4rem, 24vw, 7rem);
  }
`;
export const ClockActions = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(76px, 1fr));
  gap: 8px;
  @media (max-width: 430px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;
export const ClockAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 56px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 62%, transparent);
  border-radius: 12px;
  background: var(--primary, #002060);
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  &:focus-visible {
    outline: 3px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 3px;
  }
  &:disabled {
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.42;
  }
  @media (max-width: 430px) {
    min-height: 52px;
    padding: 8px 5px;
    span { display: none; }
  }
`;
export const ClockProgress = styled.div`
  height: 8px;
  margin: 12px 2px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;
export const ClockProgressFill = styled.div<{ $progress: number }>`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  transform: scaleX(${({ $progress }) => Math.max(0, Math.min(1, $progress))});
  transform-origin: left center;
`;
export const StationCueGrid = styled.div<{ $compact: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) => $compact
    ? 'repeat(auto-fit, minmax(150px, 1fr))'
    : 'repeat(auto-fit, minmax(210px, 1fr))'};
  gap: 8px;
  @media (max-width: 430px) {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
`;
export const StationCue = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-height: 58px;
  padding: 9px 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 11px;
  background: color-mix(in srgb, var(--surface-card, #141419) 84%, transparent);
  span {
    color: var(--accent-primary, #60C0F0);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    font-weight: 800;
  }
  strong {
    overflow: hidden;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(0.85rem, 1.2vw, 1.1rem);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (min-width: 2200px) {
    min-height: 72px;
    padding: 12px 16px;
  }
`;
export const NextCue = styled.div`
  margin-top: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;
