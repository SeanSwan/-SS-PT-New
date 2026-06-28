import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachOnboardingWorkbench from './CoachOnboardingWorkbench';
import type { ClientOption } from '../../workspaces/clients-team/ClientSelectorDropdown';

const clients: ClientOption[] = [
  {
    id: 77,
    firstName: 'Ava',
    lastName: 'Stone',
    email: 'ava@example.test',
    clientSource: 'move_fitness',
    onboardingFieldLedger: {
      summary: { completionPercentage: 44 },
      fields: [
        { key: 'primary_goal', status: 'known', category: 'goals_outcomes', label: 'Primary training goal' },
        { key: 'current_pain', status: 'client_requested', category: 'pain_body_map_movement_screen', label: 'Current pain map' },
      ],
    },
  },
];

const Harness: React.FC<{ onSubmit: ReturnType<typeof vi.fn>; onSelect?: (clientId: number) => void }> = ({ onSubmit, onSelect }) => {
  const [commandText, setCommandText] = useState('');
  return (
    <CoachOnboardingWorkbench
      clients={clients}
      selectedClientId={77}
      selectedClientLabel="Client #77"
      commandText={commandText}
      queueSummary={{ preparedDrafts: 2, pendingDrafts: 1 }}
      onCommandTextChange={setCommandText}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      onSelectClientId={onSelect}
    />
  );
};

describe('CoachOnboardingWorkbench', () => {
  it('renders real roster and ledger data while staging Coach command text', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    expect(screen.getByRole('heading', { name: /client onboarding workbench/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ava Stone/i })).toBeInTheDocument();
    expect(screen.getByText(/44% coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/Pain map and movement screen/i)).toBeInTheDocument();
    expect(screen.getByText(/Prepared: 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /use next question/i }));
    expect((screen.getByLabelText(/swan coach onboarding command/i) as HTMLTextAreaElement).value).toContain('Current pain map');

    fireEvent.click(screen.getByRole('button', { name: /prepare review draft/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('routes roster selection back through the Coach route context', () => {
    const onSelect = vi.fn();
    render(<Harness onSubmit={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Ava Stone/i }));

    expect(onSelect).toHaveBeenCalledWith(77);
  });
});
