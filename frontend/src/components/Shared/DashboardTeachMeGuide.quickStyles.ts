/**
 * Quick-strip styles for DashboardTeachMeGuide.
 * Keeps the collapsed Teach Me command surface compact on phone widths.
 */

import styled, { css } from 'styled-components';

const quickActionControlStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  min-width: 44px;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid var(--dashboard-teach-action-border, rgba(96, 192, 240, 0.2));
  background: var(--dashboard-teach-action-bg, rgba(96, 192, 240, 0.08));
  color: var(--text-primary, #E0ECF4);
  font: 800 12px/1.2 'Sora', sans-serif;
  text-decoration: none;
  cursor: pointer;
  overflow-wrap: anywhere;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;

  svg {
    color: var(--accent-primary, #60C0F0);
    flex: 0 0 auto;
  }

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: var(--dashboard-teach-action-hover-bg, rgba(96, 192, 240, 0.14));
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 620px) {
    padding: 9px 10px;
    font: 800 11px/1.25 'Sora', sans-serif;
  }
`;

export const GuideQuickStrip = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 0.75fr) minmax(280px, 1.45fr) auto;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid var(--dashboard-teach-quick-border, rgba(96, 192, 240, 0.2));
  border-radius: 8px;
  background:
    linear-gradient(135deg,
      var(--dashboard-teach-quick-bg, rgba(96, 192, 240, 0.08)),
      var(--dashboard-teach-quick-bg-2, rgba(139, 92, 246, 0.08)));

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 620px) {
    gap: 8px;
    margin-bottom: 6px;
    padding: 8px;
  }
`;

export const QuickIntro = styled.div`
  display: grid;
  align-content: center;
  min-width: 0;
`;

export const QuickEyebrow = styled.span`
  display: block;
  color: var(--accent-primary, #60C0F0);
  font: 800 10px/1.2 'Sora', sans-serif;
  text-transform: uppercase;
`;

export const QuickTitle = styled.strong`
  display: block;
  margin-top: 3px;
  color: var(--text-primary, #E0ECF4);
  font: 800 14px/1.25 'Plus Jakarta Sans', sans-serif;
  overflow-wrap: anywhere;
`;

export const QuickPathPreview = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    align-items: center;
    gap: 7px;
    min-height: 44px;
    padding: 8px 9px;
    border-radius: 8px;
    border: 1px solid var(--dashboard-teach-step-border, rgba(198, 168, 75, 0.2));
    background: var(--dashboard-teach-step-bg, rgba(198, 168, 75, 0.07));
    color: var(--text-secondary, rgba(224, 236, 244, 0.78));
    font: 700 11px/1.3 'Sora', sans-serif;
  }

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    color: var(--bg-base, #030712);
    background: var(--accent-gold, #C6A84B);
    font: 900 11px/1 'Sora', sans-serif;
  }

  @media (max-width: 620px) {
    display: none;
  }
`;

export const QuickActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-content: center;
  gap: 8px;

  @media (max-width: 980px) {
    justify-content: stretch;

    > * {
      flex: 1 1 180px;
    }
  }

  @media (max-width: 620px) {
    gap: 6px;

    > * {
      flex: 1 1 100%;
      min-width: 0;
    }
  }
`;

export const QuickPrimaryButton = styled.button`
  ${quickActionControlStyles}
  border-color: var(--accent-primary, #60C0F0);
  background: var(--dashboard-teach-first-action-bg, rgba(96, 192, 240, 0.16));
`;

export const QuickPrimaryAnchor = styled.a`
  ${quickActionControlStyles}
  border-color: var(--accent-primary, #60C0F0);
  background: var(--dashboard-teach-first-action-bg, rgba(96, 192, 240, 0.16));
`;

export const QuickCoachButton = styled.button`
  ${quickActionControlStyles}
  border-color: var(--accent-secondary, #8B5CF6);
  background: var(--dashboard-teach-coach-bg, rgba(139, 92, 246, 0.12));

  svg {
    color: var(--accent-secondary, #8B5CF6);
  }
`;
