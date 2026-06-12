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
import { HERO_LENSES, POST_MOODS, type VisionTarget } from './HomeTabVision.data';
import {
  CenterColumn,
  Eyebrow,
  GlowSweep,
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
  CoverLayerHost,
  FeedCopy,
  FeedVideoFrame,
  HandleStamp,
  HeroForeground,
  SpotlightImage,
  SpotlightVideo,
  SpreadButtonRow,
} from './HomeTabVisionCenter.styles';
import {
  AvatarFrame,
  AvatarInner,
  HeroBanner,
  HeroContent,
  HeroMeta,
  HeroName,
  HeroRangesLayer,
  HeroTagline,
  LensButton,
  LensPuck,
  LensStrip,
  LevelBadgeAnchor,
  NameRow,
  StatBlock,
  StatLabel,
  StatsStrip,
  StatValue,
} from './HomeTabVisionHero.styles';
import { HeroRanges, LevelHex, VerifiedMark } from './HomeTabVisionScenes';

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

    <HeroBanner>
      {bannerLayer ? (
        <CoverLayerHost aria-hidden="true">{bannerLayer}</CoverLayerHost>
      ) : (
        <HeroRangesLayer>
          <HeroRanges />
        </HeroRangesLayer>
      )}
      <GlowSweep />
      <HeroForeground>
      <HeroContent>
        <AvatarFrame>
          <AvatarInner>
            <img src={avatarSrc} alt="" aria-hidden="true" onError={swapToFallback(fallbackAvatarSrc)} />
          </AvatarInner>
          <LevelBadgeAnchor>
            <LevelHex level={level} />
          </LevelBadgeAnchor>
        </AvatarFrame>

        <div>
          <NameRow>
            <HeroName>{displayName}</HeroName>
            <VerifiedMark />
          </NameRow>
          <HeroMeta>
            <span>{handle}</span>
            <Chip $tone="violet">{tierName}</Chip>
            <Chip>Creator</Chip>
          </HeroMeta>
          <HeroTagline>Create. Inspire. Level Up.</HeroTagline>
        </div>

        <StatsStrip aria-label="Creator stats">
          <StatBlock>
            <StatLabel>Posts</StatLabel>
            <StatValue>{postsCount.toLocaleString()}</StatValue>
          </StatBlock>
          <StatBlock>
            <StatLabel>Followers</StatLabel>
            <StatValue>{followersCount.toLocaleString()}</StatValue>
          </StatBlock>
          <StatBlock>
            <StatLabel>Following</StatLabel>
            <StatValue>{followingCount.toLocaleString()}</StatValue>
          </StatBlock>
          <StatBlock>
            <StatLabel>XP Balance</StatLabel>
            <StatValue $gold>{points.toLocaleString()}</StatValue>
          </StatBlock>
        </StatsStrip>
      </HeroContent>
      </HeroForeground>
    </HeroBanner>

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
