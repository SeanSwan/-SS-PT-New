# LEDGER.md — direction selection record

- **Date:** 2026-09-23 · **Author:** Sable (WorkBuddy AI) · **Status:** CANONICAL (the format) · the record itself is append-only
- **Machine ledger:** `LEDGER.jsonl` (one JSON object per line, sibling of this file). This file explains the format and is the human-readable view.

---

## Why a ledger exists

The anti-convergence gate in `directions/README.md` §5 needs to know what was chosen before. Without a record, "it builds the same thing every time" is an impression. With one, it is a number that can fail a check.

The gate reads this ledger, so **the ledger is load-bearing, not a log.** A corrupt line must not be able to disable the gate — `select.mjs` skips and *counts* malformed lines rather than throwing, and the count is reported.

## Format

One JSON object per line:

```json
{
  "v": 1,
  "at": "2026-09-23T16:44:29.000Z",
  "surface_class": "marketing",
  "direction": "cyberpunk-edgerunners",
  "mode": "matched",
  "score": 2,
  "pinned": false,
  "brief": "landing page for the studio, cyberpunk feel",
  "agent": "sable"
}
```

| Field | Meaning |
|---|---|
| `surface_class` | One of `product` / `operator` / `marketing` / `internal-tool` / `experiment`. The gate windows **per class**, so a run of marketing picks does not block a product pick. |
| `direction` | The direction id that was selected |
| `mode` | `pinned` / `matched` / `rotated` — how it was chosen |
| `pinned` | Whether a human pinned it. **The gate only fires on unpinned runs.** A pin with a reason is a legitimate answer, not a failure. |
| `brief` | Truncated to 160 chars. Enough to explain the decision, not enough to become a content store. |

## The gate

> If the last **3** selections for a surface class all resolved to the same direction **and none was pinned**, the 4th is **REFUSED**.

Rotation already avoids repetition, so the case the gate actually catches is **matching that keeps returning the same direction** — every brief mentioning "dashboard" scoring to the same place. That is the real convergence mechanism, and it is the one a "try to be varied" instruction cannot stop.

## Record

Selections are appended by the caller via `select.mjs` → `ledgerEntry()`. Nothing is recorded that was not decided.

**No surface selections have been logged yet.** The registry was created 2026-09-23 and no UI slice has been built against it since. The first real entry will be the first honest test of the gate.

| Date | Surface class | Direction | Mode | Pinned | By |
|---|---|---|---|---|---|
| 2026-09-23 | — | — | — | — | registry created; no selections yet |
