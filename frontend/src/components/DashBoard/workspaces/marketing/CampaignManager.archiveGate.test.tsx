/**
 * Campaign archive must be GATED, and the gate must survive a double-click.
 *
 * This is the second of three window.confirm conversions done 2026-08-05. The
 * plan-lifecycle one is covered by its own render test; this one matters more
 * in one specific way: archive here fires a DELETE against the API and removes
 * the row optimistically, so a gate that leaks a second call would issue a
 * duplicate delete against a resource that no longer exists.
 *
 * The repo's other CampaignManager test is a source grep. A grep cannot tell
 * "renders a dialog and waits" from "renders a dialog and archives anyway".
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CampaignManager from './CampaignManager';
import type { MarketingCampaign } from './marketing.types';

const campaign = {
  id: 'c-1',
  name: 'Spring Reactivation',
  objective: 'reactivation',
  status: 'active',
} as unknown as MarketingCampaign;

const authAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  authAxios.get.mockResolvedValue({ data: { data: [campaign] } });
  authAxios.delete.mockResolvedValue({ data: {} });
});

const openArchiveDialog = async () => {
  render(<CampaignManager />);
  const trigger = await screen.findByRole('button', { name: /archive spring reactivation/i });
  fireEvent.click(trigger);
  return screen.getByRole('dialog');
};

describe('campaign archive confirmation gate', () => {
  it('does not delete on the icon click alone', async () => {
    const dialog = await openArchiveDialog();

    expect(authAxios.delete).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/hidden from the active list/i)).toBeInTheDocument();
  });

  it('deletes only after the dialog is confirmed', async () => {
    const dialog = await openArchiveDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive campaign' }));

    await waitFor(() => expect(authAxios.delete).toHaveBeenCalledTimes(1));
    expect(authAxios.delete).toHaveBeenCalledWith('/api/admin/marketing-campaigns/c-1');
  });

  it('abandons the archive on cancel', async () => {
    const dialog = await openArchiveDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(authAxios.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('issues exactly one delete when confirm is double-clicked', async () => {
    const dialog = await openArchiveDialog();
    const confirm = within(dialog).getByRole('button', { name: 'Archive campaign' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(authAxios.delete).toHaveBeenCalledTimes(1));
  });

  it('cancels on Escape, so the gate is reachable without a mouse', async () => {
    const dialog = await openArchiveDialog();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(authAxios.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
