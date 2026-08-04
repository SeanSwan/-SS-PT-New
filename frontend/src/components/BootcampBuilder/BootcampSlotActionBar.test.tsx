import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BootcampSlotActionBar from './BootcampSlotActionBar';

describe('BootcampSlotActionBar', () => {
  it('provides duplicate, remove, and no-drag station movement controls for a class slot', () => {
    const onDuplicate = vi.fn();
    const onMove = vi.fn();
    const onRemove = vi.fn();

    render(
      <BootcampSlotActionBar
        exerciseName="Front Squat"
        stationCount={3}
        stationIndex={0}
        onDuplicate={onDuplicate}
        onMove={onMove}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Front Squat' }));
    fireEvent.change(screen.getByLabelText('Move Front Squat to station'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Front Squat' }));

    expect(onDuplicate).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(2);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
