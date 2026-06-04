import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrainerPermissionsManager from './TrainerPermissionsManager';

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

const mockTrainerPermissionService = vi.hoisted(() => ({
  getTrainers: vi.fn(),
  getTrainerPermissions: vi.fn(),
  getPermissionStats: vi.fn(),
  grantPermission: vi.fn(),
  revokePermission: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: mockToast,
}));

vi.mock('../../services/nasmApiService', () => ({
  trainerPermissionService: mockTrainerPermissionService,
}));

const repoRoot = resolve(__dirname, '../../../..');
const layoutSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8',
);
const coreRoutes = readFileSync(resolve(repoRoot, 'backend/core/routes.mjs'), 'utf8');
const trainerPermissionsRoutes = readFileSync(
  resolve(repoRoot, 'backend/routes/trainerPermissionsRoutes.mjs'),
  'utf8',
);
const trainerPermissionsManagerSource = readFileSync(
  resolve(repoRoot, 'frontend/src/components/Admin/TrainerPermissionsManager.tsx'),
  'utf8',
);
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const stats = {
  totalPermissions: 1,
  activePermissions: 1,
  revokedPermissions: 0,
  expiredPermissions: 0,
  expiringPermissions: 0,
  totalTrainers: 2,
  averagePermissionsPerTrainer: '0.5',
  permissionTypeDistribution: { edit_workouts: 1 },
};

describe('TrainerPermissionsManager active admin contract', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockToast.warning.mockReset();
    mockTrainerPermissionService.getTrainers.mockReset();
    mockTrainerPermissionService.getTrainerPermissions.mockReset();
    mockTrainerPermissionService.getPermissionStats.mockReset();
    mockTrainerPermissionService.grantPermission.mockReset();
    mockTrainerPermissionService.revokePermission.mockReset();

    mockTrainerPermissionService.getTrainers.mockResolvedValue({
      success: true,
      data: [
        { id: 101, firstName: 'Tessa', lastName: 'Stone', email: 'tessa@example.test', role: 'trainer' },
        { id: 102, firstName: 'Rowan', lastName: 'Vale', email: 'rowan@example.test', role: 'trainer' },
      ],
    });
    mockTrainerPermissionService.getTrainerPermissions.mockImplementation(async (trainerId: number) => {
      if (Number(trainerId) === 101) {
        throw new Error('Permission endpoint unavailable');
      }

      return {
        success: true,
        data: {
          permissions: [{
            id: 501,
            trainerId: 102,
            permissionType: 'edit_workouts',
            grantedBy: 1,
            grantedAt: '2026-05-23T12:00:00.000Z',
            isActive: true,
            notes: null,
          }],
          permissionsByType: {
            edit_workouts: {
              hasPermission: true,
              permission: { id: 501, permissionType: 'edit_workouts', isActive: true },
              isExpiringSoon: false,
              daysUntilExpiration: null,
            },
          },
          totalActivePermissions: 1,
        },
      };
    });
    mockTrainerPermissionService.getPermissionStats.mockResolvedValue({
      success: true,
      data: stats,
    });
    mockTrainerPermissionService.grantPermission.mockResolvedValue({ success: true });
    mockTrainerPermissionService.revokePermission.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('is the mounted admin trainer permissions surface backed by mounted trainer permission routes', () => {
    expect(layoutSource).toContain("const TrainerPermissionsManager = React.lazy(() => import('../Admin/TrainerPermissionsManager'))");
    expect(layoutSource).toContain("{ path: '/trainer-permissions', component: TrainerPermissionsManager");
    expect(coreRoutes).toContain("app.use('/api/trainer-permissions', trainerPermissionsRoutes)");
    expect(trainerPermissionsRoutes).toContain("router.get('/trainer/:trainerId'");
    expect(trainerPermissionsRoutes).toContain("router.post('/grant'");
    expect(trainerPermissionsRoutes).toContain("router.put('/:id/revoke'");
  });

  it('locks trainers whose permission truth failed to load instead of showing false OFF toggles', async () => {
    render(<TrainerPermissionsManager />);

    expect(await screen.findByText('Tessa Stone')).toBeInTheDocument();
    expect(await screen.findByText('Rowan Vale')).toBeInTheDocument();
    expect(screen.getByText('1 trainer permission set could not be loaded.')).toBeInTheDocument();

    const unsafeToggle = screen.getByRole('button', {
      name: /permission data unavailable for edit client workouts on tessa stone/i,
    });
    expect(unsafeToggle).toBeDisabled();

    fireEvent.click(unsafeToggle);
    await waitFor(() => {
      expect(mockTrainerPermissionService.grantPermission).not.toHaveBeenCalled();
      expect(mockTrainerPermissionService.revokePermission).not.toHaveBeenCalled();
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0][0]).toBe('Failed to load trainer permissions:');
  });

  it('does not revoke existing permissions when a template grant fails', async () => {
    mockTrainerPermissionService.grantPermission.mockRejectedValueOnce(new Error('Grant failed'));

    render(<TrainerPermissionsManager />);

    expect(await screen.findByText('Rowan Vale')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', {
      name: /select rowan vale for bulk operations/i,
    }));
    fireEvent.change(screen.getByRole('combobox', {
      name: /select a permission template/i,
    }), {
      target: { value: 'new_trainer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply template/i }));

    await waitFor(() => {
      expect(mockTrainerPermissionService.grantPermission).toHaveBeenCalled();
    });
    expect(mockTrainerPermissionService.revokePermission).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to apply template');
  });

  it('revokes permissions outside the template only after missing grants succeed', async () => {
    mockTrainerPermissionService.getTrainerPermissions.mockImplementation(async (trainerId: number) => {
      if (Number(trainerId) === 101) {
        return {
          success: true,
          data: { permissions: [], permissionsByType: {}, totalActivePermissions: 0 },
        };
      }

      return {
        success: true,
        data: {
          permissions: [
            {
              id: 501,
              trainerId: 102,
              permissionType: 'edit_workouts',
              grantedBy: 1,
              grantedAt: '2026-05-23T12:00:00.000Z',
              isActive: true,
              notes: null,
            },
            {
              id: 777,
              trainerId: 102,
              permissionType: 'modify_schedules',
              grantedBy: 1,
              grantedAt: '2026-05-23T12:00:00.000Z',
              isActive: true,
              notes: null,
            },
          ],
          permissionsByType: {},
          totalActivePermissions: 2,
        },
      };
    });

    render(<TrainerPermissionsManager />);

    expect(await screen.findByText('Rowan Vale')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', {
      name: /select rowan vale for bulk operations/i,
    }));
    fireEvent.change(screen.getByRole('combobox', {
      name: /select a permission template/i,
    }), {
      target: { value: 'new_trainer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply template/i }));

    await waitFor(() => {
      expect(mockTrainerPermissionService.revokePermission).toHaveBeenCalledWith(
        777,
        'Template: New Trainer applied',
      );
    });
    expect(mockTrainerPermissionService.grantPermission).toHaveBeenCalledWith({
      trainerId: 102,
      permissionType: 'view_progress',
      notes: 'Applied template: New Trainer',
    });
    expect(
      mockTrainerPermissionService.grantPermission.mock.invocationCallOrder[0]
    ).toBeLessThan(mockTrainerPermissionService.revokePermission.mock.invocationCallOrder[0]);
  });

  it('keeps the mounted trainer permissions manager split below project file caps', () => {
    const expectedFiles = [
      'TrainerPermissionsManager.tsx',
      'TrainerPermissionsManager.types.ts',
      'TrainerPermissionsManager.logic.ts',
      'TrainerPermissionsManager.operations.ts',
      'TrainerPermissionsManager.controller.ts',
      'TrainerPermissionsManager.styles.ts',
      'TrainerPermissionsManager.trainerStyles.ts',
      'TrainerPermissionsManager.requestStyles.ts',
      'TrainerPermissionsManager.searchStyles.ts',
      'TrainerPermissionsManager.bulkStyles.ts',
      'TrainerPermissionsManager.Header.tsx',
      'TrainerPermissionsManager.RequestsPanel.tsx',
      'TrainerPermissionsManager.SearchBar.tsx',
      'TrainerPermissionsManager.TrainersGrid.tsx',
      'TrainerPermissionsManager.BulkActionBar.tsx',
    ];

    expect(trainerPermissionsManagerSource).toContain("from './TrainerPermissionsManager.controller'");
    expect(trainerPermissionsManagerSource).toContain("from './TrainerPermissionsManager.Header'");
    expect(trainerPermissionsManagerSource).toContain("from './TrainerPermissionsManager.RequestsPanel'");
    expect(trainerPermissionsManagerSource).toContain("from './TrainerPermissionsManager.SearchBar'");
    expect(trainerPermissionsManagerSource).toContain("from './TrainerPermissionsManager.TrainersGrid'");
    expect(trainerPermissionsManagerSource).toContain("from './TrainerPermissionsManager.BulkActionBar'");

    expectedFiles.forEach((fileName) => {
      const filePath = resolve(repoRoot, 'frontend/src/components/Admin', fileName);
      expect(existsSync(filePath), `${fileName} should exist`).toBe(true);
      const lineCount = readFileSync(filePath, 'utf8').split(/\r?\n/).length;
      expect(lineCount, `${fileName} line count`).toBeLessThanOrEqual(300);
    });
  });
});
