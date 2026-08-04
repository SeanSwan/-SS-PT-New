import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBootcampWorkflowStage } from './useBootcampWorkflowStage';

describe('useBootcampWorkflowStage', () => {
  it('acquires the run surface only when Start Class enters Run', () => {
    const acquire = vi.fn(() => Promise.resolve({
      fullscreen: true,
      wakeLock: true,
      audio: true,
    }));
    const { result } = renderHook(() => useBootcampWorkflowStage(acquire));

    act(() => result.current.onStageChange('preflight'));
    expect(result.current.workflowStage).toBe('preflight');
    expect(acquire).not.toHaveBeenCalled();

    act(() => result.current.onStageChange('run'));
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(result.current.workflowStage).toBe('run');
    expect(result.current.floorMode).toBe(true);
  });

  it('releases the wake lock when the builder unmounts during Run', () => {
    const acquire = vi.fn(() => Promise.resolve({
      fullscreen: true,
      wakeLock: true,
      audio: true,
    }));
    const release = vi.fn(() => Promise.resolve());
    const { result, unmount } = renderHook(() => useBootcampWorkflowStage(acquire, release));

    act(() => result.current.onStageChange('run'));
    unmount();

    expect(release).toHaveBeenCalledTimes(1);
  });
  it('returns to Preflight without reacquiring browser capabilities', () => {
    const acquire = vi.fn(() => Promise.resolve({
      fullscreen: true,
      wakeLock: true,
      audio: true,
    }));
    const { result } = renderHook(() => useBootcampWorkflowStage(acquire));

    act(() => result.current.onStageChange('run'));
    act(() => result.current.onStageChange('preflight'));

    expect(acquire).toHaveBeenCalledTimes(1);
    expect(result.current.floorMode).toBe(false);
  });
});
