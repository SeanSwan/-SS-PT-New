import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FactionHooksPanel from './FactionHooksPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: apiMocks.get,
    patch: apiMocks.patch,
  },
}));

describe('FactionHooksPanel mutation locks', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
  });

  it('blocks duplicate faction joins before React can rerender disabled state', async () => {
    const pendingPatches: Array<(value: unknown) => void> = [];
    apiMocks.get.mockResolvedValue({ data: { success: true, data: { factionId: null } } });
    apiMocks.patch.mockImplementation(() => new Promise((resolve) => {
      pendingPatches.push(resolve);
    }));

    render(<FactionHooksPanel />);

    const factionInput = await screen.findByPlaceholderText(/enter faction name/i);
    fireEvent.change(factionInput, { target: { value: '  Swan Team  ' } });
    const joinButton = screen.getByRole('button', { name: /^join$/i });

    act(() => {
      fireEvent.click(joinButton);
      fireEvent.click(joinButton);
    });

    expect(apiMocks.patch).toHaveBeenCalledTimes(1);
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/avatar-home/faction', {
      factionId: 'Swan Team',
    });
    expect(await screen.findByRole('button', { name: /^joining\.\.\.$/i })).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      pendingPatches[0]({ data: { success: true, data: { factionId: 'Swan Team' } } });
    });
    await screen.findByText('Swan Team');
  });

  it('blocks duplicate faction leaves before React can rerender disabled state', async () => {
    const pendingPatches: Array<(value: unknown) => void> = [];
    apiMocks.get.mockResolvedValue({ data: { success: true, data: { factionId: 'Swan Team' } } });
    apiMocks.patch.mockImplementation(() => new Promise((resolve) => {
      pendingPatches.push(resolve);
    }));

    render(<FactionHooksPanel />);

    const leaveButton = await screen.findByRole('button', { name: /^leave$/i });
    act(() => {
      fireEvent.click(leaveButton);
      fireEvent.click(leaveButton);
    });

    expect(apiMocks.patch).toHaveBeenCalledTimes(1);
    expect(apiMocks.patch).toHaveBeenCalledWith('/api/avatar-home/faction', {
      factionId: null,
    });
    expect(await screen.findByRole('button', { name: /^leaving\.\.\.$/i })).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      pendingPatches[0]({ data: { success: true } });
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /^join$/i })).toBeInTheDocument());
  });

  it('drops malformed fetched faction ids instead of rendering object-shaped payloads', async () => {
    apiMocks.get.mockResolvedValue({
      data: {
        success: true,
        data: { factionId: { label: 'raw-provider-object' } },
      },
    });

    render(<FactionHooksPanel />);

    expect(await screen.findByRole('button', { name: /^join$/i })).toBeInTheDocument();
    expect(screen.queryByText(/raw-provider-object/i)).not.toBeInTheDocument();
  });

  it('falls back to the submitted faction id when save returns malformed payload data', async () => {
    const pendingPatches: Array<(value: unknown) => void> = [];
    apiMocks.get.mockResolvedValue({ data: { success: true, data: { factionId: null } } });
    apiMocks.patch.mockImplementation(() => new Promise((resolve) => {
      pendingPatches.push(resolve);
    }));

    render(<FactionHooksPanel />);

    const factionInput = await screen.findByPlaceholderText(/enter faction name/i);
    fireEvent.change(factionInput, { target: { value: 'Swan Team' } });
    fireEvent.click(screen.getByRole('button', { name: /^join$/i }));

    await act(async () => {
      pendingPatches[0]({
        data: {
          success: true,
          data: { factionId: { label: 'raw-provider-object' } },
        },
      });
    });

    expect(await screen.findByText('Swan Team')).toBeInTheDocument();
    expect(screen.queryByText(/raw-provider-object/i)).not.toBeInTheDocument();
  });

  it('blocks overlong and control-character faction IDs before submitting', async () => {
    apiMocks.get.mockResolvedValue({ data: { success: true, data: { factionId: null } } });

    render(<FactionHooksPanel />);

    const factionInput = await screen.findByPlaceholderText(/enter faction name/i);
    const joinButton = screen.getByRole('button', { name: /^join$/i });

    fireEvent.change(factionInput, { target: { value: 'x'.repeat(51) } });
    expect(joinButton).toBeDisabled();
    fireEvent.click(joinButton);

    fireEvent.change(factionInput, { target: { value: 'Swan\u007FTeam' } });
    expect(joinButton).toBeDisabled();
    fireEvent.click(joinButton);

    fireEvent.change(factionInput, { target: { value: 'Swan Team' } });
    expect(joinButton).toBeEnabled();
    expect(apiMocks.patch).not.toHaveBeenCalled();
  });
});
