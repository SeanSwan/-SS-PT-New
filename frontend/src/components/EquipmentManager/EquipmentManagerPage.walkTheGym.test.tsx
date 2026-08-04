/**
 * EquipmentManagerPage S7 walk-the-gym regression.
 * =============================================================================
 * Two queued photos in one scan run must produce ONE merged review tray (not
 * two sequential trays), with a session summary header and a tappable merge
 * receipt naming the duplicate that was kept once across photos.
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

const RACK_PHOTO_1 = makeItem(10, 'Dumbbell Rack', 'free_weights');
const BIKE_PHOTO_1 = makeItem(11, 'Exercise Bike', 'cardio');
const RACK_PHOTO_2 = makeItem(12, 'Dumbbell Rack', 'free_weights');
const BENCH_PHOTO_2 = makeItem(13, 'Flat Bench', 'bench');

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

describe('EquipmentManagerPage S7 walk-the-gym session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [PROFILE] });
    getStatsMock.mockResolvedValue({
      success: true,
      stats: { profileCount: 1, itemCount: 0, pendingApprovals: 0 },
    });
    listItemsMock.mockResolvedValue(EMPTY_ITEMS);
  });

  it('merges two queued photos into ONE tray with a session header and merge receipt', async () => {
    scanEquipmentMock
      .mockResolvedValueOnce({
        success: true,
        item: RACK_PHOTO_1,
        items: [RACK_PHOTO_1, BIKE_PHOTO_1],
        scanResult: null,
        scanSession: { candidateCount: 2, reviewSessionId: 71 },
      })
      .mockResolvedValueOnce({
        success: true,
        item: RACK_PHOTO_2,
        items: [RACK_PHOTO_2, BENCH_PHOTO_2],
        scanResult: null,
        scanSession: { candidateCount: 2, reviewSessionId: 72 },
        degraded: true,
      });

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, {
      target: {
        files: [
          new File(['walk-one'], 'walk-1.jpg', { type: 'image/jpeg' }),
          new File(['walk-two'], 'walk-2.jpg', { type: 'image/jpeg' }),
        ],
      },
    });

    // Both photos scan back-to-back; ONE merged tray appears at the end.
    const summary = await screen.findByLabelText('Walk-the-gym scan session summary');
    await waitFor(() => expect(scanEquipmentMock).toHaveBeenCalledTimes(2));
    expect(screen.getAllByLabelText('Latest equipment scan review')).toHaveLength(1);

    // Session header: "2 photos · 3 unique items · 1 duplicate merged".
    expect(within(summary).getByText('2 photos')).toBeTruthy();
    expect(within(summary).getByText('3 unique items')).toBeTruthy();

    // Merged tray keeps the FIRST Dumbbell Rack only, plus bike + bench.
    const tray = screen.getByLabelText('Latest equipment scan review');
    expect(within(tray).getByText(/3 pending items from 2 photos/)).toBeTruthy();
    expect(within(tray).getAllByText('Dumbbell Rack')).toHaveLength(1);
    expect(within(tray).getByText('Exercise Bike')).toBeTruthy();
    expect(within(tray).getByText('Flat Bench')).toBeTruthy();
    // No per-photo approval modal auto-opened mid-run.
    expect(screen.queryByText('Review AI Scan')).toBeNull();

    // Tappable receipt: expanding names the kept-once merge.
    const receiptToggle = within(summary).getByRole('button', { name: /1 duplicate merged/i });
    expect(receiptToggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(receiptToggle);
    expect(receiptToggle.getAttribute('aria-expanded')).toBe('true');
    const receipt = within(summary).getByLabelText('Merged duplicates receipt');
    expect(within(receipt).getByText(/seen in walk-1\.jpg & walk-2\.jpg → kept once/)).toBeTruthy();
    expect(within(receipt).getByText('Dumbbell Rack')).toBeTruthy();

    // Filmstrip: per-photo chips with detection counts; degraded photo flagged.
    const filmstrip = within(summary).getByLabelText('Photos in this session');
    expect(within(filmstrip).getByLabelText('walk-1.jpg — 2 items detected')).toBeTruthy();
    expect(within(filmstrip).getByLabelText('walk-2.jpg — 2 items detected, limited scan')).toBeTruthy();
  });

  it('still lists a photo in the filmstrip when its scan found nothing', async () => {
    scanEquipmentMock
      .mockResolvedValueOnce({
        success: true,
        item: RACK_PHOTO_1,
        items: [RACK_PHOTO_1, BIKE_PHOTO_1],
        scanResult: null,
        scanSession: { candidateCount: 2 },
      })
      .mockResolvedValueOnce({
        success: true,
        item: null,
        items: [],
        scanResult: null,
        scanSession: { candidateCount: 0 },
      });

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, {
      target: {
        files: [
          new File(['walk-one'], 'walk-1.jpg', { type: 'image/jpeg' }),
          new File(['walk-two'], 'walk-2.jpg', { type: 'image/jpeg' }),
        ],
      },
    });

    const summary = await screen.findByLabelText('Walk-the-gym scan session summary');
    expect(within(summary).getByText('2 photos')).toBeTruthy();
    // "0 duplicates merged" renders as plain text, not a tappable toggle.
    expect(within(summary).queryByRole('button', { name: /duplicates merged/i })).toBeNull();
    expect(within(summary).getByText('0 duplicates merged')).toBeTruthy();
    const filmstrip = within(summary).getByLabelText('Photos in this session');
    expect(within(filmstrip).getByLabelText('walk-2.jpg — 0 items detected')).toBeTruthy();
  });

  it('keeps single-photo runs on today’s behavior with no session header', async () => {
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: RACK_PHOTO_1,
      items: [RACK_PHOTO_1, BIKE_PHOTO_1],
      scanResult: null,
      scanSession: { candidateCount: 2 },
    });

    const galleryInput = await openProfileDetail();
    fireEvent.change(galleryInput, {
      target: { files: [new File(['solo'], 'solo.jpg', { type: 'image/jpeg' })] },
    });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(within(tray).getByText(/2 pending items from solo.jpg/)).toBeTruthy();
    expect(screen.queryByLabelText('Walk-the-gym scan session summary')).toBeNull();
  });
});
