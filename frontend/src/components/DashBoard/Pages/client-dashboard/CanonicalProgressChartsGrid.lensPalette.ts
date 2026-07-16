/**
 * COMPONENT: CanonicalProgressChartsGrid.lensPalette
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Grid-specific face of the shared lens→Victory bridge. The
 * provider/context live in components/Charts/lensChartPalette (one bridge
 * for every chart host); this module keeps the grid's seamed-props hook and
 * re-exports the provider so grid consumers keep a single import site.
 */
import { useMemo } from 'react';
import { useLensChartPalette } from '../../../Charts/lensChartPalette';
import {
  buildSeamedVictoryProps,
  type SeamedVictoryProps,
} from './CanonicalProgressChartsGrid.victoryProps';

export { LensChartPaletteProvider } from '../../../Charts/lensChartPalette';

/** Seamed Victory props for the current lens palette (Swan by default). */
export const useSeamedVictoryProps = (): SeamedVictoryProps => {
  const palette = useLensChartPalette();
  return useMemo(() => buildSeamedVictoryProps(palette), [palette]);
};
