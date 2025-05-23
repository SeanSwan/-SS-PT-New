/**
 * ClientDashboard Module Exports
 * 
 * This file exports all components related to the Client Dashboard
 * for easy importing throughout the application.
 */

// Revolutionary Dashboard (RECOMMENDED - Master Prompt v28)
export { default } from './RevolutionaryClientDashboard';
export { default as RevolutionaryClientDashboard } from './RevolutionaryClientDashboard';
export { default as GamifiedGalaxyDashboard } from './GamifiedGalaxyDashboard';

// Legacy Components (Backward Compatibility)
export { default as ClientDashboard } from './ClientDashboard';
export { default as NewDashboard } from './NewDashboard';
export { default as EmergencyDashboard } from './EmergencyDashboard';
export { default as ClientLayout } from './ClientLayout';
export { default as ClientSidebar } from './ClientSidebar';
export { default as ClientMainContent } from './ClientMainContent';

// Section Components
export { default as OverviewSection } from './OverviewSection';
export { default as ProgressSection } from './ProgressSection';
export { default as MyWorkoutsSection } from './sections/MyWorkoutsSection';
export { default as GamificationSection } from './sections/GamificationSection';
export { default as CreativeHubSection } from './sections/CreativeHubSection';
export { default as CommunitySection } from './sections/CommunitySection';
export { default as ProfileSection } from './sections/ProfileSection';
export { default as SettingsSection } from './sections/SettingsSection';

// Reusable UI Components (exported from ClientMainContent)
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