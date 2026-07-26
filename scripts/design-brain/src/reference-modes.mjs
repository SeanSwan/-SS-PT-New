/** Canonical external-reference mode taxonomy shared by docs and writers. */
export const REFERENCE_MODES = Object.freeze(['P', 'S', 'D', 'X']);
export const MODE_POLICY = Object.freeze({
  P: Object.freeze({ name: 'Probe', writes: 'probe.json', status: 'likely-permitted' }),
  S: Object.freeze({ name: 'Spec', writes: 'task-local-only', status: 'disabled-pending-gates' }),
  D: Object.freeze({ name: 'Doctrine', writes: 'sean-hand-edit-only', status: 'permitted-owned-evidence-only' }),
  X: Object.freeze({ name: 'Source-corpus', writes: 'blocked', status: 'blocked' }),
});
export const SPEC_CAPS = Object.freeze({ perTask: 1, perDay: 3, perQuarter: 40, perSurface30Days: 2 });
export const RETENTION_DAYS = Object.freeze({ probe: 90 });
export function assertCurrentReferenceMode(mode) {
  if (REFERENCE_MODES.includes(mode)) return mode;
  const error = new Error(`E_LEGACY_MODE_REFUSED: unsupported reference mode ${mode}`);
  error.code = 'E_LEGACY_MODE_REFUSED';
  throw error;
}