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
]);

export const SWAN_STYLE_LENS_REGISTRY = createStyleLensRegistry([
  DEFAULT_STYLE_LENS_MANIFEST,
  SWAN_FLAGSHIP_MANIFEST,
  ...SWAN_SENTINEL_MANIFESTS,
  ...SWAN_EXPANSION_MANIFESTS,
]);

