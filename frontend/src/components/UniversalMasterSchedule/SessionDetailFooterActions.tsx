/**
 * SessionDetailFooterActions
 * ==========================
 * Footer action matrix for session detail lifecycle commands.
 */

import React from 'react';
import GlowButton from '../ui/buttons/GlowButton';
import { OutlinedButton } from './ui';
import type { SessionDetailModalMode } from './SessionDetailModal.types';

type AttendanceAction = 'present' | 'late' | 'no_show';

export interface SessionDetailFooterActionsProps {
  loading: boolean;
  lateCancelLoading: boolean;
  attendanceLoading: boolean;
  canCancel: boolean;
  showCancelOptions: boolean;
  showLateCancelWarning: boolean;
  canRecordAttendance: boolean;
  showNoShowReason: boolean;
  canComplete: boolean;
  canEdit: boolean;
  canOpenWorkoutLogger: boolean;
  canViewWorkouts: boolean;
  mode: SessionDetailModalMode;
  onClose: () => void;
  onCancelClick: () => void;
  onHideCancelOptions: () => void;
  onCancel: () => void;
  onRecordAttendance: (status: AttendanceAction) => void;
  onBackFromNoShowReason: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onLogWorkout: () => void;
  onViewWorkouts: () => void;
}

const SessionDetailFooterActions: React.FC<SessionDetailFooterActionsProps> = ({
  loading,
  lateCancelLoading,
  attendanceLoading,
  canCancel,
  showCancelOptions,
  showLateCancelWarning,
  canRecordAttendance,
  showNoShowReason,
  canComplete,
  canEdit,
  canOpenWorkoutLogger,
  canViewWorkouts,
  mode,
  onClose,
  onCancelClick,
  onHideCancelOptions,
  onCancel,
  onRecordAttendance,
  onBackFromNoShowReason,
  onComplete,
  onEdit,
  onLogWorkout,
  onViewWorkouts,
}) => {
  const isFocusedFlow = showCancelOptions || showLateCancelWarning || showNoShowReason;

  return (
    <>
      <OutlinedButton onClick={onClose} disabled={loading}>
        Close
      </OutlinedButton>
      {canCancel && !isFocusedFlow && (
        <GlowButton variant="ruby" size="medium" onClick={onCancelClick} disabled={loading || lateCancelLoading} isLoading={lateCancelLoading}>
          {lateCancelLoading ? 'Checking...' : 'Cancel Session'}
        </GlowButton>
      )}
      {showCancelOptions && (
        <>
          <OutlinedButton onClick={onHideCancelOptions} disabled={loading}>
            Back
          </OutlinedButton>
          <GlowButton variant="ruby" size="medium" onClick={onCancel} disabled={loading}>
            Confirm Cancellation
          </GlowButton>
        </>
      )}
      {canRecordAttendance && !isFocusedFlow && (
        <>
          <GlowButton variant="emerald" size="medium" onClick={() => onRecordAttendance('present')} disabled={attendanceLoading} isLoading={attendanceLoading}>
            {attendanceLoading ? 'Recording...' : 'Present'}
          </GlowButton>
          <GlowButton variant="neonBlue" size="medium" onClick={() => onRecordAttendance('late')} disabled={attendanceLoading}>
            Late
          </GlowButton>
          <GlowButton variant="ruby" size="medium" onClick={() => onRecordAttendance('no_show')} disabled={attendanceLoading}>
            No-Show
          </GlowButton>
        </>
      )}
      {showNoShowReason && (
        <>
          <OutlinedButton onClick={onBackFromNoShowReason} disabled={attendanceLoading}>
            Back
          </OutlinedButton>
          <GlowButton variant="ruby" size="medium" onClick={() => onRecordAttendance('no_show')} disabled={attendanceLoading} isLoading={attendanceLoading}>
            {attendanceLoading ? 'Recording...' : 'Confirm No-Show'}
          </GlowButton>
        </>
      )}
      {canComplete && !isFocusedFlow && (
        <GlowButton variant="emerald" size="medium" onClick={onComplete} disabled={loading} isLoading={loading}>
          Mark Complete
        </GlowButton>
      )}
      {canEdit && !isFocusedFlow && (
        <GlowButton variant="cosmic" size="medium" onClick={onEdit} disabled={loading}>
          Edit Session
        </GlowButton>
      )}
      {canOpenWorkoutLogger && !isFocusedFlow && (mode === 'admin' || mode === 'trainer') && (
        <GlowButton variant="neonBlue" size="medium" onClick={onLogWorkout}>
          Log Workout
        </GlowButton>
      )}
      {canViewWorkouts && !isFocusedFlow && (
        <GlowButton variant="cosmic" size="medium" onClick={onViewWorkouts}>
          View Workouts
        </GlowButton>
      )}
    </>
  );
};

export default SessionDetailFooterActions;
