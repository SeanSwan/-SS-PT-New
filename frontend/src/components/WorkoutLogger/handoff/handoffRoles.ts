/**
 * handoffRoles.ts — fail-closed guards shared by the Post-Save Handoff UI.
 * Trainer-indispensability + open-redirect defense: treat anything not PROVABLY a
 * trainer/admin as a non-trainer, and only navigate to internal absolute paths.
 */
const TRAINER_ROLES = new Set(['trainer', 'admin']);

export const isTrainerRole = (role?: string | null): boolean =>
  TRAINER_ROLES.has(String(role ?? '').toLowerCase());

/** Internal path only: starts with a single "/", never "//" (protocol-relative) or "javascript:". */
export const isInternalHref = (href?: string | null): boolean =>
  typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');
