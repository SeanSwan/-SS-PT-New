---
artifact_id: SWAN-CHART-V3-CONTRACTS
owner: lead Codex
version: 3.0
status: NEW ADDITIVE API AND UI CONTRACT; UNBUILT
supersedes: index-based drill identity and boolean-only actions
---

# Data, actions and safety boundaries

## Ownership

Existing page route → new flag gate → `ClientProgressStoryV3` → one shared resource store
→ registry → existing SwanChart frame → chart-kind body. Frame owns appearance, measurement,
state/action semantics and table. Body owns marks only. Server owns identity, entitlements,
source selection, normalization, aggregation and comparison eligibility. Client owns display
unit choice, filters, selected datum, accessible formatting and disclosure.

No new data engine in a chart body; no15 independent ad hoc title/unit maps. Keep canonical
chart IDs and a single registry used by overview, library, exports and tests. Type changes
must preserve old consumers via a narrow legacy adapter, not optional-any everywhere.

## NEW backend reads

Mount within existing `clientAnalyticsRoutes.mjs`, after protect/JWT subject middleware and
before broad fallbacks. Existing routes unchanged. Client cannot supply a userId/role.

```text
GET /api/client/analytics/v3/charts/:chartId
    ?range=4w|12w|24w&tz=IANA&unit=lb|kg&exerciseKey=...&reps=...
GET /api/client/analytics/v3/charts/:chartId/points/:pointKey
    ?seriesKey=...&range=...&tz=...&unit=...&exerciseKey=...&reps=...&asOf=...&snapshotId=...&cursor=...
```

`chartId` exact allowlist of15. range default12w; unit defaultlb. Exercise filter only for
best sets/anchor lifts/estimate; reps required for best-set comparable view (default most
recent eligible set's reps, returned in selection). Reject unknown params400; repeated
params400; malformed IANA/date/reps400. Percent encoding only for transport, never identity.
All SQL parameterized. Path regex cannot substitute for subject ownership or capability checks.

`seriesKey` is required for detail and must belong to this chart's registry; two series can
share a pointKey and must never be confused. `asOf` server UTC timestamp. Detail accepts only an ISO instant from a snapshot within15min
and no later than serverNow; expired→409 SNAPSHOT_EXPIRED, refresh needed. Recompute source
digest with the same filters/asOf; edited/deleted source mismatch→409 SOURCE_CHANGED.
Snapshot ID is a hash of subject-bound query + selected source IDs/version timestamps and
values, not an authorization token; server rechecks subject/entitlement on every request.
Never trust client-supplied totals or a snapshot hash as proof of ownership.

## Envelope (all fields named; dates are ISO, null explicit)

```ts
type Point = {
  key: string; seriesKey: string; at: string | null;
  periodStart: string | null; periodEnd: string | null;
  label: string; value: number | null; unit: Unit;
  count: number; partial: boolean; sourceType: SourceType; meta: PointMeta;
  detail: 'sessions' | 'session' | 'sets' | 'measurement' | 'explanation';
};
type Unit = 'sessions'|'sets'|'reps'|'min'|'lb'|'kg'|'lb_reps'|'kg_reps'|'percent'|'score10';
type ChartEnvelope = {
  schemaVersion: 3; chartId: CanonicalChartId; snapshotId: string; asOf: string;
  query: { range: '4w'|'12w'|'24w'; tz: string; unit: 'lb'|'kg';
    exerciseKey: string|null; reps: number|null };
  period: { start: string; end: string; currentPartial: boolean };
  outcome: 'ready'|'empty'|'locked';
  quality: { coverage: 'complete'|'partial'; excludedCount: number;
    reasons: Array<'UNKNOWN_UNIT'|'INVALID_VALUE'|'MISSING_DATE'|'UNCLASSIFIED'> };
  capability: {
    chart: 'allowed'|'locked'; detail: 'allowed'|'locked'|'none';
    export: boolean; share: boolean; requiredTierLabel: string|null;
  };
  series: Array<{ key: string; label: string; unit: Unit; points: Point[] }>;
  comparisons: Array<{ seriesKey: string; eligible: boolean; reason: string|null;
    currentStart: string; currentEnd: string; priorStart: string; priorEnd: string;
    current: number|null; prior: number|null; delta: number|null; unit: Unit }>;
  selection: { exerciseKey: string|null; exerciseLabel: string|null; reps: number|null };
};
```

Chronological key examples `week:2026-08-24`, `session:<uuid>`, `measurement:<id>`;
category key from stable canonical taxonomy. Unique `(seriesKey,key)` required. Display
labels can repeat. Shared timeframe plots may have multiple sessions on a day without
colliding. Count means contributing source observations, not invented confidence.
`SourceType` is an enum: completed_sessions, resolved_sessions, logged_sets, logged_reps,
logged_volume, session_duration, set_rpe, session_intensity, logged_load, exercise_sessions,
movement_volume, muscle_volume, note_sessions, high_rpe_sets, body_weight, body_fat, estimate.
`PointMeta` is a strict discriminated union; no arbitrary JSON and no silent field omission:

| kind / consumers | Required fields |
|---|---|
| count / frequency,sets,reps | `{kind:'count'}`; base count/value carry numbers |
| attendance | `{kind:'attendance', status, resolvedCount, ratePercent:number|null}` |
| volume / weekly | `{kind:'volume', setCount, zeroLoadSetCount}` |
| duration | `{kind:'duration', sessionId}` |
| effort / RPE,intensity | `{kind:'effort', sampleCount, source:'set_rpe'|'session_intensity'}` |
| load / best sets,anchor | `{kind:'load', exerciseKey, exerciseLabel, reps, verifiedRecord:boolean, priorBest:number|null, priorBestAt:string|null}` |
| exercise | `{kind:'exercise', exerciseKey, setCount}` |
| taxonomy / movement,muscle | `{kind:'taxonomy', categoryKey, setCount, zeroLoadSetCount}` |
| notes | `{kind:'notes', exerciseKey, measure:'note_sessions'|'high_rpe_sets', sampleCount}` |
| measurement / weight,body-fat | `{kind:'measurement', measurementId, originalValue, originalUnit, method:string|null}` |
| estimate | `{kind:'estimate', exerciseKey, exerciseLabel, sourceLogId, sourceLoadLb, reps, formula:'brzycki'}` |

Metadata numeric values obey decoder rules; IDs refer only to authorized source. `status` is
the existing session enum. `comparisons` is per-series, never mixes sets/reps or RPE/intensity;
empty when metric has no meaningful period comparison, locked or coverage incomplete. Frequency
summary selects only the completed_sessions series. Body uses first/last measured change in
the selected range, with dates, neutral—not the last4-week sum comparison.
The server must call the strict `comparePeriods` basis/calendar validator specified in test
contract M08; matching units and sourceType alone are insufficient. Reject cross-exercise,
cross-rep and nonadjacent/unequal calendar comparisons before issuing an eligible delta.

Quality reasons use no raw notes/PII. Aggregate responses never include client names, emails,
free-form notes, addresses or raw source rows. No partial success encoded as empty array.

HTTP200 ready/empty;402 locked chart (same envelope, series[], no comparison values);
401 expired session;403 denied;400 validation;404 unknown chart/owned source not found;
409 source changed/expired snapshot;413 DATA_LIMIT;429 rate limited;500/503 failed query.
More than500 points per chart or100KB aggregate returns413 and **Choose a shorter period.**
No silent truncation/downsampling. The server checks limits before sending. For category lists,
the payload contains all bounded rows; top6 is presentation only, the table exposes all rows.
Errors: `{schemaVersion:3,error:{code,message,retryable,requestId}}`; message safe fixed copy.
Permitted retryable codes `RATE_LIMITED`,`TEMPORARY_UNAVAILABLE`; user retry only, respect
Retry-After. No automatic retry loops. Invalid payload is a decoder error, never a logged
workout gap. A401 or403 purges current sensitive state immediately.

## Detail envelope

```ts
type DetailEnvelope = {
  schemaVersion: 3; chartId: CanonicalChartId; snapshotId: string; pointKey: string;
  seriesKey: string; explanation: string; matchedTotal: number; unit: Unit;
  sessions: Array<{ id: string; at: string; durationMinutes: number|null;
    exercises: Array<{ key: string; label: string;
      sets: Array<{ id: number; setNumber: number; type: string|null;
        reps: number|null; load: number|null; unit: 'lb'|'kg'; rpe: number|null }> }> }>;
  measurement: null | { id: string; at: string; value: number; unit: Unit;
    originalValue: number; originalUnit: string; method: string|null };
  nextCursor: string|null;
};
```

`cursor` is the only extra optional detail-query parameter; absent means first page.
25 sessions per page, max200 sets per response; cursor opaque, bound to subject/query/snapshot,
validate and expire with snapshot. Header count is all matched sources, not current page count.
Load more preserves selected point and focus; cancellation aborts pagination too. Session dates
and detail sum reconcile to parent aggregate under identical rules. Body detail is local from
authorized measurement data or an ownership-checked measurement handler, never workout-week.
Sets pagination must resume within an oversized session (cursor includes session+set offset),
not silently omit remaining sets or return an unpageable200-set cap. Show **More sets** and
session total. Notes are NOT added to this generic envelope; **View original workout notes**
links to the existing authorized workout-detail view after S0 verifies that exact route. Do not
put free text in chart metadata, telemetry, share or generic export projections.
Any existing session PDF needs its own fresh permission check; detail access is not a bypass.

## Resource identity and state

Cache key = subject-session generation + permission revision + chartId + query(range/tz/unit/
exercise/reps). Memory-only TTL60s; no IndexedDB/localStorage/ServiceWorker storage of data.
Response cache headers `private, no-store`; never log response bodies or query identifiers.
Deduplicate concurrent same-key fetches. AbortController + monotonic generation must BOTH
exist: abort alone does not protect against a transport that still resolves.

State union: `idle | loading | ready | empty | locked | refreshing | error | staleError | denied`.
For same key, refetch keeps last success under its original `asOf`; marks/table visible but
mutating/export/share/drill actions disabled while refreshing/staleError. Different key clears
selection; old snapshot may stay visually until response only with explicit **Showing {old
range/unit}; loading {new range/unit}**, noninteractive; never across a subject/permission change.
Identity change synchronously clears overview/story/table/drill/export preview and cache before
next paint, then aborts. Close increments generation. Late completion is ignored unless every
captured key/generation matches. No cross-subject stale retention under any circumstance.

401/403/entitlement change clears even a previously ready frame and closes portals.
WORKOUT_LOGGED_EVENT invalidates after successful save only; coalesce same-event ID, one
refetch per visible key. Failed save/duplicate event cannot invent progress or celebration.

## Entitlements

Preserve each registry T/G/U chart policy. Detail for training/strength retains G; body detail
retains current authenticated ownership policy. Server sends separate capability results.
Teaser chart with locked detail: table aggregate remains, select shows locked-detail explanation,
not a generic failed request. No raw details are returned before gate checks. Staff remains
out of V3 client endpoint; future staff adapters need explicit permission/view-as receipts.

## Frame actions (new typed contract, adapter for old boolean API)

```ts
type ChartAction =
  | { state: 'enabled'; label: string; onActivate: () => void }
  | { state: 'disabled'; label: string; reason: string }
  | { state: 'hidden'; reason: string };
type Activation = { seriesKey: string; pointKey: string; snapshotId: string };
```

No enabled action without handler. Disabled action remains readable but cannot fire; hidden
actions documented in About. Primary exact controls: table, expand, refresh, save, detail.
Expand and drill share one dialog state machine; no stacked dialogs. `ctx.activate` resolves
stable identity from actual datum, never a guessed grouped-series string index. Registry maps
legacy index only inside compatibility adapter; V3 callers never pass bare numbers.
Table sorting keeps pointKey association. Selection remains correct after series toggle or
range reorder. No forced hover tooltip on touch; tap selects, table gives keyboard parity.

## Export and share

CSV: visible selected series or explicitly chosen All series; ISO dates+units+source caption;
RFC-style quoted cells; prefix spreadsheet-dangerous text (`=,+,-,@`, tab, CR) with apostrophe.
Do not neutralize negative numeric cells as text. Filename `progress-{chartId}-{date}.csv`, no
client names/IDs. PDF/PNG render allowlisted DTO into a dedicated export surface; no html2canvas
of a dashboard/ancestor node. All15 private local exports permitted only for owner/current data.

Feed sharing is a separate gated slice. **NEW** `POST /api/client/analytics/v3/share-preview`
body `{chartId,pointKey,seriesKey,snapshotId,query,asOf}` recomputes authorized values and returns
`{previewId,expiresAt,content:{title,metric,unit,period,caption}}`.10min expiry, owner-bound,
server-side ephemeral store using existing cache abstraction; if no abstraction exists, STOP.
No user narrative/notes in projection. Body/notes/attendance reject403 regardless of UI.
**NEW** `POST /api/client/analytics/v3/share` body `{previewId,confirmation:true}` plus
Idempotency-Key. Recheck eligibility/snapshot/identity, call existing social-post service, return
post ID; no parallel general-post fallback. Repeated same key+body returns same result;
different body409. Use existing DB idempotency facility—missing facility→STOP, no schema invention.

The deliberate **Publish to feed** click is the only write. Closing preview, downloading,
logging a workout, changing range, retrying a read or switching clients MUST issue no write.
POST ambiguous network result: read existing status by idempotency key using service contract;
never auto-republish. Before this slice, disabled Share with **Sharing is being prepared** only
in gated internal QA; production V3 cannot advertise unsupported share. Release waits for parity.

## Observability and performance requirements

Events: `chart_load_result`, `chart_detail_result`, `chart_invalid_payload`, `chart_flag_fallback`.
Fields: chartId, schemaVersion, duration bucket, status code, reason code, aggregate count.
No subject/session IDs, notes, values, tokens, screenshot payloads or exact query in telemetry.
Local fixture measurements: ≤6 concurrent chart requests, no request per hover/resize, ≤100KB
aggregate response/chart, ≤150KB detail page; all lists bounded. Each query's plan must use
subject/date indexes; no per-session N+1.250ms control-response target and no new long tasks
>50ms for selection at reference desktop; measure, don't assert. Backend targets p95≤500ms
on seeded representative data, exclude cold build; unmet target blocks performance gate.

## Compatibility and rollback

Feature flag `clientProgressStoryV3` is NEW in existing public flag system. Runtime false wins;
QA cannot bypass kill switch. Default false; observe current gate's exact fetch-failure behavior
before reuse. No production flag changes authorized now. Flag-off renders the previous page
composition, not V3 with partial data. New endpoints additive; reverting UI needs no DB rollback.
Do not fallback to legacy data for the same V3 chart after a V3 query error—that would reintroduce
the unit/state defects under the new title. Show an honest error or switch whole page via flag.
