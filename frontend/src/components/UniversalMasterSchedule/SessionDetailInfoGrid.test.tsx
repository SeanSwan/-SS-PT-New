import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailInfoGrid from './SessionDetailInfoGrid';
import type { SessionDetail } from './SessionDetailModal.types';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

const baseSession: SessionDetail = {
  id: 12,
  sessionDate: '2026-05-31T10:30:00.000Z',
  duration: 60,
  status: 'confirmed',
  location: 'Main Studio',
  trainerId: 8,
  userId: 44,
  clientName: 'Client Alpha',
  trainerName: 'Coach Swan',
  clientEmail: 'client@example.com',
  clientPhone: '555-0100',
  clientAvailableSessions: 0,
  attendanceStatus: 'present',
  checkInTime: '2026-05-31T10:25:00.000Z',
  isRecurring: true,
};

describe('SessionDetailInfoGrid', () => {
  it('shows session details and routes admin payment recovery to the selected client', () => {
    const onApplyPayment = vi.fn();

    render(
      <SessionDetailInfoGrid
        session={baseSession}
        sessionDate={new Date(baseSession.sessionDate)}
        statusTone="var(--schedule-status-confirmed, #60C0F0)"
        hasAttendanceRecorded={true}
        canManage={true}
        mode="admin"
        isNonDeductingClient={false}
        sessionSignal={{ label: '0 paid sessions', note: 'refill soon', tone: 'warning' }}
        onApplyPayment={onApplyPayment}
      />
    );

    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('Client Alpha')).toBeInTheDocument();
    expect(screen.getByText('client@example.com')).toBeInTheDocument();
    expect(screen.getByText('0 paid sessions')).toBeInTheDocument();
    expect(screen.getByText('Client has no remaining session credits')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /apply payment/i }));

    expect(onApplyPayment).toHaveBeenCalledWith(44);
  });

  it('hides manager-only contact and paid recovery for client/free-tracking views', () => {
    render(
      <SessionDetailInfoGrid
        session={{ ...baseSession, clientSource: 'move_fitness' }}
        sessionDate={new Date(baseSession.sessionDate)}
        statusTone="var(--schedule-status-confirmed, #60C0F0)"
        hasAttendanceRecorded={false}
        canManage={false}
        mode="client"
        isNonDeductingClient={true}
        sessionSignal={{ label: 'free tracking', note: 'no deduction', tone: 'neutral' }}
      />
    );

    expect(screen.queryByText('client@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('555-0100')).not.toBeInTheDocument();
    expect(screen.queryByText('Client has no remaining session credits')).not.toBeInTheDocument();
    expect(screen.getByText('free tracking')).toBeInTheDocument();
  });

  it('keeps read-only session detail grid markup out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const gridSource = read('SessionDetailInfoGrid.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailInfoGrid'");
    expect(modalSource).not.toContain('<DetailGrid>');
    expect(modalSource).not.toContain('Client has no remaining session credits');
    expect(gridSource).toContain('<DetailGrid>');
    expect(gridSource).toContain('Client has no remaining session credits');
    expect(gridSource.split(/\r?\n/).length).toBeLessThanOrEqual(140);
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
