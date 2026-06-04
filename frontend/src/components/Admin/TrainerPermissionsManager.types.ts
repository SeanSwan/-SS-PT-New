import type { LucideIcon } from 'lucide-react';
import type {
  TrainerDirectoryUser,
  TrainerPermission
} from '../../services/nasmApiService';

export interface TrainerPermissionsManagerProps {
  trainerId?: number;
  onPermissionChange?: () => void;
}

export interface PermissionType {
  key: string;
  label: string;
  description: string;
  critical: boolean;
  icon: LucideIcon;
}

export interface PermissionRequest {
  id: string;
  trainerId: number;
  trainerName: string;
  permissionType: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
}

export interface BulkPermissionOperation {
  action: 'grant' | 'revoke';
  permissionType: string;
  trainerIds: number[];
}

export interface PermissionData {
  hasPermission: boolean;
  permission: TrainerPermission | null;
  isExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  isExpired?: boolean;
}

export interface TrainerWithPermissions {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  permissions: TrainerPermission[];
  permissionsByType: Record<string, PermissionData>;
  totalActivePermissions: number;
  permissionLoadFailed?: boolean;
}

export interface PermissionStats {
  totalPermissions: number;
  activePermissions: number;
  revokedPermissions: number;
  expiredPermissions: number;
  expiringPermissions: number;
  totalTrainers: number;
  averagePermissionsPerTrainer: string;
  permissionTypeDistribution: Record<string, number>;
}

export type PermissionStatus = 'active' | 'expiring' | 'expired' | 'inactive' | 'unknown';

export interface TrainerPermissionPayload {
  permissions?: TrainerPermission[];
  permissionsByType?: Record<string, PermissionData>;
  totalActivePermissions?: number;
}

export type TrainerSeed = TrainerDirectoryUser | {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'trainer';
};
