/**
 * MyEquipmentPage — client/user self-serve surface regression (S5).
 * =================================================================
 * Mocks useEquipmentAPI the same way EquipmentManagerPage.batchScan.test.tsx
 * does. Covers: grouped inventory render, cinematic empty state CTA, the
 * client-side 3-place cap + home/park/custom subset, and the scan flow into
 * the SHARED EquipmentScanBatchPanel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { EquipmentItem, EquipmentProfile } from '../../hooks/useEquipmentAPI';

const { listProfilesMock, listItemsMock, createProfileMock, scanEquipmentMock } = vi.hoisted(() => ({
  listProfilesMock: vi.fn(),
  listItemsMock: vi.fn(),
  createProfileMock: vi.fn(),
  scanEquipmentMock: vi.fn(),
}));

vi.mock('../../hooks/useEquipmentAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useEquipmentAPI')>();
  const api = {
    listProfiles: listProfilesMock,
    getProfile: vi.fn(),
    createProfile: createProfileMock,
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    listItems: listItemsMock,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    scanEquipment: scanEquipmentMock,
    approveItem: vi.fn(),
    rejectItem: vi.fn(),
    reviewScanCandidate: vi.fn(),
    listExerciseMappings: vi.fn(),
    addExerciseMapping: vi.fn(),
    removeExerciseMapping: vi.fn(),
    confirmExerciseMapping: vi.fn(),
    getStats: vi.fn(),
  };
  return { ...actual, useEquipmentAPI: () => api, default: () => api };
});

import MyEquipmentPage from './MyEquipmentPage';

const makeProfile = (id: number, name: string, locationType: EquipmentProfile['locationType'] = 'home'): EquipmentProfile => ({
  id,
  trainerId: 7,
  name,
  locationType,
  description: null,
  address: null,
  isDefault: false,
  isActive: true,
  equipmentCount: 0,
  coverPhotoUrl: null,
  createdAt: '',
  updatedAt: '',
});

const makeItem = (id: number, name: string, category: string, approvalStatus: EquipmentItem['approvalStatus'] = 'approved'): EquipmentItem => ({
  id,
  profileId: 1,
  name,
  trainerLabel: null,
  category,
  resistanceType: null,
  description: null,
  photoUrl: null,
  aiScanData: null,
  approvalStatus,
  approvedAt: null,
  isActive: true,
  quantity: 1,
  createdAt: '',
  updatedAt: '',
});

const itemsResponse = (items: EquipmentItem[]) => ({
  success: true,
  items,
  pagination: { page: 1, limit: 50, total: items.length, pages: 1 },
});

const galleryInput = (container: HTMLElement): HTMLInputElement => {
  const input = Array.from(container.querySelectorAll('input[type="file"]'))
    .find((candidate) => !candidate.hasAttribute('capture'));
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
};

describe('MyEquipmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProfilesMock.mockResolvedValue({ success: true, profiles: [makeProfile(1, 'My Garage')] });
    listItemsMock.mockResolvedValue(itemsResponse([]));
  });

  it('renders places and inventory grouped by movement pattern with pending dots', async () => {
    listItemsMock.mockResolvedValue(itemsResponse([
      makeItem(10, 'Pull-Up Bar', 'pull_up_bar'),
      makeItem(11, 'Adjustable Dumbbells', 'dumbbell', 'pending'),
    ]));

    render(<MyEquipmentPage />);

    expect(await screen.findByRole('button', { name: /My Garage/ })).toBeTruthy();
    await screen.findByText('Your gear (2)');
    const inventory = screen.getByLabelText('Your equipment by movement pattern');
    expect(within(inventory).getByText('Pushing')).toBeTruthy();
    expect(within(inventory).getByText('Pulling')).toBeTruthy();
    expect(within(inventory).getByText('Core')).toBeTruthy();
    // Pull-up bar serves pull AND core, so it renders in both groups.
    expect(within(inventory).getAllByText('Pull-Up Bar').length).toBe(2);
    // The pending dumbbells carry a Wing Purple pending-review dot in every group they serve.
    expect(within(inventory).getAllByRole('img', { name: /Adjustable Dumbbells pending review/ }).length).toBeGreaterThan(0);
  });

  it('renders the cinematic empty state with the scan CTA when there is no gear', async () => {
    render(<MyEquipmentPage />);

    expect(await screen.findByRole('button', { name: /Scan your space/ })).toBeTruthy();
    expect(screen.getByText(/Swan Coach identifies what you.ve got and what it unlocks\./)).toBeTruthy();
    expect(screen.getByText('Takes about 30 seconds.')).toBeTruthy();
  });

  it('disables Add place at the 3-location cap without calling the API', async () => {
    listProfilesMock.mockResolvedValue({
      success: true,
      profiles: [makeProfile(1, 'My Garage'), makeProfile(2, 'The Park', 'park'), makeProfile(3, 'Office', 'custom')],
    });

    render(<MyEquipmentPage />);

    const addButton = await screen.findByRole('button', { name: /Add place/ });
    expect((addButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Up to 3 places')).toBeTruthy();
    fireEvent.click(addButton);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(createProfileMock).not.toHaveBeenCalled();
  });

  it('offers only home/park/custom in the add-place sheet and creates with the chosen type', async () => {
    createProfileMock.mockResolvedValue({ success: true, profile: makeProfile(9, 'Riverside', 'park') });

    render(<MyEquipmentPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Add place/ }));
    const dialog = await screen.findByRole('dialog');
    // S4 policy mirror: no gym / client-home options for self-serve users.
    expect(within(dialog).queryByText('Gym')).toBeNull();
    expect(within(dialog).queryByText(/client/i)).toBeNull();
    expect(within(dialog).getByRole('radio', { name: 'Home' })).toBeTruthy();
    expect(within(dialog).getByRole('radio', { name: 'Park / Outdoor' })).toBeTruthy();
    expect(within(dialog).getByRole('radio', { name: 'Somewhere else' })).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Riverside' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Park / Outdoor' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add place' }));

    await waitFor(() => expect(createProfileMock).toHaveBeenCalledWith({ name: 'Riverside', locationType: 'park' }));
  });

  it('runs a scan through the shared EquipmentScanBatchPanel review tray', async () => {
    const rack = makeItem(21, 'Squat Rack', 'rack', 'pending');
    const bands = makeItem(22, 'Loop Bands', 'resistance_band', 'pending');
    scanEquipmentMock.mockResolvedValueOnce({
      success: true,
      item: rack,
      items: [rack, bands],
      scanResult: null,
      scanSession: { sceneSummary: 'Garage with a rack and bands.', candidateCount: 2 },
    });

    const { container } = render(<MyEquipmentPage />);
    await screen.findByRole('button', { name: /Scan your space/ });

    fireEvent.change(galleryInput(container), {
      target: { files: [new File(['garage-bytes'], 'garage.jpg', { type: 'image/jpeg' })] },
    });

    const tray = await screen.findByLabelText('Latest equipment scan review');
    expect(within(tray).getByText(/2 pending items from garage.jpg/)).toBeTruthy();
    expect(within(tray).getByText('Squat Rack')).toBeTruthy();
    expect(within(tray).getByText('Loop Bands')).toBeTruthy();
    await waitFor(() => expect(scanEquipmentMock).toHaveBeenCalledWith(1, expect.any(File)));
  });
});
