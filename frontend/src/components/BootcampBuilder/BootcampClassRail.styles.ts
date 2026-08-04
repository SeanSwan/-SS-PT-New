/**
 * ============================================================================
 * FILE: BootcampClassRail.styles.ts
 * PURPOSE: C12 Crystalline operator rail for Build, Preflight, and Run.
 * MOTION: Response-only; no ambient loops; reduced-motion safe.
 * ============================================================================
 */
import styled, { css } from 'styled-components';
export const RailShell = styled.section`
  position: relative;
  margin: 0 0 16px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  border-radius: var(--world-panel-radius, 16px);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated, #003080) 72%, transparent), var(--bg-base, #0A0A0F)),
    var(--bg-base, #0A0A0F);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent),
    0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(
      180deg,
      var(--accent-primary, #60C0F0),
      var(--accent-secondary, #8B5CF6),
      var(--accent-gold, #C6A84B)
    );
  }
  @media (max-width: 430px) {
    margin-bottom: 10px;
    padding: 12px 10px 12px 13px;
    border-radius: 12px;
  }
  @media (min-width: 2200px) {
    padding: 22px 24px;
    border-radius: 20px;
  }
  @media (prefers-reduced-motion: reduce) {
    &, & * {
      animation: none !important;
      scroll-behavior: auto !important;
      transition: none !important;
    }
  }
`;
export const RailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  &:last-child { margin-bottom: 0; }
  @media (max-width: 680px) {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
`;
export const RailKicker = styled.div`
  margin-bottom: 3px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  @media (min-width: 2200px) {
    font-size: 13px;
  }
`;
export const RailStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  svg {
    color: var(--success, #10B981);
  }
  @media (min-width: 2200px) {
    font-size: 18px;
  }
`;
export const PrimaryAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-width: 190px;
  min-height: 48px;
  padding: 10px 18px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 72%, var(--text-primary, #E0ECF4));
  border-radius: 12px;
  background: var(--primary, #002060);
  box-shadow: 0 0 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 800;
  &:focus-visible {
    outline: 3px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 3px;
  }
  &:disabled {
    border-color: var(--border-soft, rgba(96, 192, 240, 0.18));
    background: color-mix(in srgb, var(--surface-card, #141419) 82%, transparent);
    box-shadow: none;
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    cursor: not-allowed;
  }
  @media (max-width: 680px) {
    width: 100%;
  }
  @media (min-width: 2200px) {
    min-height: 56px;
    font-size: 16px;
  }
`;
export const RailBody = styled.div`
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(420px, 1.1fr);
  gap: 14px;
  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;
export const StageRail = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  @media (max-width: 430px) {
    gap: 5px;
  }
`;
export const StageButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 70%, transparent)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.16))'};
  border-radius: 11px;
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--primary, #002060) 78%, transparent)'
    : 'color-mix(in srgb, var(--surface-card, #141419) 76%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  &:focus-visible {
    outline: 3px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
  @media (max-width: 430px) {
    justify-content: center;
    min-height: 48px;
    padding: 7px 5px;
  }
`;
export const StageIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  flex: 0 0 auto;
  color: ${({ $active }) => $active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.68))'};
`;
export const StageCopy = styled.span`
  display: grid;
  min-width: 0;
  span {
    overflow: hidden;
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 430px) {
    span {
      display: none;
    }
  }
`;
export const StageLabel = styled.strong`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  @media (min-width: 2200px) {
    font-size: 15px;
  }
`;
export const FactRail = styled.div<{ $compact: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) => $compact
    ? 'repeat(5, minmax(86px, 1fr))'
    : 'minmax(150px, 1.5fr) repeat(4, minmax(78px, 1fr))'};
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 11px;
  background: var(--border-soft, rgba(96, 192, 240, 0.16));
  > div {
    min-width: 0;
    padding: 9px 11px;
    background: color-mix(in srgb, var(--surface-card, #141419) 88%, transparent);
  }
  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    > div:first-child {
      grid-column: 1 / -1;
    }
  }
`;
export const FactLabel = styled.span`
  display: block;
  margin-bottom: 3px;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;
export const FactValue = styled.strong`
  display: block;
  overflow: hidden;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  @media (min-width: 2200px) {
    font-size: 14px;
  }
`;
export const IssueRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
`;
export const IssueChip = styled.span<{ $tone: 'blocker' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 9px;
  border: 1px solid ${({ $tone }) => $tone === 'blocker'
    ? 'color-mix(in srgb, var(--danger, #E5484D) 58%, transparent)'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 58%, transparent)'};
  border-radius: 999px;
  background: ${({ $tone }) => $tone === 'blocker'
    ? 'color-mix(in srgb, var(--danger, #E5484D) 10%, transparent)'
    : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  font-size: 11px;
  ${({ $tone }) => $tone === 'warning' && css`
    svg { color: var(--accent-gold, #C6A84B); }
  `}
  ${({ $tone }) => $tone === 'blocker' && css`
    svg { color: var(--danger, #E5484D); }
  `}
`;
