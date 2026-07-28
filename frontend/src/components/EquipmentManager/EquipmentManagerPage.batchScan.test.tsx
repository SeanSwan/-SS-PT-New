/**
 * EquipmentManagerPage V2 batch scan regression.
 * =============================================================================
 * One uploaded gym photo can now produce several pending EquipmentItem rows. The
 * page must show a batch review tray instead of burying everything behind the
 * legacy first-item approval modal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { EquipmentItem } from '../../hooks/useEquipmentAPI';

const { scanEquipmentMock, listProfilesMock, getStatsMock, listItemsMock, approveItemMock, rejectItemMock } = vi.hoisted(() => ({
  scanEquipmentMock: vi.fn(),
  listProfilesMock: vi.fn(),
  getStatsMock: vi.fn(),
  listItemsMock: vi.fn(),
  approveItemMock: vi.fn(),
  rejectItemMock: vi.fn(),
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
    approveItem: approveItemMock,
    rejectItem: rejectItemMock,
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
    confidence: id === 1 ? 0.93 : 0.86,
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
  await screen.findByText('Swan Coach Scan');
  const galleryInput = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
  expect(galleryInput).toBeTruthy();
  return galleryInput;
}

describe('EquipmentManagerPage V2 batch scan tray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue({
      success: true,
      stats: { profileCount: 1, itemCount: 0, pendingApprovals: 0 },
    });
    listItemsMock.mockResolvedValue(EMPTY_ITEMS);
  });

  it('renders all created items, duplicate matches, and possible items without auto-opening the first item', async () => {
    listItemsMock
      .mockResolvedValueOnce(EMPTY_ITEMS)
      .mockResolvedValue({
        success: true,
        items: [RACK, BIKE],
        pagination: { page: 1, limit: 50, total: 2, pages: 1 },
      });
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: RACK,
      items: [RACK, BIKE],
      scanResult: {
        confidence: 0.93,
        suggestedName: 'Squat Rack',
        suggestedCategory: 'rack',
        suggestedExercises: [],
        boundingBox: null,
      },
      possibleItems: [{
        confidence: 0.42,
        suggestedName: 'Foam Roller',
        suggestedCategory: 'mobility',
        suggestedExercises: [],
        boundingBox: null,
      }],
      duplicates: [{
        confidence: 0.9,
        suggestedName: 'Dumbbell Rack',
        suggestedCategory: 'free_weights',
        suggestedExercises: [],
        boundingBox: null,
        status: 'duplicate',
      }],
      scanSession: {
        sceneSummary: 'Rack, bike, and dumbbells visible in one room.',
        candidateCount: 4,
        possibleItemCount: 1,
        duplicateCount: 1,
      },
    });

    const galleryInput = await openProfileDetail();
    const file = new File(['gym-bytes'], 'gym.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(within(tray).getByText(/2 pending items - 1 possible - 1 duplicate match from gym.jpg/)).toBeTruthy();
    expect(within(tray).getByText('Squat Rack')).toBeTruthy();
    expect(within(tray).getByText('Exercise Bike')).toBeTruthy();
    expect(within(tray).getByText('Dumbbell Rack')).toBeTruthy();
    expect(within(tray).getAllByText(/Duplicate match/i).length).toBeGreaterThan(0);
    expect(within(tray).getByText(/42% confidence/)).toBeTruthy();
    expect(within(tray).getByRole('button', { name: /add foam roller to inventory/i })).toBeTruthy();
    expect(screen.queryByText('Review AI Scan')).toBeNull();

    fireEvent.click(within(tray).getAllByRole('button', { name: 'Review' })[1]);

    await screen.findByText('Review AI Scan');
    expect((screen.getByLabelText('Equipment Name') as HTMLInputElement).value).toBe('Exercise Bike');
  });


  it('bulk-approves selected pending scan items from the batch tray', async () => {
    listItemsMock
      .mockResolvedValueOnce(EMPTY_ITEMS)
      .mockResolvedValue({
        success: true,
        items: [
          { ...RACK, approvalStatus: 'approved' },
          { ...BIKE, approvalStatus: 'approved' },
        ],
        pagination: { page: 1, limit: 50, total: 2, pages: 1 },
      });
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: RACK,
      items: [RACK, BIKE],
      scanResult: null,
      scanSession: { sceneSummary: 'Two clear items.', candidateCount: 2 },
    });
    approveItemMock.mockImplementation(async (_profileId: number, itemId: number) => ({
      success: true,
      item: { ...(itemId === RACK.id ? RACK : BIKE), approvalStatus: 'approved', approvedAt: 'now' },
    }));

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, { target: { files: [new File(['gym-bytes'], 'gym.jpg', { type: 'image/jpeg' })] } });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    fireEvent.click(within(tray).getByRole('checkbox', { name: /select all pending scan items/i }));
    fireEvent.click(within(tray).getByRole('button', { name: /approve selected/i }));

    await waitFor(() => expect(approveItemMock).toHaveBeenCalledTimes(2));
    expect(approveItemMock).toHaveBeenCalledWith(1, RACK.id, expect.objectContaining({ name: 'Squat Rack', category: 'rack' }));
    expect(approveItemMock).toHaveBeenCalledWith(1, BIKE.id, expect.objectContaining({ name: 'Exercise Bike', category: 'cardio' }));
    expect(screen.queryByText('Review AI Scan')).toBeNull();
    await waitFor(() => expect(within(tray).getAllByText(/approved/)).toHaveLength(2));
  });


  it('bulk-rejects a selected pending scan item without touching unselected rows', async () => {
    listItemsMock.mockResolvedValueOnce(EMPTY_ITEMS).mockResolvedValue({
      success: true,
      items: [{ ...RACK, approvalStatus: 'rejected' }, BIKE],
      pagination: { page: 1, limit: 50, total: 2, pages: 1 },
    });
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: RACK,
      items: [RACK, BIKE],
      scanResult: null,
      scanSession: { candidateCount: 2 },
    });
    rejectItemMock.mockResolvedValue({ success: true, message: 'Scan rejected and item archived' });

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, { target: { files: [new File(['gym-bytes'], 'gym.jpg', { type: 'image/jpeg' })] } });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    fireEvent.click(within(tray).getByRole('checkbox', { name: /select squat rack/i }));
    fireEvent.click(within(tray).getByRole('button', { name: /reject selected/i }));

    await waitFor(() => expect(rejectItemMock).toHaveBeenCalledWith(1, RACK.id));
    expect(rejectItemMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(within(tray).getByText(/rack - rejected/i)).toBeTruthy());
    expect(within(tray).getByText(/cardio - pending review/i)).toBeTruthy();
  });

  it('keeps duplicate-only scan metadata visible beside the terminal scan error', async () => {
    scanEquipmentMock.mockRejectedValueOnce(Object.assign(
      new Error('Detected equipment already exists in this profile.'),
      {
        status: 409,
        retryable: false,
        scanResponse: {
          success: false,
          error: 'Detected equipment already exists in this profile.',
          duplicates: [{
            confidence: 0.9,
            suggestedName: 'Dumbbell Rack',
            suggestedCategory: 'free_weights',
            suggestedExercises: [],
            boundingBox: null,
            status: 'duplicate',
          }],
        },
      },
    ));

    const galleryInput = await openProfileDetail();
    const file = new File(['duplicate-bytes'], 'duplicate.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [file] } });

    await screen.findByRole('alert');
    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(within(tray).getByText(/0 pending items - 1 duplicate match from duplicate.jpg/)).toBeTruthy();
    expect(within(tray).getByText('Dumbbell Rack')).toBeTruthy();
    expect(within(tray).getAllByText(/Duplicate match/i).length).toBeGreaterThan(0);
    await waitFor(() => expect(scanEquipmentMock).toHaveBeenCalledTimes(1));
  });
});