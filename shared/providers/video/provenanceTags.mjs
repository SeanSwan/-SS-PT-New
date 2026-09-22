/**
 * provenanceTags.mjs — how a field's value came to be believed.
 *
 * ── WHY THIS IS ITS OWN MODULE ──────────────────────────────────────────────
 * `PROVENANCE` lived in `catalogue.mjs` until the hosted rows arrived. Once
 * `catalogueHosted.mjs` needed the tags, importing them from `catalogue.mjs` while
 * `catalogue.mjs` imported the hosted rows back created a cycle whose failure mode
 * is a temporal-dead-zone crash at import — and it would have fired only when both
 * files were loaded, which is to say only in production.
 *
 * The tags are the one thing both catalogue halves genuinely share, so they live
 * where both can reach them without either owning the other.
 *
 * 'probed'    a `verify()` run confirmed it against the real endpoint
 * 'published' taken from the vendor's own documentation, unprobed
 * 'claimed'   assumed or inferred; treat as ABSENT when making decisions
 *
 * The distinction is load-bearing: 'published' is what a vendor says, 'probed' is
 * what the machine did. Only the second is evidence.
 */
export const PROVENANCE = Object.freeze({
  PROBED: 'probed',
  PUBLISHED: 'published',
  CLAIMED: 'claimed',
});
