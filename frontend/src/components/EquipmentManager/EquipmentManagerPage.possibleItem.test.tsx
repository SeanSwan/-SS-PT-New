/**
 * EquipmentManagerPage V2 possible-candidate promotion regression.
 * =============================================================================
 * Low-confidence scan candidates should be promotable into manual inventory from
 * the batch tray without forcing trainers to retype the AI suggestion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { EquipmentItem } from '../../hooks/useEquipmentAPI';

const { scanEquipmentMock, listProfilesMock, getStatsMock, listItemsMock, addItemMock, reviewScanCandidateMock } = vi.hoisted(() => ({
  scanEquipmentMock: vi.fn(),
  listProfilesMock: vi.fn(),
  getStatsMock: vi.fn(),
  listItemsMock: vi.fn(),
  addItemMock: vi.fn(),
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
    addItem: addItemMock,
    updateItem: vi.fn(),
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
  equipmentCount: 0,
  coverPhotoUrl: null,
  createdAt: '',
  updatedAt: '',
};

const EMPTY_ITEMS = {
  success: true,
  items: [],
  pagination: { page: 1, limit: 50, total: 0, pages: 0 },
};

const ADDED_ITEM: EquipmentItem = {
  id: 41,
  profileId: 1,
  name: 'Foam Roller',
  trainerLabel: null,
  category: 'mobility',
  resistanceType: 'bodyweight',
  description: 'Promoted from AI scan suggestion',
  photoUrl: null,
  aiScanData: null,
  approvalStatus: 'manual',
  approvedAt: null,
  isActive: true,
  quantity: 1,
  createdAt: '',
  updatedAt: '',
};

async function openProfileDetail() {
  const { container } = render(<EquipmentManagerPage />);
  fireEvent.click(await screen.findByText(/Hotel Gym/));
  await screen.findByText('Swan Coach Scan');
  const galleryInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
  expect(galleryInput).toBeTruthy();
  return galleryInput;
}

describe('EquipmentManagerPage possible scan candidate promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue({
      success: true,
      stats: { profileCount: 1, itemCount: 0, pendingApprovals: 0 },
    });
    listItemsMock.mockResolvedValue(EMPTY_ITEMS);
  });

  it('adds a possible scan candidate as a manual inventory item from the batch tray', async () => {
    listItemsMock.mockResolvedValueOnce(EMPTY_ITEMS).mockResolvedValue({
      success: true,
      items: [ADDED_ITEM],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    });
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: null,
      items: [],
      scanResult: null,
      possibleItems: [{
        confidence: 0.42,
        suggestedName: 'Foam Roller',
        suggestedCategory: 'mobility',
        resistanceType: 'bodyweight',
        quantity: 1,
        description: 'Promoted from AI scan suggestion',
        suggestedExercises: ['Myofascial release'],
        boundingBox: { x: 0.16, y: 0.28, w: 0.32, h: 0.18 },
        candidateIndex: 4,
      }],
      scanSession: { sceneSummary: 'Foam roller visible near the rack.', candidateCount: 1, possibleItemCount: 1, reviewSessionId: 99 },
    });
    addItemMock.mockResolvedValueOnce({ success: true, item: ADDED_ITEM });

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, { target: { files: [new File(['gym-bytes'], 'gym.jpg', { type: 'image/jpeg' })] } });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(within(tray).getByText('Foam Roller')).toBeTruthy();
    expect(within(tray).getByText(/42% confidence/)).toBeTruthy();
    fireEvent.click(within(tray).getByRole('button', { name: /add foam roller to inventory/i }));

    await waitFor(() => expect(addItemMock).toHaveBeenCalledWith(1, expect.objectContaining({
      name: 'Foam Roller',
      category: 'mobility',
      resistanceType: 'bodyweight',
      quantity: 1,
    })));
    await waitFor(() => expect(reviewScanCandidateMock).toHaveBeenCalledWith(1, expect.objectContaining({
      reviewSessionId: 99,
      candidateIndex: 4,
      candidateStatus: 'possible',
      outcome: 'approved',
      equipmentItemId: 41,
      trainerCorrection: expect.objectContaining({
        name: 'Foam Roller',
        category: 'mobility',
        resistanceType: 'bodyweight',
      }),
    })));
    await waitFor(() => expect(screen.queryByLabelText('Latest equipment scan review')).toBeNull());
    expect(await screen.findByText('Foam Roller')).toBeTruthy();
  });
});