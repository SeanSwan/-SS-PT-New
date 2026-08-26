/**
 * atelierStatusMap.mjs — every refusal code the Atelier can throw, and its HTTP status.
 *
 * Split out of atelierComposeRoutes when that file reached its 300-line cap. It is pure
 * frozen data with no behaviour, which makes it the honest thing to move: the routes keep
 * their logic and this keeps the invariant it was written to hold — every code an Atelier
 * service can throw has a DELIBERATE status, not a default 400. A code missing from this
 * map is a bug the reader can see, which is the whole reason it is one table.
 */

/**
 * Error code -> HTTP status. Every refusal happens BEFORE a generator is
 * called, so these are statements about the request or about our own state.
 * Busy/unreachable responses carry Retry-After so a client backs off instead
 * of retrying into a doubled queue.
 */
export const STATUS = Object.freeze({
  E_EMPTY_BRIEF: 400,
  E_BRIEF_TOO_LONG: 413,
  E_BAD_LANE: 400,
  E_BAD_SOURCE: 400,
  E_BAD_LAW_PROFILE: 400,
  // A brand kit that does not exist. The caller believed they were selecting art
  // direction; giving them something else silently is the failure this refuses.
  E_UNKNOWN_BRAND_KIT: 400,
  // A workspace was named but no brand kit was. Defaulting there would reinstate the very
  // bug brand kits exist to fix, so the ambiguity is refused rather than guessed.
  E_BRAND_KIT_REQUIRED: 400,
  // The taste corpus is Swan-rated and cannot speak for another brand.
  E_TASTE_IS_SWAN_ONLY: 400,
  E_COMPILE: 400,
  E_LAW_VIOLATION: 400,
  E_CAPABILITY_UNVERIFIED: 400,
  E_TASTE_LOCAL_ONLY: 400,
  E_PRICE_UNKNOWN: 409,
  E_NO_LANE: 409,
  E_STILL_LANE_UNPROBED: 409,
  E_LOCAL_BUSY: 409,
  E_PROVIDER_DISABLED: 403,
  E_LICENCE_GRANT_REQUIRED: 403,
  E_SPEND_CEILING: 402,
  E_RUN_CAP: 429,
  E_PROVIDER_UNCONFIGURED: 503,
  E_COMFY_UNREACHABLE: 503,
  E_VRAM_BUSY: 503,
  E_LEDGER_DEGRADED: 503,
  // The ledger could not be WRITTEN. Distinct from degraded (could not be READ):
  // nothing has been spent yet, and proceeding would spend with no counter.
  E_LEDGER_UNWRITABLE: 503,
  E_TASTE_UNREACHABLE: 502,
  E_TASTE_BAD_RESPONSE: 502,
  E_ALL_FAILED: 502,
  E_LOCAL_RENDER: 502,
  E_TASTE_URL_NOT_LOOPBACK: 500,
  E_BAD_CAP: 500,
  E_STORAGE_UNCONFIGURED: 503,
  E_STILL_UNREADABLE: 502,
  E_ARTIFACT_HASH_MISMATCH: 502,
  E_ASSET_NOT_FOUND: 404,
  E_BIND_NO_ASSET: 400,
  E_BIND_NO_HASH: 400,
  E_BAD_OWNER: 400,
  E_BIND_ASSET_NOT_FOUND: 404,
  E_ASSET_NOT_IMAGE: 400,
  E_BIND_NO_RECORDED_HASH: 409,
  E_BIND_HASH_MISMATCH: 409,
  E_BAD_INPUT: 400,
  E_UNSUPPORTED_KIND: 400,
  E_IMAGE_FIRST_REQUIRED: 400,
  E_UNKNOWN_PROVIDER: 400,
  // Ticket codes are served by renderAgentRoutes; mapped here too so the invariant
  // 'every code the atelier services can throw has a deliberate status' stays simple.
  E_JOB_NOT_FOUND: 404,
  E_LEASE_CONFLICT: 409,
  E_BIND_NO_INIT_IMAGE: 400,
  E_BAD_STATUS: 400,
  E_BAD_TRANSITION: 409,
  E_PUBLISH_BLOCKED: 422,
  E_PUBLISH_DECLARATION_REQUIRED: 422,
  E_BATCH_NOT_FOUND: 404,
  E_BAD_BATCH_ID: 400,
});
