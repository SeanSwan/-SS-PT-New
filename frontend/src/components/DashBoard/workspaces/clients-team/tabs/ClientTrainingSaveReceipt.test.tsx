import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClientTrainingSaveReceipt from './ClientTrainingSaveReceipt';

describe('ClientTrainingSaveReceipt', () => {
  it('shows booked scheduled session proof when a scheduled workout is saved', () => {
    render(
      <ClientTrainingSaveReceipt
        clientName="Client 42"
        savedWorkout={{
          id: 'form-1',
          date: '2026-05-03',
          scheduledSessionId: 777,
          sessionDeducted: true,
        }}
      />,
    );

    expect(screen.getByText('Form form-1')).toBeInTheDocument();
    expect(screen.getByText('Booked session 777')).toBeInTheDocument();
    expect(screen.getByText('Session deducted')).toBeInTheDocument();
  });

  it('shows active plan progress when a planned assignment advances', () => {
    render(
      <ClientTrainingSaveReceipt
        clientName="Client 42"
        savedWorkout={{
          id: 'form-plan-1',
          date: '2026-05-05',
          sessionDeducted: false,
          plannedAssignment: { weekNumber: 4, dayNumber: 2 },
          planProgress: {
            advanced: true,
            previous: { week: 4, day: 2 },
            next: { week: 5, day: 1 },
          },
        }}
      />,
    );

    expect(screen.getByText('Plan advanced W4D2 -> W5D1')).toBeInTheDocument();
  });

  it('does not show booked session proof for non-scheduled workout saves', () => {
    render(
      <ClientTrainingSaveReceipt
        clientName="Client 42"
        savedWorkout={{ id: 'form-2', date: '2026-05-04', sessionDeducted: false }}
      />,
    );

    expect(screen.queryByText(/Booked session/i)).not.toBeInTheDocument();
    expect(screen.getByText('No session deduction')).toBeInTheDocument();
  });
});