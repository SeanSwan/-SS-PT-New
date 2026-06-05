import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CopilotSingleWorkoutFooter from './CopilotSingleWorkoutFooter';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

describe('CopilotSingleWorkoutFooter', () => {
  it('keeps single-workout footer actions outside the copilot state-machine shell', () => {
    expect(panelSource).toContain("from './CopilotSingleWorkoutFooter'");
    expect(panelSource).toContain('<CopilotSingleWorkoutFooter');
    expect(panelSource).not.toContain('<PrimaryButton onClick={handleApprove}');
    expect(panelSource).not.toContain('<SecondaryButton onClick={() => { setState');
  });

  it('renders regenerate and approve actions for draft review', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onRegenerate = vi.fn();

    render(
      <CopilotSingleWorkoutFooter
        state="draft_review"
        isSubmitting={false}
        onApprove={onApprove}
        onRegenerate={onRegenerate}
      />,
    );

    await user.click(screen.getByRole('button', { name: /regenerate/i }));
    await user.click(screen.getByRole('button', { name: /approve & save/i }));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('locks approval while saving', () => {
    render(
      <CopilotSingleWorkoutFooter
        state="approving"
        isSubmitting
        onApprove={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
