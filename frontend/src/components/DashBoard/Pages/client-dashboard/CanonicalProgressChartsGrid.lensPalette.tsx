/**
 * COMPONENT: CanonicalProgressChartsGrid.lensPalette
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Lens v2 → Victory bridge for the canonical progress grid.
 * Victory needs RESOLVED color strings, so the provider reads
 * --world-accent/--world-action from a host INSIDE the lens frame
 * (getComputedStyle) and re-resolves when the committed lens changes.
 * Without a provider (or with no recipe worn) everything falls back to
 * the Swan palette — zero visual delta by construction.
 */
import React, { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  resolveLensChartPalette,
  SWAN_CHART_PALETTE,
  type LensChartPalette,
} from '../../../Charts/chartTheme';
import { useOptionalStyleLensAppearance } from '../../../../core/style-lens-os/StyleLensProvider';
import {
  buildSeamedVictoryProps,
  type SeamedVictoryProps,
} from './CanonicalProgressChartsGrid.victoryProps';

const LensChartPaletteContext = createContext<LensChartPalette>(SWAN_CHART_PALETTE);

interface LensChartPaletteProviderProps {
  children: React.ReactNode;
}

/** Wraps the grid; the wrapper div is the token-resolution host. */
export const LensChartPaletteProvider: React.FC<LensChartPaletteProviderProps> = ({ children }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [palette, setPalette] = useState<LensChartPalette>(SWAN_CHART_PALETTE);
  const appearance = useOptionalStyleLensAppearance();
  const committedLensId = appearance?.state.committed.styleLensId;

  useLayoutEffect(() => {
    const next = resolveLensChartPalette(hostRef.current);
    // Identity bail-out: no pre-paint re-render of 12 chart cards when the
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

/** Seamed Victory props for the current lens palette (Swan by default). */
export const useSeamedVictoryProps = (): SeamedVictoryProps => {
  const palette = useContext(LensChartPaletteContext);
  return useMemo(() => buildSeamedVictoryProps(palette), [palette]);
};
