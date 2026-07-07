/**
 * COMPONENT: HistoryBackfillDialog
 * PARENT: WorkoutHistoryPanel
 * PURPOSE: Attested history backfill (charter v3 H): grounding questions →
 *          deterministic preview generated from the client's REAL exercise
 *          history → trainer attestation (>=10 chars) → commit under the
 *          suppressed ai_generated_backfill source (no billing/XP/streaks) →
 *          one-tap undo of the whole run.
 * DATA: POST /api/admin/clients/:clientId/workouts/backfill/preview
 *       POST /api/admin/clients/:clientId/workouts/backfill/commit
 *       POST /api/admin/backfill-runs/:runId/undo
 */

import React, { useState } from 'react';
import { History, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ActionButton,
  FieldRow,
  IconButton,
  Note,
  Overlay,
  Panel,
  PreviewList,
  TitleRow,
} from './HistoryBackfillDialog.styles';

interface BackfillDay {
  date: string;
  exercises: Array<{ exerciseName: string }>;
}

interface HistoryBackfillDialogProps {
  open: boolean;
  clientId: number;
  onClose: () => void;
  onCommitted: () => void;
}

const HistoryBackfillDialog: React.FC<HistoryBackfillDialogProps> = ({
  open,
  clientId,
  onClose,
  onCommitted,
}) => {
  const { authAxios } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [dominantText, setDominantText] = useState('');
  const [preview, setPreview] = useState<{ days: BackfillDay[]; exercisePoolSize: number; conflictDates: string[] } | null>(null);
  const [attestation, setAttestation] = useState('');
  const [result, setResult] = useState<{ runId: number; createdCount: number; skippedCount: number } | null>(null);
  const [undone, setUndone] = useState(false);
  const [busy, setBusy] = useState<'preview' | 'commit' | 'undo' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const dominantExercises = dominantText.split(',').map((s) => s.trim()).filter(Boolean);
  const grounding = { sessionsPerWeek, dominantExercises };

  const handlePreview = async () => {
    if (!authAxios) return;
    setBusy('preview');
    setMessage(null);
    setPreview(null);
    setResult(null);
    setUndone(false);
    try {
      const res = await authAxios.post(`/api/admin/clients/${clientId}/workouts/backfill/preview`, {
        startDate, endDate, sessionsPerWeek, dominantExercises,
      });
      const data = res?.data as { success?: boolean; days?: BackfillDay[]; exercisePoolSize?: number; conflictDates?: string[]; message?: string };
      if (data?.success && Array.isArray(data.days)) {
        setPreview({ days: data.days, exercisePoolSize: data.exercisePoolSize ?? 0, conflictDates: data.conflictDates ?? [] });
      } else {
        setMessage(data?.message || 'Could not build the preview.');
      }
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(apiMessage || 'Could not build the preview right now.');
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (!authAxios || !preview) return;
    setBusy('commit');
    setMessage(null);
    try {
      const res = await authAxios.post(`/api/admin/clients/${clientId}/workouts/backfill/commit`, {
        days: preview.days,
        attestation,
        grounding,
      });
      const data = res?.data as { success?: boolean; runId?: number; created?: unknown[]; skipped?: unknown[]; message?: string };
      if (data?.success && data.runId) {
        setResult({ runId: data.runId, createdCount: data.created?.length ?? 0, skippedCount: data.skipped?.length ?? 0 });
        setPreview(null);
        onCommitted();
      } else {
        setMessage(data?.message || 'Commit failed.');
      }
    } catch (error) {
      const apiMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(apiMessage || 'Commit failed right now.');
    } finally {
      setBusy(null);
    }
  };

  const handleUndo = async () => {
    if (!authAxios || !result) return;
    setBusy('undo');
    setMessage(null);
    try {
      await authAxios.post(`/api/admin/backfill-runs/${result.runId}/undo`, {});
      setUndone(true);
      onCommitted();
    } catch {
      setMessage('Undo failed right now.');
    } finally {
      setBusy(null);
    }
  };

  const attestationValid = attestation.trim().length >= 10;

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Panel role="dialog" aria-modal="true" aria-label="Backfill workout history">
        <TitleRow>
          <History size={16} aria-hidden="true" />
          Backfill Workout History
          <IconButton type="button" onClick={onClose} aria-label="Close backfill dialog">
            <X size={16} aria-hidden="true" />
          </IconButton>
        </TitleRow>
        <Note>
          Reconstructs past sessions from this client's REAL logged exercise
          history. Backfilled entries never bill sessions, award points, or
          extend streaks. Answer the grounding questions, preview, then attest.
        </Note>

        <FieldRow>
          From
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Backfill start date" />
        </FieldRow>
        <FieldRow>
          To
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Backfill end date" />
        </FieldRow>
        <FieldRow>
          Sessions/week
          <input
            type="number" min={1} max={7} value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 3)))}
            aria-label="Sessions per week during this period"
          />
        </FieldRow>
        <FieldRow>
          Went heavy on
          <input
            value={dominantText}
            onChange={(e) => setDominantText(e.target.value)}
            placeholder="e.g. Squat, Bench Press (optional, comma-separated)"
            aria-label="Exercises the client focused on in this period"
          />
        </FieldRow>

        <ActionButton type="button" $tone="primary" onClick={handlePreview} disabled={!startDate || !endDate || busy !== null}>
          {busy === 'preview' ? 'Building preview...' : 'Preview backfill'}
        </ActionButton>

        {preview && (
          <>
            <Note role="status">
              {preview.days.length} session{preview.days.length === 1 ? '' : 's'} will be created,
              grounded in {preview.exercisePoolSize} logged exercise{preview.exercisePoolSize === 1 ? '' : 's'}.
              {preview.conflictDates.length > 0 && ` ${preview.conflictDates.length} date(s) skipped — already logged.`}
            </Note>
            <PreviewList aria-label="Sessions to be created">
              {preview.days.map((day) => (
                <li key={day.date}>
                  {day.date}: {day.exercises.map((exercise) => exercise.exerciseName).join(', ')}
                </li>
              ))}
            </PreviewList>
            <FieldRow>
              Attestation
              <textarea
                value={attestation}
                onChange={(e) => setAttestation(e.target.value)}
                placeholder="I certify this reflects training that actually occurred (min 10 characters)"
                aria-label="Trainer attestation"
                rows={2}
              />
            </FieldRow>
            <ActionButton type="button" $tone="primary" onClick={handleCommit} disabled={!attestationValid || busy !== null}>
              {busy === 'commit' ? 'Committing...' : `Commit ${preview.days.length} sessions`}
            </ActionButton>
          </>
        )}

        {result && !undone && (
          <>
            <Note role="status">
              Run #{result.runId} committed: {result.createdCount} created, {result.skippedCount} skipped.
            </Note>
            <ActionButton type="button" onClick={handleUndo} disabled={busy !== null}>
              {busy === 'undo' ? 'Undoing...' : `Undo run #${result.runId}`}
            </ActionButton>
          </>
        )}
        {undone && <Note role="status">Run undone — the backfilled sessions were removed.</Note>}
        {message && <Note role="status">{message}</Note>}
      </Panel>
    </Overlay>
  );
};

export default HistoryBackfillDialog;
