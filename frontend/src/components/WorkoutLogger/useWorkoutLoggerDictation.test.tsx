/**
 * Logger dictation — blueprint S4 acceptance suite.
 * Covers: mic toggle state, surface:'workout-logger' routing, the full
 * mocked-lane integration (frontend_dispatch AI_UPDATE_SET reaches the
 * EXISTING useWorkoutAiEvents handler and mutates set weight/reps), the
 * exact no-command receipt copy, and strip hidden when inactive.
 */
import React, { useRef, useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseEntry } from '../../services/nasmApiService';
import LoggerDictationStrip from './LoggerDictationStrip';
import { useWorkoutLoggerDictation } from './useWorkoutLoggerDictation';
import { useWorkoutAiEvents } from './useWorkoutAiEvents';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock('../../services/api.service', () => ({
  default: { post: mockPost },
  ApiService: class {},
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const legPress = (): ExerciseEntry => ({
  loggerExerciseId: 'ex-1',
  exerciseId: 'lp-1',
  exerciseName: 'Leg Press',
  sets: [1, 2, 3].map((setNumber) => ({
    loggerSetId: `set-${setNumber}`,
    setNumber,
    weight: 0,
    reps: 10,
    rpe: null,
    tempo: '',
    restTime: 60,
    formQuality: null,
    notes: '',
  })),
  formRating: null,
  painLevel: 0,
  performanceNotes: '',
} as unknown as ExerciseEntry);

/** Mounts the REAL useWorkoutAiEvents listeners over live exercise state. */
const AiEventsHarness: React.FC<{ stateOut: { exercises: ExerciseEntry[] } }> = ({ stateOut }) => {
  const [exercises, setExercises] = useState<ExerciseEntry[]>([legPress()]);
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  stateOut.exercises = exercises;
  let n = 0;
  useWorkoutAiEvents({
    effectiveClientId: 84,
    createWorkoutLoggerLocalId: (prefix: string) => `${prefix}-${++n}`,
    exercisesRef,
    setExercises,
    setSessionNotes: vi.fn(),
    setOverallIntensity: vi.fn(),
    loadPhaseTemplate: vi.fn(),
    currentOPTPhase: 2,
    protocolSectionSetters: { warmup: vi.fn(), balance_core: vi.fn(), cooldown: vi.fn() },
    pendingAiPlanPrefillLoadedRef: { current: false } as React.MutableRefObject<boolean>,
  });
  return null;
};

type DictationApi = ReturnType<typeof useWorkoutLoggerDictation>;
const DictationHarness: React.FC<{ apiOut: { current: DictationApi | null } }> = ({ apiOut }) => {
  const api = useWorkoutLoggerDictation({ clientId: 84 });
  apiOut.current = api;
  return <LoggerDictationStrip {...api} />;
};

const setup = () => {
  const stateOut = { exercises: [] as ExerciseEntry[] };
  const apiOut = { current: null as DictationApi | null };
  render(
    <>
      <AiEventsHarness stateOut={stateOut} />
      <DictationHarness apiOut={apiOut} />
    </>,
  );
  return { stateOut, apiOut };
};

describe('useWorkoutLoggerDictation + LoggerDictationStrip (blueprint S4)', () => {
  beforeEach(() => { mockPost.mockReset(); });

  it('keeps the strip hidden until the mic is toggled on', async () => {
    const { apiOut } = setup();
    expect(screen.queryByRole('group', { name: 'Dictate workout log entries' })).not.toBeInTheDocument();
    await act(async () => { apiOut.current?.toggle(); });
    expect(screen.getByRole('group', { name: 'Dictate workout log entries' })).toBeInTheDocument();
    await act(async () => { apiOut.current?.toggle(); });
    expect(screen.queryByRole('group', { name: 'Dictate workout log entries' })).not.toBeInTheDocument();
  });

  it('routes dictated text through the command lane with surface workout-logger', async () => {
    mockPost.mockResolvedValue({ data: { success: true, type: 'chat', fallbackToChat: true } });
    const { apiOut } = setup();
    await act(async () => { apiOut.current?.toggle(); });
    await act(async () => { apiOut.current?.setText('leg press set two ninety pounds eleven reps'); });
    await act(async () => { await apiOut.current?.send(); });
    expect(mockPost).toHaveBeenCalledWith('/api/ai-command/execute', expect.objectContaining({
      message: 'leg press set two ninety pounds eleven reps',
      selectedClientId: 84,
      routeContext: expect.objectContaining({ surface: 'workout-logger' }),
    }));
  });

  it('frontend_dispatch AI_UPDATE_SET reaches the EXISTING logger handler and updates the set', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        type: 'frontend_dispatch',
        command: 'update_set_data',
        event: 'AI_UPDATE_SET',
        payload: { exerciseName: 'Leg Press', setNumber: 2, weight: 90, reps: 11 },
        message: 'Sent update weight, reps, or rpe for a specific set in the workout logger to the workout form.',
      },
    });
    const { stateOut, apiOut } = setup();
    await act(async () => { apiOut.current?.toggle(); });
    await act(async () => { apiOut.current?.setText('leg press set two ninety pounds eleven reps'); });
    await act(async () => { await apiOut.current?.send(); });
    const set2 = stateOut.exercises[0].sets.find((s) => s.setNumber === 2);
    expect(set2?.weight).toBe(90);
    expect(set2?.reps).toBe(11);
    expect(apiOut.current?.receipt?.ok).toBe(true);
    expect(apiOut.current?.text).toBe(''); // cleared after a dispatched command
  });

  it('renders the exact no-command receipt copy — no chat fallback in the logger', async () => {
    mockPost.mockResolvedValue({ data: { success: true, type: 'chat', fallbackToChat: true } });
    const { apiOut } = setup();
    await act(async () => { apiOut.current?.toggle(); });
    await act(async () => { apiOut.current?.setText('what a lovely day'); });
    await act(async () => { await apiOut.current?.send(); });
    expect(apiOut.current?.receipt).toEqual({
      ok: false,
      text: 'I heard "what a lovely day" — try naming the exercise and set number.',
    });
    expect(screen.getByText(/I heard "what a lovely day"/)).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledTimes(1); // command lane only — never the chat lane
  });

  it('Send is disabled while empty or submitting; Enter submits from the strip input', async () => {
    mockPost.mockResolvedValue({ data: { success: true, type: 'chat', fallbackToChat: true } });
    const { apiOut } = setup();
    await act(async () => { apiOut.current?.toggle(); });
    const send = screen.getByRole('button', { name: 'Send dictated entry to Swan Coach' });
    expect(send).toBeDisabled();
    await act(async () => { apiOut.current?.setText('leg press set one one hundred'); });
    expect(send).not.toBeDisabled();
    fireEvent.keyDown(screen.getByLabelText('Dictated log entry'), { key: 'Enter' });
    await act(async () => {});
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('reports the lane-down failure honestly in the strip', async () => {
    mockPost.mockRejectedValue(new Error('network down'));
    const { apiOut } = setup();
    await act(async () => { apiOut.current?.toggle(); });
    await act(async () => { apiOut.current?.setText('leg press set two ninety'); });
    await act(async () => { await apiOut.current?.send(); });
    expect(apiOut.current?.receipt).toEqual({ ok: false, text: 'Swan Coach is unreachable — try again.' });
  });

  it('passes server error text (e.g. an RBAC denial) through verbatim — never mislabels it as an outage', async () => {
    const denial = "You don't have permission to update weight, reps, or rpe for a specific set in the workout logger. This requires admin or trainer role.";
    mockPost.mockResolvedValue({ data: { success: false, error: denial } });
    const { apiOut } = setup();
    await act(async () => { apiOut.current?.toggle(); });
    await act(async () => { apiOut.current?.setText('leg press set two ninety'); });
    await act(async () => { await apiOut.current?.send(); });
    expect(apiOut.current?.receipt).toEqual({ ok: false, text: denial });
  });

  it('source contract: the logger mounts Dictate + strip behind the admin/trainer gate', () => {
    const source = readFileSync(resolve(__dirname, 'WorkoutLogger.tsx'), 'utf8');
    expect(source).toContain("const canDictate = user?.role === 'admin' || user?.role === 'trainer';");
    expect(source).toContain('canDictate={canDictate}'); // ActionBar mic carries the gate
    expect(source).toContain('{canDictate && <LoggerDictationStrip {...dictation} />}');
  });
});
