/**
 * WorkoutLogger Crystalline Swan Color Palette
 * Shared across all WorkoutLogger sub-components
 */
import { keyframes } from 'styled-components';

export const CS = {
  bg: '#002060',             // Midnight Sapphire
  surface: '#003080',         // Royal Depth
  card: 'rgba(0, 32, 96, 0.75)',  // Glass
  cardSolid: '#00275a',
  accent: '#C6A84B',          // Gilded Fern (luxury)
  gaming: '#60C0F0',          // Ice Wing
  glow: '#50A0F0',            // Arctic Cyan — GLOW ACCENT
  glowLight: '#7CB8F4',       // Arctic Cyan Light (WCAG AA on dark)
  secondary: '#8B5CF6',       // Wing Purple — secondary accent
  secondaryLight: '#A78BFA',  // Wing Purple Light
  tertiary: '#4070C0',        // Swan Lavender
  text: '#E0ECF4',            // Frost White
  textSecondary: '#c8d6e5',
  border: 'rgba(80, 160, 240, 0.2)',
  borderSolid: '#4a6382',
  glassBorder: 'rgba(80, 160, 240, 0.15)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  inputBg: 'rgba(0, 48, 128, 0.5)',
};

export const stellarGlow = keyframes`
  0% { box-shadow: 0 0 8px rgba(80, 160, 240, 0.2), 0 0 0 rgba(96, 192, 240, 0); }
  50% { box-shadow: 0 0 24px rgba(80, 160, 240, 0.5), 0 0 48px rgba(96, 192, 240, 0.1); }
  100% { box-shadow: 0 0 8px rgba(80, 160, 240, 0.2), 0 0 0 rgba(96, 192, 240, 0); }
`;

export const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const crystallinePulse = keyframes`
  0% { opacity: 0.03; }
  50% { opacity: 0.08; }
  100% { opacity: 0.03; }
`;
