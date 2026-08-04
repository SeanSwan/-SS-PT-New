/**
 * plannerIaV2Flag.ts — S16 feature gate for the Planner IA V2 command panel
 * (JARVIS blueprint §4.2). Ships DARK: the V2 panel is built + tested but
 * mounts only where the layout checks this flag. Default OFF so a stray
 * import can never surface it in prod. Flip via VITE_ENABLE_PLANNER_IA_V2=true.
 */
export const isPlannerIaV2Enabled = (): boolean => {
  try {
    return String(import.meta.env?.VITE_ENABLE_PLANNER_IA_V2 ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
};
