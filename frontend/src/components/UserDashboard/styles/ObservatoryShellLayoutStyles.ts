/*
 * ============================================================================
 * STYLES: ObservatoryShellLayoutStyles
 * PURPOSE: Phase 19B Observatory shell - outer 3-column grid + glass panel
 *          chrome. Pure layout. No left-rail, right-rail, or mobile-nav
 *          specifics live here.
 * OWNER:   Claude Opus 4.7
 * UPDATED: 2026-04-29
 * ----------------------------------------------------------------------------
 * Token-driven (var(--token, #fallback)) per Rule 6.
 * Reduced-motion respected per Rule 25.
 * No retired Galaxy palette tokens.
 * Split from ObservatoryShellStyles.ts to satisfy Rule 4 300-line cap.
 * ============================================================================
 */

import styled from 'styled-components';

export const ObservatoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  width: 100%;
  contain: layout;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
    gap: 1.25rem;
  }

  @media (min-width: 1440px) {
    grid-template-columns: minmax(220px, 240px) minmax(560px, 1fr) minmax(260px, 280px);
    gap: 1.25rem;
  }
`;

export const ObservatoryLeftRail = styled.aside`
  display: none;

  @media (min-width: 1024px) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 1rem;
    align-self: start;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    contain: layout;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
      border-radius: 3px;
    }
  }
`;

export const ObservatoryMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
`;

export const ObservatoryRightRail = styled.aside`
  display: none;

  @media (min-width: 1440px) {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 1rem;
    align-self: start;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    contain: layout;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
      background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
      border-radius: 3px;
    }
  }
`;

export const ObservatoryGlassPanel = styled.div`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 16px;
  padding: 1rem 1.125rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  contain: paint;
  transition: border-color 0.25s ease, transform 0.25s ease;

  @supports not (backdrop-filter: blur(12px)) {
    background: var(--bg-elevated, #141419);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  }
`;

export const ObservatoryPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
`;

export const ObservatoryPanelTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0;
`;
