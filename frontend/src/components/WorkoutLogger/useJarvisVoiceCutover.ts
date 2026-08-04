/**
 * HOOK: useJarvisVoiceCutover (S10 — JARVIS blueprint §6.2)
 * PURPOSE: The logger side of the ONE-mic cutover. Flag ON → the ActionBar
 * mic opens the Jarvis overlay and the legacy dictation strip never mounts;
 * flag OFF → the pre-S6 dictation path stays fully wired (never
 * half-cutover). Owns the open state and the applied-row ids so the review
 * surface's 5s Undo removes exactly what it added. Extracted from the shell
 * per the extraction ratchet — logger + hook read as one contract surface.
 */

import { useCallback, useRef, useState } from 'react';
import type { ExerciseEntry } from '../../services/nasmApiService';
import { isVoiceModeV2Enabled } from '../../hooks/voice/voiceModeV2Flag';

export interface JarvisVoiceCutoverInput {
  applyReviewedExerciseRows: (rows: ExerciseEntry[]) => string[];
  removeExerciseRowsByIds: (ids: string[]) => void;
}

export function useJarvisVoiceCutover({ applyReviewedExerciseRows, removeExerciseRowsByIds }: JarvisVoiceCutoverInput) {
  const voiceModeV2 = isVoiceModeV2Enabled();
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const appliedIdsRef = useRef<string[]>([]);

  const toggleJarvis = useCallback(() => setJarvisOpen(open => !open), []);
  const closeJarvis = useCallback(() => setJarvisOpen(false), []);
  const commitRows = useCallback((rows: ExerciseEntry[]) => {
    appliedIdsRef.current = applyReviewedExerciseRows(rows);
  }, [applyReviewedExerciseRows]);
  const undoCommit = useCallback(() => {
    removeExerciseRowsByIds(appliedIdsRef.current);
    appliedIdsRef.current = [];
  }, [removeExerciseRowsByIds]);

  return { voiceModeV2, jarvisOpen, toggleJarvis, closeJarvis, commitRows, undoCommit };
}
