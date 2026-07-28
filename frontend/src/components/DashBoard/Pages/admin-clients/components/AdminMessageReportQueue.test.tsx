import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminMessageReportQueue from './AdminMessageReportQueue';

const mocks = vi.hoisted(() => {
  const get = vi.fn();
  const patch = vi.fn();
  return { get, patch, authAxios: { get, patch } };
});

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mocks.authAxios,
  }),
}));

const openReport = {
  id: 7,
  messageId: 44,
  reason: 'safety',
  details: 'Client flagged a pain escalation',
  status: 'open',
  createdAt: '2026-07-01T06:00:00.000Z',
  conversationId: 12,
  messageExcerpt: 'My knee pain spiked during squats.',
  reporter: { id: 3, firstName: 'Ava', lastName: 'Client', role: 'client' },
  sender: { id: 9, firstName: 'Trainer', lastName: 'One', role: 'trainer' },
};

describe('AdminMessageReportQueue', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.patch.mockReset();
  });

  it('loads open message reports from the canonical messaging admin route', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, reports: [openReport] } });

    render(<AdminMessageReportQueue />);

    await waitFor(() => {
      expect(mocks.get).toHaveBeenCalledWith('/api/messaging/admin/reports?status=open&limit=25');
    });

    expect(await screen.findByRole('region', { name: /message report queue/i })).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('My knee pain spiked during squats.')).toBeInTheDocument();
    expect(screen.getByText(/Reporter: Ava Client/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resolve report 7/i })).toBeEnabled();
  });

  it('resolves and dismisses reports through the admin moderation endpoint', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, reports: [openReport] } });
    mocks.patch.mockResolvedValue({ data: { success: true } });

    render(<AdminMessageReportQueue />);

    await screen.findByText('My knee pain spiked during squats.');
    fireEvent.click(screen.getByRole('button', { name: /resolve report 7/i }));

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/api/messaging/admin/reports/7', {
        status: 'resolved',
        resolutionNote: 'Resolved in admin Communications Center',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /dismiss report 7/i }));
    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/api/messaging/admin/reports/7', {
        status: 'dismissed',
        resolutionNote: 'Dismissed in admin Communications Center',
      });
    });
  });

  it('shows a retryable error state when reports cannot be loaded', async () => {
    mocks.get.mockResolvedValue({ data: { success: false } });

    render(<AdminMessageReportQueue />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Message reports unavailable');
    expect(screen.getByRole('button', { name: /refresh message reports/i })).toBeEnabled();
  });
});