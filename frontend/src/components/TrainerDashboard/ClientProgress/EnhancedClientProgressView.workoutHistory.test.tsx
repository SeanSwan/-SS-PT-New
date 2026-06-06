import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EnhancedClientProgressViewShell from './EnhancedClientProgressViewShell';
import type { ClientData } from './Analytics';

vi.mock('./ClientProgressView', () => ({
  default: () => <div data-testid="client-progress-overview" />,
}));

const clientData: ClientData = {
  id: '42',
  firstName: 'Fixture',
  lastName: 'Client',
  username: 'fixture-client',
  startDate: '',
  totalSessions: 12,
  completedSessions: 9,
  riskLevel: 'medium',
  primaryGoals: ['Strength'],
  lastAssessment: '',
  progressMetrics: {
    strength: 80,
    cardio: 40,
    flexibility: 55,
    balance: 60,
    stability: 65,
  },
};

describe('EnhancedClientProgressView workout history', () => {
  it('renders recent workout records from the canonical trainer progress data', () => {
    render(
      <EnhancedClientProgressViewShell
        advancedMode={false}
        clientData={clientData}
        clientId="42"
        onAdvancedModeChange={vi.fn()}
        onGoalUpdate={vi.fn()}
        onTabChange={vi.fn()}
        tabValue={0}
        workoutHistory={[
          {
            date: '2026-05-21T10:00:00Z',
            type: 'Upper Body Strength',
            duration: 52,
            intensity: 8,
            exercises: ['Push-up', 'Cable Row'],
            notes: 'Client reported lower shoulder irritation.',
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: /recent workout history/i })).toBeInTheDocument();
    expect(screen.getByText('Upper Body Strength')).toBeInTheDocument();
    expect(screen.getByText(/52 min/i)).toBeInTheDocument();
    expect(screen.getByText(/intensity 8/i)).toBeInTheDocument();
    expect(screen.getByText(/push-up/i)).toBeInTheDocument();
    expect(screen.getByText(/lower shoulder irritation/i)).toBeInTheDocument();
  });
});
