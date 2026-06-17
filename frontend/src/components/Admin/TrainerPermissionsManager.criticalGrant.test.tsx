import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainerPermissionsManager from './TrainerPermissionsManager';

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const mockTrainerPermissionService = vi.hoisted(() => ({
  getTrainers: vi.fn(),
  getTrainerPermissions: vi.fn(),
  getPermissionStats: vi.fn(),
  grantPermission: vi.fn(),
  revokePermission: vi.fn(),
}));

vi.mock('react-toastify', () => ({ toast: mockToast }));
vi.mock('../../services/nasmApiService', () => ({
  trainerPermissionService: mockTrainerPermissionService,
}));

const stats = {
  totalPermissions: 0,
  activePermissions: 0,
  revokedPermissions: 0,
  expiredPermissions: 0,
  expiringPermissions: 0,
  totalTrainers: 1,
  averagePermissionsPerTrainer: '0',
  permissionTypeDistribution: {},
};

describe('TrainerPermissionsManager critical direct grants', () => {
  beforeEach(() => {
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockTrainerPermissionService.getTrainers.mockReset();
    mockTrainerPermissionService.getTrainerPermissions.mockReset();
    mockTrainerPermissionService.getPermissionStats.mockReset();
    mockTrainerPermissionService.grantPermission.mockReset();
    mockTrainerPermissionService.revokePermission.mockReset();

    mockTrainerPermissionService.getTrainers.mockResolvedValue({
      success: true,
      data: [{ id: 102, firstName: 'Rowan', lastName: 'Vale', email: 'rowan@example.test', role: 'trainer' }],
    });
    mockTrainerPermissionService.getTrainerPermissions.mockResolvedValue({
      success: true,
      data: { permissions: [], permissionsByType: {}, totalActivePermissions: 0 },
    });
    mockTrainerPermissionService.getPermissionStats.mockResolvedValue({ success: true, data: stats });
    mockTrainerPermissionService.grantPermission.mockResolvedValue({ success: true });
    mockTrainerPermissionService.revokePermission.mockResolvedValue({ success: true });
  });

  it('requires in-app confirmation before granting a critical permission from the direct toggle', async () => {
    render(<TrainerPermissionsManager />);

    expect(await screen.findByText('Rowan Vale')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {
      name: /grant modify schedules for rowan vale/i,
    }));

    expect(mockTrainerPermissionService.grantPermission).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', {
      name: /confirm modify schedules for rowan vale/i,
    })).toHaveTextContent(/Review this critical permission before granting access/i);

    fireEvent.click(screen.getByRole('button', {
      name: /confirm grant modify schedules for rowan vale/i,
    }));

    await waitFor(() => {
      expect(mockTrainerPermissionService.grantPermission).toHaveBeenCalledWith({
        trainerId: 102,
        permissionType: 'modify_schedules',
      });
    });
  });
});
