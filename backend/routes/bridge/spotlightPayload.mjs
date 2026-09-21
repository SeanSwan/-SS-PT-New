/**
 * Spotlight ingest — payload normalisation and validation.
 *
 * WHY THIS IS ITS OWN MODULE. These rules were inline in `routes/bridge/bridgeIngestRoutes.mjs`,
 * which is a budgeted file (`06-bans.md` #50, 300 lines). Each of them has a hostile-review
 * history, and history is the reason they are written the way they are rather than the obvious
 * way — so they carry comment weight that a routing file should not. Nothing here touches
 * Express, the model, or the network: it is a pure function over a request body, which is also
 * what makes it testable without standing up the app.
 *
 * The boundary is the contract. `G0-SOURCE-EXCERPTS.md:54` bounds `itemId` at 36 and
 * `:109` declares `STRING(36), primaryKey`. The bounds below are the column's, not a new format.
 */

export const SPOTLIGHT_MAX_HEADLINE = 80;
export const SPOTLIGHT_MAX_DEK = 200;
export const SPOTLIGHT_MAX_CURATOR_NOTE = 140;
// `itemId` is the natural PRIMARY KEY (`SwanSpotlight.itemId STRING(36)`, G0-SOURCE-EXCERPTS.md:109)
// and the contract bounds it at 36 (`:54`). It is an IDENTITY, not display text: an over-long value
// is out of contract and must be REJECTED, never shortened to fit.
export const SPOTLIGHT_MAX_ITEM_ID = 36;
// `revision` is stored in an INTEGER column (SwanSpotlight.mjs:23). An out-of-range value passed
// validation and then failed at the column, so the bound is part of the contract.
export const SPOTLIGHT_MAX_REVISION = 2147483647;

/**
 * DISPLAY-TEXT normaliser: trims, and TRUNCATES to `max`.
 *
 * Truncation is correct for prose and WRONG for an identifier. The two were conflated once
 * (hostile review R5-02) and the result was two distinct itemIds — differing only past the 36th
 * character — collapsing onto a single primary key. Use `identity()` for anything that names a row.
 */
export const str = (value, max) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

/**
 * IDENTITY normaliser: trims, and REJECTS anything that does not fit rather than shortening it.
 *
 * Returns `{ok:false, reason}` for a missing or over-long value so the caller can answer 422
 * BEFORE the value reaches the model. Whitespace normalisation is preserved (the established
 * contract); the bound is the column's, not a new format — an over-long id is out of contract,
 * not a UUID that needs converting, and no format is imposed here beyond the documented length.
 */
export const identity = (value, max, label) => {
  if (typeof value !== 'string') return { ok: false, reason: `${label} is required.` };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: `${label} is required.` };
  if (trimmed.length > max) {
    return { ok: false, reason: `${label} must be at most ${max} characters.` };
  }
  return { ok: true, value: trimmed };
};

/**
 * Validate AND normalize. It returns the exact values the handler must persist, so validation
 * and persistence cannot disagree (hostile review D3 / F07).
 *
 * It used to return only `{ ok: true }`. Three consequences: `itemId` was bounded here but the
 * handler stored the RAW `req.body.itemId`; `revision` had no upper bound; and `retracted` was
 * truthiness-tested in the image branch but strict-compared for storage, so `retracted:"false"`
 * stored `false` while skipping the image. Coercing once, here, removes all three.
 */
export const validateSpotlightPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'Body must be a JSON object.' };
  }
  // Identity first, and bounded — never truncated (hostile review R5-02). `str()` would have
  // shortened an over-long id to 36 characters, silently aliasing two distinct items onto one row.
  const id = identity(body.itemId, SPOTLIGHT_MAX_ITEM_ID, 'itemId');
  if (!id.ok) return id;
  const itemId = id.value;
  if (!Number.isInteger(body.revision) || body.revision < 1) {
    return { ok: false, reason: 'revision must be a positive integer.' };
  }
  if (body.revision > SPOTLIGHT_MAX_REVISION) {
    return { ok: false, reason: `revision must be at most ${SPOTLIGHT_MAX_REVISION}.` };
  }
  const headline = str(body.headline, SPOTLIGHT_MAX_HEADLINE);
  if (!headline) return { ok: false, reason: 'headline is required.' };
  return { ok: true, value: { itemId, revision: body.revision, headline, retracted: body.retracted === true } };
};

/** Coerce an optional date field; an unparseable value is absent, never `Invalid Date`. */
export const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
