---
decision: "privacy-boundary@1.2.0 — failure propagation for a privacy rejection: the eight-site absorber chain, why the chain is not closed, and the trace method that would close it."
status: open
supersedes: "03b-privacy-boundary.md §5 — extracted in round 7 when 03b reached 305 lines against the 300-line cap"
---

# 03f — The absorber chain

**Why this file exists.** Round 7 measured **`03b-privacy-boundary.md` at 305 lines against the 300-line cap** (`06-bans.md` section 1, by `wc -l`). Section 5 had grown to carry an eight-row absorber table plus the argument about why six rounds of `catch`-enumeration still missed one, and round 7's own fixes made it longer. It is extracted here. **Nothing was deleted and the section number did not move** — §5 is still §5, so every existing `§5` reference stays meaningful and only its file component changes.

**This file carries the same contract id, `privacy-boundary@1.2.0`, and draws no boundary of its own.** The gate and its placement are **`03b-privacy-boundary.md` sections 2-4 and 8-9**. The release predicate is **`03c-release-predicate.md`**. The admission schema is **`03e-admission-schema.md`**. The context channels are **`03d-context-channels.md`**. The wire vocabulary this chain must use is the coach-cc package's `03-contracts.md` `HarnessErrorCode`.

---

## 5. Failure propagation, specified at the dispatcher (PART C-4)

| Condition | Required behaviour |
|---|---|
| Scanner throws or times out | **not sent**; `503 PRIVACY_UNAVAILABLE`; **non-retriable** |
| A field is of unexpected shape | **not sent**; `503 PRIVACY_UNAVAILABLE` |
| P1 rejects an input | **not sent**; the rejection is attributed to its channel |
| Any of the above | **zero provider calls** — not a truncated call, not a retry, **and not a fallback** |

**Propagation must be verified at the dispatcher, not at the scanner.** A scanner unit test proves the
scanner returned; it does not prove the request was withheld. **Each round finds more absorbers than the last
— round 4 found more than round 3, round 5 found two more, round 6 found a seventh. They form a chain, not a
single `catch`:**

| # | Site | What it does to a rejection | Evidence |
|---|---|---|---|
| 1 | `intentClassifier.mjs:170` | `catch` returns a **chat fallback** (`:187`) | classification dispatch. **But `:173-184` already re-checks PHI and blocks instead of falling back — the shipped precedent for the fix** |
| 2 | `aiChatService.mjs:2034` | provider-loop `catch` pushes to `failoverTrace`, logs, and **`continue`s to the next provider** | a rejection inside the provider call is treated as a provider error and **re-sent to another provider** |
| 3 | `aiChatService.mjs:2301` | **R5-03:** non-timeout error on Pro → `logger.warn` → **`continue` → retries Flash, without inspecting `err.code` or `err.name`** | a rejection raised inside the Pro call is retried against a different model |
| 4 | `commandExecutor.mjs:565` | `catch` sets `ctx.error = COMMAND_PIPELINE_FAILED_MESSAGE` — **one generic message, the error's type discarded** | any exception becomes an opaque string |
| 5 | `aiCommandRoutes.mjs:171` | `if (ctx.error)` returns `res.json({ success:false, type:'error', error: ctx.error, … })` — **HTTP 200** | the client cannot distinguish a privacy refusal from a generic failure |
| 6 | `aiChatRoutes.mjs:823` | **R5-03:** `catch` → `res.status(500).json({ success:false, error:'Failed to send message' })` | **no privacy code reaches the wire** — a refusal is indistinguishable from a server fault |
| 7 | `aiCommandRoutes.mjs:283` | **R6-05 (new in round 6):** the `/execute` handler's **outer** `catch` → `res.status(500).json({ success:false, error:'Internal server error processing your command' })` | **a THROWN rejection** — see below |
| 8 | `debate/debateOrchestrator.mjs:480` | **R7-02 (new in round 7):** `executeRound`'s `catch` calls `recordDebateFailure`, emits `round_failed`, and **returns `null`** — the caller treats the round as failed-but-continue, and the job finishes | **an ASYNCHRONOUS job** — there is no request left to fail. See below |

**Rows 5 and 7 are two different paths through the same route, and rounds 3–5 conflated them.** Row 5 is
`if (ctx.error)` — the pipeline **returned** an error object. Row 7 is the `try/catch` wrapping the whole
handler — the pipeline **threw**. A contract naming only one leaves the other untyped, and the round-5 table
asserted a *"chain of six"* that covered the returned path only. **Round-6 R6-05 reproduced the gap:** the
exact extracted `/execute` handler, given a synthetic pipeline rejection carrying
`code:"PRIVACY_UNAVAILABLE"`, returned **HTTP 500** with `"Internal server error processing your command"` and
**no privacy code**.

**Row 8 is a different SHAPE, not merely another site — and that is why six rounds of `catch`-enumeration
missed it (round-7 R7-02).** The debate path runs as an **asynchronous job**. A privacy rejection inside
`executeRound` is swallowed into a `null` round, orchestration continues, and the job reaches a **success
terminal state**. Astra reproduced it: injecting `PRIVACY_UNAVAILABLE` on round 2 produced **one additional
provider-boundary call**, two stored successful rounds, and final state **`complete`**. Propagating the
exception instead reaches `runDebate:217` and yields **`partial`** with a **salvaged plan**.

Two consequences this contract must carry, and **neither is expressible as "another `catch` site"**:

- **A refusal inside an async job cannot become `503`.** The start request has already returned. The refusal
  must be recorded in the **job's own state** and surfaced through **polling/SSE** — so the required behaviour
  is *"the job terminates in a distinct privacy terminal state"*, not *"the route returns 503"*.
- **"Terminal" must be enforced, not assumed.** No subsequent provider call and **no salvage** may follow a
  privacy refusal. A `partial` result carrying a salvaged plan is a **leak**, not a degraded success.

**Absorber 2 was missed by round 3; absorbers 3 and 6 by round 4; absorber 7 by round 5; absorber 8 by round
6.** A `continue` in a provider failover loop means a privacy rejection can cause the request to be
**re-sent to a different provider**, and absorber 3 re-sends it to a **different model on the same provider**.
Both `continue` **without inspecting the error's type**, so a typed refusal is treated as a transport fault.
Fixing only the classifier's `catch` therefore does **not** produce the specified `503`; the whole chain must
carry the rejection.

**The lesson this table keeps re-teaching, now with a third dimension.** An inventory of failure handlers is
not closed by enumerating `catch` blocks you know about. It is closed by tracing the call graph for the
specific rejection you care about, at every level, including:

1. **nested retries and failover loops** — absorbers 2 and 3, both `continue` without inspecting the error;
2. **the handler's own OUTER `catch`**, which catches what an inner one re-throws — absorber 7;
3. **every caller of the provider entry point, including ASYNCHRONOUS jobs** — where the failure surfaces as a
   **terminal job state** rather than an HTTP status — absorber 8.

**That walk has now been requested twice — by round 5's own fix, and again by round 7's packet — and performed
zero times.** Absorber 7 was found by round 6 and absorber 8 by round 7, each by the **reviewer**, not by the
trace. **An inventory that grows by one item per round is not an inventory; it is a symptom.** This contract
therefore does **not** claim the chain is complete. It states the **method** that would close it, and records
that the method has not yet been executed.

**The refusal must also be representable.** The `HarnessErrorCode` union in the coach-cc package's
`03-contracts.md` has **no privacy code**, so even a correctly propagated rejection has no wire
representation. Round-4 **R4-04**; `privacy_unavailable` is added there.

Stated once: **a privacy rejection must be a typed, non-retriable error that no generic `catch` may
absorb, no failover loop may retry — by provider or by model — no route may flatten into a 200 or a generic
500, and no asynchronous job may continue past it or salvage a result from it.** Whether the live route should
reject or fall back is an **operator decision** (`07-checkpoints.md`) — this contract fixes only that the
outcomes must be *distinguishable*, that none may produce a provider call, and that a refusal is **terminal**.

