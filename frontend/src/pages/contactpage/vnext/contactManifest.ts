/**
 * Contact V-next — lens frame manifest (mirrors the shipped surfaces). Provides the `--world-*`/`--lens-*`
 * scoping (`[data-style-lens-shell]`) that makes `--contact-*` resolve.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from './lensBindings';

const CONTACT_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'contact-vnext',
  hostId: 'contact-vnext',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
};

export const ContactLensFrame = makeLensFrame(CONTACT_MANIFEST, 'Contact SwanStudios', 'ContactVNextFrame');
