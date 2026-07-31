/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ShellNotices — SESSION SHELL zone 2 composer.               │
 * │ Builds the priority queue from host state and renders the   │
 * │ NoticeLane. Absorbs (behavior VERBATIM, disposition table): │
 * │  · offline pill (ModeBar)          → priority 10            │
 * │  · WorkoutDraftGateBanner          → priority 20 (same      │
 * │    setters, same order, not dismissible — it's a decision)  │
 * │  · ScheduledSessionStatusBanner    → priority 30 (same      │
 * │    getSessionDeductionSummary consequence)                  │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 2 + §4.1.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { CalendarCheck, CloudOff, History } from 'lucide-react';
import NoticeLane, { type ShellNotice } from './NoticeLane';
import { getSessionDeductionSummary } from '../../../SessionSummaryForm';
import { ensureWorkoutLoggerExerciseRowIdentity } from '../../../WorkoutLogger.helpers';
import type { UseWorkoutDraftResult } from '../../../useWorkoutDraft';
import type { WorkoutDraftGate } from '../../../WorkoutLogger.localTypes';
import type { ExerciseEntry } from '../../../../../services/nasmApiService';

const NoticeText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  strong { font-weight: 700; }
`;

const NoticeAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 12px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 45%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 14%, transparent);
  color: var(--text-primary, #e0ecf4);
  font: 600 0.78rem 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

export interface ShellNoticesProps {
  isOnline: boolean;
  pendingCount: number;
  workoutDraft: UseWorkoutDraftResult;
  /** The C4a offer window: no exercises and no notes yet. */
  draftOfferVisible: boolean;
  setDraftGate: (gate: WorkoutDraftGate) => void;
  setExercises: (exercises: ExerciseEntry[]) => void;
  setSessionNotes: (notes: string) => void;
  setOverallIntensity: (intensity: number | null) => void;
  /** M6: resume a still-running rest countdown from the restored draft. */
  onRestoreRest?: (endsAt: number) => void;
  /** Batch 4: re-anchor the session clock from the restored draft. */
  onRestoreSessionStart?: (startedAt: number) => void;
  scheduledSessionId: string | null | undefined;
  scheduledSessionCreditHint: number | null | undefined;
  scheduledSessionDate: string | null | undefined;
  clientSource: string | null | undefined;
}

const ShellNotices: React.FC<ShellNoticesProps> = ({
  isOnline,
  pendingCount,
  workoutDraft,
  draftOfferVisible,
  setDraftGate,
  setExercises,
  setSessionNotes,
  setOverallIntensity,
  onRestoreRest,
  onRestoreSessionStart,
  scheduledSessionId,
  scheduledSessionCreditHint,
  scheduledSessionDate,
  clientSource,
}) => {
  const notices: ShellNotice[] = [];

  if (!isOnline) {
    notices.push({
      id: 'offline',
      priority: 10,
      content: (
        <NoticeText>
          <CloudOff size={14} aria-hidden='true' /> <strong>Offline</strong> — sets save locally
          {pendingCount > 0 ? ` (${pendingCount} queued)` : ''}
        </NoticeText>
      ),
    });
  }

  if (draftOfferVisible && workoutDraft.pendingDraft) {
    const draft = workoutDraft.pendingDraft;
    const count = draft.exercises.length;
    notices.push({
      id: 'draft-gate',
      priority: 20,
      // A decision, not dismissible chrome — Restore or Discard, like the banner.
      content: (
        <>
          <NoticeText>
            <History size={14} aria-hidden='true' /> Unsaved draft — {count} exercise{count === 1 ? '' : 's'}
          </NoticeText>
          <NoticeAction
            type='button'
            onClick={() => {
              // VERBATIM WorkoutDraftGateBanner.onRestore — do not reorder.
              const restored = workoutDraft.restore();
              if (!restored) return;
              setDraftGate('restored');
              setExercises(restored.exercises.map((entry) => ensureWorkoutLoggerExerciseRowIdentity(entry)));
              setSessionNotes(restored.sessionNotes);
              setOverallIntensity(restored.overallIntensity);
              // M6: a rest countdown that was still running resumes.
              if (restored.restEndsAt && restored.restEndsAt > Date.now()) {
                onRestoreRest?.(restored.restEndsAt);
              }
              // Batch 4: the session clock survives the reload too.
              if (restored.sessionStartedAt && restored.sessionStartedAt <= Date.now()) {
                onRestoreSessionStart?.(restored.sessionStartedAt);
              }
            }}
          >
            Restore
          </NoticeAction>
          <NoticeAction
            type='button'
            onClick={() => {
              // VERBATIM WorkoutDraftGateBanner.onDiscard.
              setDraftGate('discarded');
              workoutDraft.discard();
            }}
          >
            Discard
          </NoticeAction>
        </>
      ),
    });
  }

  if (scheduledSessionId) {
    const deduction = getSessionDeductionSummary(clientSource, scheduledSessionCreditHint);
    notices.push({
      id: `schedule-${scheduledSessionId}`,
      priority: 30,
      dismissible: true,
      content: (
        <NoticeText title={scheduledSessionDate ? `Session date: ${scheduledSessionDate}` : undefined}>
          <CalendarCheck size={14} aria-hidden='true' /> <strong>Schedule-linked</strong> — saving completes
          the appointment · {deduction.label}
        </NoticeText>
      ),
    });
  }

  return <NoticeLane notices={notices} />;
};

export default ShellNotices;
