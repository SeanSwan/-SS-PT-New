import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminBroadcastComposer from './AdminBroadcastComposer';

const mocks = vi.hoisted(() => {
  const post = vi.fn();
  return { post, authAxios: { post } };
});

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mocks.authAxios,
  }),
}));

describe('AdminBroadcastComposer', () => {
  beforeEach(() => {
    mocks.post.mockReset();
  });

  it('sends admin broadcasts through the canonical admin notifications route', async () => {
    const onBroadcastComplete = vi.fn();
    mocks.post.mockResolvedValue({
      data: {
        success: true,
        notificationsCreated: 7,
        notificationsFailed: 1,
        audienceCount: 8,
      },
    });

    render(<AdminBroadcastComposer onBroadcastComplete={onBroadcastComplete} />);

    fireEvent.change(screen.getByLabelText(/broadcast title/i), {
      target: { value: '  Schedule update  ' },
    });
    fireEvent.change(screen.getByLabelText(/broadcast message/i), {
      target: { value: '  Saturday sessions moved.  ' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /^audience$/i }), {
      target: { value: 'clients' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /^priority$/i }), {
      target: { value: 'alert' },
    });
    fireEvent.change(screen.getByLabelText(/link/i), {
      target: { value: '/dashboard/client/schedule' },
    });

    fireEvent.click(screen.getByLabelText(/send this live broadcast/i));
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/api/admin/notifications/broadcast', {
        title: 'Schedule update',
        content: 'Saturday sessions moved.',
        audience: 'clients',
        type: 'alert',
        channels: ['in-app'],
        link: '/dashboard/client/schedule',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('7 delivered');
    expect(screen.getByRole('status')).toHaveTextContent('1 failed');
    expect(onBroadcastComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the send action disabled until title, message, and live confirmation are present', () => {
    render(<AdminBroadcastComposer />);

    expect(screen.getByRole('button', { name: /send broadcast/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/broadcast title/i), {
      target: { value: 'Alert' },
    });
    expect(screen.getByRole('button', { name: /send broadcast/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/broadcast message/i), {
      target: { value: 'Details' },
    });
    expect(screen.getByRole('button', { name: /send broadcast/i })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/send this live broadcast/i));
    expect(screen.getByRole('button', { name: /send broadcast/i })).toBeEnabled();
  });

  it('rejects external broadcast links before posting', async () => {
    render(<AdminBroadcastComposer />);

    fireEvent.change(screen.getByLabelText(/broadcast title/i), {
      target: { value: 'Alert' },
    });
    fireEvent.change(screen.getByLabelText(/broadcast message/i), {
      target: { value: 'Details' },
    });
    fireEvent.change(screen.getByLabelText(/link/i), {
      target: { value: 'https://example.com/outside' },
    });
    fireEvent.click(screen.getByLabelText(/send this live broadcast/i));
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Use an internal SwanStudios path');
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('shows the backend error without reporting a successful broadcast', async () => {
    mocks.post.mockResolvedValue({ data: { success: false, message: 'Title and content are required' } });

    render(<AdminBroadcastComposer />);

    fireEvent.change(screen.getByLabelText(/broadcast title/i), {
      target: { value: 'Alert' },
    });
    fireEvent.change(screen.getByLabelText(/broadcast message/i), {
      target: { value: 'Details' },
    });
    fireEvent.click(screen.getByLabelText(/send this live broadcast/i));
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Title and content are required');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});