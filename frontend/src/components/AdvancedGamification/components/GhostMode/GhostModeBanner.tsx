/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: GhostModeBanner                                   ║
 * ║  PURPOSE: Gran Turismo-inspired ghost overlay for workouts    ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-29                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  👻 GHOST MODE                          [Toggle ON/OFF]    │
 * ├────────────────────────────────────────────────────────────┤
 * │  GHOST (Mar 15)        VS        YOU (Current)            │
 * │   12,400 lbs                       13,100 lbs             │
 * │                   ▲ +5.6%                                  │
 * ├────────────────────────────────────────────────────────────┤
 * │  ▌ Bench Press        3,200    3,600   +12.5%             │
 * │  ▌ Squat              4,800    4,500   -6.3%              │
 * │  ▌ Deadlift           4,400    5,000   +13.6%             │
 * ├────────────────────────────────────────────────────────────┤
 * │  Ghost from: Mar 15, 2026 · Best volume session           │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { userId, category?, onGhostLoaded?, onToggle?, compact? }
 * State:     useGhostMode hook manages ghost data + comparison
 * API Calls: GET /api/gamification/users/:userId/ghost
 * Children:  GhostModeOverlay (inline)
 *
 * CLICK-OUTCOMES:
 * [Toggle] → Activates/deactivates ghost comparison → loads ghost if needed
 * [Exercise rows] → Display only, no click action
 *
 * GAMIFICATION HOOKS:
 * - Ghost defeated → POST /api/gamification/users/:userId/ghost/compare → bonus XP
 */

import React, { useEffect, useMemo, memo } from 'react';
import { useGhostMode } from './useGhostMode';
import type { GhostModeBannerProps } from './GhostModeTypes';
import {
  GhostBannerContainer,
  GhostHeader,
  GhostTitle,
  GhostToggle,
  GhostStatsRow,
  GhostStatBlock,
  GhostStatLabel,
  GhostStatValue,
  VsIndicator,
  DeltaIndicator,
  ExerciseList,
  ExerciseRow,
  ExerciseName,
  ExerciseVolume,
  ExerciseDelta,
  GhostSourceInfo,
  NoGhostMessage,
} from './GhostModeStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

/** Format volume number with commas */
function formatVolume(vol: number): string {
  return vol.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Format date string to readable format */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Comparison Row (memoized per CLAUDE.md)
// ─────────────────────────────────────────────────────────────

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
        {formatVolume(ghostVol)} → {formatVolume(currentVol)}
      </ExerciseVolume>
      <ExerciseDelta $positive={delta >= 0}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
      </ExerciseDelta>
    </ExerciseRow>
  );
});
ExerciseCompRow.displayName = 'ExerciseCompRow';

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

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
    error,
    toggle,
  } = useGhostMode({ userId, category });

  // Notify parent when ghost is loaded
  useEffect(() => {
    onGhostLoaded?.(ghostData);
  }, [ghostData, onGhostLoaded]);

  // Notify parent when toggled
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

  return (
    <GhostBannerContainer $isActive={isActive}>
      <GhostHeader>
        <GhostTitle>
          <span role="img" aria-label="Ghost">👻</span>
          Ghost Mode
        </GhostTitle>
        <GhostToggle
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
          {error || 'Complete more workouts to unlock Ghost Mode. Your best session becomes the ghost to beat!'}
        </NoGhostMessage>
      )}

      {isActive && ghostData && (
        <>
          {/* Volume Comparison */}
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

          {/* Delta Indicator */}
          <DeltaIndicator $status={deltaStatus}>
            {deltaStatus === 'ahead' && '▲'}
            {deltaStatus === 'behind' && '▼'}
            {deltaStatus === 'tied' && '═'}
            {' '}
            {deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
            {deltaStatus === 'ahead' && ' ahead of ghost'}
            {deltaStatus === 'behind' && ' behind ghost'}
            {deltaStatus === 'tied' && ' tied with ghost'}
          </DeltaIndicator>

          {/* Per-Exercise Breakdown (hidden in compact mode) */}
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

          {/* Source info */}
          <GhostSourceInfo>
            Ghost from: {formatDate(ghostData.sourceDate)} · Best volume session ·{' '}
            {ghostData.exercises.length} exercises
          </GhostSourceInfo>
        </>
      )}
      </div>
    </GhostBannerContainer>
  );
};

export default GhostModeBanner;
