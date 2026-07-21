/**
 * Dashboard Tabs Configuration
 *
 * Centralized configuration for dashboard tabs across different user roles.
 * This ensures consistency between admin, trainer, and client dashboards.
 */

import { CANONICAL_SURFACES } from './canonical-surface-names';

export type TabStatus = 'real' | 'mock' | 'partial' | 'fix' | 'progress' | 'new' | 'error';

export type DashboardTab = {
  key: string;
  label: string;
  icon: string;
  order: number;
  status?: TabStatus;
  section?: 'command' | 'management' | 'business' | 'content' | 'system';
  route?: string;
  description?: string;
  notification?: number;
  isNew?: boolean;
  isDisabled?: boolean;
};

// Common tabs shared across dashboard types
export const COMMON_DASHBOARD_TABS: DashboardTab[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: 'Shield',
    order: 1,
    status: 'mock',
  },
  {
    key: 'sessions',
    label: 'Schedule',
    icon: 'Calendar',
    order: 2,
    status: 'partial',
  },
  {
    key: 'workouts',
    label: 'Workouts',
    icon: 'Dumbbell',
    order: 3,
    status: 'real',
  },
  {
    key: 'client-progress',
    label: 'Client Progress',
    icon: 'BarChart3',
    order: 4,
    status: 'real',
  },
  {
    key: 'messages',
    label: 'Messages',
    icon: 'Mail',
    order: 5,
    status: 'real',
  },
  {
    key: 'gamification',
    label: 'Gamification',
    icon: 'Gamepad2',
    order: 6,
    status: 'real',
  },
  {
    key: 'community',
    label: 'Community',
    icon: 'Users',
    order: 7,
    status: 'progress',
  },
];

/**
 * @deprecated Use WORKSPACE_CONFIG instead. This array is kept for backward
 * compatibility during migration. Will be removed in a future release.
 */
export const ADMIN_DASHBOARD_TABS: DashboardTab[] = [
  {
    key: 'overview',
    label: 'Dashboard Overview',
    icon: 'Shield',
    order: 1,
    status: 'mock',
    section: 'command',
    route: '/dashboard/default',
    description: 'Executive command center overview',
  },
  {
    key: 'master-schedule',
    label: 'Master Schedule',
    icon: 'Calendar',
    order: 2,
    status: 'partial',
    section: 'command',
    route: '/dashboard/admin/master-schedule',
    description: 'Universal Master Schedule management',
    isNew: true,
  },
  {
    key: 'analytics',
    label: 'Analytics Hub',
    icon: 'BarChart3',
    order: 3,
    status: 'real',
    section: 'command',
    route: '/dashboard/analytics',
    description: 'Comprehensive analytics and insights',
  },
  {
    key: 'users',
    label: 'User Management',
    icon: 'Users',
    order: 4,
    status: 'real',
    section: 'management',
    route: '/dashboard/user-management',
    description: 'Manage all platform users',
  },
  {
    key: 'trainers',
    label: 'Trainer Management',
    icon: 'UserCheck',
    order: 5,
    status: 'real',
    section: 'management',
    route: '/dashboard/trainers',
    description: 'Manage trainer accounts and permissions',
  },
  {
    key: 'clients',
    label: 'Client Management',
    icon: 'Users',
    order: 6,
    status: 'error',
    section: 'management',
    route: '/dashboard/clients',
    description: 'Monitor client accounts and engagement',
  },
  {
    key: 'client-onboarding',
    label: 'Client Onboarding',
    icon: 'UserPlus',
    order: 7,
    status: 'new',
    section: 'management',
    route: '/dashboard/client-onboarding',
    description: 'Onboard new clients with comprehensive wizard',
    isNew: true,
  },
  {
    key: 'movement-screen',
    label: 'Movement Screen',
    icon: 'Activity',
    order: 7.5,
    status: 'new' as TabStatus,
    section: 'management',
    route: '/dashboard/admin/client-management',
    description: 'NASM + Squat University guided movement analysis',
    isNew: true,
  },
  {
    key: 'sessions',
    label: 'Session Scheduling',
    icon: 'Calendar',
    order: 8,
    status: 'partial',
    section: 'management',
    route: '/dashboard/admin-sessions',
    description: 'Manage training sessions and appointments',
  },
  {
    key: 'packages',
    label: 'Package Management',
    icon: 'Package',
    order: 9,
    status: 'error',
    section: 'management',
    route: '/dashboard/admin-packages',
    description: 'Configure pricing and session packages',
  },
  {
    key: 'pricing-sheet',
    label: 'Pricing Sheet',
    icon: 'DollarSign',
    order: 9.05,
    status: 'real',
    section: 'business',
    route: '/dashboard/admin/pricing-sheet',
    description: 'Printable pricing sheet for client handoffs',
    isNew: true,
  },
  {
    key: 'sales-scripts',
    label: 'Sales Scripts',
    icon: 'FileText',
    order: 9.06,
    status: 'real',
    section: 'business',
    route: '/dashboard/admin/sales-scripts',
    description: 'Parent onboarding scripts and objection handling',
    isNew: true,
  },
  {
    key: 'admin-specials',
    label: 'Admin Specials',
    icon: 'Star',
    order: 9.07,
    status: 'real',
    section: 'business',
    route: '/dashboard/admin-specials',
    description: 'Manage bonus session promotions',
    isNew: true,
  },
  // 5.4 consolidation: the Nutrition Plan Builder is no longer a nav
  // destination — it is reached in context via "Set targets" on the Client
  // Hub nutrition tab. The /nutrition/:clientId route stays mounted.
  {
    key: 'workout-plans',
    label: 'Plan Client Workout',
    icon: 'Dumbbell',
    order: 9.2,
    status: 'real',
    section: 'management',
    route: '/dashboard/admin/client-management?intent=plan_next',
    description: 'Pick a client, then open the canonical workout planner',
    isNew: true,
  },
  {
    key: 'workout-planner',
    label: CANONICAL_SURFACES.workoutPlanner.name,
    icon: 'Dumbbell',
    order: 9.25,
    status: 'real',
    section: 'management',
    route: '/dashboard/admin/workout-planner',
    description: 'Swan Coach workout builder with Teach Mode',
    isNew: true,
  },
  {
    key: 'client-notes',
    label: 'Client Notes',
    icon: 'FileText',
    order: 9.3,
    status: 'real',
    section: 'management',
    route: '/dashboard/admin/notes',
    description: 'Manage trainer observations and notes',
    isNew: true,
  },
  {
    key: 'client-photos',
    label: 'Client Photos',
    icon: 'Camera',
    order: 9.4,
    status: 'real',
    section: 'management',
    route: '/dashboard/admin/photos',
    description: 'Upload and compare client progress photos',
    isNew: true,
  },
  {
    key: 'revenue',
    label: 'Revenue Analytics',
    icon: 'DollarSign',
    order: 10,
    status: 'real',
    section: 'business',
    route: '/dashboard/admin/revenue',
    description: 'Track revenue streams and financial metrics',
  },
  {
    key: 'pending-orders',
    label: 'Pending Orders',
    icon: 'CreditCard',
    order: 11,
    status: 'real',
    section: 'business',
    route: '/dashboard/admin/pending-orders',
    description: 'Manage manual payments and pending orders',
    notification: 3,
  },
  {
    key: 'reports',
    label: 'Performance Reports',
    icon: 'FileText',
    order: 12,
    status: 'mock',
    section: 'business',
    route: '/dashboard/reports',
    description: 'Generate comprehensive performance reports',
  },
  {
    key: 'messages',
    label: 'Messages',
    icon: 'Mail',
    order: 13,
    status: 'error',
    section: 'content',
    route: '/dashboard/messages',
    description: 'View and manage platform messages',
  },
  {
    key: 'content',
    label: 'Content Moderation',
    icon: 'MessageSquare',
    order: 14,
    status: 'real',
    section: 'content',
    route: '/dashboard/content',
    description: 'Review and moderate user-generated content',
    notification: 5,
  },
  {
    key: 'gamification',
    label: 'Gamification Engine',
    icon: 'Gamepad2',
    order: 15,
    status: 'real',
    section: 'content',
    route: '/dashboard/gamification',
    description: 'Configure achievements and engagement systems',
  },
  {
    key: 'video-studio',
    label: 'Video Studio',
    icon: 'Video',
    order: 15.5,
    status: 'new' as TabStatus,
    section: 'content',
    route: '/dashboard/video-studio',
    description: 'Video library, YouTube imports, collections, analytics',
    isNew: true,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'Bell',
    order: 16,
    status: 'error',
    section: 'content',
    route: '/dashboard/notifications',
    description: 'Manage platform notifications and alerts',
    notification: 12,
  },
  {
    key: 'automation',
    label: 'Automation',
    icon: 'Zap',
    order: 16.1,
    status: 'real',
    section: 'system',
    route: '/dashboard/admin/automation',
    description: 'Configure automated SMS sequences',
    isNew: true,
  },
  {
    key: 'sms-logs',
    label: 'SMS Logs',
    icon: 'MessageSquare',
    order: 16.2,
    status: 'real',
    section: 'system',
    route: '/dashboard/admin/sms-logs',
    description: 'Review outbound SMS delivery logs',
    isNew: true,
  },
  {
    key: 'launch-checklist',
    label: 'Launch Checklist',
    icon: 'CheckSquare',
    order: 16.3,
    status: 'real',
    section: 'system',
    route: '/dashboard/admin/launch-checklist',
    description: 'Manual launch readiness checklist',
    isNew: true,
  },
  {
    key: 'system-health',
    label: 'System Health',
    icon: 'Monitor',
    order: 17,
    status: 'mock',
    section: 'system',
    route: '/dashboard/system-health',
    description: 'Monitor system performance and uptime',
  },
  {
    key: 'security',
    label: 'Security Dashboard',
    icon: 'ShieldCheck',
    order: 18,
    status: 'mock',
    section: 'system',
    route: '/dashboard/admin/security',
    description: 'Security monitoring and threat analysis',
  },
  {
    key: 'settings',
    label: 'Admin Settings',
    icon: 'Settings',
    order: 20,
    status: 'error',
    section: 'system',
    route: '/dashboard/settings',
    description: 'Administrative settings and configurations',
  },
  {
    key: 'style-guide',
    label: 'Aesthetic Codex',
    icon: 'Grid',
    order: 21,
    status: 'real',
    section: 'system',
    route: '/dashboard/style-guide',
    description: 'Living style guide and design system',
    isNew: true,
  },
];

// Trainer-specific tabs
export const TRAINER_DASHBOARD_TABS: DashboardTab[] = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'clients',
    label: 'Clients',
    icon: 'Users',
    order: 8,
  },
  {
    key: 'packages',
    label: 'Packages',
    icon: 'ShoppingBag',
    order: 9,
  },
  {
    key: 'workout-planner',
    label: CANONICAL_SURFACES.workoutPlanner.name,
    icon: 'Dumbbell',
    order: 9.25,
    status: 'real',
    section: 'management',
    route: '/dashboard/trainer/workout-planner',
    description: 'Swan Coach workout builder with Teach Mode',
    isNew: true,
  },
];

// Client-specific tabs
export const CLIENT_DASHBOARD_TABS: DashboardTab[] = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'creative',
    label: 'Creative Hub',
    icon: 'Palette',
    order: 8,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'UserCircle',
    order: 9,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    order: 10,
  },
];

// ─── Workspace Configuration (Phase 1) ─────────────────
export type WorkspaceSection = 'command' | 'clients' | 'training' | 'business' | 'system';

export interface WorkspaceConfig {
  id: string;
  label: string;
  icon: string;
  prefix: string;
  description: string;
  section: WorkspaceSection;
  featureKey?: string; // Per-user feature flag — hides tab for non-admin users without access
}

// Sidebar section headers (Gemini CD Kirin spec — Plus Jakarta Sans uppercase, Swan Lavender 60%)
export const WORKSPACE_SECTIONS: { id: WorkspaceSection; label: string }[] = [
  { id: 'command',  label: 'Command' },
  { id: 'clients',  label: 'Clients & Ops' },
  { id: 'training', label: 'Training' },
  { id: 'business', label: 'Business' },
  { id: 'system',   label: 'System' },
];

// Workspace prefixes must match the canonical admin route paths.
export const WORKSPACE_CONFIG: WorkspaceConfig[] = [
  // ── COMMAND — top-level orchestration ──
  { id: 'coach', section: 'command', label: 'Coach Command Center', icon: 'MessageCircle', prefix: '/dashboard/admin/coach-assistant', description: 'Review-gated Swan Coach intake, drafts, and operator approvals' },
  { id: 'home', section: 'command', label: 'Dashboard', icon: 'Shield', prefix: '/dashboard/admin/overview', description: 'Executive command center' },
  { id: 'messages', section: 'command', label: 'Messages', icon: 'Mail', prefix: '/dashboard/admin/messages', description: 'Client and trainer messaging hub' },
  { id: 'report-room', section: 'command', label: 'Report Room', icon: 'MessageCircle', prefix: '/dashboard/admin/support', description: 'Private issue inbox, triage, replies, and repair prompts' },

  // ── CLIENTS & OPS — client lifecycle and scheduling ──
  // canonical-surface-audit 2026-04-13 (Phase 6 production hotfix),
  // updated 2026-04-21 (Phase 19 dead-route cleanup):
  // The previous prefix `/dashboard/people` resolved to UnifiedAdminRoutes
  // which is no longer mounted in the active routing tree (only
  // UniversalDashboardLayout is mounted at /dashboard/* (`main-routes.tsx:873-877`).
  // Its role-aware catch-alls (`UniversalDashboardLayout.shellPieces.tsx:92-114`)
  // redirect admins to the configured default path, so any stray link to
  // /dashboard/people silently navigates to the Command Center. The
  // working canonical path is /dashboard/admin/client-management which
  // mounts ClientsWorkspace via the admin role config at
  // UniversalDashboardLayout.tsx:500. Remaining dormant references and
  // their replacement decisions are tracked in
  // docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md.
  { id: 'people', section: 'clients', label: 'Clients & Team', icon: 'Users', prefix: '/dashboard/admin/client-management', description: 'Client hub for profiles, team actions, workout logging, plans, progress, and nutrition' },
  { id: 'waivers', section: 'clients', label: 'Waivers', icon: 'FileSignature', prefix: '/dashboard/admin/waivers', description: 'Waiver records, match approval, and manual linking' },
  { id: 'scheduling', section: 'clients', label: 'Scheduling', icon: 'Calendar', prefix: '/dashboard/admin/master-schedule', description: 'Session scheduling' },
  // Trainer-ops tools below were registered routes with no nav entry
  // (dashboard audit 2026-07-13) — invisible day-to-day as the team scales.
  { id: 'trainers', section: 'clients', label: 'Trainers', icon: 'UsersRound', prefix: '/dashboard/admin/trainer-management', description: 'Trainer roster, performance stats, and profile management' },
  { id: 'assignments', section: 'clients', label: 'Assignments', icon: 'UserCircle', prefix: '/dashboard/admin/client-trainer-assignments', description: 'Assign clients to trainers and manage active pairings' },
  { id: 'session-allocation', section: 'clients', label: 'Session Allocation', icon: 'CreditCard', prefix: '/dashboard/admin/session-allocation', description: 'Grant and track client session credits' },

  // ── TRAINING — fitness programming and health ──
  { id: 'workouts', section: 'training', label: CANONICAL_SURFACES.workoutPlanner.name, icon: 'Dumbbell', prefix: CANONICAL_SURFACES.workoutPlanner.routes.admin, description: CANONICAL_SURFACES.workoutPlanner.subtitles.admin },
  { id: 'bootcamp', section: 'training', label: 'Bootcamp Creator', icon: 'Flame', prefix: '/dashboard/admin/bootcamp', description: 'Swan Coach group fitness class builder' },
  { id: 'equipment', section: 'training', label: 'Equipment', icon: 'Wrench', prefix: '/dashboard/admin/equipment', description: 'Location equipment profiles & Swan Coach scanner' },
  { id: 'pain-charts', section: 'training', label: 'Pain Charts', icon: 'Heart', prefix: '/dashboard/admin/body-map', description: 'Client pain and injury tracking (body map)' },
  { id: 'nutrition', section: 'training', label: 'Nutrition', icon: 'Apple', prefix: '/dashboard/admin/meal-planner', description: 'Nutrition intelligence and meal planning' },

  // ── BUSINESS — revenue, growth, engagement ──
  { id: 'store', section: 'business', label: 'Store & Revenue', icon: 'DollarSign', prefix: '/dashboard/admin/admin-packages', description: 'Orders and packages' },
  { id: 'pending-orders', section: 'business', label: 'Pending Orders', icon: 'CreditCard', prefix: '/dashboard/admin/pending-orders', description: 'Manual payment recovery and order completion' },
  { id: 'analytics', section: 'business', label: 'Analytics', icon: 'BarChart3', prefix: '/dashboard/admin/revenue', description: 'Data analytics and insights' },
  { id: 'trainer-payouts', section: 'business', label: 'Trainer Payouts', icon: 'Banknote', prefix: '/dashboard/admin/trainer-payouts', description: 'Commission ledger — trainer balances and mark-paid settlement' },
  { id: 'marketing', section: 'business', label: 'Marketing', icon: 'Megaphone', prefix: '/dashboard/admin/marketing', description: 'SEO, content marketing, and competitor analysis' },
  { id: 'gamification', section: 'business', label: 'Gamification', icon: 'Gamepad2', prefix: '/dashboard/admin/gamification', description: 'Achievements, badges & rewards' },
  { id: 'content', section: 'business', label: 'Content Studio', icon: 'Video', prefix: '/dashboard/admin/content', description: 'Video and content management', featureKey: 'content-studio' },
  { id: 'photo-gallery', section: 'business', label: 'Photo Galleries', icon: 'Camera', prefix: '/dashboard/admin/gallery', description: 'Passcode photoshoot galleries — upload and manage client shoots' },

  // ── SYSTEM — infrastructure, personal, tools ──
  { id: 'security', section: 'system', label: 'Security', icon: 'ShieldCheck', prefix: '/dashboard/admin/security', description: 'Vulnerability scanning, dependency health, and security posture' },
  { id: 'account-access', section: 'system', label: 'Account Access', icon: 'KeyRound', prefix: '/dashboard/admin/account-access', description: 'Log in as any client or trainer (audited); block, deactivate, reactivate, force-logout' },
  { id: 'launch-control', section: 'system', label: 'Launch Control', icon: 'Rocket', prefix: '/dashboard/admin/launch-control', description: 'Manage approved feature switches from inside the app — instant, no redeploy' },
  { id: 'design-studio', section: 'system', label: 'Design Studio', icon: 'Sparkles', prefix: '/dashboard/admin/design-playground', description: 'Preview parked redesigns and legacy concepts without changing live routes' },
  { id: 'feature-access', section: 'system', label: 'Feature Access', icon: 'Unlock', prefix: '/dashboard/admin/feature-access', description: 'Grant per-user feature flags — incl. store-prices to reveal catalog pricing for a specific client' },
  { id: 'trainer-permissions', section: 'system', label: 'Trainer Permissions', icon: 'ShieldCheck', prefix: '/dashboard/admin/trainer-permissions', description: 'Grant/revoke granular trainer capabilities (edit workouts, schedules, analytics)' },
  { id: 'system', section: 'system', label: 'System', icon: 'Settings', prefix: '/dashboard/admin/style-guide', description: 'System operations and settings' },
  { id: 'workout-design-lab', section: 'system', label: 'Workout Design Lab', icon: 'Dumbbell', prefix: '/dashboard/admin/workout-design-lab', description: 'Explore 25 workout Worlds and the full Style Lens catalog' },
  { id: 'badge-creator', section: 'system', label: 'Badge Creator', icon: 'Sparkles', prefix: '/dashboard/admin/badge-creator', description: 'AI-powered badge and icon generation' },
  { id: 'immigration', section: 'system', label: 'Canada Immigration', icon: 'Globe', prefix: '/dashboard/admin/immigration', description: 'Immigration tracker & study platform' },
  { id: 'my-home', section: 'system', label: 'My Home', icon: 'Home', prefix: '/dashboard/admin/my-home', description: '3D avatar home — unlocks at Level 10' },
];

export default {
  COMMON_DASHBOARD_TABS,
  ADMIN_DASHBOARD_TABS,
  TRAINER_DASHBOARD_TABS,
  CLIENT_DASHBOARD_TABS,
  WORKSPACE_CONFIG,
};
