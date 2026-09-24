import { describe, expect, it, vi } from 'vitest';
import {
  AI_ADD_EXERCISE, AI_PLANNER_REARRANGE, AI_PLANNER_UNDO,
  AI_SUBMIT_WORKOUT, dispatchAIWorkoutEvent,
} from './aiWorkoutEvents';

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

  it.each([AI_PLANNER_REARRANGE, AI_PLANNER_UNDO])(
    'registers %s in the generic frontend dispatcher',
    (eventName) => {
      const listener = vi.fn((event: Event) => {
        const detail = (event as CustomEvent<{ acknowledgeAIWorkoutEvent?: () => void }>).detail;
        detail.acknowledgeAIWorkoutEvent?.();
      });
      window.addEventListener(eventName, listener);
      try {
        expect(dispatchAIWorkoutEvent(eventName, {})).toBe(true);
      } finally {
        window.removeEventListener(eventName, listener);
      }
    },
  );

  it.each(['toString', 'constructor', '__proto__'])(
    'fails closed for inherited event name %s',
    (eventName) => {
      expect(dispatchAIWorkoutEvent(eventName, {})).toBe(false);
    },
  );
  it('fails closed for arrays without coercing them into event names', () => {
    const listener = vi.fn();
    window.addEventListener(AI_ADD_EXERCISE, listener);
    try {
      let result: boolean | undefined;
      expect(() => {
        result = dispatchAIWorkoutEvent([AI_ADD_EXERCISE], {});
      }).not.toThrow();
      expect(result).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(AI_ADD_EXERCISE, listener);
    }
  });

  it('fails closed for objects with a throwing custom toString', () => {
    const listener = vi.fn();
    const toString = vi.fn(() => {
      throw new Error('event name coercion must not run');
    });
    window.addEventListener(AI_ADD_EXERCISE, listener);
    try {
      let result: boolean | undefined;
      expect(() => {
        result = dispatchAIWorkoutEvent({ toString }, {});
      }).not.toThrow();
      expect(result).toBe(false);
      expect(toString).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(AI_ADD_EXERCISE, listener);
    }
  });

  it.each([0, 42, null, undefined])(
    'fails closed for non-string event name %s',
    (eventName) => {
      const listener = vi.fn();
      window.addEventListener(AI_ADD_EXERCISE, listener);
      try {
        let result: boolean | undefined;
        expect(() => {
          result = dispatchAIWorkoutEvent(eventName, {});
        }).not.toThrow();
        expect(result).toBe(false);
        expect(listener).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener(AI_ADD_EXERCISE, listener);
      }
    },
  );

  it.each(['', ' ', '\t\n'])('fails closed for blank event name %j', (eventName) => {
    const listener = vi.fn();
    window.addEventListener(AI_ADD_EXERCISE, listener);
    try {
      let result: boolean | undefined;
      expect(() => {
        result = dispatchAIWorkoutEvent(eventName, {});
      }).not.toThrow();
      expect(result).toBe(false);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(AI_ADD_EXERCISE, listener);
    }
  });
});
