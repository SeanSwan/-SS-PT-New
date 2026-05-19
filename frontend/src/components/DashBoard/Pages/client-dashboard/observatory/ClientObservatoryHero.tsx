/**
 * FILE: ClientObservatoryHero.tsx
 * PURPOSE: Asset-driven profile hero for the canonical client overview.
 */

import React from 'react';
import { Calendar, UserRound } from 'lucide-react';
import {
  LENS_TABS,
  type LensId,
  OBSERVATORY_ASSETS,
  compactNumber,
} from './ClientObservatoryData';
import {
  GhostButton,
  PrimaryButton,
  ProgressFill,
  ProgressTrack,
} from './ClientObservatoryShell.styles';
import {
  ArtworkImage,
  ArtworkOverlay,
  ArtworkPanel,
  AvatarImage,
  AvatarShell,
  HeroActions,
  HeroCard,
  HeroCopy,
  HeroGrid,
  HeroHandle,
  HeroKicker,
  HeroStat,
  HeroStats,
  HeroSubline,
  HeroTitle,
  LensButton,
  LensRail,
  ProfileRow,
  ProfileText,
  StatLabel,
  StatValue,
  TierBadge,
} from './ClientObservatoryHero.styles';

interface ClientObservatoryHeroProps {
  activeLens: LensId;
  avatar: string;
  displayName: string;
  handle: string;
  level: number;
  points: number;
  progress: number;
  streakDays: number;
  tierLabel: string;
  tierTone: string;
  onLensSelect: (id: LensId, path: string) => void;
  onNavigate: (path: string) => void;
}

const ClientObservatoryHero: React.FC<ClientObservatoryHeroProps> = ({
  activeLens,
  avatar,
  displayName,
  handle,
  level,
  points,
  progress,
  streakDays,
  tierLabel,
  tierTone,
  onLensSelect,
  onNavigate,
}) => (
  <HeroCard aria-label="Client dashboard observatory">
    <HeroGrid>
      <HeroCopy>
        <div>
          <ProfileRow>
            <AvatarShell>
              <AvatarImage src={avatar} alt="" aria-hidden="true" />
            </AvatarShell>
            <ProfileText>
              <HeroKicker>Crystalline Creator Observatory</HeroKicker>
              <HeroTitle>{displayName}</HeroTitle>
              <HeroHandle>{handle}</HeroHandle>
            </ProfileText>
          </ProfileRow>

          <HeroSubline>
            Your training, community momentum, and rewards now live in one theme-aware command view.
          </HeroSubline>
        </div>

        <HeroStats aria-label="Profile momentum">
          <HeroStat>
            <StatValue>{compactNumber(points)}</StatValue>
            <StatLabel>XP Bank</StatLabel>
          </HeroStat>
          <HeroStat>
            <StatValue>{level}</StatValue>
            <StatLabel>Current Level</StatLabel>
          </HeroStat>
          <HeroStat>
            <StatValue>{streakDays}d</StatValue>
            <StatLabel>Training Streak</StatLabel>
          </HeroStat>
        </HeroStats>

        <div>
          <TierBadge $tone={tierTone}>{tierLabel}</TierBadge>
          <ProgressTrack
            role="progressbar"
            aria-label="XP progress to next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            $top="0.85rem"
          >
            <ProgressFill $pct={progress} />
          </ProgressTrack>
        </div>

        <HeroActions>
          <PrimaryButton type="button" onClick={() => onNavigate('/dashboard/client/schedule')}>
            <Calendar size={17} aria-hidden="true" />
            Book Session
          </PrimaryButton>
          <GhostButton type="button" onClick={() => onNavigate('/dashboard/client/profile')}>
            <UserRound size={17} aria-hidden="true" />
            View Profile
          </GhostButton>
        </HeroActions>
      </HeroCopy>

      <ArtworkPanel>
        <ArtworkImage src={OBSERVATORY_ASSETS.heroSwan} alt="Crystalline Swan training artwork" />
        <ArtworkOverlay>
          <HeroKicker>Momentum Lens</HeroKicker>
          <HeroSubline>Level {level} orbit, {progress}% toward the next unlock.</HeroSubline>
        </ArtworkOverlay>
      </ArtworkPanel>
    </HeroGrid>

    <LensRail aria-label="Dashboard lenses">
      {LENS_TABS.map(({ id, label, Icon, path }) => (
        <LensButton
          key={id}
          type="button"
          $active={id === activeLens}
          onClick={() => onLensSelect(id, path)}
          aria-pressed={id === activeLens}
        >
          <Icon size={22} aria-hidden="true" />
          <span>{label}</span>
        </LensButton>
      ))}
    </LensRail>
  </HeroCard>
);

export default ClientObservatoryHero;
