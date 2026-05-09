/**
 * Motion primitives for the canonical UserDashboard V3 surface.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import { keyframes } from 'styled-components';

export const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const subtleGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent), 0 8px 32px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 0 30px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent), 0 12px 40px rgba(0, 0, 0, 0.15);
  }
`;

export const pulseScale = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// SECTION: V3 Enhancement Overlays
// PURPOSE: Cinematic noise overlay and z-index wrapper
