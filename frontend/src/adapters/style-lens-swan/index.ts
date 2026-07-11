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

export const SWAN_STYLE_LENS_REGISTRY = createStyleLensRegistry([
  DEFAULT_STYLE_LENS_MANIFEST,
  SWAN_FLAGSHIP_MANIFEST,
  ...SWAN_SENTINEL_MANIFESTS,
]);

