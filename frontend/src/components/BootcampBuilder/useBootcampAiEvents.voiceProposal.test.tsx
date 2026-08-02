import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { AI_BOOTCAMP_PLACE_EXERCISE, dispatchAIWorkoutEvent } from '../../utils/aiWorkoutEvents';
import { useBootcampAiEvents } from './useBootcampAiEvents';

const Harness: React.FC<{ handlers: Parameters<typeof useBootcampAiEvents>[0] }> = ({ handlers }) => {
  useBootcampAiEvents(handlers);
  return null;
};

describe('useBootcampAiEvents voice proposal boundary', () => {
  it('turns a valid spoken placement into a reviewable proposal without mutating the class', () => {
    const proposeExercise = vi.fn();
    const pushReceipt = vi.fn();
    render(<Harness handlers={{
      setStationCount: vi.fn(),
      setExercisesPerStation: vi.fn(),
      setTargetDuration: vi.fn(),
      setOptPhase: vi.fn(),
      proposeExercise,
      pushReceipt,
    }} />);

    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_PLACE_EXERCISE, {
      exerciseName: 'Goblet Squat',
      stationIndex: 2,
    })).toBe(true);
    expect(proposeExercise).toHaveBeenCalledWith({ exerciseName: 'Goblet Squat', stationIndex: 2 });
    expect(pushReceipt).toHaveBeenCalledWith(expect.objectContaining({ ok: true, text: expect.stringContaining('awaits review') }));
  });

  it('rejects blank or oversized voice exercise proposals', () => {
    const proposeExercise = vi.fn();
    render(<Harness handlers={{
      setStationCount: vi.fn(),
      setExercisesPerStation: vi.fn(),
      setTargetDuration: vi.fn(),
      setOptPhase: vi.fn(),
      proposeExercise,
    }} />);

    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_PLACE_EXERCISE, { exerciseName: ' ' })).toBe(false);
    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_PLACE_EXERCISE, { exerciseName: 'x'.repeat(121) })).toBe(false);
    expect(proposeExercise).not.toHaveBeenCalled();
  });
});
