/**
 * responsive.ts
 * =============
 * Shared responsive helpers for mobile-first development.
 * Uses the 10-breakpoint system from CLAUDE.md:
 * 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px, 3840px
 *
 * Import these helpers in styled-components instead of hardcoding @media queries.
 */
import { size, device } from './breakpoints';

// Extended sizes for the full 10-breakpoint matrix
export const fullSize = {
  xxs: '320px',   // iPhone SE, smallest supported
  xs: size.xs,     // 375px — standard phones
  phone: '430px',  // 430px — iPhone Pro Max / large phones
  md: size.md,     // 768px — tablets
  lg: size.lg,     // 1024px — laptops
  xl: size.xl,     // 1280px — desktops
  xxl: size.xxl,   // 1440px — wide screens
  xxxl: size.xxxl, // 1920px — full HD
  qhd: '2560px',  // 2560px — QHD monitors
  uhd: '3840px',  // 3840px — 4K UHD
};

// Mobile-first min-width queries
export const mobile = {
  xxs: `@media (min-width: ${fullSize.xxs})`,
  xs: `@media (min-width: ${fullSize.xs})`,
  phone: `@media (min-width: ${fullSize.phone})`,
  md: device.md,
  lg: device.lg,
};

// Max-width queries for targeting specific small screens
export const maxWidth = {
  xxs: `@media (max-width: ${fullSize.xxs})`,
  xs: `@media (max-width: ${fullSize.xs})`,
  phone: `@media (max-width: ${fullSize.phone})`,
  md: device.maxMd,
  lg: device.maxLg,
};

// Desktop-first queries
export const desktop = {
  lg: device.lg,
  xl: device.xl,
  xxl: device.xxl,
  xxxl: device.xxxl,
  qhd: `@media (min-width: ${fullSize.qhd})`,
  uhd: `@media (min-width: ${fullSize.uhd})`,
};

// Touch target minimum (44px per CLAUDE.md)
export const TOUCH_TARGET_MIN = '44px';

// Scrollable pill strip mixin for mobile tabs
export const scrollablePillStrip = `
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

// Pill button mixin for mobile tabs
export const pillButton = `
  flex-shrink: 0;
  white-space: nowrap;
  scroll-snap-align: start;
  border-radius: 18px;
  min-height: ${TOUCH_TARGET_MIN};
  min-width: ${TOUCH_TARGET_MIN};
`;

export { size, device } from './breakpoints';
