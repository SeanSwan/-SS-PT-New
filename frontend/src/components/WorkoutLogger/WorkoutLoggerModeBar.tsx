/**
 * Blueprint: WorkoutLoggerModeBar
 * Parent: WorkoutLogger
 * Purpose: Full Mode / Quick Log toggle plus offline and rest-timer badges.
 * The parent owns persistence so this component stays presentational.
 */
import React from 'react';
import { Timer } from 'lucide-react';
import {
  ModeButton,
  ModeHint,
  ModeToggle,
  OfflineBadge,
  RestTimerBadge,
} from './WorkoutLoggerStatus.styles';

interface WorkoutLoggerModeBarProps {
  isQuickLogMode: boolean;
  onChangeMode: (quickLog: boolean) => void;
  isOffline: boolean;
  pendingCount: number;
  restRunning: boolean;
  restSecondsLeft: number;
}

const WorkoutLoggerModeBar: React.FC<WorkoutLoggerModeBarProps> = ({
  isQuickLogMode,
  onChangeMode,
  isOffline,
  pendingCount,
  restRunning,
  restSecondsLeft,
}) => (
  <>
    <ModeToggle>
      <ModeButton type="button" $active={!isQuickLogMode} onClick={() => onChangeMode(false)}>
        Full Mode
      </ModeButton>
      <ModeButton type="button" $active={isQuickLogMode} onClick={() => onChangeMode(true)}>
        Quick Log
      </ModeButton>
      {isOffline && (
        <OfflineBadge aria-label="Offline - workouts will be saved locally">
          Offline{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </OfflineBadge>
      )}
      {restRunning && (
        <RestTimerBadge aria-label={`Rest timer: ${restSecondsLeft}s`}>
          <Timer size={14} aria-hidden="true" /> {restSecondsLeft}s
        </RestTimerBadge>
      )}
    </ModeToggle>
    <ModeHint>
      <strong>Quick Log</strong> is a faster 1-set-at-a-time view for logging on the floor;{' '}
      <strong>Full Mode</strong> shows every set, tempo, and form field. Your choice is remembered.
    </ModeHint>
  </>
);

WorkoutLoggerModeBar.displayName = 'WorkoutLoggerModeBar';
export default WorkoutLoggerModeBar;
