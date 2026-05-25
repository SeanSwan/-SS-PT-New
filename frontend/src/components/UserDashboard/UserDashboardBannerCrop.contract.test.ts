import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const styledBlock = (source: string, exportName: string) => {
  const start = source.indexOf(`export const ${exportName}`);
  const end = start >= 0 ? source.indexOf('`;', start) : -1;
  return start >= 0 && end >= 0 ? source.slice(start, end + 2) : '';
};

describe('UserDashboard banner crop contract', () => {
  const dashboard = read('src/components/UserDashboard/UserDashboard.V3.tsx');
  const header = read('src/components/UserDashboard/components/UserDashboardProfileHeaderV3.tsx');
  const cropControls = read('src/components/UserDashboard/components/UserDashboardBannerCropControls.tsx');
  const repositionPanel = read('src/components/UserDashboard/components/UserDashboardBannerRepositionPanelContent.tsx');
  const mediaLayer = read('src/components/UserDashboard/components/UserDashboardBannerMediaLayer.tsx');
  const shell = read('src/components/UserDashboard/components/ObservatoryShell.tsx');
  const controller = read('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');
  const compositionHook = read('src/components/UserDashboard/hooks/useBannerCompositionState.ts');
  const profileService = read('src/services/profileService.ts');
  const actionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerActionsStyles.ts');
  const compositionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerCompositionStyles.ts');
  const carouselStyles = read('src/components/UserDashboard/styles/DashboardV3BannerCarouselStyles.ts');
  const layoutStyles = read('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');
  const profilePhotoStyles = read('src/components/UserDashboard/styles/DashboardV3ProfilePhotoStyles.ts');

  it('uses free drag crop controls instead of the old 9-preset grid', () => {
    expect(header).not.toContain('BANNER_OBJECT_POSITION_PRESETS.map');
    expect(cropControls).toContain('onPointerDown={handleBannerPointerDown}');
    expect(repositionPanel).toContain('Drag the cover photo');
    expect(actionStyles).toContain('BannerCropModeButton');
  });

  it('persists position, fit mode, and zoom through the dashboard controller', () => {
    expect(controller).toContain('useBannerCompositionState');
    expect(compositionHook).toContain('bannerObjectFit');
    expect(compositionHook).toContain('bannerImageScale');
    expect(compositionHook).toContain('bannerFrameHeight');
    expect(compositionHook).toContain('bannerCollagePhotos');
    expect(compositionHook).toContain('bannerCollageLayout');
    expect(compositionHook).toContain('bannerStickyCarousel');
    expect(compositionHook).toContain('bannerPresets');
    expect(compositionHook).toContain('handleBannerCropCommit');
    expect(compositionHook).toContain('handleBannerCollageLayoutCommit');
    expect(compositionHook).toContain('handleBannerPresetSave');
    expect(compositionHook).toContain('updateProfile({');
    expect(compositionHook).toContain('bannerObjectPosition: normalizedNext.position');
    expect(compositionHook).toContain('bannerObjectFit: normalizedNext.fit');
    expect(compositionHook).toContain('bannerImageScale: normalizedNext.scale');
    expect(compositionHook).toContain('bannerFrameHeight: normalizedNext.height');
    expect(compositionHook).toContain('bannerCollagePhotos: normalized');
    expect(compositionHook).toContain('bannerCollageLayout: normalizedLayout');
    expect(compositionHook).toContain('bannerStickyCarousel');
    expect(compositionHook).toContain('bannerPresets: normalizedPresets');
  });

  it('allows percentage object-position strings and fit modes at the profile service boundary', () => {
    expect(profileService).toContain('type BannerObjectFit');
    expect(profileService).toContain('isBannerObjectFit');
    expect(profileService).toContain('normalizeBannerImageScale');
    expect(profileService).toContain('normalizeBannerObjectPosition');
    expect(profileService).toContain('normalizeBannerFrameHeight');
    expect(profileService).toContain('normalizeBannerCollagePhotos');
    expect(profileService).toContain('normalizeBannerCollageLayout');
    expect(profileService).toContain('normalizeBannerPresets');
    expect(profileService).toContain('BANNER_OBJECT_FIT_OPTIONS');
    expect(profileService).toContain('BANNER_COLLAGE_LAYOUT_OPTIONS');
    expect(profileService).toContain('BANNER_CAROUSEL_LAYOUT_OPTIONS');
    expect(profileService).toContain('MAX_BANNER_FRAME_HEIGHT = 1000');
    expect(profileService).toContain("'tile'");
    expect(profileService).toContain("'collage'");
    expect(profileService).toContain('bannerCollagePhotos');
    expect(profileService).toContain('bannerCollageLayout');
    expect(profileService).toContain('bannerStickyCarousel');
    expect(profileService).toContain('bannerPresets');
    expect(profileService).toContain('/api/profile/upload-banner-collage-photo');
    expect(profileService).toContain('video/mp4');
  });

  it('renders creative modes with image elements instead of CSS background-url repetition', () => {
    expect(mediaLayer).toContain('BannerTileLayer');
    expect(mediaLayer).toContain('data-testid="banner-tile-image"');
    expect(mediaLayer).toContain('BannerCollageLayer');
    expect(mediaLayer).toContain('data-testid="banner-collage-image"');
    expect(mediaLayer).toContain('data-testid="banner-collage-video"');
    expect(mediaLayer).toContain('BannerStickyCarouselLayer');
    expect(mediaLayer).toContain('BannerCarouselTrack');
    expect(mediaLayer).toContain('BannerStickyCarouselTrack');
    expect(mediaLayer).toContain('data-testid="banner-sticky-carousel"');
    expect(cropControls).not.toContain('backgroundImage: `');
    expect(mediaLayer).not.toContain('backgroundImage: `');
  });

  it('keeps tile and collage media from cropping inside their grid cells', () => {
    expect(compositionStyles).toMatch(/export const BannerTileImage[\s\S]*?object-fit: contain;/);
    expect(compositionStyles).toMatch(/const collageMediaCss[\s\S]*?object-fit: contain;/);
  });

  it('uses an adaptive aspect-ratio collage mosaic instead of fixed two-row cells', () => {
    const collageLayerBlock = styledBlock(compositionStyles, 'BannerCollageLayer');
    const collageFrameBlock = styledBlock(compositionStyles, 'BannerCollageMediaFrame');

    expect(collageLayerBlock).toContain('align-content: flex-start;');
    expect(collageLayerBlock).toContain('align-items: flex-start;');
    expect(collageLayerBlock).toContain('justify-content: flex-start;');
    expect(collageLayerBlock).toContain('padding: 0 clamp');
    expect(collageLayerBlock).toContain("data-layout='mosaic'");
    expect(collageLayerBlock).toContain("data-layout^='carousel-'");
    expect(collageFrameBlock).toContain('flex: var(--banner-collage-grow');
    expect(collageFrameBlock).toContain('aspect-ratio: var(--banner-collage-aspect-ratio');
    expect(collageFrameBlock).toContain('--banner-collage-basis');
    expect(compositionStyles).not.toContain('scale(var(--banner-image-scale');
    expect(mediaLayer).toContain('buildBannerCollageFrameStyle');
    expect(mediaLayer).toContain('normalizeBannerMediaAspectRatio');
  });

  it('supports five carousel banner layouts plus an optional sticky mini strip', () => {
    expect(profileService).toContain("'carousel-reel'");
    expect(profileService).toContain("'carousel-cinema'");
    expect(profileService).toContain("'carousel-coverflow'");
    expect(profileService).toContain("'carousel-stack'");
    expect(profileService).toContain("'carousel-ticker'");
    expect(carouselStyles).toContain('BannerCarouselTrack');
    expect(carouselStyles).toContain('BannerStickyCarouselLayer');
    expect(carouselStyles).toContain('BannerStickyCarouselTrack');
    expect(carouselStyles).toContain('position: fixed;');
    expect(carouselStyles).toContain('height: clamp(34px');
    expect(carouselStyles).toContain('0.12');
    expect(carouselStyles).toContain('@media (max-width: 768px)');
    expect(compositionStyles).not.toMatch(/BannerCollageMediaFrame[\s\S]*animation:\s*\$\{carouselTrack\}/);
  });

  it('keeps cover controls away from the desktop right-rail tier cards', () => {
    const actionRowBlock = styledBlock(actionStyles, 'BannerActionRow');

    expect(actionRowBlock).toContain('left: clamp');
    expect(actionRowBlock).toContain('right: auto;');
    expect(actionRowBlock).toContain('bottom: clamp');
    expect(actionStyles).toMatch(/export const BannerRepositionPanel[\s\S]*?left: 0;/);
  });

  it('fills tile mode with wrapped full-image tiles instead of wide dark cells', () => {
    const tileImageBlock = styledBlock(compositionStyles, 'BannerTileImage');

    expect(compositionStyles).toMatch(/export const BannerTileLayer[\s\S]*?display: flex;/);
    expect(compositionStyles).toMatch(/export const BannerTileLayer[\s\S]*?flex-wrap: wrap;/);
    expect(tileImageBlock).toContain('height: auto;');
    expect(tileImageBlock).not.toContain('background:');
  });

  it('keeps profile and observatory rails below the dynamic banner height', () => {
    expect(profilePhotoStyles).toMatch(/export const ProfileImageSection[\s\S]*?position: relative;/);
    expect(profilePhotoStyles).not.toContain('top: 230px');
    expect(layoutStyles).toContain('$profileBannerClearance');
    expect(layoutStyles).not.toContain('--observatory-profile-banner-clearance: 440px');
    expect(layoutStyles).not.toContain('--observatory-profile-banner-clearance: 540px');
    expect(shell).toContain('profileBannerClearance');
    expect(dashboard).toContain('profileBannerClearance={dashboard.bannerFrameHeight}');
  });
});
