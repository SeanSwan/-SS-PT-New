/**
 * plannerTemplatesFlag.ts — S24 feature gates (JARVIS blueprint §6.6).
 * PLANNER_TEMPLATES default OFF (no template UI). ORG_SHARE is OWNER-GATED
 * and intentionally has NO frontend reader yet — enabling it is Sean's
 * explicit permissions/billing-adjacent decision, not an env flip.
 */
export const isPlannerTemplatesEnabled = (): boolean => {
  try {
    return String(import.meta.env?.VITE_ENABLE_PLANNER_TEMPLATES ?? '').toLowerCase() === 'true';
  } catch {
    return false;
  }
};
