/**
 * ============================================================================
 * FILE: CoachAnimations.ts
 * PURPOSE: Shared keyframe animations for the Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent); }
  70% { box-shadow: 0 0 0 14px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

export const bounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
`;
