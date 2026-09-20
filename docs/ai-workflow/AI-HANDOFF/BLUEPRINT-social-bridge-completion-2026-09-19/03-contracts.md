# 03 — Contracts (part 1 of 2)

> Split on 2026-09-19 from a single 426-line document, to honour the ~300-line
> budget that lets a builder load these documents piecemeal.
> **Part 2 is `03b-contracts-s6-s8-and-interfaces.md`** — it continues with manifest
> reconciliation, the faction ceremony, the weekly digest, and the exported
> application interfaces.

#### Contract release rule

The exact existing `spotlight.v1` body and receiver response are **BLOCKED-G0**. Do not derive them from this package, invent `headline`/`summary` fields, or change shipped field types.

All newly defined DTOs below reject unknown request keys. New JSON responses use an explicit serializer, not `toJSON()` on an ORM object.

#### Common errors for new endpoints

```json
{"error":{"code":"UNAUTHORIZED","message":"Authentication required."}}
```

| Status | Code | Message |
|---|---|---|
| 400 | `INVALID_REQUEST` | `Request is invalid.` |
| 401 | `UNAUTHORIZED` | `Authentication required.` |
| 403 | `FORBIDDEN` | `This action is not permitted.` |
| 404 | `NOT_FOUND` | `Item not found.` |
| 409 | `REVISION_CONFLICT` | `This item changed. Reload and try again.` |
| 413 | `PAYLOAD_TOO_LARGE` | `Request is too large.` |
| 429 | `RATE_LIMITED` | `Too many requests. Try again later.` |
| 500 | `INTERNAL_ERROR` | `The request could not be completed.` |
| 503 | `PUBLISHING_PAUSED` | `Publishing is paused.` |
| 503 | `FEATURE_DISABLED` | `This feature is disabled.` |
| 503 | `UPSTREAM_UNAVAILABLE` | `Studio Pulse is unavailable.` |

Never return exception text, upstream response bodies, SQL errors, source URLs, or secret-validation details.

#### SwanGuard operator APIs

Prefix: `/api/operator/studio-spotlight`.

Authorization: existing authenticated **owner** check; ordinary operators receive 403. Cookie-authenticated mutations require the existing CSRF mechanism.

| Method/path | Request | Success |
|---|---|---|
| `GET /items?status=all&limit=20` | Optional opaque `cursor`; limit 1–50 | 200 `StudioSpotlightItemPage` |
| `POST /items` | `{"draft": <verified editorial DTO>}` | 201 `StudioSpotlightItem` |
| `PUT /items/:itemId` | `{"expectedRevision":"0","draft":<DTO>}` | 200 `StudioSpotlightItem` |
| `POST /items/:itemId/publications` | Body below | 202 publication result |
| `POST /items/:itemId/retractions` | `{"expectedRevision":"1"}` | 202 publication result |
| `GET /publications/:publicationId/receipts` | None | 200 receipts |
| `POST /publications/:publicationId/retry` | `{}` | 202 same publication result |

Publication request:

```json
{
  "expectedRevision":"0",
  "draftSha256":"<64 lowercase hex characters>",
  "checks":{
    "noPolitics":true,
    "noNegativity":true,
    "imageRightsCleared":true,
    "headlineInOwnerVoice":true
  }
}
```

Publication result:

```json
{
  "publicationId":"11111111-1111-4111-8111-111111111111",
  "itemId":"22222222-2222-4222-8222-222222222222",
  "revision":"1",
  "state":"queued"
}
```

Receipts:

```json
{
  "publicationId":"11111111-1111-4111-8111-111111111111",
  "receipts":[
    {
      "attempt":1,
      "outcome":"accepted",
      "httpStatus":200,
      "completedAt":"2026-09-21T16:00:00.000Z"
    }
  ]
}
```

`outcome` is one of `accepted`, `retryable`, `rejected`, `timeout`, `network_error`, `paused`. These are application strings with database CHECK validation where supported, **not an extended existing ENUM**.

`StudioSpotlightItem` and its draft schema remain blocked until the wire DTO and current source-item projection are attached. Neither endpoint may return raw SwanGuard story objects.

#### SwanStudios admin read

`GET /api/admin/studio-spotlight?limit=20`

Existing SwanStudios admin authorization. Limit 1–50; opaque cursor.

```json
{
  "enabled":false,
  "liveCount":0,
  "items":[],
  "nextCursor":null
}
```

Each nonempty item contains only:

```ts
type StudioSpotlightAdminItem = {
  itemId: string;
  revision: string;
  title: string;
  receivedAt: string;
  imageState: "hosted" | "none" | "degraded";
  receiptId: string | null;
};
```

`title` is an admin DTO projection from the verified wire field, not a new wire field.

#### Impression/dismissal collection

`POST /api/social/spotlight-events`

Authenticated member, CSRF-protected, maximum 4 KiB request.

```json
{
  "itemId":"22222222-2222-4222-8222-222222222222",
  "revision":"1",
  "event":"impression"
}
```

Success, including duplicate:

```json
{"accepted":true}
```

- `event` permits `impression` or `dismissal`.
- Server derives member and local day; never accepts either from the client.
- Reject unknown, inaccessible, retracted, or revision-mismatched items with 404.
- Dismissal without an existing qualifying exposure returns 409 with code `IMPRESSION_REQUIRED` and message `"Record an impression before dismissal."`
- Serialize client transmission per item. A sub-one-second dismissal remains a local UI dismissal and is excluded from the placement-rate statistic.
- Database uniqueness: `(userId, itemId, revision, localDate)`.
- Maximum 60 requests/member/minute.
- Retain member-keyed exposure facts for 35 days, then delete. Retain daily aggregate totals without member identifiers.

#### Pulse authentication

`GET /api/operator/pulse`

No browser authentication. TLS required. Use `SWAN_PULSE_SECRET_V1`.

Headers:

```text
X-Swan-Timestamp: <integer Unix seconds>
X-Swan-Nonce: <32 lowercase hex characters>
X-Swan-Signature: sha256=<hex>
```

Signature input, exactly:

```text
pulse.v1
<timestamp>
<nonce>
GET
/api/operator/pulse
```

No trailing newline. Timestamp tolerance ±300 seconds. Reject reused nonces for ten minutes using a shared store. Constant-time signature comparison. Reject query parameters.

Response:

```json
{
  "schema":"studio-pulse.v1",
  "generatedAt":"2026-09-21T16:00:00.000Z",
  "window":{
    "timeZone":"America/Los_Angeles",
    "start":"2026-09-14T07:00:00.000Z",
    "end":"2026-09-21T07:00:00.000Z"
  },
  "spotlight":{
    "enabled":true,
    "liveItems":3,
    "impressions":240,
    "dismissals":60,
    "dismissalRate":0.25,
    "placementReviewRequired":false
  }
}
```

- Window: seven fully closed Pacific calendar days.
- For 0–19 impressions, return `impressions:null`, `dismissals:null`, `dismissalRate:null`, and `placementReviewRequired:false`.
- At 20–99 impressions, return aggregate counts/rate but no placement alert.
- At least 100 impressions: alert iff `dismissals / impressions > 0.40`.
- Return rate rounded to four decimal places; threshold uses unrounded counts.
- Do not add drilldown, cohort, item, member, or date-range parameters.
- Set `Cache-Control: no-store`.
- SwanGuard caches the response server-side for 60 seconds and labels it stale after five minutes.

This prevents name/email disclosure **by construction of the fixed DTO and aggregate query**. It does not claim formal anonymity against every auxiliary-information attack; suppression reduces small-sample exposure.

`GET /api/operator/studio-pulse` is SwanGuard owner-authenticated:

```json
{
  "freshness":"fresh",
  "lastSuccessAt":"2026-09-21T16:00:00.000Z",
  "pulse":{}
}
```

`pulse` is exactly the above DTO, not `{}` in a real nonempty response. No verified cached value and upstream failure returns 503. A cached value with upstream failure returns 200, `freshness:"stale"`.

