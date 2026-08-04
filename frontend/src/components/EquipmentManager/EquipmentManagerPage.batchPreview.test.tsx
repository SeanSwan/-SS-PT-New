/**
 * EquipmentManagerPage V2 scan preview regression.
 * =============================================================================
 * Multi-item equipment scans must keep the uploaded photo visible in the review
 * tray and draw V2 detection boxes for created and candidate equipment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { EquipmentItem } from '../../hooks/useEquipmentAPI';

const { scanEquipmentMock, listProfilesMock, getStatsMock, listItemsMock } = vi.hoisted(() => ({
  scanEquipmentMock: vi.fn(),
  listProfilesMock: vi.fn(),
  getStatsMock: vi.fn(),
  listItemsMock: vi.fn(),
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
    scanEquipment: scanEquipmentMock,
    approveItem: vi.fn(),
    rejectItem: vi.fn(),
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

const makeItem = (id: number, name: string, category = 'free_weights'): EquipmentItem => ({
  id,
  profileId: 1,
  name,
  trainerLabel: null,
  category,
  resistanceType: null,
  description: null,
  photoUrl: null,
  aiScanData: {
    confidence: 0.9,
    boundingBox: null,
    suggestedName: name,
    suggestedCategory: category,
    suggestedExercises: [],
    rawResponse: {},
    latencyMs: 1,
    model: 'gemini',
    scannedAt: '',
  },
  approvalStatus: 'pending',
  approvedAt: null,
  isActive: true,
  quantity: 1,
  createdAt: '',
  updatedAt: '',
});

const RACK = makeItem(10, 'Squat Rack', 'rack');
const BIKE = makeItem(11, 'Exercise Bike', 'cardio');
const EMPTY_ITEMS = {
  success: true,
  items: [],
  pagination: { page: 1, limit: 50, total: 0, pages: 0 },
};

async function openProfileDetail() {
  const { container } = render(<EquipmentManagerPage />);
  fireEvent.click(await screen.findByText(/Hotel Gym/));
  await screen.findByText('Scan Equipment');
  const galleryInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
  expect(galleryInput).toBeTruthy();
  return galleryInput;
}

describe('EquipmentManagerPage V2 scan preview overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue({
      success: true,
      stats: { profileCount: 1, itemCount: 0, pendingApprovals: 0 },
    });
    listItemsMock.mockResolvedValue(EMPTY_ITEMS);
  });

  it('keeps the scanned photo visible with bounded V2 detections in the batch tray', async () => {
    const boxedRack = {
      ...RACK,
      aiScanData: {
        ...RACK.aiScanData!,
        boundingBox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      },
    };
    const boxedBike = {
      ...BIKE,
      aiScanData: {
        ...BIKE.aiScanData!,
        boundingBox: { x: 0.52, y: 0.22, w: 0.24, h: 0.36 },
      },
    };
    listItemsMock.mockResolvedValueOnce(EMPTY_ITEMS).mockResolvedValue({
      success: true,
      items: [boxedRack, boxedBike],
      pagination: { page: 1, limit: 50, total: 2, pages: 1 },
    });
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: boxedRack,
      items: [boxedRack, boxedBike],
      scanResult: null,
      possibleItems: [{
        confidence: 0.42,
        suggestedName: 'Foam Roller',
        suggestedCategory: 'mobility',
        suggestedExercises: [],
        boundingBox: { x: 0.74, y: 0.64, w: 0.18, h: 0.16 },
      }],
      scanSession: { sceneSummary: 'Rack, bike, and foam roller visible.', candidateCount: 3 },
    });

    const galleryInput = await openProfileDetail();
    const file = new File(['gym-bytes'], 'gym.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(await within(tray).findByAltText(/scan preview for gym.jpg/i)).toBeTruthy();
    const rackBox = within(tray).getByLabelText(/squat rack — Confident/i);
    expect(rackBox).toHaveStyle({ left: '10%', top: '20%', width: '30%', height: '40%' });
    expect(within(tray).getByLabelText(/foam roller — Not sure/i)).toBeTruthy();
  });
});