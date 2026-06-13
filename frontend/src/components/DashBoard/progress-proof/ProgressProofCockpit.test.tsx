/**
 * TEST: ProgressProofCockpit
 * PURPOSE: Verifies interactive proof copy and chart lens controls.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProgressProofCockpit from './ProgressProofCockpit';

describe('ProgressProofCockpit', () => {
  it('changes lenses through accessible controls', async () => {
    const user = userEvent.setup();
    const onLensChange = vi.fn();

    const { rerender } = render(
      <ProgressProofCockpit
        activeLensId="all"
        nonEmptyChartCount={5}
        onLensChange={onLensChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /strength/i }));

    expect(onLensChange).toHaveBeenCalledWith('strength');
    rerender(
      <ProgressProofCockpit
        activeLensId="strength"
        nonEmptyChartCount={5}
        onLensChange={onLensChange}
      />,
    );
    expect(screen.getByText(/volume, set\/reps work, PRs, and anchor lifts/i)).toBeInTheDocument();
  });

  it('copies share-safe proof text without leaking the admin-visible client label', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(
      <ProgressProofCockpit
        activeLensId="all"
        audience="admin"
        nonEmptyChartCount={8}
        subjectLabel="Fixture Client"
        unavailableChartCount={0}
        onLensChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /copy proof summary/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('Proof level: Apex');
    expect(copiedText).not.toContain('Fixture Client');
    expect(screen.getByRole('status')).toHaveTextContent(/copied/i);
  });
});
