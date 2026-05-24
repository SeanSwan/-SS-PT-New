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

// Live trainer route must render the real assignment-backed client view.
export { default } from './MyClientsView';
