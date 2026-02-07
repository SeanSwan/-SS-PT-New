/**
 * useResponsiveLayout Hook
 * ========================
 * Auto-detects optimal layout mode based on screen width.
 * Returns suggested layout, max trainer columns, and device class.
 *
 * Based on industry research:
 * - Phone (<768px): Stacked layout (MindBody/Glofox mobile pattern)
 * - Tablet (768-1024px): Columns with max 5 (Vagaro tablet limit)
 * - Desktop (1024-1280px): Columns with max 8
 * - Wide (1280px+): Columns with max 12
 */

import { useState, useEffect, useCallback } from 'react';
import type { LayoutMode, DensityMode } from '../types';

interface ResponsiveLayoutResult {
  /** Suggested layout mode based on screen width */
  suggestedLayout: LayoutMode;
  /** Suggested density based on screen width */
  suggestedDensity: DensityMode;
  /** Maximum trainer columns that fit the screen */
  maxColumns: number;
  /** Whether the device is phone-sized */
  isMobile: boolean;
  /** Whether the device is tablet-sized */
  isTablet: boolean;
  /** Whether the device is desktop-sized */
  isDesktop: boolean;
  /** Current viewport width */
  viewportWidth: number;
}

// Breakpoints aligned with Galaxy-Swan theme
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export function useResponsiveLayout(): ResponsiveLayoutResult {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  const handleResize = useCallback(() => {
    setViewportWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const isMobile = viewportWidth < BREAKPOINTS.mobile;
  const isTablet = viewportWidth >= BREAKPOINTS.mobile && viewportWidth < BREAKPOINTS.tablet;
  const isDesktop = viewportWidth >= BREAKPOINTS.tablet;

  // Auto-suggest layout based on screen width
  const suggestedLayout: LayoutMode = isMobile ? 'stacked' : 'columns';

  // Auto-suggest density based on screen width
  const suggestedDensity: DensityMode = isMobile ? 'compact' : 'comfortable';

  // Device-based column limits (Vagaro pattern: 7/15/25 adapted to our UI)
  const maxColumns = isMobile ? 1 : isTablet ? 5 : viewportWidth < BREAKPOINTS.desktop ? 8 : 12;

  return {
    suggestedLayout,
    suggestedDensity,
    maxColumns,
    isMobile,
    isTablet,
    isDesktop,
    viewportWidth,
  };
}

export default useResponsiveLayout;
