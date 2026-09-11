/**
 * G08 — dashboard surface adapter registry.
 *
 * The SURFACE layer of packet 19's domain contracts: every audited dashboard
 * domain declares {surfaceKey, name, routePatterns, roles, targetSource,
 * entitySources, contextDomains, capabilities, commandKeys, refreshKeys,
 * privacyClass, activation, manualFallbackRoute}. Browser/frontend
 * declarations describe CONTEXT, never grants — the server validates role,
 * target and activation here.
 *
 * Activation is receipt-gated: 'active' only where a working command lane or
 * read-only evidence path exists in this task's receipts (G01–G07). Every
 * other row is 'explain' with its existing dashboard route as the manual
 * fallback — a missing write adapter is explicitly displayed, never silently
 * pretended. Unknown surfaces resolve to explain-only, and the lookup uses a
 * Map so prototype-key probes ('__proto__', 'constructor') cannot pollute it.
 *
 * Commands are referenced by their registry `type`; membership is enforced by
 * dashboardSurfaceRegistry.da.test.mjs against the initialized registry.
 */

const ACTIVE = 'active';
const EXPLAIN = 'explain';

function row(definition) {
  return Object.freeze({ contextDomains: [], entitySources: [], commandKeys: [], refreshKeys: [], ...definition });
}

const SURFACE_ROWS = [
  row({
    surfaceKey: 'D01', name: 'Coach / PLAUD', routePatterns: ['/dashboard/*/coach-assistant', '/coach-assistant'],
    roles: ['admin', 'trainer'], targetSource: 'route thread/client params',
    entitySources: ['ai_chat_conversations', 'coach_intake_queue', 'plaud_clips'],
    contextDomains: ['D01', 'D03', 'D19'],
    commandKeys: ['view_coach_intake_queue', 'view_coach_intake_prepared_draft', 'plaud_analyze_clip_set'],
    refreshKeys: ['coach-intake-queue', 'coach-threads', 'plaud-clips'],
    privacyClass: 'operator', activation: { state: ACTIVE, reason: 'G01-G05 receipts: command registry lanes, proposal approval, confirmation projection' },
    manualFallbackRoute: '/dashboard/admin/coach-assistant',
  }),
  row({
    surfaceKey: 'D02', name: 'Workout Planner', routePatterns: ['/dashboard/*/workout-planner', '/workout-planner'],
    roles: ['admin', 'trainer'], targetSource: 'selected client context',
    entitySources: ['workout_plans', 'workout_plan_days', 'exercises'],
    contextDomains: ['D02', 'D03'],
    commandKeys: ['build_workout_plan', 'create_nasm_program', 'planner_rearrange_workout', 'planner_undo_last_change'],
    refreshKeys: ['workout-plans', 'plan-days'],
    privacyClass: 'client-scoped', activation: { state: ACTIVE, reason: 'command registry planner lanes + revision-bound plan edit approvals' },
    manualFallbackRoute: '/dashboard/trainer/workout-planner',
  }),
  row({
    surfaceKey: 'D03', name: 'Log My Workout / Logger', routePatterns: ['/dashboard/*/workout-logger', '/workout-logger', '/dashboard/*/my-workouts'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'actor or selected client',
    entitySources: ['workout_sessions', 'workout_exercises', 'sets', 'workout_forms'],
    contextDomains: ['D03', 'D19'],
    commandKeys: ['log_workout', 'view_last_workout'],
    refreshKeys: ['workout-sessions', 'progress-charts'],
    privacyClass: 'client-scoped', activation: { state: ACTIVE, reason: 'G01 atomic save + semantic readback receipts; S4 exact-once save' },
    manualFallbackRoute: '/dashboard/workout-logger',
  }),
  row({
    surfaceKey: 'D05', name: 'Clients & Team (read/brief)', routePatterns: ['/dashboard/*/clients', '/dashboard/*/clients-team', '/dashboard/*/my-clients'],
    roles: ['admin', 'trainer'], targetSource: 'selected client row (Users PK)',
    entitySources: ['users', 'client_trainer_assignments'],
    contextDomains: ['D05'],
    commandKeys: ['view_client_profile'],
    refreshKeys: ['client-list', 'assignments'],
    privacyClass: 'client-scoped', activation: { state: ACTIVE, reason: 'clientCommands read lanes; view-as stays read-only; staff/private notes filtered upstream' },
    manualFallbackRoute: '/dashboard/admin/clients',
  }),
  row({
    surfaceKey: 'D11', name: 'Pain charts / pain reporting', routePatterns: ['/dashboard/*/pain*', '/pain-tracker'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'actor or selected client',
    entitySources: ['pain_entries', 'pain_chart_regions'],
    contextDomains: ['D11', 'D19'],
    commandKeys: ['painchart_select_region'],
    refreshKeys: ['pain-entries', 'pain-charts'],
    privacyClass: 'sensitive-health', activation: { state: ACTIVE, reason: 'painChartCommands lane + pain read-only evidence tool (G05)' },
    manualFallbackRoute: '/dashboard/pain-tracker',
  }),
  row({
    surfaceKey: 'D13', name: 'Equipment intelligence', routePatterns: ['/dashboard/*/equipment*'],
    roles: ['admin', 'trainer'], targetSource: 'selected client context',
    entitySources: ['equipment_items', 'equipment_profiles'],
    contextDomains: ['D13'],
    commandKeys: ['equipment_list_items', 'equipment_gap_report'],
    refreshKeys: ['equipment-items', 'equipment-profiles'],
    privacyClass: 'client-scoped', activation: { state: ACTIVE, reason: 'equipmentCommands lanes (read/report); writes remain role-gated upstream' },
    manualFallbackRoute: '/dashboard/admin/equipment',
  }),
  row({
    surfaceKey: 'D19', name: 'Progress evidence (read-only)', routePatterns: ['/dashboard/*/progress*', '/progress'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'actor or selected client',
    entitySources: ['workout_sessions (read-only)', 'body_measurements (read-only)'],
    contextDomains: ['D19'],
    commandKeys: [],
    refreshKeys: ['progress-charts', 'progress-evidence'],
    privacyClass: 'sensitive-health', activation: { state: ACTIVE, reason: 'G07 source-linked progress evidence reader + deterministic calculator (read-only); charts remain authoritative' },
    manualFallbackRoute: '/dashboard/progress',
  }),

  row({
    surfaceKey: 'D04', name: 'Bootcamp / sprint creator', routePatterns: ['/dashboard/*/bootcamp*', '/bootcamp'],
    roles: ['admin', 'trainer'], targetSource: 'selected client or class',
    entitySources: ['bootcamps', 'bootcamp_sprints'],
    privacyClass: 'client-scoped', activation: { state: EXPLAIN, reason: 'command definitions exist but no this-task writer receipt; wave 2' },
    manualFallbackRoute: '/dashboard/admin/bootcamp',
  }),
  row({
    surfaceKey: 'D06', name: 'Onboarding', routePatterns: ['/dashboard/*/onboarding*', '/onboarding'],
    roles: ['admin', 'trainer'], targetSource: 'selected client',
    entitySources: ['onboarding_records', 'consents'],
    privacyClass: 'sensitive-health', activation: { state: EXPLAIN, reason: 'wave 3; completeness proposals need their own approval receipt' },
    manualFallbackRoute: '/dashboard/admin/onboarding',
  }),
  row({
    surfaceKey: 'D07', name: 'Waivers', routePatterns: ['/dashboard/*/waiver*'],
    roles: ['admin'], targetSource: 'selected client',
    entitySources: ['waivers'],
    privacyClass: 'legal', activation: { state: EXPLAIN, reason: 'contract-fixed: clearance metadata only; signatures stay human' },
    manualFallbackRoute: '/dashboard/admin/waivers',
  }),
  row({
    surfaceKey: 'D08', name: 'Scheduling / session location', routePatterns: ['/dashboard/*/schedule*', '/schedule'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'own or assigned schedule',
    entitySources: ['sessions', 'UniversalMasterSchedule'],
    privacyClass: 'client-scoped', activation: { state: EXPLAIN, reason: 'wave 2; location is not session-credit allocation' },
    manualFallbackRoute: '/dashboard/schedule',
  }),
  row({
    surfaceKey: 'D09', name: 'Trainers / assignments / permissions', routePatterns: ['/dashboard/*/trainers*', '/dashboard/*/assignments*'],
    roles: ['admin'], targetSource: 'assignment records',
    entitySources: ['client_trainer_assignments', 'trainer_permissions'],
    privacyClass: 'staff', activation: { state: EXPLAIN, reason: 'contract-fixed: existing authorized human workflows; assignment rechecked at every read' },
    manualFallbackRoute: '/dashboard/admin/trainers',
  }),
  row({
    surfaceKey: 'D10', name: 'Money / session allocation', routePatterns: ['/dashboard/*/billing*', '/dashboard/*/payments*', '/dashboard/*/earnings*'],
    roles: ['admin'], targetSource: 'billing records',
    entitySources: ['payments', 'session_credits'],
    privacyClass: 'financial', activation: { state: EXPLAIN, reason: 'contract-fixed: no autonomous financial effects' },
    manualFallbackRoute: '/dashboard/admin/billing',
  }),
  row({
    surfaceKey: 'D12', name: 'Nutrition & Nutrition Planner', routePatterns: ['/dashboard/*/nutrition*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'actor or selected client',
    entitySources: ['food_logs', 'macro_targets'],
    privacyClass: 'sensitive-health', activation: { state: EXPLAIN, reason: 'wave 2; food logs are not permission to replace macro targets' },
    manualFallbackRoute: '/dashboard/nutrition',
  }),
  row({
    surfaceKey: 'D14', name: 'Form assessment / video', routePatterns: ['/dashboard/*/form-analysis*', '/dashboard/*/movement*'],
    roles: ['admin', 'trainer'], targetSource: 'selected client media',
    entitySources: ['form_analyses', 'video_sessions'],
    privacyClass: 'biometric', activation: { state: EXPLAIN, reason: 'wave 2; capture consent + no background capture; no diagnostic inference' },
    manualFallbackRoute: '/dashboard/form-analysis',
  }),
  row({
    surfaceKey: 'D15', name: 'Gamification', routePatterns: ['/dashboard/*/gamification*', '/dashboard/*/achievements*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'actor or selected client',
    entitySources: ['badges', 'experience_points'],
    privacyClass: 'client-scoped', activation: { state: EXPLAIN, reason: 'wave 3' },
    manualFallbackRoute: '/dashboard/achievements',
  }),
  row({
    surfaceKey: 'D16', name: 'Content Studio / photos / galleries / videos', routePatterns: ['/dashboard/*/content-studio*', '/dashboard/*/gallery*'],
    roles: ['admin'], targetSource: 'media library',
    entitySources: ['media_assets', 'galleries'],
    privacyClass: 'public-facing', activation: { state: EXPLAIN, reason: 'wave 4; publishing needs audience preview + explicit approval; private photos are not gallery assets' },
    manualFallbackRoute: '/dashboard/admin/content-studio',
  }),
  row({
    surfaceKey: 'D17', name: 'Account / security', routePatterns: ['/dashboard/*/account*', '/dashboard/*/security*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'own account',
    entitySources: ['users (security fields)'],
    privacyClass: 'credentials', activation: { state: EXPLAIN, reason: 'contract-fixed: account security stays human-operated' },
    manualFallbackRoute: '/dashboard/account',
  }),
  row({
    surfaceKey: 'D18', name: 'Communication / support', routePatterns: ['/dashboard/*/support*', '/dashboard/*/messages*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'own threads',
    entitySources: ['messages', 'support_threads'],
    privacyClass: 'private', activation: { state: EXPLAIN, reason: 'wave 4; sending requires its own audience preview and approval' },
    manualFallbackRoute: '/dashboard/support',
  }),
  row({
    surfaceKey: 'D20', name: 'Community', routePatterns: ['/dashboard/*/community*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'own social graph',
    entitySources: ['posts', 'challenges'],
    privacyClass: 'public-facing', activation: { state: EXPLAIN, reason: 'wave 3; share drafts never auto-send (T48)' },
    manualFallbackRoute: '/dashboard/community',
  }),
  row({
    surfaceKey: 'D21', name: 'Notes', routePatterns: ['/dashboard/*/notes*'],
    roles: ['admin', 'trainer'], targetSource: 'selected client',
    entitySources: ['client_notes'],
    privacyClass: 'staff', activation: { state: EXPLAIN, reason: 'wave 3; staff notes are not client-visible memory (S9 boundary)' },
    manualFallbackRoute: '/dashboard/admin/notes',
  }),
  row({
    surfaceKey: 'D22', name: 'Internal design / operator surfaces', routePatterns: ['/dashboard/*/internal*', '/operator*'],
    roles: ['admin'], targetSource: 'operator context',
    entitySources: [],
    privacyClass: 'operator', activation: { state: EXPLAIN, reason: 'contract-fixed: operator surfaces stay human; Hermes bridge is separate and gated' },
    manualFallbackRoute: '/dashboard/admin',
  }),
  row({
    surfaceKey: 'D23', name: 'Home / overview', routePatterns: ['/dashboard', '/dashboard/*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'actor',
    entitySources: ['briefings'],
    contextDomains: ['D03', 'D19'],
    privacyClass: 'client-scoped', activation: { state: EXPLAIN, reason: 'uses Wave-1 training evidence + existing briefing; no own writer' },
    manualFallbackRoute: '/dashboard',
  }),
  row({
    surfaceKey: 'D24', name: 'AI consent', routePatterns: ['/dashboard/*/ai-consent*', '/dashboard/*/settings/ai*'],
    roles: ['admin', 'trainer', 'client'], targetSource: 'own consent record',
    entitySources: ['ai_consents'],
    privacyClass: 'consent', activation: { state: EXPLAIN, reason: 'wave 3; consent writes keep their own explicit flow' },
    manualFallbackRoute: '/dashboard/settings/ai-consent',
  }),
];

const REGISTRY = new Map(SURFACE_ROWS.map((surfaceRow) => [surfaceRow.surfaceKey, surfaceRow]));
const DOMAIN_IDS = SURFACE_ROWS.map((surfaceRow) => surfaceRow.surfaceKey);

/** Explain-only shape for unknown, role-hidden or hostile surface keys. */
function explainRow(reason, roles = []) {
  return Object.freeze({
    surfaceKey: null, name: 'Unknown surface', routePatterns: [], roles,
    targetSource: 'none', entitySources: [], contextDomains: [], capabilities: [],
    commandKeys: [], refreshKeys: [], privacyClass: 'unknown',
    activation: { state: EXPLAIN, reason }, manualFallbackRoute: '/dashboard',
  });
}

export const SURFACE_DOMAIN_IDS = Object.freeze([...DOMAIN_IDS]);

export function getSurfaceAdapter(surfaceKey) {
  if (typeof surfaceKey !== 'string') return null;
  return REGISTRY.get(surfaceKey) ?? null;
}

/**
 * Server-validated manifest read: role visibility is enforced HERE, not in
 * the browser. Returns declarations only — never entity data, never grants.
 */
export function getSurfaceCapabilityManifest({ role, surfaceKey } = {}) {
  const surface = getSurfaceAdapter(surfaceKey);
  if (!surface) {
    return { state: 'explain', reason: 'unknown_surface', surface: explainRow('unknown_surface', role ? [role] : []) };
  }
  if (!role || !surface.roles.includes(role)) {
    return { state: 'explain', reason: 'role_not_visible', surface: explainRow('role_not_visible', role ? [role] : []) };
  }
  if (surface.activation.state === EXPLAIN) {
    return {
      state: 'explain',
      reason: surface.activation.reason,
      surface: { ...surface, capabilities: ['explain', 'navigate'] },
    };
  }
  return {
    state: 'ok',
    reason: surface.activation.reason,
    surface: { ...surface, capabilities: ['explain', 'navigate', 'read', ...surface.commandKeys.length ? ['reviewed_write'] : []] },
  };
}
