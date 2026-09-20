/*
 * validate.ts — payload-shape guards at the adapter seam (S1-H18).
 *
 * WHY THIS EXISTS. `LocalEngineAdapter.request` ended with `return body as T`,
 * an **unchecked cast**. A 200 whose body was not the contract therefore arrived
 * at the components looking exactly like a good reading, and `StatusBoard` —
 * which dereferences 13 top-level paths on its first ready render — threw during
 * render. In React 18 an uncaught render error unmounts the root, so the
 * operator's console went BLANK: no reading, no message, no clue which field was
 * wrong. `console/web/dist/` is a build artifact served by a separately
 * versioned bridge, so "the payload has a shape this build never saw" is a
 * supported upgrade state, not a hypothetical.
 *
 * WHAT THIS GUARDS, AND WHAT IT DELIBERATELY DOES NOT. Only the routes whose
 * payload a component actually dereferences are validated, which at S1 is
 * `/api/status` alone — `StatusBoard` is the only consumer in this slice. The
 * other eight routes return values no S1 component reads, so a validator for
 * them would be unexercised code asserting a contract nobody depends on yet.
 * They are listed as follow-ups in the S1 record rather than written blind.
 *
 * THE DRIFT DIRECTION IS SAFE. A shape declaration is a second statement of the
 * payload, which this repo treats as a hazard (status.mjs header, blueprint H10).
 * The difference is that it cannot fabricate a value: it asserts presence and
 * broad type only. Adding a field to the bridge leaves the guard passing
 * (undeclared keys are allowed, so the console stays forward compatible);
 * REMOVING or retyping one fails the guard loudly — which is exactly the change
 * that used to blank the console. The one real risk is an over-strict check
 * rejecting a healthy bridge, so every field the bridge may legitimately omit is
 * declared `opt`, and every field it may legitimately null is `nullOr`, both
 * read off status.mjs rather than guessed.
 */

import { ConsoleApiError } from './errors';
import type { StatusInstrument } from './types';

/** The subset of JSON the console can read a payload as. */
type Shape =
  | { k: 'obj'; fields: Record<string, Shape> }
  | { k: 'arr'; of: Shape }
  | { k: 'num' }
  | { k: 'str' }
  | { k: 'bool' }
  | { k: 'oneOf'; allowed: readonly string[] }
  | { k: 'nullOr'; inner: Shape }
  | { k: 'opt'; inner: Shape };

const num: Shape = { k: 'num' };
const str: Shape = { k: 'str' };
const bool: Shape = { k: 'bool' };
const arr = (of: Shape): Shape => ({ k: 'arr', of });
const obj = (fields: Record<string, Shape>): Shape => ({ k: 'obj', fields });
const nullOr = (inner: Shape): Shape => ({ k: 'nullOr', inner });
const opt = (inner: Shape): Shape => ({ k: 'opt', inner });

/**
 * A string drawn from a CLOSED SET — for a field whose values are enumerated,
 * where any other string is a contract violation rather than a new value. A
 * plain `str` would accept `'prob'` and let it reach a consumer that branches on
 * the value, which is a silent wrong branch instead of a refusal.
 */
const oneOf = (allowed: readonly string[]): Shape => ({ k: 'oneOf', allowed });

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** `{ file, detail }` — the damage report of 05-contracts.md §3. */
const damage: Shape = nullOr(obj({ file: str, detail: str }));

/** `state.videos` — null whenever state.json is unreadable (status.mjs:114). */
const videos: Shape = nullOr(obj({ total: num, fetched: num, coverage: num }));

/** `recentRuns[]` — the engine's own journal projection (status.mjs:150). */
const runEntry: Shape = obj({ runId: str, ok: bool, fetched: num });

/*
 * The exact paths `StatusBoard` dereferences on its first ready render
 * (components/StatusBoard.tsx:143-263). `staleWarning` and `staleDays` are
 * emitted by the bridge but read by nothing in S1, so they are not required
 * here — demanding keys no component reads would only invent false refusals.
 *
 * `census.error` is the one field status.mjs emits conditionally
 * (status.mjs:139), so it is `opt` and typed only when present. `throttle.until`
 * and `lock.pid`/`lock.alive` are also conditional; they are left undeclared,
 * which the walker allows, because StatusBoard reads each behind a `??` or a
 * truthiness test and none of them can throw.
 *
 * `ytdlp`'s PROVENANCE IS REQUIRED AS OF R2-01. `healthText` branches on
 * `source` and reads `checkedAt`/`ageMs`/`stale`, so these are no longer keys
 * "no component reads" — the board cannot render an honest health line without
 * them. `version`, `checkedAt`, `ageMs` and `note` are `nullOr` because
 * health.mjs emits null for each; `source` is a string and is checked for
 * membership of its closed set below, since a typo there would silently fall
 * through to the live branch and present an unknown reading as a probe.
 */
const health: Shape = obj({
  ok: bool,
  version: nullOr(str),
  reason: str,
  checkedAt: nullOr(str),
  ageMs: nullOr(num),
  source: oneOf(['probe', 'history', 'unknown']),
  stale: bool,
  note: nullOr(str),
});

const STATUS_SHAPE: Shape = obj({
  ytdlp: health,
  creators: obj({ total: num, enabled: num, damaged: damage }),
  state: obj({ damaged: damage, videos }),
  budget: obj({ used: num, perHour: num, unit: str }),
  backlog: obj({ lines: arr(str) }),
  throttle: obj({ active: bool, text: str }),
  census: obj({ inFlight: arr(obj({})), everSwept: num, discarded: bool, error: opt(str) }),
  lock: obj({ held: bool }),
  lastRun: nullOr(obj({ status: str, runId: nullOr(str) })),
  lastGood: nullOr(obj({ at: str, staleDays: nullOr(num) })),
  documents: num,
  publishedBrains: num,
  recentRuns: arr(runEntry),
});

/** Walk `value` against `shape`, appending one message per offending path. */
function collect(path: string, value: unknown, shape: Shape, bad: string[]): void {
  switch (shape.k) {
    case 'opt':
      if (value !== undefined) collect(path, value, shape.inner, bad);
      return;
    case 'nullOr':
      if (value !== null) collect(path, value, shape.inner, bad);
      return;
    case 'num':
      if (typeof value !== 'number' || !Number.isFinite(value)) bad.push(`${path}: expected a finite number`);
      return;
    case 'str':
      if (typeof value !== 'string') bad.push(`${path}: expected a string`);
      return;
    case 'bool':
      if (typeof value !== 'boolean') bad.push(`${path}: expected a boolean`);
      return;
    case 'oneOf':
      if (typeof value !== 'string' || !shape.allowed.includes(value)) {
        bad.push(`${path}: expected one of ${shape.allowed.map((a) => `'${a}'`).join(' | ')}`);
      }
      return;
    case 'arr':
      if (!Array.isArray(value)) {
        bad.push(`${path}: expected an array`);
        return;
      }
      value.forEach((item, i) => collect(`${path}[${i}]`, item, shape.of, bad));
      return;
    case 'obj':
      if (!isObj(value)) {
        bad.push(`${path}: expected an object`);
        return;
      }
      for (const key of Object.keys(shape.fields)) {
        collect(`${path}.${key}`, value[key], shape.fields[key], bad);
      }
      return;
    default:
      return;
  }
}

/** How many offending paths the refusal names before it summarises the rest. */
const MAX_NAMED = 4;

function shapeRefusal(route: string, bad: readonly string[]): ConsoleApiError {
  const named = bad.slice(0, MAX_NAMED).join('; ');
  const rest = bad.length > MAX_NAMED ? ` (+${bad.length - MAX_NAMED} more)` : '';
  return new ConsoleApiError(
    // UNKNOWN, not VALIDATION: the REQUEST was well formed — the *response* was
    // not the contract. That is the same bucket `mapBridgeError` already puts a
    // non-envelope body in (errors.ts:73), so the two paths agree rather than
    // inventing a second meaning for one code.
    'UNKNOWN',
    `${route} answered 200 with a payload this console cannot read — ${named}${rest}`,
    { status: 200 },
  );
}

/**
 * Assert that a 200 from `GET /api/status` is the instrument `StatusBoard`
 * reads. Throws a `ConsoleApiError` naming the offending paths; otherwise
 * returns the payload UNCHANGED — no cloning and no defaulting, so nothing is
 * fabricated on the way in (05-contracts.md §3).
 */
export function parseStatusInstrument(body: unknown): StatusInstrument {
  const bad: string[] = [];
  collect('body', body, STATUS_SHAPE, bad);
  if (bad.length > 0) throw shapeRefusal('/api/status', bad);
  return body as StatusInstrument;
}
