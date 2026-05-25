import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('UserDashboard banner crop contract', () => {
  const header = read('src/components/UserDashboard/components/UserDashboardProfileHeaderV3.tsx');
  const cropControls = read('src/components/UserDashboard/components/UserDashboardBannerCropControls.tsx');
  const mediaLayer = read('src/components/UserDashboard/components/UserDashboardBannerMediaLayer.tsx');
  const controller = read('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');
  const compositionHook = read('src/components/UserDashboard/hooks/useBannerCompositionState.ts');
  const profileService = read('src/services/profileService.ts');
  const actionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerActionsStyles.ts');
  const compositionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerCompositionStyles.ts');

  it('uses free drag crop controls instead of the old 9-preset grid', () => {
    expect(header).not.toContain('BANNER_OBJECT_POSITION_PRESETS.map');
    expect(cropControls).toContain('onPointerDown={handleBannerPointerDown}');
    expect(cropControls).toContain('Drag the cover photo');
    expect(actionStyles).toContain('BannerCropModeButton');
  });

  it('persists position, fit mode, and zoom through the dashboard controller', () => {
    expect(controller).toContain('useBannerCompositionState');
    expect(compositionHook).toContain('bannerObjectFit');
    expect(compositionHook).toContain('bannerImageScale');
    expect(compositionHook).toContain('bannerFrameHeight');
    expect(compositionHook).toContain('bannerCollagePhotos');
    expect(compositionHook).toContain('handleBannerCropCommit');
    expect(compositionHook).toContain('updateProfile({');
    expect(compositionHook).toContain('bannerObjectPosition: normalizedNext.position');
    expect(compositionHook).toContain('bannerObjectFit: normalizedNext.fit');
    expect(compositionHook).toContain('bannerImageScale: normalizedNext.scale');
    expect(compositionHook).toContain('bannerFrameHeight: normalizedNext.height');
    expect(compositionHook).toContain('bannerCollagePhotos: normalized');
  });

  it('allows percentage object-position strings and fit modes at the profile service boundary', () => {
    expect(profileService).toContain('type BannerObjectFit');
    expect(profileService).toContain('isBannerObjectFit');
    expect(profileService).toContain('normalizeBannerImageScale');
    expect(profileService).toContain('normalizeBannerObjectPosition');
    expect(profileService).toContain('normalizeBannerFrameHeight');
    expect(profileService).toContain('normalizeBannerCollagePhotos');
    expect(profileService).toContain('BANNER_OBJECT_FIT_OPTIONS');
    expect(profileService).toContain('MAX_BANNER_FRAME_HEIGHT = 1000');
    expect(profileService).toContain("'tile'");
    expect(profileService).toContain("'collage'");
    expect(profileService).toContain('bannerCollagePhotos');
    expect(profileService).toContain('/api/profile/upload-banner-collage-photo');
    expect(profileService).toContain('video/mp4');
  });

  it('renders creative modes with image elements instead of CSS background-url repetition', () => {
    expect(mediaLayer).toContain('BannerTileLayer');
    expect(mediaLayer).toContain('data-testid="banner-tile-image"');
    expect(mediaLayer).toContain('BannerCollageLayer');
    expect(mediaLayer).toContain('data-testid="banner-collage-image"');
    expect(mediaLayer).toContain('data-testid="banner-collage-video"');
    expect(cropControls).not.toContain('backgroundImage: `');
    expect(mediaLayer).not.toContain('backgroundImage: `');
  });

  it('keeps tile and collage media from cropping inside their grid cells', () => {
    expect(compositionStyles).toMatch(/export const BannerTileImage[\s\S]*?object-fit: contain;/);
    expect(compositionStyles).toMatch(/const collageMediaCss[\s\S]*?object-fit: contain;/);
  });
});
