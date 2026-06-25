import React from 'react';
import { BarChart3, Brain, Dumbbell } from 'lucide-react';
import SwanCoachDockTrainer from './SwanCoachDockTrainer';
import type { TrainerObservatoryLens } from './TrainerHomeObservatoryData';
import { TRAINER_HOME_LOG_WORKOUT_PATH } from './TrainerHomeQuickActions.config';
import { TrainerHeroPanel, TrainerHomeHeroGrid } from './TrainerHomeTab.layoutStyles';
import {
  HeroActionButton,
  HeroActionRow,
  HeroCommandPanel,
  HeroCopy,
  HeroKicker,
  HeroMeta,
  HeroMetric,
  HeroMetricLabel,
  HeroMetricValue,
  HeroStatGrid,
  HeroTitle,
  LensButton,
  LensDetail,
  LensIcon,
  LensLabel,
  LensRail,
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
  const nextCue = nextClientName
    ? `Next up: ${nextClientName}. Prime, log, and turn the session into progress proof.`
    : 'No booked client is waiting. Build the day from roster, schedule, or Swan Coach triage.';

  return (
    <TrainerHomeHeroGrid aria-label="Trainer command observatory">
      <TrainerHeroPanel>
        <SwanCoachDockTrainer
          trainerName={trainerName}
          sessionCount={stats.sessionsToday}
          level={level}
          trainerHandle={trainerHandle}
          trainerPhotoUrl={trainerPhotoUrl}
          loading={loading}
          coachPath={coachPath}
          onNavigate={onNavigate}
        />
      </TrainerHeroPanel>

      <HeroCommandPanel>
        <HeroCopy>
          <HeroKicker>Trainer command observatory</HeroKicker>
          <HeroTitle>Coach the next client, log proof, and move progress forward.</HeroTitle>
          <HeroMeta>{nextCue}</HeroMeta>
        </HeroCopy>

        <HeroStatGrid aria-label="Trainer home momentum metrics">
          <HeroMetric>
            <HeroMetricValue>
              <Dumbbell size={18} aria-hidden="true" />
              {metricValue(loading, stats.sessionsToday)}
            </HeroMetricValue>
            <HeroMetricLabel>Sessions today</HeroMetricLabel>
          </HeroMetric>
          <HeroMetric>
            <HeroMetricValue>
              <BarChart3 size={18} aria-hidden="true" />
              {metricValue(loading, `${completion}%`)}
            </HeroMetricValue>
            <HeroMetricLabel>Completion</HeroMetricLabel>
          </HeroMetric>
          <HeroMetric>
            <HeroMetricValue>
              <Brain size={18} aria-hidden="true" />
              {metricValue(loading, stats.hoursLogged.toFixed(1))}
            </HeroMetricValue>
            <HeroMetricLabel>Hours coached</HeroMetricLabel>
          </HeroMetric>
        </HeroStatGrid>

        <HeroActionRow aria-label="Trainer command actions">
          <HeroActionButton
            type="button"
            $primary
            onClick={() => onNavigate(TRAINER_HOME_LOG_WORKOUT_PATH)}
            aria-label="Open trainer client roster to log a workout"
          >
            <Dumbbell size={16} aria-hidden="true" />
            Log Workout
          </HeroActionButton>
          <HeroActionButton
            type="button"
            onClick={() => onNavigate(coachPath)}
            aria-label="Ask Swan Coach for trainer command triage"
          >
            <Brain size={16} aria-hidden="true" />
            Ask Coach
          </HeroActionButton>
        </HeroActionRow>

        <LensRail aria-label="Trainer observatory lenses">
          {lenses.map(({ label, detail, path, Icon }) => {
            const lensPath = label === 'Coach' ? coachPath : path;

            return (
              <LensButton
                key={label}
                type="button"
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
      </HeroCommandPanel>
    </TrainerHomeHeroGrid>
  );
};

export default TrainerHomeObservatoryHero;