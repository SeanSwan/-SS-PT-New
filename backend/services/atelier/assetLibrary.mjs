/**
 * assetLibrary.mjs — finding the work again.
 * ============================================================================
 *
 * ── THE GAP THIS CLOSES ────────────────────────────────────────────────────
 * Compose renders four candidates. One gets picked, bound to Motion, published.
 * The other three become rows in `media_assets` that nothing can list, filter or
 * reach — they exist, they cost GPU time, and they are invisible forever. Every
 * slice before this one made assets; none of them made them findable. A studio
 * you cannot search is a renderer with extra steps.
 *
 * ── WHAT IS SEARCHABLE, AND WHAT IS DELIBERATELY NOT ───────────────────────
 * Filters here run on REAL COLUMNS (owner, kind, approval status, date) and on
 * JSONB array containment for tags, which is the one JSONB operator that is
 * unambiguous across drivers and indexable with GIN. The tags already carry what
 * matters: the lane, the seed, the workspace label, the brand kit and its
 * content hash.
 *
 * FREE-TEXT PROMPT SEARCH IS NOT HERE, on purpose. The prompt lives inside the
 * `provenance` JSONB, and searching it needs either a promoted column or a
 * to_tsvector index — neither of which exists, and neither of which I can verify
 * from an environment with no Postgres. Shipping a query I cannot execute would
 * be the dormant-code failure this codebase has already paid for twice: it looks
 * like a feature and answers nothing. THE TRIGGER for adding it is a migration
 * that promotes the prompt to a column or adds the index; until then the honest
 * surface is the one below.
 *
 * ── NO INDEXES EXIST ON THIS TABLE ─────────────────────────────────────────
 * `MediaAsset` declares none. Every filter here is therefore a sequential scan,
 * which is fine at one operator's volume and is NOT fine later. Stated rather
 * than discovered: the trigger for adding `(owner_user_id, created_at)` and a
 * GIN index on `tags` is the first time this list feels slow, and that will
 * happen long before anyone thinks to look.
 *
 * ── PAGINATION IS A CURSOR, NOT AN OFFSET ──────────────────────────────────
 * House rule, and the right one: an offset re-reads rows and shifts under
 * concurrent inserts, so a new render arriving mid-scroll silently duplicates or
 * hides a row. The cursor is `createdAt|id` — the id breaks ties, because two
 * stills from one batch share a timestamp and a timestamp-only cursor drops one.
 *
 * ── AND IT SORTS AT THE CURSOR'S OWN PRECISION, WHICH IS THE SUBTLE PART ───
 * `created_at` is TIMESTAMPTZ with `DEFAULT now()` — Postgres stores MICROseconds.
 * A JavaScript Date holds MILLIseconds. So a cursor built from a row is already
 * truncated, and `created_at < cursor` then excludes every row inside the
 * remaining sub-millisecond window: rows OLDER than the cursor row but within the
 * same millisecond are silently skipped and never appear on any page.
 *
 * That is not a rare edge. A four-up Compose batch writes four rows inside one
 * millisecond, which makes the product's most common object — a batch — exactly
 * the thing this loses.
 *
 * Sorting and comparing both happen at `date_trunc('milliseconds', ...)`, so the
 * sort key is a value the cursor can represent EXACTLY. Within one millisecond
 * the ordering is then the id, which the cursor also carries, and the slice is
 * precise. The cost is that this wants an expression index —
 * `(owner_user_id, date_trunc('milliseconds', created_at) DESC, id DESC)` —
 * which joins the index note above rather than adding a new problem.
 */

import { ComposeError } from './composeLimits.mjs';
import { signPreviews } from './assetPreviews.mjs';


export const DEFAULT_PAGE = 24;
export const MAX_PAGE = 100;
/** Only these may be filtered on. An allowlist, so a typo is a refusal rather
 *  than a filter that silently matches everything. */
export const APPROVAL_STATUSES = Object.freeze(['draft', 'approved', 'published']);
// Mirrors MediaAsset's MEDIA_ASSET_KINDS. Copied rather than imported so this module
// stays free of the model (importing it drags in database config at load time) — and
// pinned by a drift test, because the first version of this list omitted `audio` and
// would have refused a legitimate filter on assets that already exist. A hand-kept
// mirror without a drift test is just a copy waiting to be wrong.
export const KINDS = Object.freeze(['video', 'image', 'audio']);

/** `createdAt|id`, base64 so it reads as opaque and nobody hand-edits it into a scan. */
export function encodeCursor(row) {
  if (!row) return null;
  const at = row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
  return Buffer.from(`${at}|${row.id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor) {
  if (!cursor) return null;
  let raw;
  try { raw = Buffer.from(String(cursor), 'base64url').toString('utf8'); } catch { raw = ''; }
  const at = raw.slice(0, raw.lastIndexOf('|'));
  const id = raw.slice(raw.lastIndexOf('|') + 1);
  const when = new Date(at);
  if (!at || !id || Number.isNaN(when.getTime())) {
    throw new ComposeError('E_BAD_CURSOR', 'That page cursor is not one this list issued. Start from the first page.');
  }
  return { createdAt: when, id };
}

/**
 * Build the query. Pure — no model, no database, no clock.
 *
 * Separated from execution precisely so it is provable without Postgres: a test can
 * assert the exact clause this returns. That is NOT the same as proving the clause
 * runs, and the difference is disclosed rather than blurred.
 */
export function buildAssetQuery(req = {}, { Op, fn, col, where: whereFn } = {}) {
  if (!req.userId) throw new ComposeError('E_BAD_OWNER', 'Listing assets requires an owner.');

  // ABSENT and ZERO are different questions. `Number(req.limit) || DEFAULT` conflated
  // them: a caller explicitly asking for 0 silently received 24. Absent means "your
  // default"; a provided value is clamped into range, never reinterpreted.
  const asked = req.limit === undefined || req.limit === null || req.limit === '' ? DEFAULT_PAGE : Number(req.limit);
  const limit = Number.isFinite(asked) ? Math.min(MAX_PAGE, Math.max(1, Math.floor(asked))) : DEFAULT_PAGE;
  const where = { ownerUserId: req.userId };

  if (req.kind !== undefined) {
    if (!KINDS.includes(req.kind)) {
      throw new ComposeError('E_BAD_FILTER', `kind must be one of ${KINDS.join(', ')}.`);
    }
    where.kind = req.kind;
  }
  if (req.status !== undefined) {
    if (!APPROVAL_STATUSES.includes(req.status)) {
      throw new ComposeError('E_BAD_FILTER', `status must be one of ${APPROVAL_STATUSES.join(', ')}.`);
    }
    where.approvalStatus = req.status;
  }

  // Tag containment. Each filter adds ONE tag the row must carry; they AND together,
  // which is what "brand X, filed under project Y" means to a person.
  const tags = [];
  if (req.brandKit) tags.push(`brandkit:${req.brandKit}`);
  if (req.workspaceId) tags.push(`workspace:${req.workspaceId}`);
  if (req.lane) tags.push(`lane:${req.lane}`);
  // Pinning a kit VERSION, not just its name — the reason the hash is on the row at all.
  if (req.brandKitHash) tags.push(`brandkit-hash:${req.brandKitHash}`);
  if (tags.length) where.tags = { [Op.contains]: tags };

  // The sort key, at the cursor's own precision. See the header: comparing a
  // microsecond column against a millisecond cursor silently eats same-millisecond
  // rows, which is every Compose batch.
  const sqlAware = Boolean(fn && col && whereFn);
  const msKey = sqlAware ? fn('date_trunc', 'milliseconds', col('created_at')) : 'createdAt';

  const after = decodeCursor(req.cursor);
  if (after) {
    where[Op.or] = [
      // Strictly older than the cursor's millisecond...
      sqlAware ? whereFn(msKey, { [Op.lt]: after.createdAt }) : { createdAt: { [Op.lt]: after.createdAt } },
      // ...or inside the same millisecond, after it by id.
      sqlAware
        ? { [Op.and]: [whereFn(msKey, after.createdAt), { id: { [Op.lt]: after.id } }] }
        : { createdAt: after.createdAt, id: { [Op.lt]: after.id } },
    ];
  }

  return {
    where,
    order: [[msKey, 'DESC'], ['id', 'DESC']],
    // One extra row is fetched and then dropped: that is how `hasMore` is known without
    // a second COUNT query over an unindexed table.
    limit: limit + 1,
    _pageSize: limit,
  };
}

/** The client-safe shape.
 *
 *  The raw `r2Key` is still withheld — but note honestly that `previewUrl` is a SigV4
 *  presigned GET, and the object key is in its path. So the earlier posture ("the storage
 *  key never leaves the server") no longer holds in full, and saying otherwise would be
 *  the confident-copy-outliving-the-code failure this lane keeps writing up. What a
 *  preview actually gives is a time-limited, revocable-by-expiry read of ONE object,
 *  which is the same trade the published-reference endpoint already makes — now made per
 *  row instead of per request. */
export function assetView(row, previewUrl = null) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const tag = (prefix) => {
    const hit = tags.find((t) => typeof t === 'string' && t.startsWith(`${prefix}:`));
    return hit ? hit.slice(prefix.length + 1) : null;
  };
  const seedTag = finiteOrNull(tag('seed'));

  return {
    id: row.id,
    kind: row.kind,
    mime: row.mime,
    width: row.width ?? null,
    height: row.height ?? null,
    // Same treatment as `seed` below, and for the same reason: a number the client cannot
    // read must arrive as null on purpose, never as NaN that JSON.stringify turns into null
    // silently. BIGINT comes back from Sequelize as a STRING to protect precision, so this
    // coercion is load-bearing rather than decorative. Unlike `seed` — which parses a
    // free-text tag and can genuinely see `seed:v2` — a typed column cannot hold garbage,
    // so this guard is unreachable today. It is here because the two fields sit in one
    // object literal, and a reader who finds one guarded and the other bare cannot tell
    // which is deliberate. That asymmetry is exactly the shape this subsystem gets bitten by.
    sizeBytes: finiteOrNull(row.sizeBytes),
    status: row.approvalStatus,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    // Lifted out of tags so a client never parses strings to answer "which brand made this".
    brandKit: tag('brandkit'),
    brandKitHash: tag('brandkit-hash'),
    workspaceId: tag('workspace'),
    lane: tag('lane'),
    // NaN IS NOT A NUMBER THE CLIENT CAN READ. `Number('v2')` is NaN and JSON.stringify
    // emits it as `null`, so a malformed tag arrived as a seed of null with nothing logged
    // and no error, and any attempt to reproduce that render lost its anchor silently.
    seed: seedTag,
    // The prompt, from frozen provenance. Truncated at write time by buildProvenance;
    // shown so a person can recognise their own work, which is the whole point of a library.
    // THE HASH OF THE BYTES THIS CARD IS SHOWING. Motion refuses to animate a frame whose
    // recorded hash is not the one the caller approved — "approval binds bytes, not words"
    // — so the caller has to be able to SAY which bytes it approved. Without this, an asset
    // in the library is a dead end: you can see it and never animate it.
    //
    // The tempting shortcut is to let the bind look up its own hash and skip the argument.
    // That would make the gate compare a value to itself and quietly delete the protection
    // it exists to provide. Publishing the hash keeps the check adversarial: if the row
    // changed between listing and binding, the server still refuses.
    //
    // Safe to expose — it is the content hash of the caller's own image on an owner-scoped
    // query, not a credential, and the storage key stays withheld.
    sha256: row.provenance?.artifact?.sha256 ?? null,
    prompt: row.provenance?.request?.prompt ?? null,
    promptTruncated: Boolean(row.provenance?.request?.promptTruncated),
    // A SHORT-LIVED SIGNED URL, or null. Null is a degraded card, never an error: one
    // object that will not sign must not cost the operator the whole page. The storage
    // key still never leaves the server — a signed URL is time-limited and opaque, which
    // is the same trade the published-reference endpoint already makes.
    previewUrl,
  };
}

/** A number the client can actually read, or null on purpose — never NaN, which
 *  `JSON.stringify` emits as `null` with nothing logged and no error. One helper so the
 *  fields that need it cannot drift apart. */
function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * List one page. `assetModel` is injected so every branch is testable without a database.
 */
export async function listAssets(req = {}, deps = {}) {
  const { assetModel, Op, fn, col, where, readUrl } = deps;
  if (!assetModel || !Op) throw new ComposeError('E_STORAGE_UNCONFIGURED', 'The asset store is not configured.');

  const q = buildAssetQuery(req, { Op, fn, col, where });
  const rows = await assetModel.findAll({ where: q.where, order: q.order, limit: q.limit });
  const page = rows.slice(0, q._pageSize);
  const hasMore = rows.length > q._pageSize;

  // PREVIEWS. Without them this is an index, not a library: a card showing "1920x1080"
  // asks a person to find their work by reading rather than by recognising it, which is
  // not how anyone looks for a picture.
  //
  // HOW they are signed — which object a card shows, per-row isolation, and telling a
  // broken signer apart from a broken object — lives in `assetPreviews.mjs`, and is
  // described there rather than in both places.
  const { previews, previewsUnavailable } = await signPreviews(page, readUrl);

  return {
    assets: page.map((r, i) => assetView(r, previews[i])),
    previewsUnavailable,
    hasMore,
    // Null when the page is the last one, so a client stops rather than re-requesting.
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
    pageSize: q._pageSize,
  };
}
