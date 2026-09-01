/**
 * assetKeyOwnership.mjs — may this row's key be signed?
 * ============================================================================
 *
 * Its own module because it has TWO consumers — the library's preview signer and the
 * publish/permalink signer — and the defect class this subsystem produces above all others
 * is a rule that exists in two places and is updated in one. Copying this predicate into
 * `publishAsset.mjs` would have been that defect, committed in the fix for it.
 */

/**
 * IS THIS KEY ONE THIS SYSTEM COULD HAVE WRITTEN FOR THIS ROW?
 *
 * Signing is a capability. `generateThumbnailUrl` presigns ANY key it is handed, with no
 * prefix restriction, and the URL goes to a browser. So the key has to be checked, and the
 * check has to be anchored to something the caller cannot choose.
 *
 * WHY A READER VALIDATES WHAT A WRITER STORED. `posterR2Key` on a video row is written by
 * nothing in this repository. It arrives as `...meta` spread from the body of
 * `POST /api/render-agents/jobs/:jobId/complete` (renderAgentRoutes.mjs:176) into
 * `completeJob`'s rest parameter and on into `MediaAsset` defaults, unvalidated —
 * `verifyObject` checks `r2Key` only. An enrolled agent can therefore store a key pointing
 * anywhere in the bucket, on a row it legitimately owns.
 *
 * THE TWO NAMESPACES THIS SYSTEM WRITES, each anchored to an id ON THE ROW:
 *
 *   atelier/stills/<ownerUserId>/...   persistStills.mjs:52 and stillThumbnail.mjs:35
 *   jobs/<jobId>/...                   r2KeyForJob (videoRenderJobService.mjs:55)
 *
 * MY FIRST VERSION OF THIS GOT IT WRONG IN BOTH DIRECTIONS, and both seats caught it.
 * It asked only "does the owner's id appear as SOME segment", which is
 *   - TOO STRICT: a legitimate video poster is `jobs/<jobId>/...` and carries no user id at
 *     all, so every properly-produced clip would have failed closed into the very grey box
 *     this slice exists to remove; and
 *   - TOO LOOSE: `jobs/7/frame.webp` passed for owner 7 even though that 7 is a JOB id in
 *     another tenant's namespace — precisely the signed URL the check exists to refuse.
 * A segment-anywhere test written against one writer's convention, applied to two writers.
 * The pair defect again, this time in the guard against it.
 *
 * Position matters, namespace matters, and the anchor is the row's own id — never a value
 * from the payload. `jobId` is a UUID, so it cannot collide with a numeric user id.
 *
 * Empty and relative segments are refused outright. S3 keys are opaque strings and do not
 * resolve `..`, so this is not traversal defence; it keeps the invariant simple enough to
 * state, which is worth more here than the case it excludes.
 *
 * FAIL CLOSED: an unrecognised key yields a placeholder. Trusting it yields a signed URL
 * for someone else's object. A new writer must use one of the two namespaces above.
 */
export function keyOwnedByRow(key, row) {
  if (typeof key !== 'string' || !key || !row) return false;
  const seg = key.split('/');
  if (seg.some((x) => !x || x === '.' || x === '..')) return false;

  if (seg.length >= 4 && seg[0] === 'atelier' && seg[1] === 'stills') {
    return row.ownerUserId !== null && row.ownerUserId !== undefined
      && seg[2] === String(row.ownerUserId);
  }
  if (seg.length >= 3 && seg[0] === 'jobs') {
    return row.jobId !== null && row.jobId !== undefined && seg[1] === String(row.jobId);
  }
  return false;
}
