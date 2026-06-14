/**
 * Shared styles for DashboardTeachMeGuide.
 * Keeps the role-aware guide component under the 300-line file cap while
 * preserving one action-first responsive layout across dashboard shells.
 */

import styled, { css } from 'styled-components';

export const GuideShell = styled.section`
  width: min(100%, 1180px);
  margin: 0 auto 18px;
  padding: 0 clamp(12px, 2vw, 22px);
  box-sizing: border-box;

  @media (max-width: 768px) {
    margin-bottom: 14px;
    padding: 0 10px;
  }
`;

export const GuideContent = styled.div`
  display: grid;
  gap: 12px;
`;

export const GuideKicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid var(--dashboard-teach-kicker-border, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  background: var(--dashboard-teach-kicker-bg, rgba(96, 192, 240, 0.08));
  font: 700 11px/1.2 'Sora', sans-serif;
  text-transform: uppercase;
`;

export const GuideSummary = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 700 15px/1.55 'Plus Jakarta Sans', sans-serif;
`;

export const FirstMovePanel = styled.div`
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) minmax(0, 1.2fr);
  gap: 10px;
  align-items: stretch;
  padding: 12px;
  border: 1px solid var(--dashboard-teach-first-border, rgba(96, 192, 240, 0.24));
  border-radius: 8px;
  background: var(--dashboard-teach-first-bg, rgba(96, 192, 240, 0.07));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const FirstMoveHeader = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font: 800 11px/1.2 'Sora', sans-serif;
  text-transform: uppercase;

  strong {
    color: var(--accent-gold, #C6A84B);
  }
`;

export const FocusCallout = styled.div`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid var(--dashboard-teach-focus-border, rgba(198, 168, 75, 0.22));
  border-radius: 8px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  background: var(--dashboard-teach-focus-bg, rgba(198, 168, 75, 0.08));

  svg {
    color: var(--accent-gold, #C6A84B);
    margin-top: 2px;
  }
`;

export const ActionRail = styled.nav`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const actionControlStyles = css`
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
`;

export const ActionButton = styled.button`
  ${actionControlStyles}
`;

export const ActionAnchor = styled.a`
  ${actionControlStyles}
`;

export const FirstMoveButton = styled.button`
  ${actionControlStyles}
  justify-content: center;
  min-height: 52px;
  border-color: var(--accent-primary, #60C0F0);
  background: var(--dashboard-teach-first-action-bg, rgba(96, 192, 240, 0.16));
  font-size: 13px;
`;

export const FirstMoveAnchor = styled.a`
  ${actionControlStyles}
  justify-content: center;
  min-height: 52px;
  border-color: var(--accent-primary, #60C0F0);
  background: var(--dashboard-teach-first-action-bg, rgba(96, 192, 240, 0.16));
  font-size: 13px;
`;

export const FastPathList = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    min-height: 44px;
    padding: 9px 10px;
    border-radius: 8px;
    border: 1px solid var(--dashboard-teach-step-border, rgba(198, 168, 75, 0.2));
    color: var(--text-secondary, rgba(224, 236, 244, 0.78));
    background: var(--dashboard-teach-step-bg, rgba(198, 168, 75, 0.07));
    font: 700 12px/1.35 'Sora', sans-serif;
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

export const GuideSteps = styled.ol`
  display: grid;
  gap: 9px;
  margin: 0;
  padding-left: 20px;

  li {
    color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  }

  li::marker {
    color: var(--accent-primary, #60C0F0);
    font-weight: 800;
  }
`;

export const GuardrailNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--dashboard-teach-guard-border, rgba(139, 92, 246, 0.22));
  background: var(--dashboard-teach-guard-bg, rgba(139, 92, 246, 0.08));
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font: 700 12px/1.3 'Sora', sans-serif;

  svg {
    color: var(--accent-secondary, #8B5CF6);
    flex: 0 0 auto;
  }

  @media (max-width: 480px) {
    align-items: flex-start;
    width: 100%;
  }
`;
