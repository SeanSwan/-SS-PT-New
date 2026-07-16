
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BuilderActionMatrix } from './WorkoutPlannerBuilderPanel.sections';

const buildActionProps = (overrides = {}) => ({
  saving: false,
  hasExercises: true,
  loadedPlanId: null,
  loadedIsCurrent: false,
  isDirty: true,
  onSaveDraft: vi.fn(),
  onSaveAndActivate: vi.fn(),
  onUpdateLoaded: vi.fn(),
  onUpdateAndActivate: vi.fn(),
  onDuplicateLoadedPlan: vi.fn(),
  onCreatePdf: vi.fn(),
  showCreatePdf: true,
  ...overrides,
});

describe('BuilderActionMatrix', () => {
  it('offers a create PDF action for the current manual builder plan', () => {
    const props = buildActionProps();

    render(<BuilderActionMatrix {...props} />);

    const createPdf = screen.getByRole('button', {
      name: /create pdf from current workout builder/i,
    });
    fireEvent.click(createPdf);

    expect(props.onCreatePdf).toHaveBeenCalledTimes(1);
  });
});
