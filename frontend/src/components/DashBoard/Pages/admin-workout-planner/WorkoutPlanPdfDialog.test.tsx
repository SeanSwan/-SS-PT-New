import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WorkoutPlanPdfDialog from './WorkoutPlanPdfDialog';
import type { SavedPlanSummary } from './SavedPlanCard';

const plan: SavedPlanSummary = {
  id: 'plan-1',
  name: 'Six Month Foundation',
  status: 'active',
  createdAt: '2026-06-06T12:00:00.000Z',
  goal: 'strength',
  pdfFile: null,
};

describe('WorkoutPlanPdfDialog', () => {
  it('lets trainers upload a PDF file instead of pasting a URL', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(
      <WorkoutPlanPdfDialog
        plan={plan}
        mode="edit"
        saving={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onUpload={onUpload}
      />,
    );

    const file = new File(['%PDF-1.4\n%%EOF\n'], 'Six Month Foundation.pdf', {
      type: 'application/pdf',
    });

    await user.upload(screen.getByLabelText(/upload pdf plan file/i), file);
    await user.click(screen.getByRole('button', { name: /upload pdf plan/i }));

    expect(onUpload).toHaveBeenCalledWith('plan-1', file);
  });
});
