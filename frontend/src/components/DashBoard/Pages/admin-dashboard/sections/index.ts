/**
 * Admin Dashboard Sections Index
 * ==============================
 * 
 * Central export point for all admin dashboard sections
 * Facilitates clean imports and better organization
 */

// Core Management Sections
export { default as ClientsManagementSection } from './ClientsManagementSection';
export { default as PackagesManagementSection } from './PackagesManagementSection';
export { default as ContentModerationSection } from './ContentModerationSection';
export { default as NotificationsSection } from './NotificationsSection';
export { default as MCPServersSection } from './MCPServersSection';
export { default as AdminSettingsSection } from './AdminSettingsSection';

// Type exports for better TypeScript integration
export type {
  Client,
  ClientStats
} from './ClientsManagementSection';

export type {
  Package,
  PackageStats
} from './PackagesManagementSection';

export type {
  ContentItem,
  ContentStats
} from './ContentModerationSection';

export type {
  Notification,
  NotificationStats
} from './NotificationsSection';

export type {
  MCPServer,
  MCPStats
} from './MCPServersSection';

export type {
  SystemSettings,
  SecuritySettings,
  NotificationSettings,
  APIKey
} from './AdminSettingsSection';