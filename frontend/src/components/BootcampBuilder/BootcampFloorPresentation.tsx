/**
 * BootcampFloorPresentation - full-screen presentation chrome for Demo Mode.
 * Keeps the opt-in body class local to Bootcamp floor mode.
 */
import React, { useEffect } from 'react';
import { createGlobalStyle } from 'styled-components';

const FLOOR_CLASS = 'swan-bootcamp-floor-active';

const BootcampFloorPresentationGlobalStyle = createGlobalStyle`
  body.${FLOOR_CLASS} {
    overflow: hidden;
    background: var(--bg-base, #0A0A0F);
  }

  body.${FLOOR_CLASS} [data-swan-app-header],
  body.${FLOOR_CLASS} [data-swan-theme-status],
  body.${FLOOR_CLASS} [data-swan-mobile-dashboard-safe-area],
  body.${FLOOR_CLASS} button[aria-label="Back to dashboard overview"],
  body.${FLOOR_CLASS} button[aria-label="Open admin menu"],
  body.${FLOOR_CLASS} button[aria-label="Open trainer menu"],
  body.${FLOOR_CLASS} button[aria-label="Open client menu"],
  body.${FLOOR_CLASS} aside {
    display: none !important;
  }

  body.${FLOOR_CLASS} [data-swan-app-content-wrapper] {
    margin-top: 0 !important;
    min-height: 100dvh !important;
  }

  body.${FLOOR_CLASS} main[data-dashboard-scroll-root] {
    margin-left: 0 !important;
    min-height: 100dvh !important;
    max-height: 100dvh;
    overflow: auto;
    padding: clamp(12px, 1.5vw, 40px) !important;
  }

  body.${FLOOR_CLASS} div[data-dashboard-scroll-root] {
    width: 100% !important;
    max-width: none !important;
  }
`;

interface BootcampFloorPresentationProps {
  active: boolean;
}

const BootcampFloorPresentation: React.FC<BootcampFloorPresentationProps> = ({ active }) => {
  useEffect(() => {
    document.body.classList.toggle(FLOOR_CLASS, active);
    return () => document.body.classList.remove(FLOOR_CLASS);
  }, [active]);

  return active ? <BootcampFloorPresentationGlobalStyle /> : null;
};

export default BootcampFloorPresentation;
