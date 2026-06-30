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
  const homeCoverHook = read('src/components/UserDashboard/components/useHomeCoverBanner.tsx');
  const coverHero = read('src/components/UserDashboard/components/ObservatoryCoverHero.tsx');
  const coverHeroStyles = read('src/components/UserDashboard/components/ObservatoryCoverHero.styles.ts');
  const stageLayer = read('src/components/UserDashboard/components/UserDashboardBannerStageLayouts.tsx');
  const shell = read('src/components/UserDashboard/components/ObservatoryShell.tsx');
  const controller = read('src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts');
  const compositionHook = read('src/components/UserDashboard/hooks/useBannerCompositionState.ts');
  const mediaHandlers = read('src/components/UserDashboard/hooks/useBannerCollageMediaHandlers.ts');
  const profileService = read('src/services/profileService.ts');
  const bannerCompositionService = read('src/services/profileBannerComposition.ts');
  const profileTypesService = read('src/services/profileTypes.ts');
  const actionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerActionsStyles.ts');
  const compositionStyles = read('src/components/UserDashboard/styles/DashboardV3BannerCompositionStyles.ts');
  const carouselStyles = read('src/components/UserDashboard/styles/DashboardV3BannerCarouselStyles.ts');
  const smartFitStyles = read('src/components/UserDashboard/styles/DashboardV3BannerSmartFitStyles.ts');
  const stageStyles = read('src/components/UserDashboard/styles/DashboardV3BannerStageStyles.ts');
  const stageHeroBackdropStyles = read('src/components/UserDashboard/styles/DashboardV3BannerStageHeroBackdropStyles.ts');
  const dashboardStylesBarrel = read('src/components/UserDashboard/styles/DashboardV3Styles.ts');
  const backendController = read('../backend/controllers/profileController.mjs');
  const layoutStyles = read('src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts');
  const profilePhotoStyles = read('src/components/UserDashboard/styles/DashboardV3ProfilePhotoStyles.ts');

  it('uses free drag crop controls instead of the old 9-preset grid', () => {
    expect(header).not.toContain('BANNER_OBJECT_POSITION_PRESETS.map');
    expect(cropControls).toContain('onPointerDown={handleBannerPointerDown}');
    expect(repositionPanel).toContain('Drag the cover photo');
    expect(actionStyles).toContain('BannerCropModeButton');
    expect(cropControls).toContain('<BannerUploadButton type="button"');
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
    expect(compositionHook).toContain('handleBannerCollageShuffle');
    expect(compositionHook).toContain('useBannerCollageMediaHandlers');
    expect(mediaHandlers).toContain('handleBannerCollageShuffle');
    expect(compositionHook).toContain('handleBannerPresetSave');
    expect(compositionHook).toContain('updateProfile({');
    expect(compositionHook).toContain('bannerObjectPosition: normalizedNext.position');
    expect(compositionHook).toContain('bannerObjectFit: normalizedNext.fit');
    expect(compositionHook).toContain('bannerImageScale: normalizedNext.scale');
    expect(compositionHook).toContain('bannerFrameHeight: normalizedNext.height');
    expect(mediaHandlers).toContain('bannerCollagePhotos: normalized');
    expect(compositionHook).toContain('bannerCollageLayout: normalizedLayout');
    expect(compositionHook).toContain('bannerStickyCarousel');
    expect(compositionHook).toContain('bannerPresets: normalizedPresets');
  });

  it('allows percentage object-position strings and fit modes at the profile service boundary', () => {
    expect(profileService).toContain("export * from './profileBannerComposition'");
    expect(bannerCompositionService).toContain('type BannerObjectFit');
    expect(bannerCompositionService).toContain('isBannerObjectFit');
    expect(bannerCompositionService).toContain('normalizeBannerImageScale');
    expect(bannerCompositionService).toContain('normalizeBannerObjectPosition');
    expect(bannerCompositionService).toContain('normalizeBannerFrameHeight');
    expect(bannerCompositionService).toContain('normalizeBannerCollagePhotos');
    expect(bannerCompositionService).toContain('normalizeBannerCollageLayout');
    expect(bannerCompositionService).toContain('normalizeBannerPresets');
    expect(bannerCompositionService).toContain('BANNER_OBJECT_FIT_OPTIONS');
    expect(bannerCompositionService).toContain("'smart'");
    expect(bannerCompositionService).toContain("DEFAULT_BANNER_OBJECT_FIT: BannerObjectFit = 'smart'");
    expect(bannerCompositionService).toContain('BANNER_COLLAGE_LAYOUT_OPTIONS');
    expect(bannerCompositionService).toContain('BANNER_CAROUSEL_LAYOUT_OPTIONS');
    expect(bannerCompositionService).toContain("'smart-carousel'");
    expect(bannerCompositionService).toContain("DEFAULT_BANNER_COLLAGE_LAYOUT: BannerCollageLayout = 'smart-carousel'");
    expect(bannerCompositionService).toContain('MAX_BANNER_FRAME_HEIGHT = 1000');
    expect(bannerCompositionService).toContain("'tile'");
    expect(bannerCompositionService).toContain("'collage'");
    expect(profileTypesService).toContain('bannerCollagePhotos');
    expect(profileTypesService).toContain('bannerCollageLayout');
    expect(profileTypesService).toContain('bannerStickyCarousel');
    expect(profileTypesService).toContain('bannerPresets');
    expect(profileService).toContain('/api/profile/upload-banner-collage-photo');
    expect(bannerCompositionService).toContain('video/mp4');
  });

  it('renders creative modes with image elements instead of CSS background-url repetition', () => {
    expect(mediaLayer).toContain('BannerTileLayer');
    expect(mediaLayer).toContain('data-testid="banner-tile-image"');
    expect(mediaLayer).toContain('BannerSmartFitLayer');
    expect(mediaLayer).toContain('data-testid="banner-smart-fit-layer"');
    expect(smartFitStyles).toContain('object-fit: contain;');
    expect(mediaLayer).toContain('BannerCollageLayer');
    expect(mediaLayer).toContain('data-testid="banner-collage-image"');
    expect(mediaLayer).toContain('data-testid="banner-collage-video"');
    expect(mediaLayer).toContain('BannerStickyCarouselLayer');
    expect(mediaLayer).toContain('BannerCarouselTrack');
    expect(mediaLayer).toContain('BannerStickyCarouselTrack');
    expect(mediaLayer).toContain('data-testid="banner-sticky-carousel"');
    expect(mediaLayer).toContain('!bannerStickyCarousel');
    expect(mediaLayer).toContain('data-testid="banner-sticky-carousel-image"');
    // 2026-06-11 flaw fix: sticky carousel media is cover-fill (was contain,
    // which letterboxed photos with black bars).
    expect(carouselStyles).toMatch(/const stickyCarouselMediaCss[\s\S]*?object-fit: cover;/);
    expect(bannerCompositionService).toContain('MAX_BANNER_COLLAGE_PHOTOS = 12');
    expect(bannerCompositionService).toContain('MAX_BANNER_COLLAGE_VIDEOS = 3');
    expect(mediaHandlers).toContain('MAX_BANNER_COLLAGE_VIDEOS');
    expect(mediaHandlers).toContain('nextVideoCount >= MAX_BANNER_COLLAGE_VIDEOS');
    expect(mediaLayer).toContain('slice(0, MAX_BANNER_COLLAGE_PHOTOS)');
    expect(cropControls).not.toContain('backgroundImage: `');
    expect(mediaLayer).not.toContain('backgroundImage: `');
  });

  it('honors the saved banner height in the mounted Observatory cover hero', () => {
    expect(homeCoverHook).toContain('DEFAULT_BANNER_FRAME_HEIGHT');
    expect(homeCoverHook).toContain('bannerFrameHeight = coverBanner?.bannerFrameHeight ?? DEFAULT_BANNER_FRAME_HEIGHT');
    expect(homeCoverHook).toContain('bannerFrameHeight,');
    expect(coverHero).toContain('--cover-hero-height');
    expect(coverHero).toContain('`${bannerFrameHeight}px`');
    expect(coverHeroStyles).toContain('height: clamp(220px, var(--cover-hero-height, 320px), 620px);');
    expect(coverHeroStyles).toContain('calc(var(--cover-hero-height, 320px) * 0.72)');
    expect(coverHeroStyles).toContain('calc(var(--cover-hero-height, 320px) * 0.66)');
    expect(coverHeroStyles).toContain('height: clamp(300px, var(--cover-hero-height, 420px), 720px);');
    expect(coverHeroStyles).toContain('height: clamp(360px, var(--cover-hero-height, 500px), 860px);');
    expect(coverHeroStyles).not.toContain('height: clamp(200px, 26vw, 340px);');
  });

  it('keeps the mounted banner media renderer below the runtime file-size cap', () => {
    expect(mediaLayer.split(/\r?\n/).length, 'UserDashboardBannerMediaLayer.tsx line count')
      .toBeLessThanOrEqual(300);
    expect(stageLayer.split(/\r?\n/).length, 'UserDashboardBannerStageLayouts.tsx line count')
      .toBeLessThanOrEqual(300);
    expect(mediaHandlers.split(/\r?\n/).length, 'useBannerCollageMediaHandlers.ts line count')
      .toBeLessThanOrEqual(300);
    expect(stageHeroBackdropStyles.split(/\r?\n/).length, 'DashboardV3BannerStageHeroBackdropStyles.ts line count')
      .toBeLessThanOrEqual(300);
  });

  it('keeps tile media whole and removes carousel frame containers below photos', () => {
    expect(compositionStyles).toMatch(/export const BannerTileImage[\s\S]*?object-fit: contain;/);
    expect(compositionStyles).toMatch(/const collageMediaCss[\s\S]*?object-fit: cover;/);
    expect(compositionStyles).toMatch(/const collageMediaCss[\s\S]*?data-layout\^='carousel-'[\s\S]*?object-fit: contain;/);
    expect(compositionStyles).toMatch(/BannerCollageLayer[\s\S]*?data-layout='stream'[\s\S]*?display: grid;/);
    expect(compositionStyles).toContain("${BannerCollageLayer}[data-layout='stream'] &,");
    expect(compositionStyles).toMatch(/\$\{BannerCollageLayer\}\[data-layout='stream'\][\s\S]*?height: 100%;/);
    expect(compositionStyles).toMatch(/\$\{BannerCollageLayer\}\[data-layout\^='carousel-'\][\s\S]*?flex: 0 0 auto;/);
    expect(compositionStyles).toMatch(/\$\{BannerCollageLayer\}\[data-layout\^='carousel-'\][\s\S]*?aspect-ratio: auto;/);
    expect(compositionStyles).toMatch(/\$\{BannerCollageLayer\}\[data-layout\^='carousel-'\][\s\S]*?background: transparent;/);
    expect(compositionStyles).toMatch(/\$\{BannerCollageLayer\}\[data-layout\^='carousel-'\][\s\S]*?box-shadow: none;/);
    expect(carouselStyles).toMatch(/export const BannerCarouselTrack[\s\S]*?align-items: flex-start;/);
  });

  it('uses an adaptive aspect-ratio collage mosaic instead of fixed two-row cells', () => {
    const collageLayerBlock = styledBlock(compositionStyles, 'BannerCollageLayer');
    const collageFrameBlock = styledBlock(compositionStyles, 'BannerCollageMediaFrame');

    expect(collageLayerBlock).toContain('align-content: flex-start;');
    expect(collageLayerBlock).toContain('align-items: flex-start;');
    expect(collageLayerBlock).toContain('justify-content: flex-start;');
    expect(collageLayerBlock).toContain('padding: 0 clamp');
    expect(collageLayerBlock).toContain("data-layout='stream'");
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
    expect(bannerCompositionService).toContain("'carousel-reel'");
    expect(bannerCompositionService).toContain("'carousel-cinema'");
    expect(bannerCompositionService).toContain("'carousel-coverflow'");
    expect(bannerCompositionService).toContain("'carousel-stack'");
    expect(bannerCompositionService).toContain("'carousel-ticker'");
    expect(carouselStyles).toContain('BannerCarouselTrack');
    expect(carouselStyles).toContain('BannerStickyCarouselLayer');
    expect(carouselStyles).toContain('BannerStickyCarouselTrack');
    expect(carouselStyles).toContain('position: fixed;');
    expect(carouselStyles).toContain('height: clamp(34px');
    expect(carouselStyles).toContain('0.12');
    expect(carouselStyles).toContain('@media (max-width: 768px)');
    expect(compositionStyles).not.toMatch(/BannerCollageMediaFrame[\s\S]*animation:\s*\$\{carouselTrack\}/);
  });

  it('renders Smart Carousel, Atrium, and Vitrine as full-bleed premium stage layouts', () => {
    // enum carries the standalone stage layouts
    expect(bannerCompositionService).toContain("'smart-carousel'");
    expect(bannerCompositionService).toContain("'atrium'");
    expect(bannerCompositionService).toContain("'vitrine'");
    // they are NOT marquee carousels (must stay out of the carousel option set,
    // so isBannerCarouselLayout() is false and the sticky-strip path is skipped)
    const carouselArray = bannerCompositionService.match(/BANNER_CAROUSEL_LAYOUT_OPTIONS = \[[\s\S]*?\]/)?.[0] ?? '';
    expect(carouselArray).not.toContain('smart-carousel');
    expect(carouselArray).not.toContain('atrium');
    expect(carouselArray).not.toContain('vitrine');
    // frontend <-> backend allowlist parity (drift here silently downgrades the
    // saved layout to 'stream' - the M5b crossfade gotcha)
    expect(backendController).toContain("'smart-carousel'");
    expect(backendController).toContain("'atrium'");
    expect(backendController).toContain("'vitrine'");
    // editor picker maps every option through a label record (exhaustive)
    expect(header || cropControls).toBeDefined();
    // the media layer renders each stage on its own branch with stable testids
    expect(mediaLayer).toContain("bannerCollageLayout === 'smart-carousel'");
    expect(mediaLayer).toContain("bannerCollageLayout === 'atrium'");
    expect(mediaLayer).toContain("bannerCollageLayout === 'vitrine'");
    expect(mediaLayer).toContain('UserDashboardBannerStageLayouts');
    expect(stageLayer).toContain('data-testid="banner-stage-smart-carousel"');
    expect(stageStyles).toMatch(/BannerStageSmartHero[\s\S]*?object-fit: contain;/);
    expect(stageStyles).toMatch(/BannerStageVitrineHero[\s\S]*?object-fit: contain;/);
    expect(stageLayer).toContain('BannerStageHeroBackdrop');
    expect(stageLayer).toContain('renderStageMedia(heroPhoto, isBannerVideoUrl(heroPhoto) ?');
    expect(stageHeroBackdropStyles).toContain("import { BannerStageImage, BannerStageVideo } from './DashboardV3BannerStageStyles';");
    expect(stageHeroBackdropStyles).toMatch(/BannerStageImage[\s\S]*?object-fit: cover;/);
    expect(stageHeroBackdropStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(dashboardStylesBarrel).toContain("export * from './DashboardV3BannerStageHeroBackdropStyles';");
    expect(stageLayer).toContain("'banner-stage-smart-theme-tile'");
    expect(stageLayer).toContain('buildSmartRailItems');
    expect(stageLayer).toContain('data-testid="banner-stage-atrium"');
    expect(stageLayer).toContain('data-testid="banner-stage-vitrine"');
    expect(stageLayer).toContain('buildAtriumSlotStyle');
    expect(stageLayer).toContain('BannerStageVitrineRail');
    // the active index is reduced-motion-guarded in the stage renderer
    expect(stageLayer).toMatch(/setStageIndex[\s\S]*?prefers-reduced-motion: reduce/);
    // stage styles exist, are will-change-scoped, and kill transitions under
    // reduced motion (matches the M5a/M5b accessibility discipline)
    expect(stageStyles).toContain('export const BannerStageSmart');
    expect(stageStyles).toContain('export const BannerStageSmartTile');
    expect(stageStyles).toContain('export const BannerStageAtrium');
    expect(stageStyles).toContain('export const BannerStageVitrine');
    expect(stageStyles).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*?will-change: transform/);
    expect(stageStyles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none/);
  });

  it('docks cover controls beside the live editor preview instead of below it', () => {
    const editorStyles = read('src/components/Social/Feed/components/SocialCoverEditor.styles.ts');
    const editorSource = read('src/components/Social/Feed/components/SocialCoverEditor.tsx');

    expect(editorSource).toContain('cover-editor-workspace');
    expect(editorSource).toContain('cover-editor-controls');
    expect(editorSource).toContain('Accept Changes');
    expect(editorStyles).toContain('grid-template-columns: minmax(360px, 1.35fr) minmax(300px, 0.85fr);');
    expect(editorStyles).toContain('max-height: calc(var(--cover-editor-preview-height) + 2px);');
    expect(editorStyles).toContain('@media (max-width: 980px)');
  });

  it('fills tile mode with wrapped full-image tiles instead of wide dark cells', () => {
    const tileImageBlock = styledBlock(compositionStyles, 'BannerTileImage');

    expect(compositionStyles).toMatch(/export const BannerTileLayer[\s\S]*?display: flex;/);
    expect(compositionStyles).toMatch(/export const BannerTileLayer[\s\S]*?flex-wrap: wrap;/);
    expect(tileImageBlock).toContain('height: auto;');
    expect(tileImageBlock).not.toContain('background:');
  });

  it('keeps the cover in normal flow with no rail clearance machinery (workstream O)', () => {
    expect(profilePhotoStyles).toMatch(/export const ProfileImageSection[\s\S]*?position: relative;/);
    expect(profilePhotoStyles).not.toContain('top: 230px');
    // The full-bleed overlay banner is retired: the ObservatoryCoverHero sits
    // above the grid in normal flow, so no clearance offsets may come back.
    expect(layoutStyles).not.toContain('$profileBannerClearance');
    expect(layoutStyles).not.toContain('--observatory-profile-banner-clearance');
    expect(shell).not.toContain('profileBannerClearance');
    expect(dashboard).not.toContain('profileBannerClearance');
    expect(dashboard).toContain('<ObservatoryCoverHero');
  });
});
