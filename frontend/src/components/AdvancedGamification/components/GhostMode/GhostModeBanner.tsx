/**
 * COMPONENT: GhostModeBanner
 * PURPOSE: Workout ghost comparison preview for the mounted admin RPG panel.
 * DATA FLOW: useGhostMode reads /api/gamification/users/:userId/ghost.
 * CLICK OUTCOME: Toggle activates or deactivates the ghost comparison preview.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { ArrowDown, ArrowUp, Ghost as GhostIcon, Minus } from 'lucide-react';
import { useGhostMode } from './useGhostMode';
import type { GhostModeBannerProps } from './GhostModeTypes';
import {
  DeltaIndicator,
  ExerciseDelta,
  ExerciseList,
  ExerciseName,
  ExerciseRow,
  ExerciseVolume,
  GhostBannerContainer,
  GhostHeader,
  GhostSourceInfo,
  GhostStatBlock,
  GhostStatLabel,
  GhostStatsRow,
  GhostStatValue,
  GhostTitle,
  GhostToggle,
  NoGhostMessage,
  VsIndicator,
} from './GhostModeStyles';

function formatVolume(vol: number): string {
  return vol.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const UNKNOWN_GHOST_SOURCE_DATE = 'Unknown session date';

function formatDate(dateStr: unknown): string {
  if (typeof dateStr !== 'string' || dateStr.trim().length === 0) {
    return UNKNOWN_GHOST_SOURCE_DATE;
  }

  const parsedDate = new Date(dateStr);
  if (!Number.isFinite(parsedDate.getTime())) {
    return UNKNOWN_GHOST_SOURCE_DATE;
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ExerciseCompRowProps {
  name: string;
  ghostVol: number;
  currentVol: number;
}

const ExerciseCompRow = memo(({ name, ghostVol, currentVol }: ExerciseCompRowProps) => {
  const delta = ghostVol > 0 ? ((currentVol - ghostVol) / ghostVol) * 100 : 0;
  const status = currentVol > ghostVol ? 'beat' : currentVol === ghostVol ? 'tied' : 'lost';

  return (
    <ExerciseRow $status={status}>
      <ExerciseName>{name}</ExerciseName>
      <ExerciseVolume>
        {formatVolume(ghostVol)} to {formatVolume(currentVol)}
      </ExerciseVolume>
      <ExerciseDelta $positive={delta >= 0}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
      </ExerciseDelta>
    </ExerciseRow>
  );
});
ExerciseCompRow.displayName = 'ExerciseCompRow';

const GhostModeBanner: React.FC<GhostModeBannerProps> = ({
  userId,
  category,
  currentVolume: currentVolumeProp = 0,
  currentExercises = {},
  onGhostLoaded,
  onToggle,
  compact = false,
}) => {
  const {
    ghostData,
    isActive,
    isLoading,
    error: ghostError,
    toggle,
  } = useGhostMode({ userId, category });

  useEffect(() => {
    onGhostLoaded?.(ghostData);
  }, [ghostData, onGhostLoaded]);

  useEffect(() => {
    onToggle?.(isActive);
  }, [isActive, onToggle]);

  const deltaPercent = useMemo(() => {
    if (!ghostData || ghostData.totalVolume === 0) return 0;
    return ((currentVolumeProp - ghostData.totalVolume) / ghostData.totalVolume) * 100;
  }, [ghostData, currentVolumeProp]);

  const deltaStatus = useMemo(() => {
    if (deltaPercent > 0) return 'ahead' as const;
    if (deltaPercent < 0) return 'behind' as const;
    return 'tied' as const;
  }, [deltaPercent]);

  const hasGhostFailure = Boolean(ghostError) && !isLoading;

  return (
    <GhostBannerContainer $isActive={isActive}>
      <GhostHeader>
        <GhostTitle>
          <GhostIcon size={16} aria-hidden="true" focusable="false" />
          Ghost Mode
        </GhostTitle>
        <GhostToggle
          type="button"
          $active={isActive}
          onClick={toggle}
          aria-pressed={isActive}
          aria-label={isActive ? 'Deactivate Ghost Mode' : 'Activate Ghost Mode'}
        >
          {isLoading ? 'Loading...' : isActive ? 'ON' : 'OFF'}
        </GhostToggle>
      </GhostHeader>

      <div aria-live="polite" aria-atomic="true">
        {isActive && !ghostData && !isLoading && (
          <NoGhostMessage>
            {hasGhostFailure
              ? 'Ghost comparison is temporarily unavailable. Try again in a moment.'
              : 'Complete more workouts to unlock Ghost Mode. Your best session becomes the ghost to beat.'}
          </NoGhostMessage>
        )}

        {isActive && ghostData && (
          <>
            <GhostStatsRow>
              <GhostStatBlock $side="ghost">
                <GhostStatLabel $variant="ghost">
                  Ghost ({formatDate(ghostData.sourceDate)})
                </GhostStatLabel>
                <GhostStatValue $variant="ghost">
                  {formatVolume(ghostData.totalVolume)} lbs
                </GhostStatValue>
              </GhostStatBlock>

              <VsIndicator>VS</VsIndicator>

              <GhostStatBlock $side="current">
                <GhostStatLabel $variant="current">
                  You (Current)
                </GhostStatLabel>
                <GhostStatValue $variant="current">
                  {formatVolume(currentVolumeProp)} lbs
                </GhostStatValue>
              </GhostStatBlock>
            </GhostStatsRow>

            <DeltaIndicator $status={deltaStatus}>
              {deltaStatus === 'ahead' && <ArrowUp size={14} aria-hidden="true" focusable="false" />}
              {deltaStatus === 'behind' && <ArrowDown size={14} aria-hidden="true" focusable="false" />}
              {deltaStatus === 'tied' && <Minus size={14} aria-hidden="true" focusable="false" />}
              {' '}
              {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
              {deltaStatus === 'ahead' && ' ahead of ghost'}
              {deltaStatus === 'behind' && ' behind ghost'}
              {deltaStatus === 'tied' && ' tied with ghost'}
            </DeltaIndicator>

            {!compact && ghostData.exercises.length > 0 && (
              <ExerciseList>
                {ghostData.exercises.map((ex) => (
                  <ExerciseCompRow
                    key={ex.name}
                    name={ex.name}
                    ghostVol={ex.volume}
                    currentVol={currentExercises[ex.name] ?? 0}
                  />
                ))}
              </ExerciseList>
            )}

            <GhostSourceInfo>
              Ghost from: {formatDate(ghostData.sourceDate)} - Best volume session -{' '}
              {ghostData.exercises.length} exercises
            </GhostSourceInfo>
          </>
        )}
      </div>
    </GhostBannerContainer>
  );
};

export default GhostModeBanner;
