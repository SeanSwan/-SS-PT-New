/**
 * PlaudMergeReviewStatusRibbon.styles.ts
 * ======================================
 * Compact orientation ribbon for the active PLAUD merge review panel.
 */
import styled from 'styled-components';

export const MergeStatusRibbon = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 1.1fr 1fr 1fr;
  gap: 8px;
  margin: 0 0 12px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent),
      color-mix(in srgb, var(--glow-accent, #8B5CF6) 8%, transparent)
    ),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const MergeStatusCell = styled.div`
  min-width: 0;
  padding: 7px 8px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--bg-base, #030712) 48%, transparent);
`;

export const MergeStatusLabel = styled.span`
  display: block;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  line-height: 1.25;
  text-transform: uppercase;
`;

export const MergeStatusValue = styled.strong`
  display: block;
  margin-top: 2px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.35;
  letter-spacing: 0;
`;

export const MergeStatusAction = styled.button`
  min-height: 44px;
  margin-top: 6px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;
