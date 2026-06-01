import { describe, expect, it, vi } from 'vitest';
import { AI_ADD_EXERCISE, AI_SUBMIT_WORKOUT, dispatchAIWorkoutEvent } from './aiWorkoutEvents';

describe('AI workout event dispatch acknowledgements', () => {
  it('does not report a submit event as handled when no WorkoutLogger listener acknowledges it', () => {
    expect(dispatchAIWorkoutEvent(AI_SUBMIT_WORKOUT, { intensity: 8 })).toBe(false);
  });

  it('reports a submit event as handled only after the listener acknowledges receipt', () => {
    const listener = vi.fn((event: Event) => {
      const detail = (event as CustomEvent<{ acknowledgeAIWorkoutEvent?: () => void }>).detail;
      detail.acknowledgeAIWorkoutEvent?.();
    });

    window.addEventListener(AI_SUBMIT_WORKOUT, listener);
    try {
      expect(dispatchAIWorkoutEvent(AI_SUBMIT_WORKOUT, { notes: 'Strong finish' })).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(AI_SUBMIT_WORKOUT, listener);
    }
  });

  it('does not report form mutation events as handled without a listener acknowledgement', () => {
    expect(dispatchAIWorkoutEvent(AI_ADD_EXERCISE, { exerciseName: 'Push Up' })).toBe(false);
  });

  it('reports form mutation events as handled after listener acknowledgement', () => {
    const listener = vi.fn((event: Event) => {
      const detail = (event as CustomEvent<{ acknowledgeAIWorkoutEvent?: () => void }>).detail;
      detail.acknowledgeAIWorkoutEvent?.();
    });

    window.addEventListener(AI_ADD_EXERCISE, listener);
    try {
      expect(dispatchAIWorkoutEvent(AI_ADD_EXERCISE, { exerciseName: 'Push Up' })).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(AI_ADD_EXERCISE, listener);
    }
  });

  it('does not report a form mutation as handled when a listener explicitly rejects the acknowledgement', () => {
    const listener = vi.fn((event: Event) => {
      const detail = (event as CustomEvent<{ acknowledgeAIWorkoutEvent?: (handled?: boolean) => void }>).detail;
      detail.acknowledgeAIWorkoutEvent?.(false);
    });

    window.addEventListener(AI_ADD_EXERCISE, listener);
    try {
      expect(dispatchAIWorkoutEvent(AI_ADD_EXERCISE, { exerciseName: 'Missing Exercise' })).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(AI_ADD_EXERCISE, listener);
    }
  });
});
