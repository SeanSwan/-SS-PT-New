import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

const socialFeedSource = readSource('./SocialFeed.tsx');
const readySource = readSource('./components/SocialFeedReady.tsx');
const sectionsSource = readSource('./components/SocialFeedSections.tsx');
const postStreamSource = readSource('./components/SocialFeedPostStream.tsx');
const stateSource = readSource('./components/SocialFeedState.tsx');
const panelsSource = readSource('./components/SocialFeedPanels.tsx');
const studioSource = readSource('./components/FeedCoverStudio.tsx');
const coverEditorSource = readSource('./components/SocialCoverEditor.tsx');
const coverPanelSource = readSource('./components/CoverStudioPanel.tsx');
const coverPanelPrimarySource = readSource('./components/CoverStudioPanel.primarySections.tsx');
const coverPanelTypesSource = readSource('./components/CoverStudioPanel.types.ts');
const studioStylesSource = readSource('./components/FeedCoverStudio.styles.ts');
const identityStylesSource = readSource('./components/FeedCoverIdentity.styles.ts');
const viewModelSource = readSource('./hooks/useSocialFeedViewModel.ts');
const socialFeedStylesSource = readSource('./styles/SocialFeedStyles.ts');

describe('SocialFeed cover studio contract', () => {
  it('mounts the cover studio on BOTH the canonical /social full feed and the compact dashboard feed (merge M1)', () => {
    expect(readySource).toContain('compact: SocialFeedCompactSections');
    expect(sectionsSource).toContain("import FeedCoverStudio from './FeedCoverStudio';");
    // One shared cover wrapper, rendered by BOTH variants.
    expect(sectionsSource.match(/<SocialFeedCover viewModel=\{viewModel\} \/>/g)).toHaveLength(2);
    expect(sectionsSource).toContain('stats={viewModel.feedStats}');
    expect(sectionsSource).toContain('onCreatePostFocus={viewModel.handleCreatePostFocus}');
    expect(sectionsSource).toContain('export const SocialFeedFullSections');
  });

  it('retires the duplicate fact blocks the cover replaces (no-duplicate-facts rule)', () => {
    // The cover metric rail now owns the feed numbers; the page sidebar +
    // Coach dock own identity/greeting. The old header + stats blocks are gone.
    expect(sectionsSource).not.toContain('<FullGamificationHeader');
    expect(sectionsSource).not.toContain('<FullFeedStats');
    expect(panelsSource).not.toContain('export const FullGamificationHeader');
    expect(panelsSource).not.toContain('export const FullFeedStats');
    // Still-live panels survive.
    expect(panelsSource).toContain('RecentActivityBanner');
    expect(panelsSource).toContain('EmptyFeedWelcome');
    expect(panelsSource).toContain('export interface FeedStatsSummary');
  });

  it('folds the real-data identity strip into the cover (merge M2)', () => {
    // View model composes identity from the gamification profile with the
    // auth user as fallback; null when nothing identifies the user.
    expect(viewModelSource).toContain('const identity = useMemo(');
    expect(viewModelSource).toContain('p?.tier || null');
    expect(viewModelSource).toContain('p?.streakDays ?? null');
    // Sections pass it through; the cover renders it conditionally.
    expect(sectionsSource).toContain('identity={viewModel.identity}');
    expect(studioSource).toContain('export interface CoverIdentity');
    expect(studioSource).toContain('{identity && (');
    expect(studioSource).toContain('<IdentityRow>');
    // Anonymous-safe: identity defaults to null, cover renders without it.
    expect(studioSource).toContain('identity = null');
    // Identity styles: 44px-class avatar, tokens, no animation (low-motion).
    expect(identityStylesSource).toContain('var(--accent-gold, #C6A84B)');
    expect(identityStylesSource).toContain('var(--accent-data, #50A0F0)');
    expect(identityStylesSource).not.toMatch(/keyframes|animation:/);
  });

  it('surfaces the user’s REAL banner as the cover backdrop (merge M5b)', () => {
    const hookSource = readSource('./hooks/useSocialCoverBanner.ts');
    const mediaLayerSource = readSource(
      '../../UserDashboard/components/UserDashboardBannerMediaLayer.tsx',
    );
    // Cover accepts the layer; decorative panels stay as the fallback.
    expect(studioSource).toContain('bannerLayer');
    expect(studioSource).toContain('{!bannerLayer && (');
    // Sections fetch + wire it, with the sticky strip hard-disabled on /social.
    expect(sectionsSource).toContain('useSocialCoverBanner');
    expect(sectionsSource).toContain('bannerStickyCarousel={false}');
    // The hook is the lightweight read — it never imports the heavy useProfile.
    expect(hookSource).not.toMatch(/import .*useProfile/);
    expect(hookSource).toContain('DEFAULT_BANNER_FRAME_HEIGHT');
    expect(hookSource).toContain('normalizeBannerFrameHeight');
    expect(hookSource).toContain('bannerFrameHeight: normalizeBannerFrameHeight(profile.bannerFrameHeight ?? DEFAULT_BANNER_FRAME_HEIGHT)');
    expect(hookSource).toContain('decorative fallback');
    // Crossfade hero: reduced-motion users get a static photo (no cycling),
    // and the media layer drives the index adaptively in JS.
    expect(mediaLayerSource).toContain("'(prefers-reduced-motion: reduce)'");
    expect(mediaLayerSource).toContain('setCrossfadeIndex');
  });

  it('embeds the cover editor on the hub, now canonical at /user-dashboard (merge M7)', () => {
    const editorSource = coverEditorSource;
    const routesSource = readSource('../../../routes/main-routes.tsx');
    // The editor reuses the banner machinery - no forks, and now makes drag
    // repositioning the primary way to save the focal point.
    expect(editorSource).toContain('useBannerCompositionState');
    expect(editorSource).toContain('CoverStudioPanel');
    expect(editorSource).toContain('uploadBannerPhoto');
    expect(editorSource).toContain('onPointerDown={handlePreviewPointerDown}');
    expect(editorSource).toContain('handleBannerCropCommit(next)');
    expect(coverPanelTypesSource).toContain("export type CoverType = 'single' | 'stage' | 'carousel' | 'collage'");
    expect(coverPanelTypesSource).toContain('BANNER_CAROUSEL_LAYOUT_OPTIONS');
    expect(coverPanelPrimarySource).toContain('Vitrine</b> keeps the hero whole with atmospheric fill.');
    expect(coverPanelPrimarySource).toContain("selectedLayout !== 'smart-carousel' && selectedLayout !== 'vitrine'");
    expect(coverPanelPrimarySource).toContain('Need the full photo visible? Use Smart or Vitrine');
    expect(coverPanelSource).toContain('bannerStickyCarousel');
    // The cover exposes the entry; sections lazy-mount the editor and refresh
    // the live cover when it closes.
    expect(studioSource).toContain('onEditCover');
    expect(sectionsSource).toContain('SocialCoverEditor');
    expect(sectionsSource).toContain('setCoverRefreshKey');
    // Workstream O: the V3 Observatory mounts at /user-dashboard; the feed
    // tab folded into Home, so /social redirects to the dashboard root (the
    // cover editor now opens from Home's hero and the non-home cover hero).
    expect(routesSource).toMatch(/path: 'user-dashboard',\s*element: \(\s*<ProtectedRoute>/);
    expect(routesSource).toMatch(/path: 'social',\s*element: <Navigate to="\/user-dashboard" replace \/>/);
    expect(routesSource).toContain("import('../components/UserDashboard/UserDashboard.V3')");
  });
  it('keeps the crossfade layout in lockstep across frontend and backend (drift guard)', () => {
    const compositionSource = readSource('../../../services/profileBannerComposition.ts');
    const backendController = readSource(
      '../../../../../backend/controllers/profileController.mjs',
    );
    expect(compositionSource).toContain("'crossfade',");
    expect(backendController).toContain("'crossfade',");
  });

  it('kills the cover bottom dead-zone: responsive stage height, lighter bottom padding', () => {
    // Fixed 230px stage was the awkward dead block on phones/narrow columns.
    expect(studioStylesSource).not.toContain('min-height: 230px');
    expect(studioStylesSource).toMatch(/min-height: clamp\(/);
  });

  it('routes the banner create action to the existing composer', () => {
    expect(viewModelSource).toContain('const createPostAnchorRef = useRef<HTMLDivElement>(null);');
    expect(viewModelSource).toContain('composer.scrollIntoView({');
    expect(viewModelSource).toContain("composer.querySelector<HTMLElement>('textarea, input, [contenteditable=\"true\"]')");
    expect(readySource).toContain('<div id="swan-create-post" ref={viewModel.createPostAnchorRef}>');
    expect(socialFeedSource).not.toContain('window.location.reload()');
  });

  it('keeps the studio mobile-safe, tokenized, and motion-aware', () => {
    expect(studioSource).toContain('interface FeedCoverStats');
    expect(studioSource).toContain('Feed Cover Studio');
    expect(studioSource).toContain('Make the proof visible.');
    expect(studioSource).toContain('onCreatePostFocus');

    expect(studioStylesSource).toContain('min-height: 44px;');
    expect(studioStylesSource).toContain('container-type: inline-size;');
    expect(studioStylesSource).toContain('@container (min-width: 720px)');
    expect(studioStylesSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(studioStylesSource).toContain('var(--accent-primary, #60C0F0)');
    expect(studioStylesSource).toContain('var(--bg-base, #030712)');
    expect(studioStylesSource).not.toContain('@mui');
    expect(studioStylesSource).not.toContain('tailwind');
  });

  it('keeps the feed refactor split into tokenized files under the size cap', () => {
    [
      ['./SocialFeed.tsx', socialFeedSource],
      ['./components/SocialFeedReady.tsx', readySource],
      ['./components/SocialFeedSections.tsx', sectionsSource],
      ['./components/SocialFeedPostStream.tsx', postStreamSource],
      ['./components/SocialFeedState.tsx', stateSource],
      ['./components/SocialFeedPanels.tsx', panelsSource],
      ['./components/FeedCoverStudio.tsx', studioSource],
      ['./components/FeedCoverStudio.styles.ts', studioStylesSource],
      ['./components/FeedCoverIdentity.styles.ts', identityStylesSource],
      ['./hooks/useSocialFeedViewModel.ts', viewModelSource],
      ['./styles/SocialFeedStyles.ts', socialFeedStylesSource],
    ].forEach(([file, source]) => {
      expect(source.split(/\r?\n/).length, `${file} must stay under 300 lines`)
        .toBeLessThanOrEqual(300);
    });

    expect(socialFeedStylesSource).toContain('min-height: 44px;');
    expect(socialFeedStylesSource).toContain('@media (prefers-reduced-motion: reduce)');

    [
      socialFeedSource,
      readySource,
      sectionsSource,
      postStreamSource,
      stateSource,
      panelsSource,
      socialFeedStylesSource,
      studioStylesSource,
      identityStylesSource,
      viewModelSource,
    ].forEach((source) => {
      expect(source).not.toContain('rgba(');
      expect(source).not.toContain('#fff');
      expect(source).not.toContain('color: white');
      expect(source).not.toContain('background: #');
    });
  });
});
