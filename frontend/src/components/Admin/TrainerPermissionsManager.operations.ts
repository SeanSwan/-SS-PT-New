import type React from 'react';
import { toast } from 'react-toastify';
import { trainerPermissionService } from '../../services/nasmApiService';
import { PERMISSION_TEMPLATES } from './TrainerPermissionsManager.logic';
import type {
  BulkPermissionOperation,
  TrainerWithPermissions
} from './TrainerPermissionsManager.types';

interface PermissionMutationArgs {
  loadData: () => Promise<void>;
  onPermissionChange?: () => void;
  setBulkProcessing: (processing: boolean) => void;
  setSelectedTrainers: React.Dispatch<React.SetStateAction<Set<number>>>;
  trainers: TrainerWithPermissions[];
}

interface ApplyTemplateArgs extends PermissionMutationArgs {
  setSelectedTemplate: (template: string) => void;
  templateKey: string;
  trainerIds: number[];
}

interface BulkOperationArgs extends PermissionMutationArgs {
  operation: BulkPermissionOperation;
}

const getActionableTrainerIds = (
  trainerIds: number[],
  trainers: TrainerWithPermissions[]
): number[] => trainerIds.filter((id) => {
  const trainer = trainers.find((item) => item.id === id);
  return trainer && !trainer.permissionLoadFailed;
});

export const applyPermissionTemplate = async ({
  loadData,
  onPermissionChange,
  setBulkProcessing,
  setSelectedTemplate,
  setSelectedTrainers,
  templateKey,
  trainerIds,
  trainers
}: ApplyTemplateArgs) => {
  if (!templateKey || trainerIds.length === 0) return;
  const template = PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];
  if (!template) return;

  const actionableTrainerIds = getActionableTrainerIds(trainerIds, trainers);
  if (actionableTrainerIds.length === 0) {
    toast.error('Permission data unavailable. Refresh before applying templates.');
    return;
  }

  setBulkProcessing(true);
  try {
    const grantOperations: Array<Promise<unknown>> = [];
    const revokeOperations: Array<Promise<unknown>> = [];
    actionableTrainerIds.forEach((id) => {
      const trainer = trainers.find((item) => item.id === id);
      const activePermissions = trainer?.permissions.filter((permission) => permission.isActive) || [];
      const templatePermissionTypes = new Set(template.permissions);

      template.permissions.forEach((permissionType) => {
        const alreadyGranted = activePermissions.some((permission) => permission.permissionType === permissionType);
        if (!alreadyGranted) {
          grantOperations.push(trainerPermissionService.grantPermission({
            trainerId: id,
            permissionType,
            notes: `Applied template: ${template.name}`
          }));
        }
      });

      activePermissions.forEach((existingPermission) => {
        if (!templatePermissionTypes.has(existingPermission.permissionType)) {
          revokeOperations.push(
            trainerPermissionService.revokePermission(existingPermission.id, `Template: ${template.name} applied`)
          );
        }
      });
    });

    await Promise.all(grantOperations);
    await Promise.all(revokeOperations);
    await loadData();
    onPermissionChange?.();
    toast.success(`Template "${template.name}" applied to ${actionableTrainerIds.length} trainer(s)`);
    setSelectedTemplate('');
    setSelectedTrainers(new Set());
  } catch (error: unknown) {
    console.error('Failed to apply template:', error);
    toast.error('Failed to apply template');
  } finally {
    setBulkProcessing(false);
  }
};

export const performPermissionBulkOperation = async ({
  loadData,
  onPermissionChange,
  operation,
  setBulkProcessing,
  setSelectedTrainers,
  trainers
}: BulkOperationArgs) => {
  if (operation.trainerIds.length === 0) return;
  const actionableTrainerIds = getActionableTrainerIds(operation.trainerIds, trainers);
  if (actionableTrainerIds.length === 0) {
    toast.error('Permission data unavailable. Refresh before changing permissions.');
    return;
  }

  setBulkProcessing(true);
  try {
    const operations: Array<Promise<unknown>> = [];
    actionableTrainerIds.forEach((id) => {
      if (operation.action === 'grant') {
        operations.push(trainerPermissionService.grantPermission({
          trainerId: id,
          permissionType: operation.permissionType,
          notes: 'Bulk operation'
        }));
        return;
      }

      const trainer = trainers.find((item) => item.id === id);
      const permission = trainer?.permissions.find((item) => item.permissionType === operation.permissionType && item.isActive);
      if (permission) operations.push(trainerPermissionService.revokePermission(permission.id, 'Bulk operation'));
    });

    await Promise.all(operations);
    await loadData();
    onPermissionChange?.();
    toast.success(`Bulk ${operation.action} completed for ${actionableTrainerIds.length} trainer(s)`);
    setSelectedTrainers(new Set());
  } catch (error: unknown) {
    console.error('Failed to perform bulk operation:', error);
    toast.error('Failed to perform bulk operation');
  } finally {
    setBulkProcessing(false);
  }
};
