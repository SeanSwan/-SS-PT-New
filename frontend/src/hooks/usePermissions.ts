/**
 * usePermissions Hook
 * ==================
 * Hook for managing user permissions in the Universal Master Schedule
 * and other components that require role-based access control.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Permission types
export type Permission = 
  | 'view_all_sessions'
  | 'create_sessions'
  | 'edit_sessions'
  | 'delete_sessions'
  | 'assign_trainers'
  | 'bulk_operations'
  | 'view_statistics'
  | 'export_data'
  | 'import_data'
  | 'manage_users'
  | 'manage_clients'
  | 'manage_trainers'
  | 'view_reports'
  | 'manage_permissions'
  | 'system_settings';

// User roles
export type UserRole = 'admin' | 'trainer' | 'client' | 'user';

// Permission configuration by role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_all_sessions',
    'create_sessions',
    'edit_sessions',
    'delete_sessions',
    'assign_trainers',
    'bulk_operations',
    'view_statistics',
    'export_data',
    'import_data',
    'manage_users',
    'manage_clients',
    'manage_trainers',
    'view_reports',
    'manage_permissions',
    'system_settings',
  ],
  trainer: [
    'view_all_sessions',
    'create_sessions',
    'edit_sessions',
    'view_statistics',
    'export_data',
    'manage_clients',
  ],
  client: [
    'view_all_sessions',
  ],
  user: [
    'view_all_sessions',
  ],
};

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  view_all_sessions: 'View all training sessions',
  create_sessions: 'Create new training sessions',
  edit_sessions: 'Edit existing training sessions',
  delete_sessions: 'Delete training sessions',
  assign_trainers: 'Assign trainers to sessions',
  bulk_operations: 'Perform bulk operations on sessions',
  view_statistics: 'View session statistics and analytics',
  export_data: 'Export session data',
  import_data: 'Import session data',
  manage_users: 'Manage user accounts',
  manage_clients: 'Manage client accounts',
  manage_trainers: 'Manage trainer accounts',
  view_reports: 'View detailed reports',
  manage_permissions: 'Manage user permissions',
  system_settings: 'Access system settings',
};

/**
 * usePermissions Hook
 * 
 * Provides permission checking functionality based on user roles.
 * Integrates with the AuthContext to get current user information.
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Get user's role
  const userRole = useMemo(() => {
    if (!user) return 'user';
    return (user.role || 'user') as UserRole;
  }, [user]);

  // Get user's permissions based on role
  const userPermissions = useMemo(() => {
    return ROLE_PERMISSIONS[userRole] || [];
  }, [userRole]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return userPermissions.includes(permission);
  }, [user, userPermissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => userPermissions.includes(permission));
  }, [user, userPermissions]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => userPermissions.includes(permission));
  }, [user, userPermissions]);

  // Get permissions for a specific role (utility function)
  const getPermissionsForRole = useCallback((role: UserRole): Permission[] => {
    return ROLE_PERMISSIONS[role] || [];
  }, []);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return userRole === 'admin';
  }, [userRole]);

  // Check if user is trainer
  const isTrainer = useMemo(() => {
    return userRole === 'trainer';
  }, [userRole]);

  // Check if user is client
  const isClient = useMemo(() => {
    return userRole === 'client';
  }, [userRole]);

  // Permission checker with error handling
  const checkPermission = useCallback((permission: Permission, throwError = false): boolean => {
    try {
      const hasAccess = hasPermission(permission);
      
      if (!hasAccess && throwError) {
        throw new Error(`Access denied: ${PERMISSION_DESCRIPTIONS[permission]}`);
      }
      
      return hasAccess;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }, [hasPermission]);

  // Refresh permissions (for future use with dynamic permissions)
  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch updated permissions from the server
      // For now, it's a placeholder
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Permission utilities for common operations
  const can = {
    // Session management
    viewSessions: hasPermission('view_all_sessions'),
    createSessions: hasPermission('create_sessions'),
    editSessions: hasPermission('edit_sessions'),
    deleteSessions: hasPermission('delete_sessions'),
    assignTrainers: hasPermission('assign_trainers'),
    bulkOperations: hasPermission('bulk_operations'),
    
    // Data operations
    viewStatistics: hasPermission('view_statistics'),
    exportData: hasPermission('export_data'),
    importData: hasPermission('import_data'),
    
    // User management
    manageUsers: hasPermission('manage_users'),
    manageClients: hasPermission('manage_clients'),
    manageTrainers: hasPermission('manage_trainers'),
    
    // System operations
    viewReports: hasPermission('view_reports'),
    managePermissions: hasPermission('manage_permissions'),
    systemSettings: hasPermission('system_settings'),
  };

  // Effect to log permission changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('User permissions updated:', {
        user: user?.email,
        role: userRole,
        permissions: userPermissions,
      });
    }
  }, [user, userRole, userPermissions]);

  return {
    // User info
    user,
    userRole,
    isAdmin,
    isTrainer,
    isClient,
    
    // Permission data
    userPermissions,
    isLoading,
    
    // Permission checking methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermission,
    
    // Utility methods
    getPermissionsForRole,
    refreshPermissions,
    
    // Convenience object
    can,
    
    // Permission constants
    PERMISSIONS: ROLE_PERMISSIONS,
    PERMISSION_DESCRIPTIONS,
  };
};

export default usePermissions;
