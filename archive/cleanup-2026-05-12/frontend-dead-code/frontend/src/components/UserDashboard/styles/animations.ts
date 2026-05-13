/**
 * ============================================================================
 * FILE: animations.ts
 * PURPOSE: Shared keyframe animations for UserDashboard components
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all CSS keyframe animations used across the
 * UserDashboard component tree. GPU-composited (transform/opacity only).
 * HOW IT FITS IN THE APP: Imported by UserDashboardStyles.ts and sub-components
 * KEY DECISIONS: Extracted to prevent duplication across styled-component files
 */

import { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Entry Animations
// PURPOSE: Slide-in and fade-in effects for initial render
// ─────────────────────────────────────────────────────────────

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

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Ambient Animations
// PURPOSE: Subtle continuous animations for premium feel
// ─────────────────────────────────────────────────────────────

export const subtleGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1), 0 8px 32px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2), 0 12px 40px rgba(0, 0, 0, 0.15);
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
