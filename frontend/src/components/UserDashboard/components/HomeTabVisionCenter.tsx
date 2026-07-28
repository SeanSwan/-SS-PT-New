/**
 * FILE: HomeTabVisionCenter.tsx
 * PURPOSE: Center column for the Claude Design Creator Observatory Home view.
 */

import React, { lazy, Suspense } from 'react';
import {
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Video,
} from 'lucide-react';
import type { HomeLatestPostView, HomeTopBarAction, HomeTopBarTarget } from './HomeTabViewModel';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import type { FeedEnrichmentItem } from '../../../hooks/social/useFeedEnrichment';
import type { HomeFeedFocus } from './HomeFeedFocus';
import { HERO_LENSES, POST_MOODS, type VisionTarget } from './HomeTabVision.data';
import {
  CenterColumn,
  Eyebrow,
  Panel,
  TopBar,
  IconButton,
  MobileBrandText,
  NotifyDot,
  XpPill,
} from './HomeTabVision.styles';
import {
  CenterGrid,
  Chip,
  ComposerInput,
  GlassButton,
  MoodButton,
  MoodScroller,
  VideoFrame,
} from './HomeTabVisionCards.styles';
import {
  CaptionCopy,
  ComposerActions,
  IntentPreview,
  IntentTag,
  SpotlightImage,
  SpotlightVideo,
  SpreadButtonRow,
} from './HomeTabVisionCenter.styles';
import HomeTabSelectedMediaPreview from './HomeTabSelectedMediaPreview';
import UserDashboardQuickStatsTicker, { type QuickStatsTickerStat } from './UserDashboardQuickStatsTicker';
import {
  LensButton,
  LensPuck,
  LensStrip,
} from './HomeTabVisionHero.styles';

// Lazy: PostCard + comment machinery stay out of Home's initial chunk.
const HomeCommunityFeed = lazy(() => import('./HomeCommunityFeed'));

interface HomeTabVisionCenterProps {
  points: number;
  activeLens: string;
  postText: string;
  activeMood: string;
  selectedMediaName?: string;
  selectedMediaPreviewUrl?: string | null;
  selectedMediaType?: string;
  mediaError?: string | null;
  /** O3: the single stateful feed mount (owned by HomeTab) - powers the
      community stream below the composer. */
  communityFeed: SocialFeedApi;
  quickStats: QuickStatsTickerStat[];
  supportPanels?: React.ReactNode;
  feedEnrichmentItems: FeedEnrichmentItem[];
  feedFocus: HomeFeedFocus;
  /** O3: true while "Share my week" has armed the workout-proof attachment. */
  proofAttached: boolean;
  /** Live preview of the smart type + hashtags the quick post will ship with. */
  postIntentPreview: { type: string; label: string | null; hashtags: string[] } | null;
  /** Real latest feed post - null renders honest empty states. */
  latestPost: HomeLatestPostView | null;
  canPost: boolean;
  isPosting: boolean;
  onAction: (target: VisionTarget) => void;
  onUtilityAction: (target: HomeTopBarTarget) => void;
  onSetMood: (mood: string) => void;
  onAddMediaClick: () => void;
  onClearMedia: () => void;
  onPostTextChange: (value: string) => void;
  onSubmitPost: (event: React.FormEvent<HTMLFormElement>) => void;
  onClearFeedFocus: () => void;
  topBarActions: ReadonlyArray<HomeTopBarAction>;
}

const HomeTabVisionCenter: React.FC<HomeTabVisionCenterProps> = ({
  points,
  activeLens,
  postText,
  activeMood,
  selectedMediaName,
  selectedMediaPreviewUrl,
  selectedMediaType,
  mediaError,
  communityFeed,
  quickStats,
  supportPanels,
  feedEnrichmentItems,
  feedFocus,
  proofAttached,
  postIntentPreview,
  latestPost,
  canPost,
  isPosting,
  onAction,
  onUtilityAction,
  onSetMood,
  onAddMediaClick,
  onClearMedia,
  onPostTextChange,
  onSubmitPost,
  onClearFeedFocus,
  topBarActions,
}) => (
  <CenterColumn>
    <TopBar aria-label="Dashboard utility actions">
      <MobileBrandText aria-label="SwanStudios Crystalline Observatory">
        <strong>SwanStudios</strong>
        <span>Crystalline Observatory</span>
      </MobileBrandText>
      {/* Utility actions route to real dashboard surfaces. */}
      {topBarActions.map(({ label, Icon, count, target }) => (
        <IconButton
          key={label}
          type="button"
          aria-label={label}
          onClick={target ? () => onUtilityAction(target) : undefined}
        >
          <Icon size={18} aria-hidden="true" />
          {count > 0 && <NotifyDot>{count}</NotifyDot>}
        </IconButton>
      ))}
      <XpPill type="button" aria-label={`${points.toLocaleString()} XP balance`}>
        <span>XP</span>
        {points.toLocaleString()} XP
      </XpPill>
    </TopBar>

    <LensStrip aria-label="Creator dashboard sections">
      {HERO_LENSES.map(({ id, label, Icon, target }) => (
        <LensButton key={id} type="button" $active={activeLens === id} onClick={() => onAction(target)}>
          <LensPuck $active={activeLens === id}>
            <Icon size={25} aria-hidden="true" />
          </LensPuck>
          <span>{label}</span>
        </LensButton>
      ))}
    </LensStrip>

    <CenterGrid>
      <Panel $tone="violet">
        <SpreadButtonRow>
          <Eyebrow $tone="violet">
            <Sparkles size={14} aria-hidden="true" />
            Latest Drop
          </Eyebrow>
          {latestPost?.mediaUrl && <Chip $tone="violet">From your feed</Chip>}
        </SpreadButtonRow>
        {latestPost?.mediaUrl ? (
          <>
            <VideoFrame>
              {latestPost.isVideo ? (
                <SpotlightVideo src={latestPost.mediaUrl} controls muted playsInline preload="metadata" />
              ) : (
                <SpotlightImage src={latestPost.mediaUrl} alt="Latest post media" />
              )}
            </VideoFrame>
            {latestPost.caption && <CaptionCopy>{latestPost.caption}</CaptionCopy>}
          </>
        ) : (
          <>
            <CaptionCopy>
              No media drops yet - your latest photo or clip will headline here.
            </CaptionCopy>
            <ComposerActions>
              <GlassButton type="button" $variant="ghost" onClick={() => onAction('reels')}>
                <Video size={15} aria-hidden="true" />
                Open Reels
              </GlassButton>
            </ComposerActions>
          </>
        )}
      </Panel>

      <Panel as="form" $tone="cyan" onSubmit={onSubmitPost}>
        <SpreadButtonRow>
          <Eyebrow>Quick Post</Eyebrow>
          {/* O3: "Share my week" armed - this post ships as REAL workout
              proof (type workout + the latest session link). */}
          {proofAttached && <Chip $tone="gold">Workout proof attached</Chip>}
        </SpreadButtonRow>
        <ComposerInput
          value={postText}
          onChange={(event) => onPostTextChange(event.target.value)}
          placeholder="What are you creating today?"
          aria-label="Create a community post"
          maxLength={500}
        />
        <MoodScroller aria-label="Post category">
          {POST_MOODS.map(({ id, label, Icon }) => (
            <MoodButton key={id} type="button" $active={activeMood === id} onClick={() => onSetMood(id)}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </MoodButton>
          ))}
        </MoodScroller>
        {/* Workstream N3: the smart-hashtag truth-line - exactly what this
            post will ship as (same inference path as the submit payload). */}
        {postIntentPreview && postIntentPreview.hashtags.length > 0 && (
          <IntentPreview aria-live="polite">
            <span>Posts as {postIntentPreview.label ?? postIntentPreview.type} with</span>
            {postIntentPreview.hashtags.map((tag) => (
              <IntentTag key={tag}>{tag}</IntentTag>
            ))}
          </IntentPreview>
        )}
        {mediaError && (
          <IntentPreview role="alert">
            <span>{mediaError}</span>
          </IntentPreview>
        )}
        {selectedMediaPreviewUrl && (
          <HomeTabSelectedMediaPreview
            previewUrl={selectedMediaPreviewUrl}
            mediaType={selectedMediaType}
            fileName={selectedMediaName}
            onClear={onClearMedia}
          />
        )}
        <ComposerActions>
          <GlassButton
            type="button"
            $variant="ghost"
            onClick={onAddMediaClick}
            title={selectedMediaName || 'Add media to post'}
          >
            <ImagePlus size={15} aria-hidden="true" />
            {selectedMediaName ? 'Media Ready' : 'Add Media'}
          </GlassButton>
          <GlassButton type="submit" $variant="primary" disabled={!canPost}>
            {isPosting ? <Loader2 size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            Post It
          </GlassButton>
        </ComposerActions>
      </Panel>
    </CenterGrid>

    {/* Workstream O2: the REAL scrolling community feed lives on Home now -
        full PostCard interactions + infinite scroll (the retired Feed tab's
        single duplicated surface). Replaces the old one-post feed card; the
        Latest Drop spotlight above still owns the user's own latest media. */}
    <UserDashboardQuickStatsTicker stats={quickStats} />
    {supportPanels}

    <Suspense fallback={null}>
      <HomeCommunityFeed
        feed={communityFeed}
        enrichmentItems={feedEnrichmentItems}
        focus={feedFocus}
        onClearFocus={onClearFeedFocus}
      />
    </Suspense>
  </CenterColumn>
);

export default HomeTabVisionCenter;
