/**
 * ============================================================================
 * FILE: HomeTabHeroHeader.tsx
 * PURPOSE: Identity hero for the V3 dashboard Home — avatar, name, tier,
 *          stats — over the user's REAL cover composition, with the Edit
 *          Cover entry that opens the full embedded cover editor (photo /
 *          collage / layouts / presets). Extracted from HomeTabVisionCenter
 *          (rule 4 — 300-line cap) in workstream N3.
 * ============================================================================
 */
import React from 'react';
import { ImagePlus } from 'lucide-react';
import { Chip } from './HomeTabVisionCards.styles';
import { GlowSweep } from './HomeTabVision.styles';
import {
  CoverLayerHost,
  EditCoverButton,
  HeroForeground,
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
  LevelBadgeAnchor,
  NameRow,
  StatBlock,
  StatLabel,
  StatsStrip,
  StatValue,
} from './HomeTabVisionHero.styles';
import { HeroRanges, LevelHex, VerifiedMark } from './HomeTabVisionScenes';

interface HomeTabHeroHeaderProps {
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
  bannerLayer: React.ReactNode | null;
  onEditCover: () => void;
}

const swapToFallback = (fallbackSrc: string) => (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackSrc;
};

const HomeTabHeroHeader: React.FC<HomeTabHeroHeaderProps> = ({
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
  bannerLayer,
  onEditCover,
}) => (
  <HeroBanner>
    {bannerLayer ? (
      <CoverLayerHost aria-hidden="true">{bannerLayer}</CoverLayerHost>
    ) : (
      <HeroRangesLayer>
        <HeroRanges />
      </HeroRangesLayer>
    )}
    <GlowSweep />
    {/* Compact icon-only over a real cover so the photo/carousel stays
        unobstructed; full label only over the decorative backdrop. */}
    <EditCoverButton
      type="button"
      onClick={onEditCover}
      $compact={!!bannerLayer}
      aria-label={bannerLayer ? 'Edit cover' : 'Design your cover'}
      title={bannerLayer ? 'Edit cover' : 'Design your cover'}
    >
      <ImagePlus size={17} aria-hidden="true" />
      {!bannerLayer && 'Design your cover'}
    </EditCoverButton>
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
);

export default HomeTabHeroHeader;
