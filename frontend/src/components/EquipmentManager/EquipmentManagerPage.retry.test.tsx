/**
 * EquipmentManagerPage AI scan retry regression.
 * =============================================================================
 * A transient Gemini Vision scan failure could drop the uploaded File after the
 * queue advanced, leaving only a blank manual form. These tests lock the desired
 * behavior: retry once for transient failures, retain the same File for manual
 * Try Again, and never auto-retry rate limits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

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

const SCAN_OK = {
  success: true,
  item: {
    id: 10,
    profileId: 1,
    name: 'Squat Rack',
    trainerLabel: null,
    category: 'rack',
    resistanceType: null,
    description: null,
    photoUrl: null,
    aiScanData: {
      confidence: 0.9,
      boundingBox: null,
      suggestedName: 'Squat Rack',
      suggestedCategory: 'rack',
      suggestedExercises: [],
      rawResponse: {},
      latencyMs: 1,
      model: 'gemini',
      scannedAt: '',
    },
    approvalStatus: 'pending' as const,
    approvedAt: null,
    isActive: true,
    quantity: 1,
    createdAt: '',
    updatedAt: '',
  },
  scanResult: {
    confidence: 0.9,
    suggestedName: 'Squat Rack',
    suggestedCategory: 'rack',
    suggestedExercises: [],
    boundingBox: null,
  },
};

const transientError = () => Object.assign(
  new Error('AI connection lost: no response.'),
  { status: 500, retryable: true },
);

async function openProfileDetail() {
  const { container } = render(<EquipmentManagerPage />);
  fireEvent.click(await screen.findByText(/Hotel Gym/));
  await screen.findByText('Scan Equipment');
  const galleryInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
  expect(galleryInput).toBeTruthy();
  return galleryInput;
}

describe('EquipmentManagerPage AI scan retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue({
      success: true,
      stats: { profileCount: 1, itemCount: 0, pendingApprovals: 0 },
    });
    listItemsMock.mockResolvedValue({
      success: true,
      items: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    });
  });

  it('retains the photo, auto-retries once, then re-scans the same photo on Try Again', async () => {
    scanEquipmentMock
      .mockRejectedValueOnce(transientError())
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce(SCAN_OK);

    const galleryInput = await openProfileDetail();
    const file = new File(['rack-bytes'], 'rack.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    await waitFor(() => expect(scanEquipmentMock).toHaveBeenCalledTimes(2), { timeout: 2500 });
    const errorBox = await screen.findByRole('alert');
    expect(within(errorBox).getByText('Try again')).toBeTruthy();

    expect(scanEquipmentMock.mock.calls[0][1]).toBe(file);
    expect(scanEquipmentMock.mock.calls[1][1]).toBe(file);

    fireEvent.click(within(errorBox).getByText('Try again'));
    await waitFor(() => expect(scanEquipmentMock).toHaveBeenCalledTimes(3));
    expect(scanEquipmentMock.mock.calls[2][1]).toBe(file);
    await screen.findByText('Review AI Scan');
  });

  it('does not auto-retry a rate-limit error but still keeps the photo for manual retry', async () => {
    scanEquipmentMock.mockRejectedValueOnce(
      Object.assign(new Error('Rate limit exceeded. Maximum 10 scans per hour.'), {
        status: 429,
        retryable: false,
      }),
    );

    const galleryInput = await openProfileDetail();
    const file = new File(['bench-bytes'], 'bench.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    const errorBox = await screen.findByRole('alert');
    expect(within(errorBox).getByText(/Rate limit/)).toBeTruthy();
    expect(within(errorBox).getByText('Try again')).toBeTruthy();
    expect(scanEquipmentMock).toHaveBeenCalledTimes(1);
  });
});
