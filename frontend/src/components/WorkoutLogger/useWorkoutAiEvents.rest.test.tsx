import React, { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AI_REST_ADJUST,
  AI_REST_SKIP,
  dispatchAIWorkoutEvent,
} from '../../utils/aiWorkoutEvents';
import { useWorkoutAiEvents } from './useWorkoutAiEvents';

const Probe = ({ restTimer }: { restTimer: { isRunning: boolean; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> } }) => {
  const exercisesRef = useRef([]);
  useWorkoutAiEvents({
    effectiveClientId: 1,
    createWorkoutLoggerLocalId: (prefix) => prefix,
    exercisesRef,
    setExercises: vi.fn(),
    setSessionNotes: vi.fn(),
    setOverallIntensity: vi.fn(),
    loadPhaseTemplate: vi.fn(),
    currentOPTPhase: 1,
    protocolSectionSetters: { warmup: vi.fn(), balance_core: vi.fn(), cooldown: vi.fn() },
    pendingAiPlanPrefillLoadedRef: { current: false },
    restTimer,
  });
  return null;
};

describe('useWorkoutAiEvents rest-command bridge', () => {
  it('skips an active rest timer through AI_REST_SKIP', () => {
    const restTimer = { isRunning: true, start: vi.fn(), stop: vi.fn() };
    render(<Probe restTimer={restTimer} />);
    act(() => expect(dispatchAIWorkoutEvent(AI_REST_SKIP, {})).toBe(true));
    expect(restTimer.stop).toHaveBeenCalledTimes(1);
  });

  it('cuts rest to the requested seconds through AI_REST_ADJUST', () => {
    const restTimer = { isRunning: true, start: vi.fn(), stop: vi.fn() };
    render(<Probe restTimer={restTimer} />);
    act(() => expect(dispatchAIWorkoutEvent(AI_REST_ADJUST, { seconds: 45 })).toBe(true));
    expect(restTimer.start).toHaveBeenCalledWith(45);
  });

  it('reads live timer state after re-render, not the mount-time snapshot', () => {
    const stopped = { isRunning: false, start: vi.fn(), stop: vi.fn() };
    const running = { isRunning: true, start: vi.fn(), stop: vi.fn() };
    const view = render(<Probe restTimer={stopped} />);
    view.rerender(<Probe restTimer={running} />);
    act(() => expect(dispatchAIWorkoutEvent(AI_REST_SKIP, {})).toBe(true));
    expect(running.stop).toHaveBeenCalledTimes(1);
    expect(stopped.stop).not.toHaveBeenCalled();
  });

  it('does not start rest when adjust arrives while no timer is active', () => {
    const restTimer = { isRunning: false, start: vi.fn(), stop: vi.fn() };
    render(<Probe restTimer={restTimer} />);
    expect(dispatchAIWorkoutEvent(AI_REST_ADJUST, { seconds: 45 })).toBe(false);
    expect(restTimer.start).not.toHaveBeenCalled();
  });

  it('keeps an unknown rest intent unhandled for the existing honest receipt path', () => {
    render(<Probe restTimer={{ isRunning: false, start: vi.fn(), stop: vi.fn() }} />);
    expect(dispatchAIWorkoutEvent('AI_REST_NOT_A_REAL_COMMAND', {})).toBe(false);
  });
});
