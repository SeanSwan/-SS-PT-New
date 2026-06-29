import React from 'react';
import { BarChart3, Brain, CalendarDays, CheckCircle, Dumbbell, Users } from 'lucide-react';
import { sanitizeImageUrl } from '../../../../utils/imageUrl';
import type { TrainerObservatoryLens } from './TrainerHomeObservatoryData';
import { TRAINER_OBSERVATORY_ASSETS } from './TrainerHomeObservatoryData';
import { TRAINER_HOME_LOG_WORKOUT_PATH } from './TrainerHomeQuickActions.config';
import {
  ArtworkBadge,
  ArtworkMeta,
  ArtworkPanel,
  ArtworkShade,
  ArtworkTitle,
  HeroActionButton,
  HeroActions,
  HeroArtwork,
  HeroAvatar,
  HeroCard,
  HeroCopy,
  HeroGrid,
  HeroHandle,
  HeroIdentity,
  HeroKicker,
  HeroStatCard,
  HeroStatLabel,
  HeroStats,
  HeroStatValue,
  HeroSubline,
  HeroTitle,
  LensButton,
  LensDetail,
  LensIcon,
  LensLabel,
  LensRail,
  ProfileRow,
  ProgressFill,
  ProgressTrack,
  TierMeta,
  TierRow,
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
  nextClientName: string | null;
  coachPath: string;
  lenses: readonly TrainerObservatoryLens[];
  onNavigate: (path: string) => void;
}

const metricValue = (loading: boolean, value: string | number): string | number => (loading ? '-' : value);

const TrainerHomeObservatoryHero: React.FC<TrainerHomeObservatoryHeroProps> = ({
  trainerName,
  trainerHandle,
  trainerPhotoUrl,
  level,
  loading,
  stats,
  nextClientName,
  coachPath,
  lenses,
  onNavigate,
}) => {
  const completion = Math.max(0, Math.min(100, Math.round(stats.completionRate)));
  const safePhoto = sanitizeImageUrl(trainerPhotoUrl) || TRAINER_OBSERVATORY_ASSETS.profileMark;
  const handleLabel = trainerHandle || 'Trainer Command';
  const nextCue = nextClientName
    ? `Next up: ${nextClientName}. Prime the session, log the proof, then review the progress signal.`
    : 'No booked client is waiting. Build the day from roster, schedule, Build Plan, or Swan Coach triage.';

  const heroActions = [
    { label: 'Log Workout', Icon: Dumbbell, path: TRAINER_HOME_LOG_WORKOUT_PATH, primary: true },
    { label: 'Ask Coach', Icon: Brain, path: coachPath, primary: false },
    { label: 'View Clients', Icon: Users, path: '/dashboard/trainer/clients', primary: false },
    { label: 'Progress', Icon: BarChart3, path: '/dashboard/trainer/client-progress', primary: false },
    { label: 'Schedule', Icon: CalendarDays, path: '/dashboard/trainer/schedule', primary: false },
  ] as const;

  return (
    <HeroCard aria-label="Trainer dashboard observatory">
      <HeroGrid>
        <HeroCopy>
          <ProfileRow>
            <HeroAvatar src={safePhoto} alt={`${trainerName} profile`} />
            <HeroIdentity>
              <HeroKicker>Welcome back, Coach</HeroKicker>
              <HeroTitle>{trainerName}</HeroTitle>
              <HeroHandle>{handleLabel}</HeroHandle>
            </HeroIdentity>
          </ProfileRow>

          <HeroSubline>{nextCue}</HeroSubline>

          <HeroStats aria-label="Trainer home momentum metrics">
            <HeroStatCard>
              <HeroStatValue>
                <Users size={18} aria-hidden="true" />
                {metricValue(loading, stats.clientsToday)}
              </HeroStatValue>
              <HeroStatLabel>Clients today</HeroStatLabel>
            </HeroStatCard>
            <HeroStatCard>
              <HeroStatValue>
                <Dumbbell size={18} aria-hidden="true" />
                {metricValue(loading, stats.sessionsToday)}
              </HeroStatValue>
              <HeroStatLabel>Sessions</HeroStatLabel>
            </HeroStatCard>
            <HeroStatCard>
              <HeroStatValue>
                <CheckCircle size={18} aria-hidden="true" />
                {metricValue(loading, `${completion}%`)}
              </HeroStatValue>
              <HeroStatLabel>Completion</HeroStatLabel>
            </HeroStatCard>
          </HeroStats>

          <TierRow>
            <TierMeta>
              <span>Trainer Level {level}</span>
              <span>{metricValue(loading, stats.hoursLogged.toFixed(1))} hours coached today</span>
            </TierMeta>
            <ProgressTrack aria-label={`Trainer day completion ${completion}%`}>
              <ProgressFill $value={loading ? 0 : completion} />
            </ProgressTrack>
          </TierRow>

          <HeroActions aria-label="Trainer command actions">
            {heroActions.map(({ label, Icon, path, primary }) => (
              <HeroActionButton
                key={label}
                type="button"
                $primary={primary}
                onClick={() => onNavigate(path)}
                aria-label={label}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </HeroActionButton>
            ))}
          </HeroActions>
        </HeroCopy>

        <ArtworkPanel aria-label="Trainer observatory artwork">
          <HeroArtwork src={TRAINER_OBSERVATORY_ASSETS.heroSwan} alt="Crystalline Swan trainer observatory" />
          <ArtworkShade>
            <ArtworkBadge>
              <Brain size={14} aria-hidden="true" />
              Trainer Command Observatory
            </ArtworkBadge>
            <div>
              <ArtworkTitle>{nextClientName || 'Build the day'}</ArtworkTitle>
              <ArtworkMeta>
                Roster, Coach, Build Plan, schedule, and progress proof stay one move from home.
              </ArtworkMeta>
            </div>
          </ArtworkShade>
        </ArtworkPanel>
      </HeroGrid>

      <LensRail aria-label="Trainer observatory lenses">
        {lenses.map(({ id, label, detail, path, Icon }) => {
          const lensPath = id === 'coach' ? coachPath : path;

          return (
            <LensButton
              key={id}
              type="button"
              $active={id === 'today'}
              onClick={() => onNavigate(lensPath)}
              aria-label={`Trainer lens: ${label}`}
            >
              <LensIcon aria-hidden="true"><Icon size={17} /></LensIcon>
              <span>
                <LensLabel>{label}</LensLabel>
                <LensDetail>{detail}</LensDetail>
              </span>
            </LensButton>
          );
        })}
      </LensRail>
    </HeroCard>
  );
};

export default TrainerHomeObservatoryHero;
