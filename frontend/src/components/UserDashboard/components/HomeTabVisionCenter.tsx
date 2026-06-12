/**
 * FILE: HomeTabVisionCenter.tsx
 * PURPOSE: Center column for the Claude Design Creator Observatory Home view.
 */

import React from 'react';
import {
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Video,
} from 'lucide-react';
import type { HomeLatestPostView } from './HomeTabViewModel';
import HomeTabHeroHeader from './HomeTabHeroHeader';
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
  AvatarMini,
  ButtonRow,
  CenterGrid,
  Chip,
  ComposerInput,
  FeedCard,
  FeedHeader,
  GlassButton,
  MoodButton,
  MoodScroller,
  VideoFrame,
} from './HomeTabVisionCards.styles';
import {
  CaptionCopy,
  ComposerActions,
  FeedCopy,
  FeedVideoFrame,
  HandleStamp,
  IntentPreview,
  IntentTag,
  SpotlightImage,
  SpotlightVideo,
  SpreadButtonRow,
} from './HomeTabVisionCenter.styles';
import {
  LensButton,
  LensPuck,
  LensStrip,
} from './HomeTabVisionHero.styles';

interface HomeTabVisionCenterProps {
  avatarSrc: string;
  fallbackAvatarSrc: string;
  displayName: string;
  handle: string;
  tierName: string;
  level: number;
  points: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  activeLens: string;
  postText: string;
  activeMood: string;
  selectedMediaName?: string;
  /** Real cover composition (photo/collage/carousel) — null keeps the decorative backdrop. */
  bannerLayer: React.ReactNode | null;
  /** Opens the embedded cover editor (photo/collage/layouts/presets). */
  onEditCover: () => void;
  /** Lazy-mounted SocialCoverEditor instance while editing — renders under the hero. */
  coverEditorSlot: React.ReactNode | null;
  /** Live preview of the smart type + hashtags the quick post will ship with. */
  postIntentPreview: { type: string; label: string | null; hashtags: string[] } | null;
  /** Real latest feed post — null renders honest empty states. */
  latestPost: HomeLatestPostView | null;
  canPost: boolean;
  isPosting: boolean;
  onAction: (target: VisionTarget) => void;
  onSetMood: (mood: string) => void;
  onAddMediaClick: () => void;
  onPostTextChange: (value: string) => void;
  onSubmitPost: (event: React.FormEvent<HTMLFormElement>) => void;
  topBarActions: ReadonlyArray<{ label: string; Icon: React.ElementType; count: number }>;
}

const swapToFallback = (fallbackSrc: string) => (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackSrc;
};

const HomeTabVisionCenter: React.FC<HomeTabVisionCenterProps> = ({
  avatarSrc,
  fallbackAvatarSrc,
  displayName,
  handle,
  tierName,
  level,
  points,
  postsCount,
  followersCount,
  followingCount,
  activeLens,
  postText,
  activeMood,
  selectedMediaName,
  bannerLayer,
  onEditCover,
  coverEditorSlot,
  postIntentPreview,
  latestPost,
  canPost,
  isPosting,
  onAction,
  onSetMood,
  onAddMediaClick,
  onPostTextChange,
  onSubmitPost,
  topBarActions,
}) => (
  <CenterColumn>
    <TopBar aria-label="Dashboard utility actions">
      <MobileBrandText aria-label="SwanStudios Crystalline Observatory">
        <strong>SwanStudios</strong>
        <span>Crystalline Observatory</span>
      </MobileBrandText>
      {topBarActions.map(({ label, Icon, count }) => (
        <IconButton key={label} type="button" aria-label={label}>
          <Icon size={18} aria-hidden="true" />
          {count > 0 && <NotifyDot>{count}</NotifyDot>}
        </IconButton>
      ))}
      <XpPill type="button" aria-label={`${points.toLocaleString()} XP balance`}>
        <span>XP</span>
        {points.toLocaleString()} XP
      </XpPill>
    </TopBar>

    <HomeTabHeroHeader
      avatarSrc={avatarSrc}
      fallbackAvatarSrc={fallbackAvatarSrc}
      displayName={displayName}
      handle={handle}
      tierName={tierName}
      level={level}
      points={points}
      postsCount={postsCount}
      followersCount={followersCount}
      followingCount={followingCount}
      bannerLayer={bannerLayer}
      onEditCover={onEditCover}
    />
    {coverEditorSlot}

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
              No media drops yet — your latest photo or clip will headline here.
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
        {/* Workstream N3: the smart-hashtag truth-line — exactly what this
            post will ship as (same inference path as the submit payload). */}
        {postIntentPreview && postIntentPreview.hashtags.length > 0 && (
          <IntentPreview aria-live="polite">
            <span>Posts as {postIntentPreview.label ?? postIntentPreview.type} with</span>
            {postIntentPreview.hashtags.map((tag) => (
              <IntentTag key={tag}>{tag}</IntentTag>
            ))}
          </IntentPreview>
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

    {/* Workstream N2: the feed card shows the REAL latest post — real
        timestamp, real engagement counts, real media — or nothing at all. */}
    {latestPost ? (
      <Panel as={FeedCard}>
        <FeedHeader>
          <ButtonRow>
            <AvatarMini>
              <img src={avatarSrc} alt="" aria-hidden="true" onError={swapToFallback(fallbackAvatarSrc)} />
            </AvatarMini>
            <div>
              <strong>{displayName}</strong>
              <HandleStamp>{handle} · {latestPost.timeAgo}</HandleStamp>
            </div>
          </ButtonRow>
        </FeedHeader>
        <FeedCopy>
          {latestPost.caption || 'Shared a new drop.'}
        </FeedCopy>
        {latestPost.mediaUrl && (
          <FeedVideoFrame>
            {latestPost.isVideo ? (
              <SpotlightVideo src={latestPost.mediaUrl} controls muted playsInline preload="metadata" />
            ) : (
              <SpotlightImage src={latestPost.mediaUrl} alt="Post media" />
            )}
          </FeedVideoFrame>
        )}
        <ButtonRow>
          <Chip>{latestPost.likes.toLocaleString()} likes</Chip>
          <Chip $tone="violet">{latestPost.comments.toLocaleString()} comments</Chip>
        </ButtonRow>
      </Panel>
    ) : (
      <Panel as={FeedCard}>
        <FeedCopy>Your first post will land here — share what you're building above.</FeedCopy>
      </Panel>
    )}
  </CenterColumn>
);

export default HomeTabVisionCenter;
