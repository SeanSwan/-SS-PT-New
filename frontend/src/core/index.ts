/**
 * core/index.ts
 * Clean exports for SwanStudios Core Design System
 */

// Main components
export { default as TheAestheticCodex } from './TheAestheticCodex';

// Theme system
export { default as swanStudiosTheme, galaxySwanTheme, themeUtils, mediaQueries, animationConfig } from './theme';
export type { SwanStudiosTheme, TypographyVariant, SpacingSize, BreakpointSize } from './theme';

// Individual theme systems for direct import
export { typography, spacing, breakpoints } from './theme';