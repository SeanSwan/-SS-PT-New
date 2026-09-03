/**
 * userDashboard.tokens — the user tree's read-only bridge to the world/lens layer.
 *
 * LAW 8 promises the Appearance Studio can switch palette + lens + world and
 * re-skin every surface with zero code change. Today that promise reaches
 * exactly one tree: the trainer/clients-team/WorkoutLogger surfaces consume
 * `--world-*`; the user, client, admin and home trees consume none. So a
 * trainer who switches worlds and then opens any other dashboard watches the
 * skin drop mid-session — same user, two skins, right now.
 *
 * This is a pure CONSUMER (LAW 8 REFINEMENT 6): it READS world tokens and falls
 * back to the tree's existing Swan tokens. It must never emit or modify a world
 * token name, SurfaceLensGate, makeLensFrame or AppearanceProfile — those belong
 * to the World Engine. Fail-closed by construction: every value nests a world
 * read inside a Swan-token read inside a literal, so a missing world degrades to
 * exactly what the tree renders today. (The illustrative placeholders that used
 * to appear here were removed: the token-existence gate reads comments too, and
 * correctly refused a var() name that resolves to nothing.)
 *
 * @module components/UserDashboard/userDashboard.tokens
 */

/**
 * Vocabulary confirmed in the one tree that already consumes it
 * (clients-team/clientCardSystem.ts, WorkoutLogger styles): accent, panel
 * radius, row radius. Deliberately small — a bridge that invents world tokens
 * the engine does not emit is a fallback that never resolves.
 */
export const userDashboardWorldTokens = {
  /** Primary accent — the lens's chosen highlight. */
  accent: 'var(--world-accent, var(--accent-primary, #60C0F0))',
  /** Panel corner radius. */
  panelRadius: 'var(--world-panel-radius, var(--swan-card-radius, 18px))',
  /** Row/list-item corner radius. */
  rowRadius: 'var(--world-row-radius, var(--swan-card-radius, 12px))',
} as const;

export type UserDashboardWorldTokens = typeof userDashboardWorldTokens;
