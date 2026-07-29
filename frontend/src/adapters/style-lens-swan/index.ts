import {
  DEFAULT_STYLE_LENS_MANIFEST,
  createStyleLensRegistry,
} from '../../core/style-lens-os';
import { SWAN_FLAGSHIP_MANIFEST } from './manifests/swanFlagship';
import { QUIET_MERIDIAN_MANIFEST } from './manifests/quietMeridian';
import { BLUEPRINT_FOLD_MANIFEST } from './manifests/blueprintFold';
import { KINTSUGI_CIRCUIT_MANIFEST } from './manifests/kintsugiCircuit';
import { ANALOG_FLIGHT_RECORDER_MANIFEST } from './manifests/analogFlightRecorder';
import { CANDY_GLASS_ARCADE_MANIFEST } from './manifests/candyGlassArcade';
import { RECOVERY_CLOISTER_MANIFEST } from './manifests/recoveryCloister';
import { TEMPO_FORGE_MANIFEST } from './manifests/tempoForge';
import { COACH_LEDGER_MANIFEST } from './manifests/coachLedger';
import { SIGNAL_GARDEN_MANIFEST } from './manifests/signalGarden';
import { SPLIT_HORIZON_MANIFEST } from './manifests/splitHorizon';
import { PRISM_TERMINAL_MANIFEST } from './manifests/prismTerminal';
import { TIDAL_COLUMNS_MANIFEST } from './manifests/tidalColumns';
import { MONASTIC_GRID_MANIFEST } from './manifests/monasticGrid';
import { ORBIT_ATLAS_MANIFEST } from './manifests/orbitAtlas';
import { CARBON_ATELIER_MANIFEST } from './manifests/carbonAtelier';
import { KINETIC_KANBAN_MANIFEST } from './manifests/kineticKanban';
import { AURORA_INDEX_MANIFEST } from './manifests/auroraIndex';
import { MODULAR_HARBOR_MANIFEST } from './manifests/modularHarbor';
import { TERRAIN_CONSOLE_MANIFEST } from './manifests/terrainConsole';
import { CHRONOGRAPH_BOARD_MANIFEST } from './manifests/chronographBoard';
import { GLASS_RAIL_MANIFEST } from './manifests/glassRail';
import { MERIDIAN_MAGAZINE_MANIFEST } from './manifests/meridianMagazine';
import { LUNAR_STACK_MANIFEST } from './manifests/lunarStack';
import { CEDAR_WORKSHOP_MANIFEST } from './manifests/cedarWorkshop';
import { CRYSTALLINE_CATHEDRAL_MANIFEST } from './manifests/crystallineCathedral';
import { AURORA_CONSOLE_MANIFEST } from './manifests/auroraConsole';
import { assertLensRegistryIntegrity } from './contract/registryIntegrity';
import { buildWorldValuesRegistry } from './contract/values';
import { LENS_STYLE_ALLOWLIST } from './styles/lenses';
// Recipe-FREE import (hostile round 9): pulling V2_RECIPE_BY_CATALOG_ID in here
// dragged all 23 world recipe modules into the main entry chunk, for an
// exemption set that world entries structurally cannot contribute to.
import { buildV2OnlyAllowlistExemptions } from './v2/catalogV2Exemptions';

export { SWAN_FLAGSHIP_MANIFEST } from './manifests/swanFlagship';
export { SWAN_ROLE_SLOT_MAP } from './roleMapping';
export { SwanStyleLensGlobalStyles } from './SwanStyleLensGlobalStyles';
export { SWAN_STYLE_LENS_VISUALS } from './visuals';

export const SWAN_SENTINEL_MANIFESTS = Object.freeze([
  QUIET_MERIDIAN_MANIFEST,
  BLUEPRINT_FOLD_MANIFEST,
  KINTSUGI_CIRCUIT_MANIFEST,
  ANALOG_FLIGHT_RECORDER_MANIFEST,
  CANDY_GLASS_ARCADE_MANIFEST,
]);

export const SWAN_EXPANSION_MANIFESTS = Object.freeze([
  RECOVERY_CLOISTER_MANIFEST,
  TEMPO_FORGE_MANIFEST,
  COACH_LEDGER_MANIFEST,
  SIGNAL_GARDEN_MANIFEST,
  SPLIT_HORIZON_MANIFEST,
  PRISM_TERMINAL_MANIFEST,
  TIDAL_COLUMNS_MANIFEST,
  MONASTIC_GRID_MANIFEST,
  ORBIT_ATLAS_MANIFEST,
  CARBON_ATELIER_MANIFEST,
  KINETIC_KANBAN_MANIFEST,
  AURORA_INDEX_MANIFEST,
  MODULAR_HARBOR_MANIFEST,
  TERRAIN_CONSOLE_MANIFEST,
  CHRONOGRAPH_BOARD_MANIFEST,
  GLASS_RAIL_MANIFEST,
  MERIDIAN_MAGAZINE_MANIFEST,
  LUNAR_STACK_MANIFEST,
  CEDAR_WORKSHOP_MANIFEST,
  CRYSTALLINE_CATHEDRAL_MANIFEST,
  AURORA_CONSOLE_MANIFEST,
]);

export const SWAN_STYLE_LENS_REGISTRY = createStyleLensRegistry([
  DEFAULT_STYLE_LENS_MANIFEST,
  SWAN_FLAGSHIP_MANIFEST,
  ...SWAN_SENTINEL_MANIFESTS,
  ...SWAN_EXPANSION_MANIFESTS,
]);

// ── Swan Lens Slice-1 contract surface (S1-A/B/C) ──
export { validateLensDesignValues, validateDesignThenRecipe } from './contract/designValueGuard';
export { assertLensRegistryIntegrity } from './contract/registryIntegrity';
export { buildWorldValuesRegistry, CRYSTALLINE_DEFAULT_WORLD_VALUES } from './contract/values';
export { safeResolveLensId, ANNOUNCE_COPY } from './contract/safeResolveLensId';
export { LENS_STYLE_ALLOWLIST } from './styles/lenses';

// ── Swan Lens Slice-2 (Crystallize + viewport) — ready-to-wire for Lane A ──
export {
  useCrystallizeTransition,
  CRYSTALLIZE_SURFACE_ID,
  CRYSTALLIZE_TIMING,
  type CrystallizeController,
  type CrystallizeOverlayProps,
} from './motion/useCrystallizeTransition';
export { CrystallizeOverlay, CRYSTALLIZE_OVERLAY_Z, crystallizeOverlayCss } from './motion/CrystallizeOverlay';
export {
  useLensViewport,
  layoutProfileForViewport,
  LENS_VIEWPORT_QUERIES,
  type LensViewport,
} from './viewport/useLensViewport';
export { lensViewportCss } from './styles/lensViewportStyles';

// ── Swan Lens Slice-3 (surfaces + Victory bridge) — additive, ready-to-wire ──
export { lensSurfaceCss, LensSurfaceGlobalStyles } from './styles/lensSurfaceStyles';
export {
  resolveLensVictoryTheme,
  SWAN_CHROME_FALLBACKS,
  type LensVictoryThemeBundle,
} from './charts/victoryLensTheme';

// F16 — dev/CI fail-closed integrity gate (never runs in production). Asserts that every STYLED
// lens (the 27 named manifests; the DEFAULT safety lens renders via always-present core, so it is
// intentionally outside this set) has a Crystalline-clean world-values entry AND a style-allowlist
// entry, with no orphans. A drift here throws at adapter init — before any render.
// Carve-out: v2-only styles (dashboardChrome:false in V2_RECIPE_BY_CATALOG_ID) intentionally have
// NO v1 chrome/allowlist entry — the LENS-ADD-A-STYLE five-entry pipeline stays crash-free for
// style #27+ while chrome styles still require a real allowlist entry.
if (process.env.NODE_ENV !== 'production') {
  const styledLensIds = [
    SWAN_FLAGSHIP_MANIFEST,
    ...SWAN_SENTINEL_MANIFESTS,
    ...SWAN_EXPANSION_MANIFESTS,
  ].map((manifest) => manifest.id);
  assertLensRegistryIntegrity(
    styledLensIds,
    buildWorldValuesRegistry(styledLensIds),
    { ...LENS_STYLE_ALLOWLIST, ...buildV2OnlyAllowlistExemptions() },
  );
}

