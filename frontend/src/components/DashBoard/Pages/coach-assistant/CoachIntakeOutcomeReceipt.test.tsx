import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeOutcomeReceipt from './CoachIntakeOutcomeReceipt';

describe('CoachIntakeOutcomeReceipt privacy safety', () => {
  it('does not render arbitrary outcome title or detail text', () => {
    render(
      <CoachIntakeOutcomeReceipt
        outcome={{
          title: 'Email Marcus at private@example.com',
          detail: 'Raw transcript mentioned private@example.com and should not render.',
        }}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/Draft action recorded/i);
    expect(screen.getByRole('status')).toHaveTextContent(/Queue refreshed/i);
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
    expect(screen.queryByText(/Raw transcript/i)).toBeNull();
  });
});
