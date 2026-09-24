/**
 * FILE: coachWorkspaceFlag.ts
 * PURPOSE: Which coach surface mounts at /dashboard/:role/coach-assistant.
 *
 * v4 Coach Workspace is the default. Two exits, both deliberate:
 *  - build time: VITE_COACH_WORKSPACE_V4=false ships the legacy Command Center
 *    (a Render env flip + redeploy is the rollback; no code change needed);
 *  - per visit: `?coachLegacy=1` opens the legacy page for one comparison or a
 *    support call. It is read from the URL only and never persisted.
 * Deep links the legacy page owns (review workspaces, Plaud intake) keep working
 * in v4 because the workspace opens the same review panel for them.
 */

type FlagEnv = { VITE_COACH_WORKSPACE_V4?: string | boolean | undefined };

export function coachWorkspaceV4Enabled(env: FlagEnv, search: string): boolean {
  const params = new URLSearchParams(search);
  const legacy = params.get('coachLegacy');
  if (legacy === '1' || legacy === 'true') return false;
  const raw = env.VITE_COACH_WORKSPACE_V4;
  if (raw === false) return false;
  if (typeof raw === 'string' && ['false', '0', 'off'].includes(raw.trim().toLowerCase())) return false;
  return true;
}
