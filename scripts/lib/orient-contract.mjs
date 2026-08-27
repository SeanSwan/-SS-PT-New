/**
 * orient-contract.mjs — v3. The ONE definition of the ORIENT block.
 * =================================================================
 * Written by `scripts/orient.mjs`, read by `scripts/hooks/orient-gate.mjs`. One definition,
 * two importers: a writer and a reader with separate copies of a format drift apart, and the
 * failure is silent in the worst direction — the gate quietly stops recognising valid blocks
 * while still appearing to enforce. That is how Rule 57 died the first time.
 *
 * WHY v3 REPLACED THE DUAL-TIER SUMMARY (Sean, 2026-08-27; two independent GLM 5.3 reviews):
 * the plain-English/technical split could never satisfy the requirement. BOTH tiers describe
 * the DELTA at two altitudes; NEITHER states the INVARIANT — which project this is and where
 * in it we are. Sean was not misreading good summaries; he was missing an index, and altitude
 * cannot cure an indexing failure.
 *
 * RETIRED ON *WRONG TARGET*, NEVER ON FIRE RATE. The old gate measured 6.3% raw / 5.9% cleaned
 * against a pre-registered 15% kill threshold, and stayed a KEEP at every clustering window
 * tested (1/5/10/30/60 min). Retiring it for "firing too much" would have been false, and
 * would have voided the value of pre-registration for every future gate. The honest ground is
 * that it enforced the wrong requirement accurately.
 *
 * THE BLOCK:
 *   <project> · <branch>@<sha7> · <step> · [OK|WIP|BLOCK] · <L|F>
 *   ASK   what Sean asked for                    light + full
 *   WHY   why it matters                                full
 *   DONE  what is finished                              full
 *   NOW   where the work stands                  light + full
 *   PROOF current-session evidence                      full
 *   NEXT  where it goes next                     light + full
 *
 * Everything on the identity line is DERIVED. The gate recomputes it and compares, so it
 * cannot be typed into existence — including the SIZE MARKER, which lets the gate catch a
 * turn that emitted the light block when the work deserved the full one.
 */

export const LIGHT_FIELDS = ['ASK', 'NOW', 'NEXT'];
export const FULL_FIELDS = ['ASK', 'WHY', 'DONE', 'NOW', 'PROOF', 'NEXT'];

/**
 * Per-field budgets. Floors exist to kill empty theater — the failure mode where a field is
 * present, the regex is satisfied, and the content is "done" or "in progress". A floor of 12
 * excludes the longest common vacuous literal before the blacklist even fires. Caps keep a
 * field to one unwrapped terminal line, so one glance reads one field.
 */
export const BUDGET = {
  ASK: [12, 140], WHY: [12, 200], DONE: [12, 150],
  NOW: [12, 140], PROOF: [16, 240], NEXT: [12, 140],
};

/**
 * Content that satisfies a length check while telling Sean nothing. Matched against the whole
 * trimmed field, so a field that merely CONTAINS "done" is fine — only one that IS a vacuous
 * phrase is rejected. Deliberately short: a long blacklist becomes a game of synonyms, and the
 * real defence against theater is PROOF token verification, not word policing.
 */
export const VACUOUS_RE =
  /^(n\/?a|tbd|none|done|ok|pending|in progress|see above|as before|same as (last|above)|unchanged|various|misc|stuff|things|updated?|fixed|wip|—|-)\.?$/i;

/**
 * PROOF must carry at least one token a machine can check: a short sha, a path, a test count,
 * or an exit-status claim. This is the single field where theater is MECHANICALLY detectable,
 * so it is where the teeth go. The gate verifies the tokens it can (sha reachable in git log,
 * path exists on disk); the pattern only decides whether a checkable claim was made at all.
 */
export const PROOF_TOKEN_RE =
  /\b([0-9a-f]{7,40})\b|(\S+\/\S+\.\w{1,5})|(\b\d+\s*\/\s*\d+\b)|(\b\d+\s+(?:passed|failed|tests?)\b)|(\bexit\s*(?:code\s*)?\d+\b)/i;

/**
 * How far into a message the block may sit. Wide enough for a fenced FULL block (fence + 6
 * rows + fence), tight enough that a block QUOTED later in a report is out of scope — reports
 * legitimately quote earlier blocks, and a stale quotation must never be read as this turn's
 * header. Scoping also enforces "the summary comes first" positionally rather than by asking.
 */
export const ORIENT_WINDOW_LINES = 12;

/**
 * Identity line. Captures branch, sha, status and size marker; all four are recomputed.
 *
 * The size marker is anchored to END OF LINE with a permissive gap after the status, because
 * segments can legitimately sit between them — `· no-ledger` is emitted when no ledger could be
 * resolved. An earlier version demanded the marker IMMEDIATELY after the status, so a degraded
 * but perfectly honest block was unparseable and the gate rejected it as absent. That defeated
 * the whole point of degrading gracefully: the moment several agents each had a ledger, the
 * read path correctly refused to guess whose it was, and every block became unparseable.
 * Greedy `[^\n]*` plus the `$` anchor means the LAST `· <L|F>` wins, which is where it lives.
 */
export const ORIENT_RE =
  /^[^\n]{1,160}·[ \t]*(\S+)@([0-9a-f]{7}|NONE)[ \t]*·[^\n]*\[(OK|WIP|BLOCK)\][^\n]*·[ \t]*([LF])[ \t]*$/m;

/** Reason codes. Stable strings: they appear in telemetry and in the gate's block text. */
export const CODE = {
  ABSENT: 'ORIENT-ABSENT',
  FIELDS: 'ORIENT-FIELDS-MISSING',
  BUDGET: 'ORIENT-BUDGET',
  VACUOUS: 'ORIENT-VACUOUS',
  STALE: 'ORIENT-STALE',
  WRONG_PROJECT: 'ORIENT-WRONG-PROJECT',
  SIZE: 'ORIENT-SIZE-MISMATCH',
  CARRIED: 'ORIENT-CARRIED-COPY',
  PROOF: 'ORIENT-UNVERIFIABLE-PROOF',
};

/**
 * Parse the opening of a message. Returns null when no identity line is present.
 * Pure and synchronous — called on every turn by the gate and by `orient.mjs --check`.
 */
export function parseOrient(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  const opening = lines.slice(0, ORIENT_WINDOW_LINES).join('\n');
  const m = opening.match(ORIENT_RE);
  if (!m) return null;

  const fields = {};
  for (const line of opening.split('\n')) {
    const f = line.match(/^\s{0,3}(ASK|WHY|DONE|NOW|PROOF|NEXT)\s+(\S.*?)\s*$/);
    if (f && fields[f[1]] === undefined) fields[f[1]] = f[2];
  }
  return { branch: m[1], sha: m[2], status: m[3], size: m[4], fields };
}

/**
 * Shape validation: required fields, budgets, vacuity, and whether PROOF makes a checkable
 * claim. Returns [] when clean. Deliberately excludes anything needing git or the filesystem —
 * those live in the gate so this stays pure and trivially testable.
 */
export function validateShape(claim) {
  if (!claim) return [{ code: CODE.ABSENT, detail: 'no identity line in the opening window' }];
  const problems = [];
  const required = claim.size === 'F' ? FULL_FIELDS : LIGHT_FIELDS;

  const missing = required.filter((f) => !claim.fields[f]);
  if (missing.length) problems.push({ code: CODE.FIELDS, detail: `missing: ${missing.join(', ')}` });

  for (const f of required) {
    const v = claim.fields[f];
    if (!v) continue;
    if (VACUOUS_RE.test(v.trim())) {
      problems.push({ code: CODE.VACUOUS, detail: `${f} says "${v}" — that is a placeholder, not an answer` });
      continue;
    }
    const [min, max] = BUDGET[f];
    if (v.length < min) problems.push({ code: CODE.BUDGET, detail: `${f} is ${v.length} chars, floor is ${min} — too short to carry meaning` });
    else if (v.length > max) problems.push({ code: CODE.BUDGET, detail: `${f} is ${v.length} chars, cap is ${max} — it wraps, so it stops being scannable` });
  }

  if (required.includes('PROOF') && claim.fields.PROOF && !PROOF_TOKEN_RE.test(claim.fields.PROOF)) {
    problems.push({
      code: CODE.PROOF,
      detail: 'PROOF contains no checkable token (a sha, a file path, a test count, or an exit status). '
        + 'Evidence that cannot be checked is an assertion.',
    });
  }
  return problems;
}

/** Stable hash of the authored, per-turn content — the carried-copy detector's input. */
export function contentHash(claim, createHash) {
  const f = claim?.fields ?? {};
  return createHash('sha256')
    .update(`${f.NOW ?? ''} ${f.NEXT ?? ''} ${f.DONE ?? ''}`)
    .digest('hex')
    .slice(0, 16);
}
