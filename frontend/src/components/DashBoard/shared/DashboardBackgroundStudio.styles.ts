/**
 * FILE: DashboardBackgroundStudio.styles.ts
 * PURPOSE: Token-driven shell and collapsible controls styling for dashboard backgrounds.
 * PARENT: DashboardBackgroundStudio.tsx.
 */

import styled from 'styled-components';

export const DashboardBackgroundSurfaceFrame = styled.section`
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 100%;
  overflow: visible;
  background: var(--user-dashboard-bg-base, var(--bg-base, #030712));
  background-size: var(--user-dashboard-bg-base-size, auto);
  background-position: var(--user-dashboard-bg-base-position, center);
  background-repeat: var(--user-dashboard-bg-base-repeat, no-repeat);
  color: var(--text-primary, #E0ECF4);

  &::before,
  &::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  &::before {
    background:
      var(--user-dashboard-bg-art, transparent),
      var(--user-dashboard-bg-base, var(--bg-base, #030712));
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }

  &::after {
    background-image: var(--user-dashboard-bg-mark-image, none);
    background-position: var(--user-dashboard-bg-mark-position, center);
    background-size: var(--user-dashboard-bg-mark-size, min(68vw, 900px));
    background-repeat: no-repeat;
    opacity: var(--user-dashboard-bg-mark-opacity, 0.06);
    filter: blur(var(--user-dashboard-bg-mark-blur, 0px)) saturate(1.15);
    mix-blend-mode: screen;
  }
`;

export const DashboardBackgroundSurfaceContent = styled.div`
  position: relative;
  z-index: 1;
`;

export const DashboardBackgroundSettingsDetails = styled.details`
  position: relative;
  width: min(100%, 430px);
  margin-bottom: 0;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 10px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-primary, #003080) 24%, transparent), transparent 68%),
    color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent);
  box-shadow: 0 18px 42px color-mix(in srgb, var(--bg-base, #030712) 30%, transparent);
  overflow: visible;

  &[open] {
    z-index: 60;
  }
`;

export const DashboardBackgroundSettingsSummary = styled.summary`
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0.75rem 0.95rem;
  cursor: pointer;
  list-style: none;
  color: var(--text-primary, #E0ECF4);

  &::-webkit-details-marker { display: none; }
  &::marker { display: none; }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: -4px;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const DashboardBackgroundSummaryMain = styled.span`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }

  .background-summary-copy {
    min-width: 0;
  }

  .background-summary-copy > span {
    display: block;
    margin-bottom: 3px;
    font-family: 'Fira Code', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-primary, #60C0F0);
  }

  .background-summary-copy > strong {
    display: block;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 0.96rem;
    line-height: 1.25;
    color: var(--text-primary, #E0ECF4);
  }
`;

export const DashboardBackgroundSummaryMeta = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 0.68rem;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);

  svg {
    transition: transform 0.2s ease;
  }

  details[open] & svg {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    svg { transition: none; }
  }
`;

export const DashboardBackgroundSettingsBody = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(760px, calc(100vw - 48px));
  max-height: min(68vh, 720px);
  padding: 1rem;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 12px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-primary, #003080) 24%, transparent), transparent 68%),
    color-mix(in srgb, var(--bg-base, #030712) 94%, transparent);
  box-shadow: 0 24px 70px color-mix(in srgb, var(--bg-base, #030712) 58%, transparent);
  backdrop-filter: blur(14px);

  @media (max-width: 760px) {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    max-height: 70vh;
    margin-top: 8px;
  }
`;
