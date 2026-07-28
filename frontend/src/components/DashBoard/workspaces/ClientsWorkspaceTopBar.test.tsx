import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientsWorkspaceTopBar from './ClientsWorkspaceTopBar';

const baseProps = {
  clients: [],
  loading: false,
  exportingClients: false,
  onExportClients: vi.fn(),
  onSelectClient: vi.fn(),
  onNewClient: vi.fn(),
  onOpenAI: vi.fn(),
  onOpenOnboardingWorkbench: vi.fn(),
  onViewAsClient: vi.fn(),
  onDeactivateClient: vi.fn(),
  onReactivateClient: vi.fn(),
  onSendPasswordReset: vi.fn(),
  onManageAssignments: vi.fn(),
  onManualCreateClient: vi.fn(),
};

describe('ClientsWorkspaceTopBar', () => {
  it('uses fallback client identity in selected-client admin actions', () => {
    render(
      <ClientsWorkspaceTopBar
        {...baseProps}
        selectedClient={{
          id: 424242,
          firstName: '',
          lastName: '',
          email: 'fallback.client@example.test',
          isActive: true,
        }}
      />
    );

    expect(screen.getByRole('button', {
      name: /view fallback.client@example.test as admin/i,
    })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', {
      name: /deactivate fallback.client@example.test/i,
    })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', {
      name: /send password reset link to fallback.client@example.test/i,
    })).toHaveAttribute('type', 'button');
  });

  it('keeps every top action as a non-submit button for embedded layouts', () => {
    render(<ClientsWorkspaceTopBar {...baseProps} selectedClient={null} />);

    expect(screen.getByRole('button', { name: /export client directory as csv/i })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /trainer assignments/i })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /open swan coach/i })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /manual add/i })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /new client/i })).toHaveAttribute('type', 'button');
  });

  it('opens the onboarding workbench from selected and empty states', () => {
    const onOpenOnboardingWorkbench = vi.fn();
    const selectedClient = {
      id: 424242,
      firstName: 'Ava',
      lastName: 'Stone',
      email: 'ava@example.test',
      isActive: true,
    };

    const { rerender } = render(
      <ClientsWorkspaceTopBar {...baseProps} onOpenOnboardingWorkbench={onOpenOnboardingWorkbench} selectedClient={null} />
    );
    screen.getByRole('button', { name: /^Open onboarding workbench$/i }).click();

    rerender(
      <ClientsWorkspaceTopBar {...baseProps} onOpenOnboardingWorkbench={onOpenOnboardingWorkbench} selectedClient={selectedClient} />
    );
    screen.getByRole('button', { name: /open onboarding workbench for ava stone/i }).click();

    expect(onOpenOnboardingWorkbench).toHaveBeenCalledTimes(2);
  });
  it('prioritizes onboarding actions before support actions when no client is selected', () => {
    render(<ClientsWorkspaceTopBar {...baseProps} selectedClient={null} />);

    const newClient = screen.getByRole('button', { name: /new client/i });
    const manualAdd = screen.getByRole('button', { name: /manual add/i });
    const swanCoach = screen.getByRole('button', { name: /open swan coach/i });
    const workbench = screen.getByRole('button', { name: /open onboarding workbench/i });
    const trainerAssignments = screen.getByRole('button', { name: /trainer assignments/i });

    expect(newClient.compareDocumentPosition(manualAdd) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(manualAdd.compareDocumentPosition(swanCoach) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(swanCoach.compareDocumentPosition(workbench) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(workbench.compareDocumentPosition(trainerAssignments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
