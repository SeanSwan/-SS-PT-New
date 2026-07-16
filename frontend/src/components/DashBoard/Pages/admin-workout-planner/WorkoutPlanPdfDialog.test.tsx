
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
  it('does not render direct protected API PDF URLs in view mode', () => {
    render(
      <WorkoutPlanPdfDialog
        plan={{
          ...plan,
          pdfFile: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
          },
        }}
        mode="view"
        saving={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onUpload={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/protected pdf preview/i);
    expect(screen.queryByTitle(/six month foundation pdf plan/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open pdf/i })).not.toBeInTheDocument();
  });

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
