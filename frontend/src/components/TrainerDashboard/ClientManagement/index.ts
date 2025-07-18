/**
 * ClientManagement Index - Export Module
 * =====================================
 * 
 * Centralized exports for trainer client management components
 * Provides clean imports for the UniversalDashboardLayout system
 */

// Main Components
export { default as MyClientsView } from './MyClientsView';
export { default as MyClientsViewWithFallback } from './MyClientsViewWithFallback';

// Export fallback component as default for better UX
export { default } from './MyClientsViewWithFallback';