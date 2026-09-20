# 03b — Contracts (part 2 of 2)

> Continuation of `03-contracts.md`. Part 1 carries the contract release rule,
> common errors, the SwanGuard operator APIs, the SwanStudios admin read,
> impression/dismissal collection, and pulse authentication.

#### Manifest reconciliation

`GET /api/bridge/studio-spotlight/manifest?after=0&through=&limit=100`

Publisher-side endpoint, server-to-server only.

- `after` and `through`: nonnegative decimal strings; empty `through` starts a snapshot.
- `limit`: exactly 100 in the consumer; server permits 1–100.
- Initial page captures the highest committed manifest sequence as `through`.
- Following pages retain that `through`.
- Events ordered by committed sequence ascending.
- Immutable events include retractions. Retain them for this phase; do not introduce pruning without a full-snapshot protocol.

Request uses `SWAN_BRIDGE_SECRET_V1`, existing timestamp/signature header names, and a fresh nonce. Domain-separated signature input:

```text
manifest.request.v1
<timestamp>
<nonce>
GET
<exact path and query>
```

Canonical query order is `after`, `through`, `limit`; values use ordinary percent encoding. Reject noncanonical query order or duplicate parameters.

Response:

```json
{
  "schema":"studio-spotlight-manifest.v1",
  "through":"0",
  "nextAfter":"0",
  "hasMore":false,
  "events":[]
}
```

A nonempty event:

```ts
type BridgeSpotlightManifestEvent = {
  sequence: string;
  payloadBase64: string;
  payloadSha256: string;
};
```

The decoded payload is the exact, previously approved `spotlight.v1` body. No publication actor, attempt history, source metadata, or source ID is exported.

Response headers include fresh timestamp, echoed nonce, and signature over:

```text
manifest.response.v1
<response timestamp>
<request nonce>
<exact response body bytes>
```

- Maximum response body: 1 MiB. Return fewer than 100 events when needed.
- Manifest payload-size limit must match the verified existing ingest ceiling. If even one event cannot fit, stop and alert; never skip it.
- Receiver verifies the raw response before parsing.
- Apply through the same schema/positivity/revision/image service used by webhook ingestion.
- Advance cursor transactionally after every event in the page is durably accepted or a valid no-op.
- Invalid event stops advancement and alerts the operator; do not silently drop it.
- Poll at minute 17 each hour, with a distributed lease and startup catch-up.
- When Spotlight is disabled, do not poll/apply or advance the cursor.
- Maximum 20 pages/run; continue from the saved cursor next run.

#### Faction ceremony

`POST /api/social/faction-ceremony/claim`, authenticated member, CSRF-protected.

Request: `{}`.

No eligible ceremony or already claimed:

```json
{"ceremony":null}
```

Successful claim:

```json
{
  "ceremony":{
    "id":"33333333-3333-4333-8333-333333333333",
    "opensAt":"2026-09-21T16:00:00.000Z",
    "closesAt":"2026-09-22T16:00:00.000Z",
    "winnerFactionId":"faction-1",
    "mvpUserId":null,
    "modifierCode":"<existing verified modifier code>"
  }
}
```

- Monday 09:00 to Tuesday 09:00, `America/Los_Angeles`.
- Snapshot prior closed faction period at reveal time.
- Existing faction authority supplies score, tie rules, MVP eligibility, and modifier. **Do not invent new scoring rules.**
- Claim inserts `(ceremonyId, userId)` atomically before returning the card.
- Two concurrent claims return one card and one null.
- This chooses **at-most-once reveal**, not guaranteed viewing: a crash after claim can suppress the card. Never promise exactly-once human viewing.
- UI names resolve through existing authorized client lookup. Missing names use `"Winning faction"` and `"MVP unavailable"`.

#### Weekly digest

Delivery medium: **in-app only**, not email or push.

`GET /api/social/weekly-digest`, authenticated member:

```json
{
  "enabled":true,
  "digest":{
    "id":"44444444-4444-4444-8444-444444444444",
    "periodEnd":"2026-09-21T01:00:00.000Z",
    "xpEarned":120,
    "streakDays":4,
    "friendHighlight":{
      "userId":"<canonical opaque ID>",
      "kind":"challenge_completed"
    },
    "factionRank":2,
    "spotlightItemId":"22222222-2222-4222-8222-222222222222"
  }
}
```

No digest: `{"enabled":true,"digest":null}`.

Opted out: `{"enabled":false,"digest":null}`.

`PUT /api/social/weekly-digest/preference`

Request: `{"enabled":false}`.

Response: `{"enabled":false}`.

- Sunday 18:00 Pacific; period is previous Sunday 18:00 through current Sunday 18:00.
- XP/streak/rank come from authoritative adapters.
- Friend highlight requires an eligible challenge completion and current sharing permission. Stable tie-break: latest qualifying completion, then canonical ID.
- Recheck friendship and visibility on read; if invalid, set `friendHighlight:null`.
- Select at most one currently live Spotlight. Recheck on read; retracted/disabled yields null.
- Opt-out checked both during generation and read.
- Default follows the verified existing digest preference. If none exists, default OFF.
- Template-only. No prose generation service, model client, prompt, embedding, or LLM dependency.

#### Exported application interfaces

These signatures are fixed for newly introduced service boundaries:

```ts
type DecimalString = string;
type Instant = string;
type CanonicalUserId = string | number; // Narrow at G0.

type StudioSpotlightPublishInput = {
  itemId: string;
  expectedRevision: DecimalString;
  draftSha256: string;
  checks: {
    noPolitics: true;
    noNegativity: true;
    imageRightsCleared: true;
    headlineInOwnerVoice: true;
  };
};

type BridgeSpotlightDispatchResult = {
  publicationId: string;
  outcome: "accepted" | "retryable" | "rejected" | "paused";
};

export function publishStudioSpotlight(
  input: StudioSpotlightPublishInput,
  context: StudioSpotlightOwnerContext
): Promise<StudioSpotlightPublicationResult>;

export function dispatchBridgeSpotlight(
  publicationId: string,
  dependencies: BridgeSpotlightDispatchDependencies
): Promise<BridgeSpotlightDispatchResult>;

export function reconcileBridgeSpotlight(
  dependencies: BridgeSpotlightReconcileDependencies
): Promise<{ applied: number; cursor: DecimalString }>;

export function buildStudioPulse(
  now: Date,
  dependencies: StudioPulseDependencies
): Promise<StudioPulseV1>;

export function claimFactionCeremony(
  userId: CanonicalUserId,
  now: Date
): Promise<FactionCeremonyDTO | null>;

export function buildWeeklyDigest(
  userId: CanonicalUserId,
  periodEnd: Date
): Promise<WeeklyDigestDTO | null>;
```

The dependency types, route context type, canonical ID narrowing, complete model definitions, and actual working pattern excerpts are **BLOCKED-G0**. They must be written into this file before builder release; `any`, placeholder imports, and guessed Sequelize models are forbidden.

---
