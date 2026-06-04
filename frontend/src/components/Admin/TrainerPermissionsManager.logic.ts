import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  Target,
  Users
} from 'lucide-react';
import type {
  PermissionData,
  PermissionStatus,
  PermissionType,
  TrainerPermissionPayload,
  TrainerSeed,
  TrainerWithPermissions
} from './TrainerPermissionsManager.types';

export const PERMISSION_TEMPLATES = {
  senior_trainer: {
    name: 'Senior Trainer',
    description: 'Full access for experienced trainers',
    permissions: ['edit_workouts', 'view_progress', 'manage_clients', 'access_nutrition', 'modify_schedules', 'view_analytics'],
    color: 'var(--permission-template-senior, #8b5cf6)'
  },
  new_trainer: {
    name: 'New Trainer',
    description: 'Basic permissions for new team members',
    permissions: ['edit_workouts', 'view_progress'],
    color: 'var(--permission-template-new, #10b981)'
  },
  specialist: {
    name: 'Nutrition Specialist',
    description: 'Specialized access for nutrition experts',
    permissions: ['edit_workouts', 'view_progress', 'access_nutrition'],
    color: 'var(--permission-template-specialist, #c6a84b)'
  },
  session_manager: {
    name: 'Session Manager',
    description: 'Scheduling and session management focus',
    permissions: ['edit_workouts', 'view_progress', 'modify_schedules', 'view_analytics'],
    color: 'var(--permission-template-session, #60c0f0)'
  },
  limited_access: {
    name: 'Limited Access',
    description: 'Minimal permissions for contractors',
    permissions: ['view_progress'],
    color: 'var(--permission-template-limited, #4070c0)'
  }
};

export const PERMISSION_TYPES: PermissionType[] = [
  {
    key: 'edit_workouts',
    label: 'Edit Client Workouts',
    description: 'Allow trainer to log and modify client workout sessions',
    critical: true,
    icon: Activity
  },
  {
    key: 'view_progress',
    label: 'View Client Progress',
    description: 'Access to client progress charts and analytics',
    critical: false,
    icon: BarChart3
  },
  {
    key: 'manage_clients',
    label: 'Manage Assigned Clients',
    description: 'Edit client information and session notes',
    critical: false,
    icon: Users
  },
  {
    key: 'access_nutrition',
    label: 'Access Nutrition Data',
    description: 'View and edit client nutrition logs',
    critical: false,
    icon: Target
  },
  {
    key: 'modify_schedules',
    label: 'Modify Schedules',
    description: 'Book and reschedule client sessions',
    critical: true,
    icon: Calendar
  },
  {
    key: 'view_analytics',
    label: 'View Analytics',
    description: 'Access trainer performance analytics',
    critical: false,
    icon: Award
  }
];

export const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

export const buildTrainer = (
  trainer: TrainerSeed,
  permissionsData?: TrainerPermissionPayload,
  permissionLoadFailed = false
): TrainerWithPermissions => ({
  id: Number(trainer.id),
  firstName: trainer.firstName || 'Trainer',
  lastName: trainer.lastName || `#${trainer.id}`,
  email: trainer.email || 'Email unavailable',
  permissions: permissionsData?.permissions || [],
  permissionsByType: permissionsData?.permissionsByType || {},
  totalActivePermissions: permissionsData?.totalActivePermissions || 0,
  permissionLoadFailed
});

export const escapeCsvCell = (value: string | number | null | undefined): string => {
  const raw = String(value ?? '');
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
};

export const getPermissionStatus = (permissionData: PermissionData): PermissionStatus => {
  if (!permissionData.hasPermission) return 'inactive';
  if (permissionData.isExpired) return 'expired';
  if (permissionData.isExpiringSoon) return 'expiring';
  return 'active';
};

export const buildTrainerPermissionCsv = (trainers: TrainerWithPermissions[]): string => {
  const rows = [
    ['Trainer', 'Email', 'Active Permissions', ...PERMISSION_TYPES.map((permission) => permission.label)],
    ...trainers.map((trainer) => [
      `${trainer.firstName} ${trainer.lastName}`,
      trainer.email,
      `${trainer.totalActivePermissions}/${PERMISSION_TYPES.length}`,
      ...PERMISSION_TYPES.map((permission) => (
        trainer.permissionsByType[permission.key]?.hasPermission ? 'Granted' : 'Not granted'
      ))
    ])
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
};
