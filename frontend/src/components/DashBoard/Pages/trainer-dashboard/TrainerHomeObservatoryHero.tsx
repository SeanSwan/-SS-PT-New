import React from 'react';
import { sanitizeImageUrl } from '../../../../utils/imageUrl';
import { TRAINER_OBSERVATORY_ASSETS } from './TrainerHomeObservatoryData';
import {
  HeroAvatar,
  HeroCard,
  HeroHandle,
  HeroIdentity,
  HeroKicker,
  HeroTitle,
  IdentityBar,
  IdentityMeta,
  IdentityProgressFill,
  IdentityProgressTrack,
  ProfileRow,
} from './TrainerHomeObservatoryHero.styles';

interface TrainerHomeHeroStats {
  clientsToday: number;
  sessionsToday: number;
  completionRate: number;
  hoursLogged: number;
}

interface TrainerHomeObservatoryHeroProps {
  trainerName: string;
  trainerHandle?: string;
  trainerPhotoUrl?: string | null;
  level: number;
  loading: boolean;
  stats: TrainerHomeHeroStats;
}

const metricValue = (loading: boolean, value: string | number): string | number => (loading ? '-' : value);

const TrainerHomeObservatoryHero: React.FC<TrainerHomeObservatoryHeroProps> = ({
  trainerName,
  trainerHandle,
  trainerPhotoUrl,
  level,
  loading,
  stats,
}) => {
  const completion = Math.max(0, Math.min(100, Math.round(stats.completionRate)));
  const safePhoto = sanitizeImageUrl(trainerPhotoUrl) || TRAINER_OBSERVATORY_ASSETS.profileMark;
  const handleLabel = trainerHandle || 'Trainer Command';

  // Slim identity bar (Kimi K3, 2026-07-23): a trainer console is not a champion
  // dashboard. The hero's stats, action buttons, and lens rail duplicated the
  // KPI strip, NextActionCard, and Quick Actions below, so they were removed.
  // This carries ONLY the unique bits: who you are, your level, day-progress.
  return (
    <HeroCard aria-label="Trainer identity">
      <IdentityBar>
        <ProfileRow>
          <HeroAvatar src={safePhoto} alt={`${trainerName} profile`} />
          <HeroIdentity>
            <HeroKicker>Welcome back, Coach</HeroKicker>
            <HeroTitle>{trainerName}</HeroTitle>
            <HeroHandle>{handleLabel}</HeroHandle>
          </HeroIdentity>
        </ProfileRow>

        <IdentityMeta>
          <span>Trainer Level {level}</span>
          <span>{metricValue(loading, stats.hoursLogged.toFixed(1))} hours coached today</span>
          <IdentityProgressTrack aria-label={`Trainer day completion ${completion}%`}>
            <IdentityProgressFill $value={loading ? 0 : completion} />
          </IdentityProgressTrack>
        </IdentityMeta>
      </IdentityBar>
    </HeroCard>
  );
};

export default TrainerHomeObservatoryHero;
