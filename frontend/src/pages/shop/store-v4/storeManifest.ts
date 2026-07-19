/**
 * Store V4 — lens frame manifest (mirrors the shipped Dashboards pattern). The store gets its look
 * from the `--world-*`/`--lens-*` scoping the frame provides (`[data-style-lens-shell]`), NOT from
 * recipe slots — so slots/templates are intentionally empty (fail-closed to host defaults). The frame
 * is what makes `--store-*` (→ `--world-*`) resolve, so a world switch re-skins the store via CSS alone.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from './lensBindings';

const STORE_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'store-v4',
  hostId: 'store-v4',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
};

export const StoreLensFrame = makeLensFrame(STORE_MANIFEST, 'SwanStudios store', 'StoreV4Frame');
