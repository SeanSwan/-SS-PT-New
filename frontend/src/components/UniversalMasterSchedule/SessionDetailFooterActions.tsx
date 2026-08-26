/**
 * SessionDetailFooterActions
 * ==========================
 * Footer action matrix for session detail lifecycle commands.
 */

import React from 'react';
import ForgeButton from '../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
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
  logWorkoutLabel?: string;
  mode: SessionDetailModalMode;
  onClose: () => void;
  onCancelClick: () => void;
  onHideCancelOptions: () => void;
  onCancel: () => void;
  onRecordAttendance: (status: AttendanceAction) => void;
  onBackFromNoShowReason: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onCoachLogWorkout: () => void;
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
  logWorkoutLabel,
  mode,
  onClose,
  onCancelClick,
  onHideCancelOptions,
  onCancel,
  onRecordAttendance,
  onBackFromNoShowReason,
  onComplete,
  onEdit,
  onCoachLogWorkout,
  onLogWorkout,
  onViewWorkouts,
}) => {
  const isFocusedFlow = showCancelOptions || showLateCancelWarning || showNoShowReason;
  const isManagerMode = mode === 'admin' || mode === 'trainer';
  const canLogFromSchedule = canOpenWorkoutLogger && isManagerMode;
  const completeLabel = canLogFromSchedule ? 'Complete Without Log' : 'Mark Complete';
  const scheduleLogWorkoutLabel = logWorkoutLabel || 'Log Workout';

  return (
    <>
      <OutlinedButton onClick={onClose} disabled={loading}>
        Close
      </OutlinedButton>
      {canCancel && !isFocusedFlow && (
        <ForgeButton variant="ruby" size="medium" onClick={onCancelClick} disabled={loading || lateCancelLoading} isLoading={lateCancelLoading}>
          {lateCancelLoading ? 'Checking...' : 'Cancel Session'}
        </ForgeButton>
      )}
      {showCancelOptions && (
        <>
          <OutlinedButton onClick={onHideCancelOptions} disabled={loading}>
            Back
          </OutlinedButton>
          <ForgeButton variant="ruby" size="medium" onClick={onCancel} disabled={loading}>
            Confirm Cancellation
          </ForgeButton>
        </>
      )}
      {canLogFromSchedule && !isFocusedFlow && (
        <>
          <ForgeButton variant="neonBlue" size="medium" onClick={onCoachLogWorkout}>Coach Log</ForgeButton>
          <ForgeButton variant="neonBlue" size="medium" onClick={onLogWorkout}>{scheduleLogWorkoutLabel}</ForgeButton>
        </>
      )}
      {canRecordAttendance && !isFocusedFlow && (
        <>
          <ForgeButton variant="emerald" size="medium" onClick={() => onRecordAttendance('present')} disabled={attendanceLoading} isLoading={attendanceLoading}>
            {attendanceLoading ? 'Recording...' : 'Present'}
          </ForgeButton>
          <ForgeButton variant="neonBlue" size="medium" onClick={() => onRecordAttendance('late')} disabled={attendanceLoading}>
            Late
          </ForgeButton>
          <ForgeButton variant="ruby" size="medium" onClick={() => onRecordAttendance('no_show')} disabled={attendanceLoading}>
            No-Show
          </ForgeButton>
        </>
      )}
      {showNoShowReason && (
        <>
          <OutlinedButton onClick={onBackFromNoShowReason} disabled={attendanceLoading}>
            Back
          </OutlinedButton>
          <ForgeButton variant="ruby" size="medium" onClick={() => onRecordAttendance('no_show')} disabled={attendanceLoading} isLoading={attendanceLoading}>
            {attendanceLoading ? 'Recording...' : 'Confirm No-Show'}
          </ForgeButton>
        </>
      )}
      {canEdit && !isFocusedFlow && (
        <ForgeButton variant="cosmic" size="medium" onClick={onEdit} disabled={loading}>
          Edit Session
        </ForgeButton>
      )}
      {canComplete && !isFocusedFlow && (
        <ForgeButton variant={canLogFromSchedule ? 'cosmic' : 'emerald'} size="medium" onClick={onComplete} disabled={loading} isLoading={loading}>
          {completeLabel}
        </ForgeButton>
      )}
      {canViewWorkouts && !isFocusedFlow && (
        <ForgeButton variant="cosmic" size="medium" onClick={onViewWorkouts}>
          View Workouts
        </ForgeButton>
      )}
    </>
  );
};

export default SessionDetailFooterActions;
