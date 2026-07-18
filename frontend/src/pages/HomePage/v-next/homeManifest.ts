/**
 * Home V-next — lens frame manifest (mirrors the shipped Store/Dashboards pattern). The frame provides
 * the `--world-*`/`--lens-*` scoping (`[data-style-lens-shell]`) that makes `--home-*` resolve, so a
 * world switch re-skins Home via CSS alone. Slots/templates empty → fail-closed to host defaults.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from './lensBindings';

const HOME_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'home-vnext',
  hostId: 'home-vnext',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
};

export const HomeLensFrame = makeLensFrame(HOME_MANIFEST, 'SwanStudios home', 'HomeVNextFrame');
