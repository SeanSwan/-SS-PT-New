/**
 * plannerLensFlag.ts — S19 feature gate for the Planner Lens fleet
 * (JARVIS blueprint §5/§6.6). Default OFF: only `studio-classic` exists and
 * no switcher renders. Flip via VITE_ENABLE_PLANNER_LENS_STYLES=true.
 * Gate to flip: conformance suite green across every registered lens.
 */
export const isPlannerLensStylesEnabled = (): boolean => {
  try {
    return String(import.meta.env?.VITE_ENABLE_PLANNER_LENS_STYLES ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
};
