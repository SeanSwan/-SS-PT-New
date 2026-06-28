import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailCommandPanel from './SessionDetailCommandPanel';
import type { SessionDetail } from './SessionDetailModal.types';

const baseSession: SessionDetail = {
  id: 72,
  sessionDate: '2026-06-27T12:00:00.000Z',
  duration: 60,
  status: 'confirmed',
  userId: 44,
  trainerId: 9,
  clientName: 'Client Alpha',
  trainerName: 'Coach Swan',
  clientAvailableSessions: 0,
  attendanceStatus: 'present',
  sessionDeducted: false,
};

describe('SessionDetailCommandPanel', () => {
  it('renders payment review as the primary admin action for zero-credit paid sessions', () => {
    const onApplyPayment = vi.fn();

    render(
      <SessionDetailCommandPanel
        session={baseSession}
        mode="admin"
        now={new Date('2026-06-28T18:00:00.000Z')}
        isNonDeductingClient={false}
        onApplyPayment={onApplyPayment}
      />
    );

    expect(screen.getByRole('heading', { name: /appointment command/i })).toBeInTheDocument();
    expect(screen.getByText('Payment review')).toBeInTheDocument();
    expect(screen.getAllByText('Payment recovery needed')).toHaveLength(2);
    expect(screen.getByText('No AI proposals drafted')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open payment review/i }));

    expect(onApplyPayment).toHaveBeenCalledWith(44);
  });

  it('shows attendance attention without exposing payment mutation to trainers', () => {
    render(
      <SessionDetailCommandPanel
        session={{ ...baseSession, attendanceStatus: null }}
        mode="trainer"
        now={new Date('2026-06-28T18:00:00.000Z')}
        isNonDeductingClient={false}
      />
    );

    expect(screen.getByText('Attendance review')).toBeInTheDocument();
    expect(screen.getByText('Missing attendance after cutoff')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open payment review/i })).not.toBeInTheDocument();
  });
});
