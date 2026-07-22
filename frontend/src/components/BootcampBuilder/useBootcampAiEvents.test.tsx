/**
 * CC-3b useBootcampAiEvents contracts — Swan Coach drives the Bootcamp Builder via the
 * additive AI_BOOTCAMP_* event family (same acknowledge handshake as the planner).
 * Laws under test: payloads re-validated against the builder's REAL option sets (invalid
 * values ack(false) and never mutate); unsupported tools ack(false) so the dock renders
 * the honest inline "can't do that yet" transcript message (Kimi law #2).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
  dispatchAIWorkoutEvent,
  AI_BOOTCAMP_SET_STRUCTURE,
  AI_BOOTCAMP_SET_DURATION,
  AI_BOOTCAMP_SET_FORMAT,
  AI_BOOTCAMP_PLACE_EXERCISE,
} from '../../utils/aiWorkoutEvents';
import { useBootcampAiEvents } from './useBootcampAiEvents';

const Harness: React.FC<{ handlers: Parameters<typeof useBootcampAiEvents>[0] }> = ({ handlers }) => {
  useBootcampAiEvents(handlers);
  return null;
};

const baseHandlers = () => ({
  setStationCount: vi.fn(),
  setExercisesPerStation: vi.fn(),
  setTargetDuration: vi.fn(),
  setClassStyle: vi.fn(),
  setOptPhase: vi.fn(),
  pushReceipt: vi.fn(),
});

describe('useBootcampAiEvents', () => {
  it('applies a valid structure change and acknowledges handled', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    const handled = dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_STRUCTURE, { stations: 5, exercisesPerStation: 3 });
    expect(handled).toBe(true);
    expect(handlers.setStationCount).toHaveBeenCalledWith(5);
    expect(handlers.setExercisesPerStation).toHaveBeenCalledWith(3);
  });

  it('rejects out-of-range structure values — no mutation, ack(false)', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    const handled = dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_STRUCTURE, { stations: 99 });
    expect(handled).toBe(false);
    expect(handlers.setStationCount).not.toHaveBeenCalled();
  });

  it('applies a valid duration (minutes clamped to the builder range)', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    const handled = dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_DURATION, { minutes: 45 });
    expect(handled).toBe(true);
    expect(handlers.setTargetDuration).toHaveBeenCalledWith('45');
  });

  it('rejects nonsense duration', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_DURATION, { minutes: -5 })).toBe(false);
    expect(handlers.setTargetDuration).not.toHaveBeenCalled();
  });

  it('applies format fields it knows (optPhase 1-5) and rejects unknown phases', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_FORMAT, { optPhase: 2 })).toBe(true);
    expect(handlers.setOptPhase).toHaveBeenCalledWith(2);
    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_FORMAT, { optPhase: 9 })).toBe(false);
  });

  it('PLACE_EXERCISE is honestly unsupported in v1 — ack(false), never a silent no-op', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_PLACE_EXERCISE, { exerciseName: 'Burpees' })).toBe(false);
  });

  it('stops listening on unmount', () => {
    const handlers = baseHandlers();
    const { unmount } = render(<Harness handlers={handlers} />);
    unmount();
    expect(dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_STRUCTURE, { stations: 4 })).toBe(false);
    expect(handlers.setStationCount).not.toHaveBeenCalled();
  });
});

describe('undo actions (Kimi law: aggregate undo, zero-click apply)', () => {
  it('structure receipt carries an Undo action restoring the PREVIOUS values', () => {
    const handlers = { ...baseHandlers(), getCurrent: () => ({ stationCount: 4, exercisesPerStation: 4, targetDuration: '40', optPhase: 1 }) };
    render(<Harness handlers={handlers} />);
    dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_STRUCTURE, { stations: 6 });
    const receipt = handlers.pushReceipt.mock.calls.at(-1)?.[0];
    expect(receipt.ok).toBe(true);
    expect(receipt.action?.label).toBe('Undo');
    expect(receipt.action?.eventName).toBe(AI_BOOTCAMP_SET_STRUCTURE);
    expect(receipt.action?.payload).toEqual({ stations: 4, exercisesPerStation: 4 });
  });

  it('duration receipt Undo restores the previous minutes', () => {
    const handlers = { ...baseHandlers(), getCurrent: () => ({ stationCount: 4, exercisesPerStation: 4, targetDuration: '40', optPhase: 1 }) };
    render(<Harness handlers={handlers} />);
    dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_DURATION, { minutes: 60 });
    const receipt = handlers.pushReceipt.mock.calls.at(-1)?.[0];
    expect(receipt.action?.payload).toEqual({ minutes: 40 });
  });

  it('without getCurrent the receipt has no Undo (never fabricates a previous state)', () => {
    const handlers = baseHandlers();
    render(<Harness handlers={handlers} />);
    dispatchAIWorkoutEvent(AI_BOOTCAMP_SET_DURATION, { minutes: 60 });
    const receipt = handlers.pushReceipt.mock.calls.at(-1)?.[0];
    expect(receipt.action).toBeUndefined();
  });
});
