/**
 * Dashboard Workspace Configuration
 *
 * WORKSPACE_CONFIG is the admin dashboard's data-driven nav source, consumed by
 * AdminStellarSidebar and guarded by sidebarRouteParity.contract.test.ts and
 * dashboardSupersetInvariant.test.ts.
 *
 * The filename still says "tabs" for import stability. It no longer defines tabs:
 * the per-role tab arrays it used to hold were removed 2026-08-23 as unreferenced.
 * The trainer sidebar builds its own nav inline in TrainerStellarSidebar.tsx — that
 * divergence is real and tracked on SWA-64, not something this file resolves.
 */

import { CANONICAL_SURFACES } from './canonical-surface-names';

// TabStatus and DashboardTab were removed with the tab consts they typed (2026-08-23);
// nothing outside this file referenced either. WORKSPACE_CONFIG has its own interface.

// COMMON_DASHBOARD_TABS / TRAINER_DASHBOARD_TABS / CLIENT_DASHBOARD_TABS lived here
// until 2026-08-23. Removed because nothing outside this file imported them: ~113
// lines of tab definitions that read as the authoritative dashboard nav while driving
// nothing. WORKSPACE_CONFIG below is the real, contract-tested nav source
// (sidebarRouteParity.contract.test.ts, dashboardSupersetInvariant.test.ts).
// If you need per-role tab config, extend WORKSPACE_CONFIG rather than reviving a
// second parallel document — two nav sources is how the two dashboards drifted.

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
  { id: 'client-progress', section: 'clients', label: 'Client Progress', icon: 'BarChart3', prefix: '/dashboard/admin/client-progress', description: 'Comparison analytics, injury-risk assessment, and goal tracking for a selected client' },

  // ── TRAINING — fitness programming and health ──
  { id: 'workouts', section: 'training', label: CANONICAL_SURFACES.workoutPlanner.name, icon: 'Dumbbell', prefix: CANONICAL_SURFACES.workoutPlanner.routes.admin, description: CANONICAL_SURFACES.workoutPlanner.subtitles.admin },
  // Workout-OS C0 (2026-07-29): the owner personal logger was a registered
  // route with zero nav entries — a dead end by the same 2026-07-13 audit
  // reasoning as the entries above. Client-facing workout logging stays inside
  // Clients & Team (workoutFirst contract); this entry is the OWNER's own log.
  { id: 'log-my-workout', section: 'training', label: CANONICAL_SURFACES.logMyWorkout.name, icon: 'ClipboardCheck', prefix: CANONICAL_SURFACES.logMyWorkout.routes.admin, description: CANONICAL_SURFACES.logMyWorkout.subtitles.admin },
  { id: 'assessments', section: 'training', label: 'Form Assessments', icon: 'ScanFace', prefix: '/dashboard/admin/assessments', description: 'Swan Coach form checking' },
  { id: 'bootcamp', section: 'training', label: 'Bootcamp Creator', icon: 'Flame', prefix: '/dashboard/admin/bootcamp', description: 'Swan Coach group fitness class builder' },
  { id: 'equipment', section: 'training', label: 'Equipment', icon: 'Wrench', prefix: '/dashboard/admin/equipment', description: 'Location equipment profiles & Swan Coach scanner' },
  { id: 'pain-charts', section: 'training', label: 'Pain Charts', icon: 'Heart', prefix: '/dashboard/admin/body-map', description: 'Client pain and injury tracking (body map)' },
  { id: 'nutrition', section: 'training', label: 'Nutrition', icon: 'Apple', prefix: '/dashboard/admin/meal-planner', description: 'Nutrition intelligence and meal planning' },
  // Phase 4E (2026-08-04): the Plan Builder was a registered route with no nav
  // entry — the only macro-target writer was URL-only (HY3 UX-crime #2).
  { id: 'nutrition-plan-builder', section: 'training', label: 'Nutrition Plan Builder', icon: 'ClipboardCheck', prefix: '/dashboard/admin/nutrition', description: 'Set client macro targets and build structured nutrition plans' },

  // ── BUSINESS — revenue, growth, engagement ──
  { id: 'store', section: 'business', label: 'Store & Revenue', icon: 'DollarSign', prefix: '/dashboard/admin/admin-packages', description: 'Orders and packages' },
  { id: 'pending-orders', section: 'business', label: 'Pending Orders', icon: 'CreditCard', prefix: '/dashboard/admin/pending-orders', description: 'Manual payment recovery and order completion' },
  { id: 'analytics', section: 'business', label: 'Analytics', icon: 'BarChart3', prefix: '/dashboard/admin/revenue', description: 'Data analytics and insights' },
  { id: 'trainer-payouts', section: 'business', label: 'Trainer Payouts', icon: 'Banknote', prefix: '/dashboard/admin/trainer-payouts', description: 'Commission ledger — trainer balances and mark-paid settlement' },
  { id: 'marketing', section: 'business', label: 'Marketing', icon: 'Megaphone', prefix: '/dashboard/admin/marketing', description: 'SEO, content marketing, and competitor analysis' },
  { id: 'gamification', section: 'business', label: 'Gamification', icon: 'Gamepad2', prefix: '/dashboard/admin/gamification', description: 'Achievements, badges & rewards' },
  { id: 'content', section: 'business', label: 'Content Studio', icon: 'Video', prefix: '/dashboard/admin/content', description: 'Video and content management', featureKey: 'content-studio' },
  { id: 'photo-gallery', section: 'business', label: 'Photo Galleries', icon: 'Camera', prefix: '/dashboard/admin/gallery', description: 'Passcode photoshoot galleries — upload and manage client shoots' },
  { id: 'videos', section: 'business', label: 'Training Videos', icon: 'Video', prefix: '/dashboard/admin/videos', description: 'Training video content library' },
  { id: 'live', section: 'business', label: 'Live Streams', icon: 'Video', prefix: '/dashboard/admin/live', description: 'Stream live workouts to clients' },
  { id: 'creators', section: 'business', label: 'Creators', icon: 'Sparkles', prefix: '/dashboard/admin/creators', description: 'Creator program and content monetization' },

  // ── SYSTEM — infrastructure, personal, tools ──
  { id: 'security', section: 'system', label: 'Security', icon: 'ShieldCheck', prefix: '/dashboard/admin/security', description: 'Vulnerability scanning, dependency health, and security posture' },
  { id: 'account-access', section: 'system', label: 'Account Access', icon: 'KeyRound', prefix: '/dashboard/admin/account-access', description: 'Log in as any client or trainer (audited); block, deactivate, reactivate, force-logout' },
  { id: 'launch-control', section: 'system', label: 'Launch Control', icon: 'Rocket', prefix: '/dashboard/admin/launch-control', description: 'Manage the three approved feature controls and audited overrides' },
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
  WORKSPACE_CONFIG,
};
