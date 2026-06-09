import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditProfileForm } from './useEditProfileForm';

describe('useEditProfileForm chart visibility truth defaults', () => {
  it('initializes new profile chart settings to only proven live progress charts', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useEditProfileForm(null, onSave));

    expect(result.current.form.chartVisibility).toMatchObject({
      workoutFrequency: true,
      weightProgression: true,
      muscleRadar: false,
      workoutHeatmap: false,
      goalProgress: false,
    });
  });
});
