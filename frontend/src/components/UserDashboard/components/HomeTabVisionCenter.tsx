/**
 * FILE: HomeTabVisionCenter.tsx
 * PURPOSE: Center column for the Claude Design Creator Observatory Home view.
 */

import React from 'react';
import styled from 'styled-components';
import {
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Play,
  Send,
  Sparkles,
} from 'lucide-react';
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
  PlayBadge,
  VideoFrame,
} from './HomeTabVisionCards.styles';
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
import { CrystalScene, HeroRanges, LevelHex, VerifiedMark } from './HomeTabVisionScenes';

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
  latestCaption: string;
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

const SpreadButtonRow = styled(ButtonRow)`
  justify-content: space-between;
  margin-bottom: 0.85rem;
`;

const ComposerActions = styled(ButtonRow)`
  justify-content: space-between;
  margin-top: 0.75rem;
`;

const SpotlightTitle = styled.h2`
  margin: 0.85rem 0 0.25rem;
  font-size: 1.35rem;
`;

const CaptionCopy = styled.p`
  margin: 0;
  color: var(--vision-soft);
  line-height: 1.55;
`;

const HandleStamp = styled.div`
  color: var(--vision-soft);
  font-size: 0.8rem;
`;

const FeedCopy = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.6;
`;

const FeedVideoFrame = styled(VideoFrame)`
  min-height: 280px;
`;

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
  latestCaption,
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
      <HeroRangesLayer>
        <HeroRanges />
      </HeroRangesLayer>
      <GlowSweep />
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
            Reels Spotlight
          </Eyebrow>
          <Chip $tone="violet">Reel of the Day</Chip>
        </SpreadButtonRow>
        <VideoFrame>
          <CrystalScene tone="violet" />
          <PlayBadge type="button" aria-label="Preview spotlight reel">
            <Play size={22} fill="currentColor" aria-hidden="true" />
          </PlayBadge>
        </VideoFrame>
        <SpotlightTitle>Rise Through</SpotlightTitle>
        <CaptionCopy>{latestCaption}</CaptionCopy>
      </Panel>

      <Panel as="form" $tone="cyan" onSubmit={onSubmitPost}>
        <SpreadButtonRow>
          <Eyebrow>Quick Post</Eyebrow>
          <Chip $tone="gold">+25 XP</Chip>
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

    <Panel as={FeedCard}>
      <FeedHeader>
        <ButtonRow>
          <AvatarMini>
            <img src={avatarSrc} alt="" aria-hidden="true" onError={swapToFallback(fallbackAvatarSrc)} />
          </AvatarMini>
          <div>
            <strong>{displayName}</strong>
            <HandleStamp>{handle} · just now</HandleStamp>
          </div>
        </ButtonRow>
        <ButtonRow>
          <Chip $tone="gold">+25 XP</Chip>
          <IconButton type="button" aria-label="Post options">
            <MoreHorizontal size={18} aria-hidden="true" />
          </IconButton>
        </ButtonRow>
      </FeedHeader>
      <FeedCopy>
        {latestCaption || 'New set. New energy. Let us build.'}
      </FeedCopy>
      <FeedVideoFrame>
        <CrystalScene tone="cyan" />
        <PlayBadge type="button" aria-label="Preview feed media">
          <Play size={22} fill="currentColor" aria-hidden="true" />
        </PlayBadge>
      </FeedVideoFrame>
      <ButtonRow>
        <Chip>1.3K likes</Chip>
        <Chip $tone="violet">86 comments</Chip>
        <Chip $tone="gold">96 shares</Chip>
      </ButtonRow>
    </Panel>
  </CenterColumn>
);

export default HomeTabVisionCenter;
