/**
 * About V-next — lens frame manifest (mirrors the shipped Home/Store pattern). The frame provides the
 * `--world-*`/`--lens-*` scoping (`[data-style-lens-shell]`) that makes `--about-*` resolve.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from './lensBindings';

const ABOUT_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'about-vnext',
  hostId: 'about-vnext',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
};

export const AboutLensFrame = makeLensFrame(ABOUT_MANIFEST, 'About SwanStudios', 'AboutVNextFrame');
