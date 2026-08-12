/**
 * entity-scope.mjs — the guardrail that decides WHO may be collected on.
 * ============================================================================
 * This is the most important file in swan-collect, and the smallest.
 *
 * THE PROBLEM IT SOLVES. "Search any person and pull all their posts" is two
 * products wearing one sentence. Collecting an ORGANISATION's or a PUBLIC
 * OFFICIAL's public statements is what a newsroom does, and it is well protected.
 * Aggregating everything a PRIVATE INDIVIDUAL ever posted is a dossier — that
 * carries privacy-tort, GDPR/CCPA and harassment-facilitation exposure, and it
 * would undercut the citation discipline the rest of the product is built on.
 *
 * The distinction cannot live in a policy document, because a policy document is
 * not in the call path. So it lives here, as a function that returns DENY, and
 * every collection run goes through it.
 *
 * PORTABILITY: zero imports, zero I/O, pure. Copy anywhere. The categories are
 * data, so a different app can supply its own registry without forking logic.
 *
 * DESIGN NOTE — fail-closed. `assertCollectable` denies anything it does not
 * positively recognise. A new category added upstream without updating this file
 * is refused rather than silently permitted. Given what is on the other side of a
 * wrong answer here, an unhelpful deny beats a permissive accept every time.
 *
 * @module swan-collect/core/entity-scope
 */

export class ScopeDenied extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * The allowlisted categories. Anything not on this list is denied.
 *
 * `public_figure` deliberately requires a CITATION — it is the only category
 * where the claim "this person is public" is a judgement rather than a fact, and
 * an unsourced judgement about a named person is exactly the thing that becomes a
 * defamation problem. Same rule the product already applies to left/right camp
 * labels on news organisations: no label without a citation.
 */
export const ENTITY_CATEGORIES = Object.freeze({
  organization: { requiresCitation: false, why: 'Institutional speech by a company, agency, or nonprofit.' },
  official: { requiresCitation: true, why: 'Accountability of public power. Cite the office held.' },
  brand_account: { requiresCitation: false, why: 'Commercial speech from a product or brand account.' },
  public_figure: { requiresCitation: true, why: 'Cite what makes this person a public figure.' },
});

export const CATEGORY_KEYS = Object.freeze(Object.keys(ENTITY_CATEGORIES));

/**
 * A citation must be a real http(s) source, not a hand-wave like "well known".
 *
 * HONEST SCOPE (Kimi K3 finding L1): this checks FORMAT, not CLAIM. It cannot
 * know whether the linked page actually establishes public-figure status — only
 * a human can. It is still worth having, because it forces the operator to
 * produce a locatable source instead of an assertion, and it makes the claim
 * auditable later. The user-facing wording below says so rather than implying
 * the citation was substantively verified.
 */
function citationIsUsable(citation) {
  if (typeof citation !== 'string') return false;
  const s = citation.trim();
  if (s.length < 12 || s.length > 2_048) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    // Align with safeHttpUrl in item.mjs, which rejects embedded credentials.
    // Two validators disagreeing about what a safe URL is invites the gap.
    return !u.username && !u.password;
  } catch {
    return false;
  }
}

/**
 * Strip control characters. Kimi K3 finding L5: `name` was trimmed but not
 * sanitized, and it reaches logs AND the user-facing `ScopeDenied.reason`, so a
 * newline or ANSI escape could forge log lines or corrupt terminal output.
 */
const stripControl = (s) => [...s].filter((c) => c.charCodeAt(0) > 31 && c.charCodeAt(0) !== 127).join('');

/**
 * Decide whether an entity may be collected on.
 *
 * Returns `{ allowed: true, entity }` or `{ allowed: false, code, reason }`.
 * Never throws for a denial — a denial is an expected outcome, not an exception.
 * Use `assertCollectable` when a throw is wanted at a call boundary.
 *
 * The `reason` is written to be shown to a user verbatim. "No results" with no
 * explanation trains people to think the tool is broken; "we only cover
 * organisations and public officials" teaches them what the tool is for.
 */
export function checkEntity(entity, { onDroppedHandle } = {}) {
  if (!entity || typeof entity !== 'object') {
    return { allowed: false, code: 'MALFORMED', reason: 'No entity was supplied.' };
  }

  const name = typeof entity.name === 'string' ? stripControl(entity.name).trim() : '';
  if (!name || name.length > 256) {
    return { allowed: false, code: 'MALFORMED', reason: 'An entity needs a name of 1-256 characters.' };
  }

  const category = entity.category;
  if (!Object.prototype.hasOwnProperty.call(ENTITY_CATEGORIES, category)) {
    return {
      allowed: false,
      code: 'OUT_OF_SCOPE',
      reason:
        'This tool covers organisations, public officials, brand accounts, and cited public figures. ' +
        'It does not build profiles of private individuals.',
    };
  }

  const rule = ENTITY_CATEGORIES[category];
  if (rule.requiresCitation && !citationIsUsable(entity.citation)) {
    return {
      allowed: false,
      code: 'CITATION_REQUIRED',
      // Wording is deliberately honest about what was checked (Kimi K3 L1): the
      // URL is format-checked only. Saying "requires a citation" full stop would
      // imply the system verified the claim, which it cannot.
      reason:
        `Category '${category}' requires a citation URL — format-checked only; ` +
        `a human must confirm it supports the claim. ${rule.why}`,
    };
  }

  return {
    allowed: true,
    entity: {
      name,
      category,
      // Bound the citation even where it is optional. Every other field is
      // capped; leaving this one unbounded made it the exception (Kimi K3 L1).
      citation: rule.requiresCitation
        ? entity.citation.trim()
        : (typeof entity.citation === 'string' ? stripControl(entity.citation).trim().slice(0, 2_048) || null : null),
      handles: sanitizeHandles(entity.handles, { onDropped: onDroppedHandle }),
    },
  };
}

/**
 * Normalize the per-source handles map ({ bluesky: 'reuters.com', youtube: 'UC…' }).
 *
 * CONSUMER CONTRACT (Kimi K3 finding L5): the allowed charset includes `.`, so
 * `..` passes. That is safe ONLY because every adapter today places handles in
 * QUERY parameters via URLSearchParams / URL, never in a path segment. Any future
 * adapter that interpolates a handle into a path MUST `encodeURIComponent` it, or
 * it reintroduces traversal.
 */
export function sanitizeHandles(handles, { onDropped } = {}) {
  if (!handles || typeof handles !== 'object') return {};
  // Null prototype (Kimi K3 L2): `__proto__` matches the source-key regex, and
  // assigning it on a normal object literal is a silent no-op that then reads
  // back as Object.prototype — a phantom handle rather than a stored one.
  // `constructor` would shadow instead. A null-prototype object stores both as
  // ordinary keys, so what goes in is what comes out.
  const out = Object.create(null);
  const drop = (source, why) => { if (typeof onDropped === 'function') onDropped(source, why); };

  for (const [source, value] of Object.entries(handles)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(source)) { drop(source, 'source key is not a lowercase slug'); continue; }
    if (typeof value !== 'string') { drop(source, 'value is not a string'); continue; }
    const v = value.trim();
    if (!v || v.length > 2_048) { drop(source, 'value is empty or over 2048 chars'); continue; }

    // TWO legitimate handle shapes, because sources genuinely differ:
    //   identifier — reuters.com, @user@host, UC… channel ids
    //   http(s) URL — a feed address (the RSS adapter takes a whole URL)
    // Found 2026-08-11 by a live run: `--rss https://feeds.npr.org/...` was
    // SILENTLY dropped because a URL's "/" is outside the identifier charset,
    // so the source never ran and nothing reported it. A silent drop is the
    // worst failure shape here — the operator believes a source is covered when
    // it is not.
    if (/^[A-Za-z0-9._:@-]{1,256}$/.test(v)) { out[source] = v; continue; }
    if (isSafeFeedUrl(v)) { out[source] = v; continue; }

    drop(source, 'value is neither an identifier nor a safe http(s) URL');
  }
  return out;
}

/** http(s) only, no credentials — the shape a feed-style handle may take. */
function isSafeFeedUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Throwing wrapper for call boundaries where a denial should stop the run. */
export function assertCollectable(entity) {
  const verdict = checkEntity(entity);
  if (!verdict.allowed) throw new ScopeDenied(verdict.reason, verdict.code);
  return verdict.entity;
}
