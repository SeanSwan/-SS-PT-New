import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EquipmentProfilePicker from './EquipmentProfilePicker';
import apiService from '../../services/api.service';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../services/api.service', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('EquipmentProfilePicker compact mode', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        profiles: [],
      },
    });
    window.history.pushState({}, '', '/dashboard/trainer/bootcamp-builder');
  });

  it('keeps a direct route to the mounted Equipment Manager in compact Bootcamp config usage', async () => {
    render(
      <EquipmentProfilePicker
        compact
        selectedProfileId={null}
        onSelect={vi.fn()}
        label="Equipment Profile"
      />,
    );

    const manageButton = await screen.findByRole('button', { name: /manage equipment profiles/i });
    fireEvent.click(manageButton);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/trainer/equipment');
  });

  it('can intentionally hide the compact management shortcut', async () => {
    render(
      <EquipmentProfilePicker
        compact
        showManageLink={false}
        selectedProfileId={null}
        onSelect={vi.fn()}
        label="Equipment Profile"
      />,
    );

    await waitFor(() => expect(apiService.get).toHaveBeenCalledWith('/api/equipment-profiles'));
    expect(screen.queryByRole('button', { name: /manage equipment profiles/i })).not.toBeInTheDocument();
  });
});
