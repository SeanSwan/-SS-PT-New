import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCreateSpecialManager from './AdminCreateSpecialManager';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../../../services/api', () => ({
  default: { post: mocks.post },
}));

vi.mock('../../../../context/GlobalClientContext', () => ({
  useGlobalClient: () => ({
    clientList: [
      { id: 501, firstName: 'Paid', lastName: 'Client' },
      { id: 502, firstName: 'Other', lastName: 'Client' },
    ],
    loadingClients: false,
  }),
}));

describe('Create Special authoritative receipt contract', () => {
  beforeEach(() => {
    mocks.post.mockReset();
  });

  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText('Client'), { target: { value: '501' } });
    fireEvent.change(screen.getByLabelText('Effective $ / session'), { target: { value: '80' } });
  }

  it('shows success only from a complete authoritative pricing receipt', async () => {
    mocks.post.mockResolvedValueOnce({
      status: 201,
      data: {
        success: true,
        pricing: { totalSessions: 22, effectiveHourlyRate: 79.55 },
        storefrontItemId: 88,
      },
    });

    render(<AdminCreateSpecialManager />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('22 sessions'));
    expect(screen.getByRole('status')).toHaveTextContent('~$80/session');
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('keeps the form and requires checking existing specials when the receipt is malformed', async () => {
    mocks.post.mockResolvedValueOnce({
      status: 201,
      data: { success: true, pricing: { totalSessions: 'not-a-number' } },
    });

    render(<AdminCreateSpecialManager />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/check existing specials before retrying/i));
    expect(screen.queryByText(/Special created/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Client')).toHaveValue('501');
    expect(screen.getByLabelText('Effective $ / session')).toHaveValue(80);
    expect(screen.getByRole('button', { name: 'Create Special' })).toBeEnabled();
  });

  it('retains selections after a rejected create so the admin can retry', async () => {
    mocks.post.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Target rate must be positive' } } });

    render(<AdminCreateSpecialManager />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Target rate must be positive'));
    expect(screen.getByLabelText('Client')).toHaveValue('501');
    expect(screen.getByLabelText('Effective $ / session')).toHaveValue(80);
    expect(screen.getByRole('button', { name: 'Create Special' })).toBeEnabled();
  });

  it('prevents duplicate in-flight submits', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.post.mockReturnValueOnce(new Promise((r) => { resolve = r; }));

    render(<AdminCreateSpecialManager />);
    fillRequiredFields();
    const button = screen.getByRole('button', { name: 'Create Special' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
    resolve?.({ status: 201, data: { success: true, pricing: { totalSessions: 22, effectiveHourlyRate: 80 } } });
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
  });

  const receipt = (sessions = 22) => ({
    status: 201,
    data: { success: true, pricing: { totalSessions: sessions, effectiveHourlyRate: 80 } },
  });
  const validationFailure = { response: { status: 422, data: { message: 'Target rate must be positive' } } };
  function deferred() {
    let resolve!: (value: unknown) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  describe('AF1-03/05 regressions', () => {
    it.each(['success', 'validation rejection'] as const)(
      'settles a %s after actual StrictMode effect replay', async (outcome) => {
        const pending = deferred();
        mocks.post.mockReturnValueOnce(pending.promise);
        render(<StrictMode><AdminCreateSpecialManager /></StrictMode>);
        fillRequiredFields();
        const submit = screen.getByRole('button', { name: 'Create Special' });
        act(() => {
          fireEvent.click(submit);
          fireEvent.click(submit);
        });
        expect(mocks.post).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();

        await act(async () => {
          if (outcome === 'success') pending.resolve(receipt());
          else pending.reject(validationFailure);
        });

        expect(screen.getByRole('button', { name: 'Create Special' })).toBeEnabled();
        if (outcome === 'success') {
          expect(screen.getByRole('status')).toHaveTextContent('22 sessions');
          expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        } else {
          expect(screen.getByRole('alert')).toHaveTextContent('Target rate must be positive');
          expect(screen.queryByRole('status')).not.toBeInTheDocument();
        }
      },
    );

    it.each([
      ['lost response', new Error('Network Error')],
      ['timeout', { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }],
      ['HTTP timeout', { response: { status: 408, data: { message: 'Request timeout' } } }],
      ['server failure', { response: { status: 500, data: { message: 'Failed to create custom package' } } }],
      ['service failure', { response: { status: 503, data: { message: 'Service unavailable' } } }],
    ])('keeps a synthetic commit with %s unconfirmed and requires checking before retry', async (_label, failure) => {
      const committed: unknown[] = [];
      mocks.post.mockImplementationOnce(async (_url, body) => {
        committed.push(body);
        throw failure;
      });
      render(<AdminCreateSpecialManager />);
      fillRequiredFields();
      fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Synthetic preserved offer' } });
      fireEvent.change(screen.getByLabelText('Admin note (optional, not shown to client)'), { target: { value: 'Keep this draft' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/check existing specials before retrying/i));
      expect(screen.getByRole('alert')).toHaveTextContent(/could not be confirmed/i);
      expect(screen.getByRole('alert')).not.toHaveTextContent(/could not create|try again/i);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Special' })).toBeEnabled();
      expect(screen.getByLabelText('Client')).toHaveValue('501');
      expect(screen.getByLabelText('Effective $ / session')).toHaveValue(80);
      expect(screen.getByLabelText('Name (optional)')).toHaveValue('Synthetic preserved offer');
      expect(screen.getByLabelText('Admin note (optional, not shown to client)')).toHaveValue('Keep this draft');
      expect(committed).toHaveLength(1);
      expect(mocks.post).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['success', ['502']],
      ['rejection', ['502']],
      ['success', ['502', '501']],
      ['rejection', ['502', '501']],
    ] as const)('ignores stale %s after client changes %j', async (outcome, clients) => {
      const pending = deferred();
      mocks.post.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(receipt(31));
      render(<AdminCreateSpecialManager />);
      fillRequiredFields();
      fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));
      for (const id of clients) fireEvent.change(screen.getByLabelText('Client'), { target: { value: id } });
      fireEvent.click(screen.getByRole('button', { name: 'Creating…' }));
      expect(mocks.post).toHaveBeenCalledTimes(1);

      await act(async () => {
        if (outcome === 'success') pending.resolve(receipt());
        else pending.reject(validationFailure);
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Special' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('31 sessions'));
      expect(mocks.post).toHaveBeenLastCalledWith('/api/custom-packages', expect.objectContaining({ clientId: Number(clients.at(-1)) }));
    });

    it.each(['success', 'rejection'] as const)('clears a published %s when the selected client changes', async (outcome) => {
      if (outcome === 'success') mocks.post.mockResolvedValueOnce(receipt());
      else mocks.post.mockRejectedValueOnce(validationFailure);
      render(<AdminCreateSpecialManager />);
      fillRequiredFields();
      fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));
      await waitFor(() => expect(screen.getByRole(outcome === 'success' ? 'status' : 'alert')).toBeInTheDocument());
      fireEvent.change(screen.getByLabelText('Client'), { target: { value: '502' } });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it.each(['success', 'rejection'] as const)('ignores late %s after unmount while the next mount is pending', async (outcome) => {
      const old = deferred();
      const current = deferred();
      mocks.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      const previous = render(<AdminCreateSpecialManager />);
      fillRequiredFields();
      fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));
      previous.unmount();
      render(<AdminCreateSpecialManager />);
      fillRequiredFields();
      fireEvent.click(screen.getByRole('button', { name: 'Create Special' }));

      await act(async () => {
        if (outcome === 'success') old.resolve(receipt());
        else old.reject(validationFailure);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
      await act(async () => current.resolve(receipt(31)));
      expect(screen.getByRole('status')).toHaveTextContent('31 sessions');
      expect(screen.getByRole('button', { name: 'Create Special' })).toBeEnabled();
      expect(mocks.post).toHaveBeenCalledTimes(2);
    });
  });
});
