/**
 * Gallery vNext — lens frame manifest (mirrors the shipped Store-V4 pattern). The gallery gets its look
 * from the `--world-*`/`--lens-*` scoping the frame provides (`[data-style-lens-shell]`), NOT from recipe
 * slots — so slots/templates are intentionally empty (fail-closed to host defaults). The frame is what
 * makes `--gallery-*` (→ `--world-*`) resolve, so a world switch re-skins the gallery via CSS alone.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from './lensBindings';

const GALLERY_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'gallery-vnext',
  hostId: 'gallery-vnext',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
};

export const GalleryLensFrame = makeLensFrame(GALLERY_MANIFEST, 'SwanStudios gallery', 'GalleryVNextFrame');
