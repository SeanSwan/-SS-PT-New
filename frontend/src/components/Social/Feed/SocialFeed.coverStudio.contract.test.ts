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
const studioStylesSource = readSource('./components/FeedCoverStudio.styles.ts');
const viewModelSource = readSource('./hooks/useSocialFeedViewModel.ts');
const socialFeedStylesSource = readSource('./styles/SocialFeedStyles.ts');

describe('SocialFeed compact cover studio contract', () => {
  it('mounts the cover studio only on the user-dashboard compact feed', () => {
    expect(readySource).toContain('compact: SocialFeedCompactSections');
    expect(sectionsSource).toContain("import FeedCoverStudio from './FeedCoverStudio';");
    expect(sectionsSource).toContain('<FeedCoverStudio');
    expect(sectionsSource).toContain('stats={viewModel.feedStats}');
    expect(sectionsSource).toContain('onCreatePostFocus={viewModel.handleCreatePostFocus}');
    expect(sectionsSource).toContain('export const SocialFeedFullSections');
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
      viewModelSource,
    ].forEach((source) => {
      expect(source).not.toContain('rgba(');
      expect(source).not.toContain('#fff');
      expect(source).not.toContain('color: white');
      expect(source).not.toContain('background: #');
    });
  });
});
