/**
 * EquipmentManagerPage V2 duplicate merge regression.
 * =============================================================================
 * Duplicate scan detections should be trainer-mergeable into the matched
 * inventory item without inventing a second item or leaving the tray stuck.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { EquipmentItem } from '../../hooks/useEquipmentAPI';

const { scanEquipmentMock, listProfilesMock, getStatsMock, listItemsMock, updateItemMock, reviewScanCandidateMock } = vi.hoisted(() => ({
  scanEquipmentMock: vi.fn(),
  listProfilesMock: vi.fn(),
  getStatsMock: vi.fn(),
  listItemsMock: vi.fn(),
  updateItemMock: vi.fn(),
  reviewScanCandidateMock: vi.fn(),
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
    updateItem: updateItemMock,
    deleteItem: vi.fn(),
    scanEquipment: scanEquipmentMock,
    approveItem: vi.fn(),
    rejectItem: vi.fn(),
    reviewScanCandidate: reviewScanCandidateMock,
    listExerciseMappings: vi.fn(),
    addExerciseMapping: vi.fn(),
    removeExerciseMapping: vi.fn(),
    confirmExerciseMapping: vi.fn(),
    getStats: getStatsMock,
  };
  return {
    ...actual,
    useEquipmentAPI: () => api,
    default: () => api,
  };
});

import EquipmentManagerPage from './EquipmentManagerPage';

const PROFILE = {
  id: 1,
  trainerId: 1,
  name: 'Hotel Gym',
  locationType: 'gym' as const,
  description: null,
  address: null,
  isDefault: false,
  isActive: true,
  equipmentCount: 1,
  coverPhotoUrl: null,
  createdAt: '',
  updatedAt: '',
};

const EXISTING_ITEM: EquipmentItem = {
  id: 7,
  profileId: 1,
  name: 'Adjustable Dumbbells',
  trainerLabel: null,
  category: 'dumbbell',
  resistanceType: 'dumbbell',
  description: null,
  photoUrl: null,
  aiScanData: null,
  approvalStatus: 'manual',
  approvedAt: null,
  isActive: true,
  quantity: 1,
  createdAt: '',
  updatedAt: '',
};

const UPDATED_ITEM: EquipmentItem = {
  ...EXISTING_ITEM,
  quantity: 3,
};

const itemsResponse = (items: EquipmentItem[]) => ({
  success: true,
  items,
  pagination: { page: 1, limit: 50, total: items.length, pages: 1 },
});

async function openProfileDetail() {
  const { container } = render(<EquipmentManagerPage />);
  fireEvent.click(await screen.findByText(/Hotel Gym/));
  await screen.findByText('Swan Coach Scan');
  const galleryInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
  expect(galleryInput).toBeTruthy();
  return galleryInput;
}

describe('EquipmentManagerPage duplicate scan merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue({
      success: true,
      stats: { profileCount: 1, itemCount: 1, pendingApprovals: 0 },
    });
    listItemsMock.mockResolvedValue(itemsResponse([EXISTING_ITEM]));
  });

  it('merges a duplicate scan candidate into the matched item quantity', async () => {
    listItemsMock
      .mockResolvedValueOnce(itemsResponse([EXISTING_ITEM]))
      .mockResolvedValueOnce(itemsResponse([EXISTING_ITEM]))
      .mockResolvedValue(itemsResponse([UPDATED_ITEM]));
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: null,
      items: [],
      scanResult: null,
      duplicates: [{
        status: 'duplicate',
        confidence: 0.91,
        suggestedName: 'Adjustable Dumbbells',
        suggestedCategory: 'dumbbell',
        resistanceType: 'dumbbell',
        quantity: 2,
        duplicateOfItemId: 7,
        matchType: 'dedupeKey',
        suggestedExercises: ['Goblet squat'],
        boundingBox: { x: 0.22, y: 0.3, w: 0.28, h: 0.18 },
        candidateIndex: 2,
      }],
      scanSession: { sceneSummary: 'Matched dumbbells already in inventory.', candidateCount: 1, duplicateCount: 1, reviewSessionId: 99 },
    });
    updateItemMock.mockResolvedValueOnce({ success: true, item: UPDATED_ITEM });

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, { target: { files: [new File(['gym-bytes'], 'gym.jpg', { type: 'image/jpeg' })] } });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(within(tray).getByText(/Matched Adjustable Dumbbells x1/)).toBeTruthy();
    fireEvent.click(within(tray).getByRole('button', { name: /merge adjustable dumbbells into matched inventory/i }));

    await waitFor(() => expect(updateItemMock).toHaveBeenCalledWith(1, 7, { quantity: 3 }));
    await waitFor(() => expect(reviewScanCandidateMock).toHaveBeenCalledWith(1, expect.objectContaining({
      reviewSessionId: 99,
      candidateIndex: 2,
      candidateStatus: 'duplicate',
      outcome: 'approved',
      equipmentItemId: 7,
      duplicateOfItemId: 7,
      trainerCorrection: expect.objectContaining({
        name: 'Adjustable Dumbbells',
        category: 'dumbbell',
        resistanceType: 'dumbbell',
      }),
    })));
    await waitFor(() => expect(screen.queryByLabelText('Latest equipment scan review')).toBeNull());
    expect(await screen.findByText('x3')).toBeTruthy();
  });
});