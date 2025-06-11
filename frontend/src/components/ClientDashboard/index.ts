/**
 * ClientDashboard Module Exports - ARCHITECTURAL REFACTOR v28.4
 * ============================================================
 * This file exports all components related to the Client Dashboard
 * following modern React best practices and Gemini's architectural guidance.
 * 
 * STRUCTURE:
 * - /components: Reusable UI parts (OverviewPanel, ProgressChart)
 * - /layouts: Structural components (ClientDashboardLayout)
 * - /sections: Major view sections (ProfileSection, WorkoutsSection)
 * - /hooks: Custom hooks (useClientData)
 */

// Main Dashboard Component (ACTIVE - Master Prompt v28.4)
export { default } from './RevolutionaryClientDashboard';
export { default as RevolutionaryClientDashboard } from './RevolutionaryClientDashboard';

// NEW ARCHITECTURAL STRUCTURE - Gemini's Refactoring
// ==================================================

// Reusable UI Components (Modern, Decomposed)
export * from './components';

// Layout Components (Structural)
export * from './layouts';

// Custom Hooks (Data Management)
export * from './hooks';

// LEGACY COMPONENTS - Maintained for Compatibility
// ================================================

// Active Layout Components (Legacy - to be migrated)
export { default as ClientLayout } from './ClientLayout';
export { default as ClientSidebar } from './ClientSidebar';
export { default as ClientMainContent } from './ClientMainContent';

// Section Components (Well-structured)
export { default as OverviewSection } from './OverviewSection';
export { default as ProgressSection } from './ProgressSection';
export { default as MyWorkoutsSection } from './sections/MyWorkoutsSection';
export { default as GamificationSection } from './sections/GamificationSection';
export { default as CreativeHubSection } from './sections/CreativeHubSection';
export { default as CommunitySection } from './sections/CommunitySection';
export { default as ProfileSection } from './sections/ProfileSection';
export { default as SettingsSection } from './sections/SettingsSection';

// Reusable UI Components (from legacy ClientMainContent)
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter,
  Grid,
  Flex,
  ProgressBar,
  Badge,
  Button
} from './ClientMainContent';

// Types
export { DashboardSection } from './ClientLayout';

// REFACTORING NOTES:
// ==================
// ✅ NEW: Clean barrel exports for /components, /layouts, /hooks
// ✅ NEW: Decomposed UI components (OverviewPanel, ProgressChart)
// ✅ NEW: Custom data management hooks (useClientData)
// ✅ NEW: Responsive layout components (ClientDashboardLayout)
// 🔄 MIGRATION: Legacy components maintained for compatibility
// 📋 TODO: Migrate legacy components to new structure gradually
