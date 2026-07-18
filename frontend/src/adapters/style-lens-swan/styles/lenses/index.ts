/**
 * Swan Lens — static per-lens style allowlist (S1-C / KIMI-SWAN-LENS-S1C §5).
 * lensId -> its createGlobalStyle component. Static imports only (no import()/fetch). The key-set
 * MUST equal the monolith's [data-style-lens] block set AND the manifest id set (asserted at init).
 */
import type { ComponentType } from 'react';
import { AnalogFlightRecorderLensStyles } from './analog-flight-recorder';
import { AuroraConsoleLensStyles } from './aurora-console';
import { AuroraIndexLensStyles } from './aurora-index';
import { BlueprintFoldLensStyles } from './blueprint-fold';
import { CandyGlassArcadeLensStyles } from './candy-glass-arcade';
import { CarbonAtelierLensStyles } from './carbon-atelier';
import { CedarWorkshopLensStyles } from './cedar-workshop';
import { ChronographBoardLensStyles } from './chronograph-board';
import { CoachLedgerLensStyles } from './coach-ledger';
import { CrystallineCathedralLensStyles } from './crystalline-cathedral';
import { GlassRailLensStyles } from './glass-rail';
import { KineticKanbanLensStyles } from './kinetic-kanban';
import { KintsugiCircuitLensStyles } from './kintsugi-circuit';
import { LunarStackLensStyles } from './lunar-stack';
import { MeridianMagazineLensStyles } from './meridian-magazine';
import { ModularHarborLensStyles } from './modular-harbor';
import { MonasticGridLensStyles } from './monastic-grid';
import { OrbitAtlasLensStyles } from './orbit-atlas';
import { PrismTerminalLensStyles } from './prism-terminal';
import { QuietMeridianLensStyles } from './quiet-meridian';
import { RecoveryCloisterLensStyles } from './recovery-cloister';
import { SignalGardenLensStyles } from './signal-garden';
import { SplitHorizonLensStyles } from './split-horizon';
import { SwanFlagshipLensStyles } from './swan-flagship';
import { TempoForgeLensStyles } from './tempo-forge';
import { TerrainConsoleLensStyles } from './terrain-console';
import { TidalColumnsLensStyles } from './tidal-columns';

export type LensStyleComponent = ComponentType;

export const LENS_STYLE_ALLOWLIST: Readonly<Record<string, LensStyleComponent>> = Object.freeze({
  'analog-flight-recorder': AnalogFlightRecorderLensStyles,
  'aurora-console': AuroraConsoleLensStyles,
  'aurora-index': AuroraIndexLensStyles,
  'blueprint-fold': BlueprintFoldLensStyles,
  'candy-glass-arcade': CandyGlassArcadeLensStyles,
  'carbon-atelier': CarbonAtelierLensStyles,
  'cedar-workshop': CedarWorkshopLensStyles,
  'chronograph-board': ChronographBoardLensStyles,
  'coach-ledger': CoachLedgerLensStyles,
  'crystalline-cathedral': CrystallineCathedralLensStyles,
  'glass-rail': GlassRailLensStyles,
  'kinetic-kanban': KineticKanbanLensStyles,
  'kintsugi-circuit': KintsugiCircuitLensStyles,
  'lunar-stack': LunarStackLensStyles,
  'meridian-magazine': MeridianMagazineLensStyles,
  'modular-harbor': ModularHarborLensStyles,
  'monastic-grid': MonasticGridLensStyles,
  'orbit-atlas': OrbitAtlasLensStyles,
  'prism-terminal': PrismTerminalLensStyles,
  'quiet-meridian': QuietMeridianLensStyles,
  'recovery-cloister': RecoveryCloisterLensStyles,
  'signal-garden': SignalGardenLensStyles,
  'split-horizon': SplitHorizonLensStyles,
  'swan-flagship': SwanFlagshipLensStyles,
  'tempo-forge': TempoForgeLensStyles,
  'terrain-console': TerrainConsoleLensStyles,
  'tidal-columns': TidalColumnsLensStyles,
});
