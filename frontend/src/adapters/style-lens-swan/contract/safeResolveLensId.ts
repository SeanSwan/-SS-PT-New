/**
 * Swan Lens — safe lens-id resolution + Apply announcement copy (S1-B / blueprint §7, F6).
 *
 * Pure helper SHIPPED for World-Engine Lane A to wire into the Apply handler (the handler and
 * `appearancePersistence` are Lane A's — Slice-1 does not call this from any Lane A file).
 *
 * Fail-closed model (blueprint §9.4): a NO safety-lens id is invented. On an unknown id the
 * resolution is `ok:false, lensId:null` — Lane A then keeps the persisted profile and renders
 * core-only (S1-C fallback), rather than swapping in a fabricated lens.
 */

export interface LensResolution {
  ok: boolean;
  /** The requested id when known; null when unknown (keep persisted profile, core-only render). */
  lensId: string | null;
}

export function safeResolveLensId(requestedId: unknown, knownIds: readonly string[]): LensResolution {
  if (typeof requestedId === 'string' && requestedId.length > 0 && knownIds.includes(requestedId)) {
    return { ok: true, lensId: requestedId };
  }
  return { ok: false, lensId: null };
}

/** Live-region announcements (a11y). Lane A writes these on Apply success / safe-fallback. */
export const ANNOUNCE_COPY = {
  success: (lensDisplayName: string): string => `Appearance applied: ${lensDisplayName}.`,
  fallback: "That style couldn't be applied safely, so the default look was restored.",
} as const;
