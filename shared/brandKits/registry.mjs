/**
 * registry.mjs — resolving a workspace to a brand kit. BEHAVIOUR, not data.
 * ============================================================================
 *
 * ── THE REFUSAL THIS FILE EXISTS FOR ───────────────────────────────────────
 * `workspaceId` used to be free text. Any string was accepted, tagged onto the
 * asset, and forgotten. That meant a typo — `swanstudio`, `swan-studios`,
 * `SwanStudios` — silently produced a render under whatever defaults happened to
 * apply, filed under a workspace that does not exist, and nothing ever said so.
 * The asset looked fine. It was simply filed and styled wrongly, forever.
 *
 * So an unknown workspace is a REFUSAL with the known ids in the message, not a
 * fallback to the default. Falling back would be the same silent-wrong-answer
 * failure the tri-state capability work in this codebase already paid for once:
 * the dangerous outcome is not an error, it is a plausible result nobody checks.
 *
 * ── WHO WINS: THE KIT OR THE CALLER ────────────────────────────────────────
 * A kit supplies the law profile and the style defaults. An explicit
 * `lawProfile` on the request still wins, because there are legitimate reasons
 * to render Swan work under `universal` (an experiment, a client mock) — but the
 * resolved result RECORDS which one was used and whether it was overridden, so
 * "why did this render ignore the gold rule" is answerable from the asset rather
 * than from memory.
 */

import { createHash } from 'node:crypto';
import { BRAND_KITS, BRAND_KIT_IDS, DEFAULT_BRAND_KIT } from './catalogue.mjs';

/**
 * A content hash of the kit, carried on every asset it renders.
 *
 * Kits are mutable code objects — adding one is a one-object edit, and so is CHANGING
 * one. Without this, every historical asset tagged `swanstudios` would point at whatever
 * that name means TODAY, and "why does this render not match its label" would have no
 * answer. The label says which kit; the hash says which VERSION of it.
 */
const kitHash = (kit) => createHash('sha256')
  .update(JSON.stringify([kit.id, kit.lawProfile, kit.paletteWords, kit.styleAnchors, kit.negativeSlot ?? null]))
  .digest('hex').slice(0, 12);

export class BrandKitError extends Error {
  constructor(code, message) { super(message); this.name = 'BrandKitError'; this.code = code; }
}

/** Every kit, shaped for a picker. Ids and names only — the prompt material stays server-side. */
export function listBrandKits() {
  return BRAND_KIT_IDS.map((id) => ({
    id, name: BRAND_KITS[id].name, lawProfile: BRAND_KITS[id].lawProfile,
    aspectDefault: BRAND_KITS[id].aspectDefault,
    isDefault: id === DEFAULT_BRAND_KIT,
  }));
}

/**
 * Resolve a brand-kit id to its kit.
 *
 * ── WHY THIS IS NOT `workspaceId` ──────────────────────────────────────────
 * The first draft made the workspace id select the kit, and the existing test
 * suite immediately refused every request: callers already pass workspace ids
 * like `ws-1` as a FILING label, and there is no art direction by that name.
 * Two different concepts had been merged. A brand kit is art direction — small,
 * curated, reviewed like code, and therefore a strict allowlist. A workspace id
 * is a label saying which project an asset belongs to, and demanding that every
 * label be pre-declared in source would make filing an asset a code change.
 * They stay separate fields, each meaning one thing.
 *
 * `undefined` takes the default — the single-site case, which is most of them.
 * An id that is PRESENT but unknown is refused: the caller believed they were
 * selecting something, and silently giving them something else is the
 * plausible-wrong-answer failure this codebase has already paid for once.
 */
export function resolveBrandKit(brandKitId, { lawProfile } = {}) {
  const id = brandKitId === undefined || brandKitId === null || brandKitId === ''
    ? DEFAULT_BRAND_KIT
    : String(brandKitId);

  const kit = BRAND_KITS[id];
  if (!kit) {
    throw new BrandKitError('E_UNKNOWN_BRAND_KIT',
      `No brand kit named "${id}". Known brand kits: ${BRAND_KIT_IDS.join(', ')}. `
      + 'Nothing was generated and nothing was spent.');
  }

  const overridden = Boolean(lawProfile) && lawProfile !== kit.lawProfile;
  return {
    brandKit: id,
    name: kit.name,
    // The caller's explicit choice wins, and the fact that it did is recorded.
    lawProfile: lawProfile || kit.lawProfile,
    lawProfileFromKit: kit.lawProfile,
    lawProfileOverridden: overridden,
    aspectDefault: kit.aspectDefault,
    paletteWords: kit.paletteWords,
    styleAnchors: kit.styleAnchors,
    negativeSlot: kit.negativeSlot ?? null,
    isDefault: id === DEFAULT_BRAND_KIT,
    kitHash: kitHash(kit),
  };
}

/**
 * Fold a kit's art direction into a brief.
 *
 * Additive and idempotent-ish by construction: the operator's own words lead, and
 * the kit's language follows. The reverse order reads as the brand describing a
 * subject rather than a subject rendered in the brand, and diffusion models weight
 * the front of a prompt heavily — so the order here is doing real work, not
 * cosmetics. A kit with nothing to say (`universal`) returns the text untouched
 * rather than appending empty joins.
 */
export function applyBrandKit(text, kit) {
  const base = String(text || '').trim();
  if (!kit || (!kit.styleAnchors?.length && !kit.paletteWords?.length)) return base;
  const parts = [base, ...(kit.styleAnchors || []), ...(kit.paletteWords || [])].filter(Boolean);
  return parts.join('. ').replace(/\.\.+/g, '.');
}

/**
 * The shape a client is allowed to see. Ids, names and which law profile applied —
 * never the style anchors or palette words, which are the prompt material and stay
 * server-side for the same reason compiled prompts do.
 */
export function brandKitView(kit) {
  if (!kit) return null;
  return {
    id: kit.brandKit,
    name: kit.name,
    lawProfile: kit.lawProfile,
    lawProfileFromKit: kit.lawProfileFromKit,
    lawProfileOverridden: kit.lawProfileOverridden,
    isDefault: kit.isDefault,
    kitHash: kit.kitHash,
  };
}
