/**
 * SocialPostGenerator.outcome — turning a publish response into something a
 * human can act on.
 * ============================================================================
 * Extracted from SocialPostGenerator.tsx to keep that component under the
 * 300-line rule, and because this is the part worth testing on its own: it is
 * pure, and it is where the composer decides whether to trust the server.
 *
 * The history matters. The publish route used to hardcode `success: true`, so a
 * post where every platform failed reported success — and the composer cleared
 * the caption on success, destroying the draft for something that never went
 * out. The rule encoded here is that a failure must say WHICH platform failed
 * and WHY, and must reassure that the draft survived, because "failed to
 * publish" with an empty composer is the worst possible pairing.
 */

export type PublishFailure = {
  status?: string;
  message?: string;
  compliance?: { blockers?: string[] };
  data?: { results?: Array<{ provider?: string; status?: string; error?: string }> };
};

/** Name which platforms failed and why — a bare "failed to publish" is unactionable. */
export const describeFailure = (body: PublishFailure): string => {
  if (body?.status === 'blocked') {
    const first = body.compliance?.blockers?.[0];
    return first
      ? `Not published — compliance: ${first}`
      : 'Not published — content did not pass the compliance gate.';
  }
  const failures = (body?.data?.results || []).filter(r => r?.status !== 'published');
  if (failures.length) {
    const detail = failures.map(f => `${f.provider || 'account'}: ${f.error || 'failed'}`).join(' · ');
    return body?.status === 'partial_failed'
      ? `Partly published. Your draft is kept. Failed — ${detail}`
      : `Not published. Your draft is kept. ${detail}`;
  }
  return body?.message || 'Not published. Your draft is kept.';
};

/**
 * Only call it a network error when it actually was one. Axios rejects any
 * non-2xx, so a 422 compliance refusal arrives through the caller's catch —
 * reporting that as "Network error" would be the same class of lie the publish
 * -truth work exists to remove.
 */
export const describeThrown = (err: unknown): string => {
  const body = (err as { response?: { data?: PublishFailure } })?.response?.data;
  if (body) return describeFailure(body);
  return 'Network error. Native publisher did not respond — your draft is kept.';
};
