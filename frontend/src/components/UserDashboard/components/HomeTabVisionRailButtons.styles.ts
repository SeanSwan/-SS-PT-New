/**
 * FILE: HomeTabVisionRailButtons.styles.ts
 * PURPOSE: Interactive row controls for Home right-rail widgets.
 */
import styled from 'styled-components';

export const ActivityItem = styled.button`
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  width: 100%;
  min-height: 44px;
  min-width: 0;
  padding: 0.45rem;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
    background: color-mix(in srgb, var(--surface-elevated, #003080) 22%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const TrendingRow = styled.button`
  display: grid;
  grid-template-columns: 2.05rem minmax(0, 1fr) max-content;
  gap: 0.68rem;
  align-items: center;
  width: 100%;
  min-height: 54px;
  padding: 0.68rem 0.72rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated, #003080) 34%, transparent), color-mix(in srgb, var(--bg-surface, #141419) 74%, transparent));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent), 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
