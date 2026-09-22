/**
 * normalizeResponse.mjs — flatten a vendor's response envelope into ONE shape.
 *
 * ── WHY THIS IS NOT IN `registry.mjs` ───────────────────────────────────────
 * It has nothing to do with which provider exists, whether it is enabled, or what
 * its licence permits. It is about the SHAPE a vendor's HTTP body happens to have,
 * which is a transport concern — and `registry.mjs` was over rule 4's 300-line cap
 * with it inlined. Extracted rather than truncated: every alternative in the
 * alternation below is a shape some real API actually returned, so shortening the
 * lists to the "obvious" ones is exactly how this breaks silently the next time a
 * vendor nests its payload one level deeper.
 *
 * `registry.mjs` re-exports both names, so every existing import path still works.
 */

function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || null;
}

/**
 * Flatten a provider's response envelope into one shape.
 *
 * RESTORED from the deleted service, near-verbatim. The long alternation lists
 * are not defensive padding — each alternative is a shape some real API actually
 * returned. Trimming them to the "obvious" ones is how this breaks silently the
 * next time a vendor nests its payload one level deeper.
 */
export function normalizeProviderResponse(data = {}) {
  const nested = data.data && typeof data.data === 'object' ? data.data : {};
  const output = data.output && typeof data.output === 'object' ? data.output : {};

  const providerJobId = firstString(data.id, data.jobId, data.taskId, nested.id, nested.jobId, output.id);
  const videoUrl = firstString(
    data.videoUrl, data.video_url,
    nested.videoUrl, nested.video_url,
    output.videoUrl, output.url,
  );
  const rawStatus = firstString(data.status, nested.status, output.status);

  return {
    providerJobId,
    videoUrl,
    // A URL present means done regardless of what the status field says; several
    // APIs return 'processing' alongside a finished asset.
    status: videoUrl ? 'completed' : (rawStatus || 'queued'),
    rawStatus,
  };
}

export { firstString };
