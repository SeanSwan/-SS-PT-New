/**
 * breakpoints.ts
 * =============
 * 
 * Standardized responsive breakpoints for consistent use throughout the application.
 * This helps ensure consistent responsive behavior across all components.
 */

// Device breakpoints (in pixels)
export const size = {
  xs: '375px',    // Extra small devices (phones)
  sm: '576px',    // Small devices (phones)
  md: '768px',    // Medium devices (tablets)
  lg: '1024px',   // Large devices (laptops/desktops)
  xl: '1280px',   // Extra large devices (large desktops)
  xxl: '1440px',  // Ultra large devices (wide screens)
  xxxl: '1920px'  // Extreme large devices (ultra-wide screens)
};

// Media query helper functions
export const device = {
  // Min-width queries (mobile-first approach)
  xs: `@media (min-width: ${size.xs})`,
  sm: `@media (min-width: ${size.sm})`,
  md: `@media (min-width: ${size.md})`,
  lg: `@media (min-width: ${size.lg})`,
  xl: `@media (min-width: ${size.xl})`,
  xxl: `@media (min-width: ${size.xxl})`,
  xxxl: `@media (min-width: ${size.xxxl})`,
  
  // Max-width queries (for specific overrides)
  maxXs: `@media (max-width: ${size.xs})`,
  maxSm: `@media (max-width: ${size.sm})`,
  maxMd: `@media (max-width: ${size.md})`,
  maxLg: `@media (max-width: ${size.lg})`,
  maxXl: `@media (max-width: ${size.xl})`,
  maxXxl: `@media (max-width: ${size.xxl})`,
  maxXxxl: `@media (max-width: ${size.xxxl})`,
  
  // Range queries (between two breakpoints)
  xsToSm: `@media (min-width: ${size.xs}) and (max-width: ${size.sm})`,
  smToMd: `@media (min-width: ${size.sm}) and (max-width: ${size.md})`,
  mdToLg: `@media (min-width: ${size.md}) and (max-width: ${size.lg})`,
  lgToXl: `@media (min-width: ${size.lg}) and (max-width: ${size.xl})`,
  xlToXxl: `@media (min-width: ${size.xl}) and (max-width: ${size.xxl})`,
  xxlToXxxl: `@media (min-width: ${size.xxl}) and (max-width: ${size.xxxl})`,
  
  // Special queries
  portrait: `@media (orientation: portrait)`,
  landscape: `@media (orientation: landscape)`,
  reducedMotion: `@media (prefers-reduced-motion: reduce)`,
  darkMode: `@media (prefers-color-scheme: dark)`,
  lightMode: `@media (prefers-color-scheme: light)`,
  highContrast: `@media (prefers-contrast: high)`,
  touch: `@media (hover: none) and (pointer: coarse)`,
  mouse: `@media (hover: hover) and (pointer: fine)`,
  tablet: `@media (min-width: ${size.md}) and (max-width: ${size.lg}) and (orientation: landscape), 
           (min-width: ${size.sm}) and (max-width: ${size.lg}) and (orientation: portrait)`,
  mobile: `@media (max-width: ${size.sm})`,
  desktop: `@media (min-width: ${size.lg})`
};

// Usage example with styled-components:
/*
import styled from 'styled-components';
import { device } from './breakpoints';

const ResponsiveComponent = styled.div`
  font-size: 1rem;
  
  ${device.sm} {
    font-size: 1.2rem;
  }
  
  ${device.md} {
    font-size: 1.4rem;
  }
  
  ${device.lg} {
    font-size: 1.6rem;
  }
  
  ${device.portrait} {
    padding: 10px;
  }
  
  ${device.landscape} {
    padding: 20px;
  }
`;
*/

// Function to generate responsive values based on viewport size
export const responsive = {
  /**
   * Generate a responsive property value with fluid scaling
   * @param prop - CSS property name
   * @param minSize - Minimum size (in px, rem, etc.)
   * @param maxSize - Maximum size (in px, rem, etc.)
   * @param minWidth - Viewport width where minimum size applies (default: 375px)
   * @param maxWidth - Viewport width where maximum size applies (default: 1440px)
   * @returns CSS property with fluid value
   * 
   * Example: ${responsive.fluid('font-size', '16px', '24px')}
   * Result: font-size: clamp(16px, calc(16px + (24 - 16) * ((100vw - 375px) / (1440 - 375))), 24px);
   */
  fluid: (
    prop: string, 
    minSize: string, 
    maxSize: string, 
    minWidth: string = '375px', 
    maxWidth: string = '1440px'
  ): string => {
    // Extract numeric values and units
    const minSizeValue = parseFloat(minSize);
    const maxSizeValue = parseFloat(maxSize);
    const minSizeUnit = minSize.replace(/[0-9.]/g, '');
    
    const minWidthValue = parseFloat(minWidth);
    const maxWidthValue = parseFloat(maxWidth);
    
    return `
      ${prop}: ${minSize};
      @media (min-width: ${minWidth}) {
        ${prop}: clamp(
          ${minSize}, 
          calc(${minSize} + (${maxSizeValue} - ${minSizeValue}) * ((100vw - ${minWidth}) / (${maxWidthValue} - ${minWidthValue}))), 
          ${maxSize}
        );
      }
      @media (min-width: ${maxWidth}) {
        ${prop}: ${maxSize};
      }
    `;
  },
  
  /**
   * Generate a responsive spacing value (margin, padding)
   * @param size - Base size in pixels
   * @returns Responsive spacing in clamp() function
   * 
   * Example: margin: ${responsive.space(16)};
   * Result: margin: clamp(10px, 2.5vw, 16px);
   */
  space: (size: number): string => {
    const min = Math.max(size * 0.625, 4); // Minimum 4px or 62.5% of original
    return `clamp(${min}px, ${size * 0.15625}vw, ${size}px)`;
  },
  
  /**
   * Generate a responsive font size with proper scaling
   * @param size - Base size in pixels
   * @returns Responsive font size in clamp() function
   * 
   * Example: font-size: ${responsive.fontSize(16)};
   * Result: font-size: clamp(14px, 1rem + 0.5vw, 16px);
   */
  fontSize: (size: number): string => {
    const min = Math.max(size * 0.875, 12); // Minimum 12px or 87.5% of original
    const vwScale = size * 0.03125; // 0.03125 = 1/32 (scales well across devices)
    return `clamp(${min}px, ${size * 0.0625}rem + ${vwScale}vw, ${size}px)`;
  }
};

export default device;