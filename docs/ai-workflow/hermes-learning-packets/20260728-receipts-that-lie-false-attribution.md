---
originating_model: claude-fable-5
date: 2026-07-28
topic: Receipts that lie — false attribution in catch blocks, and why an evidence system fails differently than an app
provenance: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
---

# Learning Packet — a receipt that lies is worse than a crash

**The permanent lesson:** in any system whose value is *evidence* — receipts, audit logs,
provenance, attribution — the worst failure is not an outage. It is a record that is
**confidently wrong about causation**. A crash is visible and self-correcting; a false
receipt is durable, trusted, and silently poisons every decision made downstream from it.
Design and review such systems with that asymmetry in mind.

## 1. The bug class: a `catch` that wraps a WRITE but blames the OUTSIDE

Found in a connector sync path:

```ts
try {
  const batch = await provider.client.fetchBatch();   // external call
  ...
  await store.commitSync({ ... });                    // OUR persistence — also inside the try
} catch {
  const receipt = createReceipt(..., ['provider_unavailable'], 0, quotaCost);
  await store.recordReceipt(receipt);                 // writes a receipt blaming the provider
}
```

When the *database* failed, the system recorded **"provider unavailable"** — blaming a
healthy third party for an internal fault — and burned the day's API quota doing it.
Everything downstream (dashboards, retry logic, trust scoring of that source, a human
deciding the feed is unreliable) inherits the lie.

**The sweep rule, memorize it:** for every `catch`, ask two questions —
1. Does the `try` block contain a **write/persist/mutation**?
2. Does the handler assign blame to something **external** (provider down, network, upstream)?
If both are true, it is this bug. Narrow the `try` to the external call only; let internal
failures propagate as internal failures (a 500 is honest; a false receipt is not).

Correct-by-contrast examples from the same repo (kept as the positive pattern): a `try`
around *only* `delivery.sendMagicLink` whose catch invalidates the token and returns a
truthful `503 magic_link_delivery_failed`; a `try` around *only* `decodeURIComponent` /
`request.json()` returning `400 invalid_json`. Narrow scope + truthful label = fine.

## 2. Companion: attribution that vanishes exactly when it matters

Same subsystem, second defect: `sync(connectorKey, _userId, requestId)` — the actor was
discarded at the signature. The receipts recorded *what* happened, never *who* triggered it,
while the sibling method (`setOwnerEnabled`) correctly persisted `updated_by_user_id`.

Two generalizable rules:
- **A leading-underscore parameter is a code smell in any audited path.** `_userId` is the
  compiler being told to stop caring about the exact fact an audit trail exists to record.
  Grep for it during provenance review.
- **Stamp attribution on every outcome branch, not just success.** The blocked,
  quota-exhausted, and provider-failed paths need the actor *more* than the happy path —
  those are the records someone will read during an incident. Attribution that only survives
  success is attribution you cannot use when it counts.

## 3. Review posture this implies for evidence systems

- Ask of each recorded fact: *could this record be confidently wrong?* Rank those paths above
  availability bugs.
- Prefer **propagating an error** over **recording a guess**. "Unknown/unresolved" and a
  hard failure are both honest; a plausible wrong cause is not.
- Verify the **observable consequence**, not the mechanism: assert that a database failure
  *throws* rather than that a catch was narrowed; assert the actor *round-trips through the
  real database* rather than that a column was added. (The memory store proved the logic; only
  real Postgres proved the persistence.)
- Nullable-by-design for attribution columns: system/scheduled actions genuinely have no
  human actor, and forcing a fake one is another way to make a record lie.

## 4. Applying this
- New `catch` in review → run the two-question sweep rule (§1).
- Any `_param` in a path that writes an audit/receipt/provenance row → treat as a finding.
- Any new receipt/log field → test it on the failure branches, not just the success branch.
- Any evidence-system claim → verify with the consequence, on the real backing store.
