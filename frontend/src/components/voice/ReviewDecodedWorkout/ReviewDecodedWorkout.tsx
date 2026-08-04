/**
 * COMPONENT: ReviewDecodedWorkout (S8 — JARVIS blueprint §6.2, F2 de-risk)
 * PURPOSE: THE one review surface between any decoded audio and the client's
 * log. Three doors mount it: the S9 voice overlay, History Import
 * (`draftMode`), and the S12 PLAUD inbox. Laws:
 * - NOTHING auto-commits. Commit is an explicit button; this component owns
 *   NO network — `onCommit(rows, {needsReview})` hands rows to the caller,
 *   which applies them through the EXISTING logger state, so the byte-pinned
 *   POST /api/workout-forms body is preserved by construction.
 * - The transcript is the receipt: always visible beside the rows.
 * - Low-confidence fields: `--caution-ember` dotted underline + "check this"
 *   (gold NEVER appears on warnings — ruling A2).
 * - Pain flags render region+side and are never silently committed — the
 *   trainer sees them before Commit is possible.
 * - Undo (5s) after commit via onUndo callback. Bottom sheet ≤414px,
 *   modal ≥1280px (ruling A4: z-95). Every input ≥44px.
 */

import React from 'react';
import type { ExerciseEntry } from '../../../services/nasmApiService';
import type { ParsedWorkout } from '../../WorkoutLogger/VoiceMemoUpload';
import { mapDecodedWorkoutToRows, type DecodedWorkoutReview } from '../../../utils/workout/mapDecodedWorkoutToRows';
import {
  Backdrop, Sheet, Header, Title, TranscriptReceipt, RowsList, RowCard, RowName,
  SetLine, FieldInput, CheckThis, PainBlock, PainLine, Actions, CommitButton,
  SecondaryButton, UndoBar,
} from './ReviewDecodedWorkout.styles';

export interface ReviewDecodedWorkoutProps {
  workout: ParsedWorkout;
  transcript: string;
  /** History-Import door renders draft framing instead of live-log framing. */
  draftMode?: boolean;
  onCommit: (rows: ExerciseEntry[], meta: { needsReview: boolean }) => void;
  onUndo: () => void;
  onClose: () => void;
}

const ReviewDecodedWorkout: React.FC<ReviewDecodedWorkoutProps> = ({
  workout, transcript, draftMode = false, onCommit, onUndo, onClose,
}) => {
  const review: DecodedWorkoutReview = React.useMemo(
    () => mapDecodedWorkoutToRows(workout),
    [workout],
  );
  const [rows, setRows] = React.useState<ExerciseEntry[]>(review.rows);
  const [committed, setCommitted] = React.useState(false);
  const undoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => setRows(review.rows), [review.rows]);
  React.useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const editRow = (rowIndex: number, patch: Partial<ExerciseEntry>) =>
    setRows(current => current.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row)));
  const editSet = (rowIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) =>
    setRows(current => current.map((row, i) => (i === rowIndex
      ? { ...row, sets: row.sets.map((set, j) => (j === setIndex ? { ...set, [field]: value } : set)) }
      : row)));

  const commit = () => {
    onCommit(rows, { needsReview: review.needsReview });
    setCommitted(true);
    undoTimerRef.current = setTimeout(onClose, 5000);
  };

  return (
    <Backdrop>
      <Sheet role="dialog" aria-modal="true" aria-label={draftMode ? 'Review imported workout draft' : 'Review decoded workout'}>
        <Header>
          <Title>{draftMode ? 'Review draft before saving' : 'Coach heard this — check it before it logs'}</Title>
          <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
        </Header>

        <TranscriptReceipt aria-label="Transcript">{transcript}</TranscriptReceipt>

        {review.painFlags.length > 0 && (
          <PainBlock role="note" aria-label="Pain mentions" data-testid="review-pain-flags">
            {review.painFlags.map((flag, i) => (
              <PainLine key={i}>{flag.bodyRegion}{flag.side ? ` (${flag.side})` : ''} — “{flag.mention}”. Never logged automatically; review the affected sets.</PainLine>
            ))}
          </PainBlock>
        )}

        <RowsList>
          {rows.map((row, rowIndex) => {
            const flags = review.flagsByExerciseId[row.exerciseId];
            return (
              <RowCard key={row.exerciseId} $lowConfidence={Boolean(flags?.lowConfidence)}>
                <RowName
                  value={row.exerciseName}
                  aria-label={`Exercise ${rowIndex + 1} name`}
                  onChange={e => editRow(rowIndex, { exerciseName: e.target.value })}
                />
                {row.sets.map((set, setIndex) => (
                  <SetLine key={setIndex}>
                    <span>Set {setIndex + 1}</span>
                    <FieldInput
                      type="number" inputMode="decimal" value={set.weight}
                      aria-label={`Set ${setIndex + 1} weight`}
                      onChange={e => editSet(rowIndex, setIndex, 'weight', Number(e.target.value))}
                    />
                    <span>lb ×</span>
                    <FieldInput
                      type="number" inputMode="numeric" value={set.reps}
                      aria-label={`Set ${setIndex + 1} reps`}
                      onChange={e => editSet(rowIndex, setIndex, 'reps', Number(e.target.value))}
                    />
                  </SetLine>
                ))}
                {flags && flags.checkFields.length > 0 && (
                  <CheckThis>Check this: {flags.checkFields.join(', ')}</CheckThis>
                )}
              </RowCard>
            );
          })}
        </RowsList>

        {committed ? (
          <UndoBar role="status" data-testid="review-undo-bar">
            <span>{draftMode ? 'Draft saved.' : 'Added to the session.'}</span>
            <SecondaryButton type="button" onClick={() => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); onUndo(); onClose(); }}>
              Undo
            </SecondaryButton>
          </UndoBar>
        ) : (
          <Actions>
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <CommitButton type="button" disabled={rows.length === 0} onClick={commit} data-testid="review-commit">
              {draftMode ? 'Save draft' : 'Add to session'}
            </CommitButton>
          </Actions>
        )}
      </Sheet>
    </Backdrop>
  );
};

export default ReviewDecodedWorkout;
