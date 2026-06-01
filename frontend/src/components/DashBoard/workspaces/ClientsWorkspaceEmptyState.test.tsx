import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientsWorkspaceEmptyState from './ClientsWorkspaceEmptyState';

describe('ClientsWorkspaceEmptyState', () => {
  it('uses explicit non-submit actions in the first-run client hub state', () => {
    render(
      <ClientsWorkspaceEmptyState
        onNewClient={vi.fn()}
        onManualCreate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /onboard with swan coach/i })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /manual add/i })).toHaveAttribute('type', 'button');
  });
});
