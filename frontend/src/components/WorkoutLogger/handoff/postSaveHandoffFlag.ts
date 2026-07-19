/**
 * postSaveHandoffFlag.ts — Slice-1 feature gate for the Post-Save Handoff.
 * The handoff ships DARK: the component is built + tested but only mounts where the shell
 * checks this flag (Slice 2 wiring). Default OFF so a stray import can never surface it in prod.
 * Flip via VITE_ENABLE_POST_SAVE_HANDOFF=true.
 */
export const isPostSaveHandoffEnabled = (): boolean => {
  try {
    return String(import.meta.env?.VITE_ENABLE_POST_SAVE_HANDOFF ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
};
