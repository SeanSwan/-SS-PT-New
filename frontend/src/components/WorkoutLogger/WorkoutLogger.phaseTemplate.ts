/**
 * WorkoutLogger.phaseTemplate.ts
 * ================================
 * Pure transforms for loading a NASM OPT phase template into the logger,
 * extracted from the WorkoutLogger shell (extraction ratchet, Rule 4).
 * Behavior is byte-equivalent to the previous inline implementation:
 * - template exercises → ExerciseEntry rows with fresh logger row identity
 * - template protocol id lists → ProtocolSelection entries (source 'template')
 */
import type { ExerciseEntry } from '../../services/nasmApiService';
import type { PhaseTemplate } from './NASMPhaseTemplates';
import { findProtocolDefaultById } from './NASMProtocolDefaults';
import type { ProtocolSelection } from './CompactProtocolSection';

export function buildPhaseTemplateEntries(
  template: PhaseTemplate,
  phase: number,
  createLocalId: (prefix: string) => string
): ExerciseEntry[] {
  return template.exercises.map((ex, i) => ({
    loggerExerciseId: createLocalId('exercise'),
    exerciseId: `template-${phase}-${i}-${Date.now()}`,
    exerciseName: ex.name,
    sets: Array.from(
      { length: Array.isArray(ex.sets) ? ex.sets.length : Number(ex.sets) || 3 },
      (_, s) => ({
        loggerSetId: createLocalId('set'),
        setNumber: s + 1,
        weight: 0,
        reps: ex.reps,
        rpe: null,
        tempo: ex.tempo,
        restTime: ex.restSeconds,
        formQuality: null,
        notes: ex.notes || '',
      })
    ),
    formRating: null,
    painLevel: 0,
    performanceNotes: '',
  }));
}

export function templateIdsToSelections(ids: string[]): ProtocolSelection[] {
  const out: ProtocolSelection[] = [];
  for (const id of ids) {
    const item = findProtocolDefaultById(id);
    if (item) {
      out.push({
        id: item.id,
        name: item.name,
        source: 'template',
        category: item.category,
      });
    }
  }
  return out;
}
