import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildWorkoutSessionPayload,
  createBlankWorkoutSession,
} from './WorkoutPlanner.logic';

const plannerSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/WorkoutPlanner.tsx'),
  'utf8'
);
const plannerLogicSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/WorkoutPlanner.logic.ts'),
  'utf8'
);

const getSourceBetween = (source: string, start: string, end: string): string => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
};

describe('WorkoutPlanner workout history contract', () => {
  it('uses the canonical client workout history endpoint and response shape', () => {
    expect(plannerLogicSource).toContain('`/api/workouts/${clientId}/history`');
    expect(plannerSource).not.toContain('`/api/workouts/history/${clientId}`');
    expect(plannerSource).toContain('extractWorkoutHistory');
    expect(plannerSource).not.toContain('response.data.history?.workoutSessions');
    expect(plannerSource).toContain('Workout Sessions');
    expect(plannerSource).toContain('Error fetching workout sessions:');
    expect(plannerSource).toContain('Failed to fetch workout sessions');
    expect(plannerSource).not.toContain('Failed to fetch workout plans');
  });

  it('saves sessions with the canonical workout-session payload shape', () => {
    const saveBlock = getSourceBetween(
      plannerSource,
      'const handleSaveSession',
      'const handleCancelEdit'
    );
    const payloadBlock = getSourceBetween(
      plannerLogicSource,
      'export const buildWorkoutSessionPayload',
      'export const extractWorkoutHistory'
    );

    expect(saveBlock).toContain('buildWorkoutSessionPayload');
    expect(payloadBlock).toContain('userId: clientId');
    expect(payloadBlock).toContain('clientRequestId: currentSession?.clientRequestId');
    expect(payloadBlock).toContain('sessionDate');
    expect(payloadBlock).toContain('notes');
    expect(payloadBlock).toContain('sets: Array.from');
    expect(payloadBlock).not.toMatch(/clientId,\s*date: sessionDate/);
    expect(payloadBlock).not.toContain('date: sessionDate');
    expect(payloadBlock).not.toContain('trainerNotes');
    expect(payloadBlock).not.toContain('setDetails');
    expect(payloadBlock).not.toContain('setsCompleted');
  });

  it('reuses one client request id for retries of the same unsaved draft', () => {
    const currentSession = createBlankWorkoutSession('2026-07-19');
    const input = {
      clientId: '42',
      currentSession,
      notes: '',
      selectedExercises: [],
      sessionDate: '2026-07-19',
    };

    const firstPayload = buildWorkoutSessionPayload(input);
    const retryPayload = buildWorkoutSessionPayload(input);

    expect(firstPayload.clientRequestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(retryPayload.clientRequestId).toBe(firstPayload.clientRequestId);
  });

  it('wires the workout session card actions to real handlers', () => {
    expect(plannerSource).toContain('const handleViewSession');
    expect(plannerSource).toContain('const handleEditSession');
    expect(plannerSource).toContain('<ViewButton onClick={() => handleViewSession(session)}>');
    expect(plannerSource).toContain('<EditButton onClick={() => handleEditSession(session)}>');
  });

  it('requires confirmation before discarding an active workout session draft', () => {
    const cancelBlock = getSourceBetween(
      plannerSource,
      'const handleCancelEdit',
      'const handleAddExercise'
    );

    expect(plannerLogicSource).toContain('export const hasWorkoutSessionDraft');
    expect(cancelBlock).toContain('hasWorkoutSessionDraft');
    expect(plannerSource).not.toContain('window.confirm');
    expect(plannerSource).toContain("from '../../../components/WorkoutLogger/WorkoutLoggerConfirmDialog'");
    expect(plannerSource).toContain('<WorkoutLoggerConfirmDialog');
    expect(cancelBlock).toContain('setDiscardRequest');
    expect(cancelBlock).toContain('Discard workout session draft?');
    expect(cancelBlock).toContain('onConfirm: discardCurrentDraft');
  });

  it('keeps the mounted planner file under the project line cap', () => {
    expect(plannerSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
