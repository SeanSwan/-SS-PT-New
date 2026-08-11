/**
 * Variant delete must be GATED — the third and last of the window.confirm
 * conversions done 2026-08-05, and the most destructive of them: it DELETEs a
 * buyer-facing variant and drops the row locally, with no undo anywhere.
 *
 * The sibling contract test for this file is a source grep, which cannot tell
 * "renders a dialog and waits" from "renders a dialog and deletes anyway".
 * Verified by mutation on the other two conversions: injecting exactly that
 * regression PASSES every grep and FAILS a render test. So this renders.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductVariantsManager from './ProductVariantsManager';

const variant = { id: 7, label: 'Organic 1.5L', price: null, stockQuantity: null, isActive: true };

const authAxios = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() };
const toast = vi.fn();

vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ authAxios }) }));
vi.mock('../../../../hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

beforeEach(() => {
  vi.clearAllMocks();
  authAxios.get.mockResolvedValue({ data: { variants: [variant] } });
  authAxios.delete.mockResolvedValue({ data: {} });
});

const openDeleteDialog = async () => {
  render(<ProductVariantsManager itemId={1} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Organic 1.5L' }));
  return screen.getByRole('dialog');
};

describe('variant delete confirmation gate', () => {
  it('does not delete on the trash click alone', async () => {
    const dialog = await openDeleteDialog();

    expect(authAxios.delete).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/buyer variant list/i)).toBeInTheDocument();
  });

  it('deletes only after the dialog is confirmed', async () => {
    const dialog = await openDeleteDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete variant' }));

    await waitFor(() => expect(authAxios.delete).toHaveBeenCalledTimes(1));
    expect(authAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/variants/7'));
  });

  it('abandons the delete on cancel, and the variant survives', async () => {
    const dialog = await openDeleteDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(authAxios.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Organic 1.5L')).toBeInTheDocument();
  });

  it('issues exactly one delete when confirm is double-clicked', async () => {
    const dialog = await openDeleteDialog();
    const confirm = within(dialog).getByRole('button', { name: 'Delete variant' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(authAxios.delete).toHaveBeenCalledTimes(1));
  });

  it('cancels on Escape, so the gate is reachable without a mouse', async () => {
    const dialog = await openDeleteDialog();
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(authAxios.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
