/**
 * EquipmentManagerPage error-state regression (Slice 1: discoverability + stability).
 * =============================================================================
 * The profile-list and item-list loaders previously swallowed failures in silent
 * `catch {}` blocks, so a network blip rendered the EMPTY state ("No equipment
 * profiles yet" / "No equipment here yet") — making a trainer's real inventory
 * look deleted. These tests lock that a load failure now renders a RETRYABLE
 * error, never a false empty state, and that retry recovers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const { listProfilesMock, getStatsMock, listItemsMock, approveItemMock } = vi.hoisted(() => ({
  listProfilesMock: vi.fn(),
  getStatsMock: vi.fn(),
  listItemsMock: vi.fn(),
  approveItemMock: vi.fn(),
}));

vi.mock('../../hooks/useEquipmentAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useEquipmentAPI')>();
  const api = {
    listProfiles: listProfilesMock,
    getProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    listItems: listItemsMock,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    scanEquipment: vi.fn(),
    approveItem: approveItemMock,
    rejectItem: vi.fn(),
    listExerciseMappings: vi.fn(),
    addExerciseMapping: vi.fn(),
    removeExerciseMapping: vi.fn(),
    confirmExerciseMapping: vi.fn(),
    getStats: getStatsMock,
  };
  return { ...actual, useEquipmentAPI: () => api, default: () => api };
});

import EquipmentManagerPage from './EquipmentManagerPage';

const PROFILE = {
  id: 1, trainerId: 1, name: 'Hotel Gym', locationType: 'gym' as const,
  description: null, address: null, isDefault: false, isActive: true,
  equipmentCount: 0, coverPhotoUrl: null, createdAt: '', updatedAt: '',
};
const STATS_OK = { success: true, stats: { profileCount: 1, itemCount: 0, pendingApprovals: 0 } };
const ITEMS_OK = { success: true, items: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } };
const PENDING_ITEM = {
  id: 10, profileId: 1, name: 'Squat Rack', trainerLabel: null,
  category: 'rack' as const, resistanceType: null, description: null,
  photoUrl: null, aiScanData: null, approvalStatus: 'pending' as const,
  approvedAt: null, isActive: true, quantity: 1, createdAt: '', updatedAt: '',
};

describe('EquipmentManagerPage error states (silent-catch regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The catches now log via console.error by design — keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders a retryable error (not a false empty state) when the profile list fails to load', async () => {
    listProfilesMock.mockRejectedValueOnce(new Error('network down'));
    getStatsMock.mockResolvedValue(STATS_OK);

    render(<EquipmentManagerPage />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Try again')).toBeTruthy();
    // The false-empty state must NOT be shown on a failure.
    expect(screen.queryByText('No equipment profiles yet')).toBeNull();

    // Recovery: retry succeeds and the real profile renders, error clears.
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    fireEvent.click(within(alert).getByText('Try again'));
    await screen.findByText(/Hotel Gym/);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("renders a retryable error in the detail view when a location's equipment fails to load", async () => {
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue(STATS_OK);
    listItemsMock.mockRejectedValueOnce(new Error('items fetch failed'));

    render(<EquipmentManagerPage />);
    fireEvent.click(await screen.findByText(/Hotel Gym/));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('No equipment here yet')).toBeNull();

    // Recovery: retry loads the (empty) inventory and shows the REAL empty state.
    listItemsMock.mockResolvedValue(ITEMS_OK);
    fireEvent.click(within(alert).getByText('Try again'));
    await screen.findByText('No equipment here yet');
  });

  it('surfaces an inline error inside the approval modal (and keeps it open) when approve fails', async () => {
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue(STATS_OK);
    listItemsMock.mockResolvedValue({
      success: true, items: [PENDING_ITEM],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    });
    approveItemMock.mockRejectedValueOnce(new Error('approve failed'));

    render(<EquipmentManagerPage />);
    fireEvent.click(await screen.findByText(/Hotel Gym/));
    fireEvent.click(await screen.findByText('Review'));
    await screen.findByText('Review AI Scan');

    fireEvent.click(screen.getByText('Confirm'));

    // The error must appear WHERE THE TRAINER ACTED — inside the dialog, not
    // only in a banner hidden behind it — and the dialog must stay open to retry.
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByRole('alert');
    expect(screen.getByText('Review AI Scan')).toBeTruthy();
    expect(approveItemMock).toHaveBeenCalledTimes(1);
  });
});
