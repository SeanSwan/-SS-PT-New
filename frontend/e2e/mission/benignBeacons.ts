/**
 * FILE: benignBeacons.ts
 * PURPOSE: The SINGLE registry of write requests a read-only production audit
 * may tolerate — fire-and-forget analytics beacons that mutate no business data.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY THIS FILE EXISTS: the read-only guards block every POST/PUT/PATCH/DELETE
 * and fail the run on anything they blocked. Two analytics beacons legitimately
 * fire on ordinary page loads, so each guard carried its own hardcoded copy of
 * the allowed endpoint — four copies of one string across four files. When the
 * second beacon shipped (`/api/telemetry/funnel`, SWA-29) not one of the four
 * knew about it, so the 2026-08-14 production audit failed every non-auth test
 * on a call that was working exactly as designed. A gate that cries wolf on
 * correct behaviour is a gate people learn to ignore, and the real findings
 * behind it never get read.
 *
 * This is the same two-sources-of-truth defect class the crawl worklist's BUG-4
 * and BUG-2 comments were written against; the cure is the same: one registry,
 * imported everywhere, so a third beacon is ONE edit instead of four.
 *
 * ADDING AN ENTRY IS A SECURITY DECISION. A request only belongs here when all
 * of the following hold, and `reason` must say which:
 *   - it mutates no business data (no orders, sessions, workouts, clients, posts)
 *   - it is fire-and-forget: the UI neither reads nor awaits the response
 *   - the server treats it as untrusted input and cannot be driven by it
 * Anything else is a finding, and the audit is supposed to say so.
 */

export interface BenignWriteBeacon {
  /** HTTP method. Matched exactly — `DELETE` on a beacon path is NOT benign. */
  method: 'POST';
  /** URL pathname. Matched exactly — no prefix or substring matching. */
  path: string;
  /** Why tolerating this write is safe. Required; asserted non-trivial by contract test. */
  reason: string;
}

export const BENIGN_WRITE_BEACONS: readonly BenignWriteBeacon[] = [
  {
    method: 'POST',
    path: '/api/dashboard/track-pageview',
    reason:
      'Pageview counter. Writes only to the pageview cache, never to business records, '
      + 'and the UI ignores the response.',
  },
  {
    method: 'POST',
    path: '/api/telemetry/funnel',
    reason:
      'Public funnel beacon (SWA-29). Always 204, fail-soft, server-side event allowlist '
      + 'drops client-claimed conversions, and the sanitizer strips PII — it cannot write a '
      + 'business record. Sent via navigator.sendBeacon, so the UI never reads the response.',
  },
] as const;

/**
 * True when a blocked-write entry (`"POST /api/foo"`, the shape the guards push
 * into `state.blockedWrites`) is a registered beacon.
 *
 * Deliberately an exact whole-string comparison rather than a regex: a partial
 * match would tolerate `DELETE /api/telemetry/funnel` or `POST /api/telemetry/funnel/admin`
 * — a destructive call wearing a beacon's path.
 */
export function isBenignWriteBeacon(entry: string): boolean {
  return BENIGN_WRITE_BEACONS.some((beacon) => `${beacon.method} ${beacon.path}` === entry);
}

/** Same decision, taken from a live request before it is fulfilled. */
export function isBenignBeaconRequest(method: string, pathname: string): boolean {
  return isBenignWriteBeacon(`${method} ${pathname}`);
}

/**
 * True when a console message names a registered beacon path — used to tolerate
 * a beacon's TRANSPORT noise (a browser-logged 405/network error), never to
 * tolerate an application error.
 *
 * Substring matching is correct here and nowhere else: a console line wraps the
 * path in prose and a full URL, so there is no exact string to compare against.
 * The risk is inverted from the write allowlist — the worst case is silencing
 * one line of noise, not permitting a write — and the caller additionally
 * requires a transport-failure signature before it suppresses anything.
 */
export function mentionsBenignBeacon(message: string): boolean {
  return BENIGN_WRITE_BEACONS.some((beacon) => message.includes(beacon.path));
}
