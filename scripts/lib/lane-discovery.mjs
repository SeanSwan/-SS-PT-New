/**
 * lane-discovery.mjs — COMPLETE discovery, reusing the one parser (Rule 67 v2.1)
 * =============================================================================
 * Purpose: answer "what does the ledger actually contain" without omission.
 * Boundary: read-only. No writes, no claims, no pruning, no retries, no second
 * Markdown parser — it imports `parseLane`/`identity` from lane-core.mjs, which
 * is the single implementation of ledger truth.
 *
 * WHY THIS EXISTS (Astra hostile review, 2026-09-20 — F01, HIGH):
 *   `digest` — the command every instruction file now points agents at as THE
 *   discovery path — CAPS ITS OUTPUT. Measured in `lane.mjs`:
 *     :234-235  lock paths per seat  capped at 5   (prints "… +N more")
 *     :237      live lanes           capped at 6
 *     :221-227  sibling lanes        capped at SIBLING_CAP
 *     :174      still-locked warning capped at 5
 *   So an agent asking "is my file locked?" could be shown a TRUNCATED list and
 *   conclude the file was free. This module has no caps: every enumerated entry
 *   produces a record, every parsed claim is preserved, and `entries === records
 *   === lanes.length` is asserted rather than hoped for.
 *
 * WHY `identity` IS CALLED, NOT INJECTED: the blueprint's S2 checkpoint refuses
 * normalized-object mocks and canned JSON, and requires the REAL integrated
 * parser and identity resolver. So the self record is derived here by calling the
 * same `identity()` that every other command uses. There is deliberately no `fs`
 * seam either: both filesystem failure classes the contract needs are inducible
 * against the real filesystem — measured on this machine, a directory named
 * `*.lane.md` makes `readFileSync` throw EISDIR, and a missing ledger directory
 * makes `readdirSync` throw ENOENT. A real failure beats a mocked one, and an
 * injection point with no caller is just untested surface.
 *
 * ONE seam does exist, and it is `parse`, because `parseLane` is TOTAL: no real
 * lane file can make it throw. The contract still requires a parse failure to be
 * REPRESENTED rather than to crash the response, and a requirement that cannot be
 * exercised cannot be shown to hold. So the seam is injected in exactly one test,
 * labelled as the mock it is, and the default remains the real parser.
 *
 * REAL-DATA NOTES, measured 2026-09-21 against the live ledger (87 lanes) before
 * fixing these semantics — the package warns that "template conformity alone does
 * not certify real records", and it was right:
 *   - 77/87 carry a `Updated:` field; 10 do not. A MISSING timestamp is therefore
 *     treated as `freshness: 'unknown'` and does NOT make the response
 *     incomplete, or the command could never return `complete` on this repo and
 *     would be useless as clearance. An INVALID or FUTURE one does make it
 *     incomplete: the content cannot be trusted, so clearance must not be
 *     granted on it.
 *   - Of those 10, **8 write the field markdown-bold** (`**Updated:** …`) and 8
 *     likewise write `**Status:** …`. A bare anchored regex misses all of them —
 *     see `fieldOf`, which was added after a hostile pass on this very module
 *     caught the under-report. 2 lanes have no timestamp at all, which is the
 *     genuinely-missing case.
 *   - Statuses in the wild include `handoff-ready` and `awaiting-sean`, which are
 *     not in the contract enum. They map to `null` (unknown), never to a guessed
 *     keyword — and an unknown status is NOT idle, so its locks stay visible.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { identity, ledgerDir, parseLane } from './lane-core.mjs';

export const STALE_AFTER_MINUTES = 30;
export const SCHEMA_VERSION = 1;
/** Guard against unbounded output; the whole point is that nothing is dropped
 *  silently, so exceeding this is reported as an error rather than truncated. */
export const OUTPUT_LIMIT_BYTES = 4 * 1024 * 1024;

const STATUSES = ['in-progress', 'idle', 'awaiting-review', 'blocked'];

/** Map a raw Status line onto the contract enum, or null when unrecognised.
 *  A trailing annotation is the common hand-edited shape ("idle — round-4
 *  repairs…", "in-progress  (header refreshed…)"), so a delimiter is required
 *  after the keyword. Without that rule `handoff-ready` would not match — but a
 *  looser `startsWith` would have let `awaiting-sean` pass as `awaiting-review`,
 *  inventing a status the lane never declared. */
export function mapStatus(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  for (const k of STATUSES) {
    if (s === k) return k;
    if (s.startsWith(k) && /^[\s—–(\[]/.test(s.slice(k.length))) return k;
  }
  return null;
}

/** Classify a declared claim form. Only the forms the packet DEMONSTRATES are
 *  resolvable; anything else is ambiguous and must not clear a target.
 *  Preserves the original string — this classifies, it never rewrites.
 *
 *  Trailing `/` and `/**` reserve descendants. `dir/*` is NOT in that set: it
 *  matches direct children only, so treating it as a subtree would clear
 *  grandchildren the lane never claimed. Every other wildcard form, and any
 *  traversal, is ambiguous — uncertainty must never read as clearance. */
export function classifyLock(lock) {
  if (typeof lock !== 'string' || !lock.trim()) return 'ambiguous';
  const s = lock.trim();
  if (/(^|[\\/])\.\.([\\/]|$)/.test(s)) return 'ambiguous';   // traversal
  if (s.endsWith('/**') || s.endsWith('/')) return 'subtree';
  if (/[*?[\]]/.test(s)) return 'ambiguous';                  // any other wildcard form
  if (/[\\/]/.test(s)) return 'exact';
  return 'basename';
}

/** Freshness from the lane's own `Updated:` field. `nowMs` is captured ONCE per
 *  response by the caller, so two records can never be aged against different
 *  clocks inside one answer. */
export function freshnessOf(updatedAt, nowMs) {
  if (updatedAt === null || updatedAt === undefined) return 'unknown';
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t) || t > nowMs) return 'unknown';
  // Exactly 30 minutes old is FRESH; strictly greater is stale.
  return (nowMs - t) / 60000 > STALE_AFTER_MINUTES ? 'stale' : 'fresh';
}

const err = (code, laneFile, message) => ({ code, laneFile, message });

/**
 * Read a `Field: value` line, tolerating the markdown-bold wrapper that real
 * lanes actually use — `**Updated:** 2026-09-18 (…)`, `**Status:** in-progress`.
 *
 * WHY THIS IS NOT A PLAIN `^Updated:` REGEX: measured against the live ledger,
 * **8 of 87 lanes** write the field bold-wrapped, and a bare anchored regex
 * cannot see any of them. The consequence was silent and in the wrong
 * direction — those lanes reported `status: null` and `freshness: 'unknown'`,
 * i.e. the response looked *less* informed than the data warranted, and nothing
 * said why. Six of the eight carry a perfectly good timestamp (`Date.parse`
 * handles the trailing prose fine; `claude.lane.md` and `codex.lane.md` are
 * among them), so the value was present and readable all along.
 *
 * `parseLane` already tolerates markdown bold in `clean()`; this mirrors that
 * tolerance rather than inventing a second convention. It extracts two scalar
 * fields and does no section logic, so it does not duplicate the parser.
 */
export function fieldOf(src, name) {
  const m = src.match(new RegExp(`^\\*{0,2}${name}:\\*{0,2}[ \\t]*(.+)$`, 'm'));
  if (!m) return undefined;
  return m[1].trim().replace(/\*+$/, '').trim();
}

/**
 * Build one complete discovery response.
 *
 * Options:
 *   ledger           — ledger directory; defaults to `ledgerDir(cwd)`.
 *   cwd              — passed to the real identity resolver; defaults to process.cwd().
 *   resolveIdentity  — seam for the one case the real resolver cannot produce
 *                      (a session whose ownership is genuinely unknown). The
 *                      default IS the real resolver; a test that overrides it
 *                      must label that boundary.
 *   parse            — seam for LANE_PARSE_FAILED only. The default is the real
 *                      parser; see the header for why this one exists.
 *   now              — capture time, once per response.
 */
export function buildDiscovery(options = {}) {
  const {
    cwd = process.cwd(),
    now = Date.now(),
    resolveIdentity = identity,
    parse = parseLane,
  } = options;

  const generatedAt = new Date(now).toISOString();
  const errors = [];

  let ledger = options.ledger;
  if (!ledger) {
    try {
      ledger = ledgerDir(cwd);
    } catch {
      ledger = null;
    }
  }

  /* Self, resolved through the SAME resolver every other command uses. The lane
   * path is constructed from the resolved lane NAME, never by reading a `me:`
   * line back out of the digest text — a lane file may not exist yet on a fresh
   * session, and that is not an error. */
  let selfLaneFile = null;
  let selfIdentity = null;
  try {
    const me = resolveIdentity(cwd);
    if (me && me.laneName && ledger) {
      selfLaneFile = resolve(ledger, me.laneName);
      selfIdentity = `${me.agent}@${me.slug}`;
    }
  } catch {
    selfLaneFile = null;
    selfIdentity = null;
  }
  if (!selfLaneFile) {
    errors.push(err('IDENTITY_UNRESOLVED', null, 'the own-lane path could not be resolved'));
  }

  let names = [];
  let enumerationFailed = false;
  if (!ledger) {
    enumerationFailed = true;
    errors.push(err('ENUMERATION_FAILED', null, 'no ledger directory could be resolved'));
  } else {
    try {
      names = readdirSync(ledger).filter((f) => f.endsWith('.lane.md'));
    } catch {
      enumerationFailed = true;
      errors.push(err('ENUMERATION_FAILED', null, 'the ledger directory could not be enumerated'));
    }
  }

  const root = ledger ? resolve(ledger, '..', '..') : null;

  const lanes = names.map((name) => {
    const laneFile = resolve(ledger, name);
    const record = {
      laneFile,
      agentLabel: name.replace(/\.lane\.md$/, ''),   // DISPLAY ONLY — never an identity key
      updatedAt: null,
      status: null,
      task: null,
      locks: [],
      freshness: 'unknown',
      errors: [],
    };

    let src;
    try {
      src = readFileSync(laneFile, 'utf8');
    } catch {
      // The record still appears. An unreadable lane must not shrink the
      // apparent inventory — that is the same omission class as F01.
      record.errors.push(err('LANE_READ_FAILED', laneFile, 'the lane file could not be read'));
      return record;
    }

    let parsed;
    try {
      // The real parser is total, but the contract requires a parse failure to be
      // REPRESENTED rather than crash the whole response, so it is wrapped.
      parsed = parse(src, root);
    } catch {
      record.errors.push(err('LANE_PARSE_FAILED', laneFile, 'the lane file could not be parsed'));
      return record;
    }

    // RAW locks, not activeLocks(): an idle lane's claims stay visible. "Age
    // never removes locks" — and neither does status. Suppression here would
    // recreate the very hiding this command exists to end.
    record.locks = parsed.locks;
    record.task = parsed.task ?? null;

    const statusRaw = fieldOf(src, 'Status');
    record.status = mapStatus(statusRaw);

    const updatedRaw = fieldOf(src, 'Updated');
    if (updatedRaw === undefined) {
      // Absent is not invalid: 10 of 87 real lanes have no Updated field.
      record.freshness = 'unknown';
    } else {
      record.updatedAt = updatedRaw.trim();
      const t = Date.parse(record.updatedAt);
      if (Number.isNaN(t)) {
        record.freshness = 'unknown';
        record.errors.push(err('INVALID_TIMESTAMP', laneFile, 'the Updated field is not a parsable timestamp'));
      } else if (t > now) {
        record.freshness = 'unknown';
        record.errors.push(err('INVALID_TIMESTAMP', laneFile, 'the Updated field is in the future; not clamped'));
      } else {
        record.freshness = freshnessOf(record.updatedAt, now);
      }
    }

    for (const lock of record.locks) {
      if (classifyLock(lock) === 'ambiguous') {
        record.errors.push(err('AMBIGUOUS_PATH', laneFile, `claim form is not resolvable: ${lock.slice(0, 60)}`));
      }
    }
    return record;
  });

  // Stable code-unit ordering by absolute path. localeCompare would make the
  // order depend on the host's locale, so two agents could read different orders.
  lanes.sort((a, b) => (a.laneFile < b.laneFile ? -1 : a.laneFile > b.laneFile ? 1 : 0));

  for (const r of lanes) errors.push(...r.errors);

  const failedReads = lanes.filter((r) => r.errors.some((e) => e.code === 'LANE_READ_FAILED')).length;
  const enumeration = { entries: names.length, records: lanes.length, failedReads };

  let complete = !enumerationFailed && errors.length === 0;
  if (enumeration.entries !== enumeration.records) complete = false;   // asserted, not assumed

  const discovery = {
    schemaVersion: SCHEMA_VERSION,
    root,
    ledgerDir: ledger,
    generatedAt,
    staleAfterMinutes: STALE_AFTER_MINUTES,
    self: { laneFile: selfLaneFile, identity: selfIdentity },
    enumeration,
    complete,
    lanes,
    errors,
  };

  try {
    if (Buffer.byteLength(JSON.stringify(discovery), 'utf8') > OUTPUT_LIMIT_BYTES) {
      discovery.errors.push(err('OUTPUT_LIMIT', null, 'the discovery response exceeds the output limit'));
      discovery.complete = false;
    }
  } catch {
    // A response that cannot be serialized cannot be produced at all.
    return { discovery: null, exitCode: 1 };
  }

  return { discovery, exitCode: discovery.complete ? 0 : 2 };
}

/** Human-readable rendering of a discovery response. Complete by construction:
 *  every lane and every lock is printed, and the error list is never capped. */
export function renderDiscovery(discovery) {
  const out = [
    `[lane] discovery: ${discovery.lanes.length} lane(s) in ${discovery.ledgerDir}`,
    `[lane] complete=${discovery.complete ? 'yes' : 'NO'} · stale-after=${discovery.staleAfterMinutes}m · generated=${discovery.generatedAt}`,
    `[lane] self: ${discovery.self.identity ?? '(unresolved)'} → ${discovery.self.laneFile ?? '(unresolved)'}`,
  ];
  for (const l of discovery.lanes) {
    out.push(`[lane]   ${l.laneFile}`);
    out.push(`[lane]     status=${l.status ?? 'unknown'} freshness=${l.freshness} updated=${l.updatedAt ?? '—'}`);
    out.push(`[lane]     task: ${l.task ?? '—'}`);
    for (const lock of l.locks) out.push(`[lane]     🔒 ${lock}`);
    for (const e of l.errors) out.push(`[lane]     ! ${e.code}: ${e.message}`);
  }
  if (discovery.errors.length) {
    out.push(`[lane] ${discovery.errors.length} error(s) — discovery is INCOMPLETE; do not treat as clearance:`);
    for (const e of discovery.errors) out.push(`[lane]   ${e.code} ${e.laneFile ?? '(global)'} — ${e.message}`);
  }
  return out.join('\n');
}
