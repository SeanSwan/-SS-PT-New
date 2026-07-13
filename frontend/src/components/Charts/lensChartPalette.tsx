/**
 * COMPONENT: lensChartPalette (shared Lens v2 → Victory bridge)
 * OWNER: Charts
 * PURPOSE: One palette provider for every chart-bearing lens host. Victory
 * needs RESOLVED color strings (CSS var() is unsafe in SVG presentation
 * attributes), so the provider reads --world-accent from a host element
 * INSIDE the surface's lens frame (getComputedStyle) and re-resolves when
 * the committed lens changes. Without a provider — or with no recipe worn —
 * consumers fall back to the Swan palette: zero visual delta by construction.
 * Consumers: CanonicalProgressChartsGrid (seamed props) and the
 * /progress/detailed NASM charts (raw palette via useLensChartPalette).
 */
import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import {
  resolveLensChartPalette,
  SWAN_CHART_PALETTE,
  type LensChartPalette,
} from './chartTheme';
import { useOptionalStyleLensAppearance } from '../../core/style-lens-os/StyleLensProvider';

const LensChartPaletteContext = createContext<LensChartPalette>(SWAN_CHART_PALETTE);

interface LensChartPaletteProviderProps {
  children: React.ReactNode;
}

/** Wraps a chart region; the wrapper div is the token-resolution host. */
export const LensChartPaletteProvider: React.FC<LensChartPaletteProviderProps> = ({ children }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [palette, setPalette] = useState<LensChartPalette>(SWAN_CHART_PALETTE);
  const appearance = useOptionalStyleLensAppearance();
  const committedLensId = appearance?.state.committed.styleLensId;

  useLayoutEffect(() => {
    const next = resolveLensChartPalette(hostRef.current);
    // Identity bail-out: no pre-paint re-render of the chart cards when the
    // resolved palette equals the current one (the no-lens common case).
    setPalette(previous => (
      previous.primary === next.primary && previous.secondary === next.secondary
        ? previous
        : next
    ));
  }, [committedLensId]);

  return (
    <div ref={hostRef} style={{ display: 'contents' }}>
      <LensChartPaletteContext.Provider value={palette}>
        {children}
      </LensChartPaletteContext.Provider>
    </div>
  );
};

/** The resolved lens chart palette (Swan by default, always populated). */
export const useLensChartPalette = (): LensChartPalette => useContext(LensChartPaletteContext);
