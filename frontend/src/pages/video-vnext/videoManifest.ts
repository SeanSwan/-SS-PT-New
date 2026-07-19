/**
 * Video V-next — lens frame manifest (mirrors the shipped Home/Store/About pattern). The frame provides
 * the `--world-*`/`--lens-*` scoping (`[data-style-lens-shell]`) that makes `--video-*` resolve.
 */
import { makeLensFrame, CONTAINER_PROFILES, type SurfaceCapabilityManifest } from './lensBindings';

const VIDEO_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'video-vnext',
  hostId: 'video-vnext',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {},
  templates: {},
};

export const VideoLensFrame = makeLensFrame(VIDEO_MANIFEST, 'SwanStudios video library', 'VideoVNextFrame');
