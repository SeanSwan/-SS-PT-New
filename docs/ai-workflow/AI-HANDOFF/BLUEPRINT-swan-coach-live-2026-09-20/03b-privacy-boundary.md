---
decision: "privacy-boundary@1.2.0 is the single authoritative outbound privacy contract: an allowlist applied at three points, a provenance-scoped release predicate, and typed non-retriable failures. It is consumed by BLUEPRINT-coach-cc-ai-harness-2026-09-20 by version pin."
status: open
supersedes: "03-contracts.md §4.3 (positive admission) and §4.4 (canary verification) — moved here in round 3, unchanged in substance except where marked"
---

# 03b — Privacy boundary `privacy-boundary@1.2.0`

**Why this file exists.** Round-3 review **R3-02** found that this package and
`BLUEPRINT-coach-cc-ai-harness-2026-09-20/` referenced a shared defect but **not each other's
remedies**, so no agreed relationship existed between the early scanner expansion and the final
outbound gate. A gate specified in two places is specified in neither. This file is the one place.

**Why not `03-contracts.md` §4.3.** That file is 235 lines and `06-bans.md` §1 caps a file at 300 by
`wc -l`. The full contract does not fit. It is extracted here rather than truncated.

**Why §6 now lives in `03c-release-predicate.md` and §7 in `03d-context-channels.md`.** Round-5 **R5-08**
measured this file at **298 lines against the 300-line cap** — the seven lines of headroom its own §9 had
claimed were already gone, because the round-4 fixes grew the file after §9 was written. §9's standing
instruction is to **split** rather than breach the cap, so §6–§7 were extracted to `03c` in round 5. Round 6
then measured **`03c` at 309 lines**, so §7 was extracted onward to `03d`. Nothing was deleted; both
extractions are recorded at their destinations.

---

## 1. Authority and the reciprocal pin (R3-02)

| | |
|---|---|
| **Contract id** | `privacy-boundary@1.2.0` |
| **Authoritative for** | the outbound privacy gate: what it filters, where it runs, what licenses sending, how it fails |
| **Consumer** | `BLUEPRINT-coach-cc-ai-harness-2026-09-20/` — requirement **H06** ("Enforced provider privacy boundary"). It **references** this contract and must not restate it. |
| **Reciprocal pin** | the coach-cc package pins `privacy-boundary@1.2.0` by id **and version** in its `03-contracts.md`; this file pins that package's `03-contracts.md` in return. |
| **Split** | §6 (release predicate) is in `03c-release-predicate.md`; §7 (context channels) is in `03d-context-channels.md`. Same contract id and version throughout. |
| **Change rule** | a change to this file, **`03c` or `03d`**, is a **version bump plus a `07-checkpoints.md` decision**, never a prose edit. The consumer is updated in the same change, or the pin is broken and the gate is unimplementable. |

**Division of labour, so the two contracts cannot drift:**

- **this contract owns** — the gate, its placement, the failure and fallback rules, and the canary
  assertions;
- **`03c` owns** — the release predicate, provenance scoping, and the admission schema;
- **`03d` owns** — the context channels: the C6a/C6b split, the verified seven-field emission list, and the
  second emitter;
- **the coach-cc package owns** — the command/response harness contracts, replay and expiry, and the
  **shared acceptance tests** that exercise this gate *through the dispatcher* (§8);
- **neither owns** — the detector's coverage limits (R2-02, unchanged) or the operator's decision on
  reject-versus-fallback for the live route (`03f-absorber-chain.md` §5).

---

## 2. What the allowlist filters — the object is NOT supplied (PART C-1)

The gate is an **allowlist of permitted outbound fields**, applied to the **final serialized provider
request** — after every context channel has been assembled, not before.

`OUTBOUND_ALLOWLIST` filters **one object: the provider request envelope** — the exact bytes handed to
the provider adapter, i.e. the object whose `messages[]` array carries the serialized body.

**That envelope's wire schema is not supplied in any reviewed artifact.** Therefore:

- the names below **must not** be treated as that schema. They are the *pipeline-side* names of the
  channels that contribute content. The envelope's field names, nesting and any provider-injected
  fields are **UNKNOWN** and must be captured from the adapter before this gate is implementable;
- until that capture exists, "apply the allowlist to the final request" is **not implementable** and
  must not be reported as done. The capture is an **S0 prerequisite** (`04-build-order.md`).

```ts
// PROPOSED — pipeline-side channel names, NOT a wire schema.
const OUTBOUND_ALLOWLIST = ['message', 'previousContext', 'routeContext', 'systemPrompt'] as const;
```

---

## 3. Three enforcement points, not one (PART C-2; P2 corrected in round 4)

Filtering object keys **after** assembly cannot remove text already interpolated into a string.
`selectedClientName` is excluded from the allowlist yet is interpolated into `contextualMessage`
(`intentClassifier.mjs:118-120`), and `routeContext` is re-emitted as prose by `buildRouteContextLine`
(`:28-51` → `:116`). So the boundary needs **three** points:

| # | Point | What it enforces |
|---|---|---|
| **P1 — pre-assembly projection** | before any channel is interpolated | only **permitted inputs, in an approved representation**, may enter assembly at all. An inadmissible input is **rejected**, not dropped later. Admission is defined executably in `03e-admission-schema.md` §6.1. |
| **P2 — per-class inspection** | on the assembled body **as semantic text, before transport encoding**, **per provenance class** | O segments are admitted by **content-hash identity** and are **NOT content-scanned** (`03c` §6.0, **R6-01**); U and P segments receive the **full detector**. This is **not** a scan of the assembled body as one string — round-7 **R7-03** found that rule inconsistent with hash-only O admission, and a whole-body scan is what produced the R5-02/R6-01/R7-01 false positives |
| **P2c — composition check** | on the assembled body, after P2 | detects a prohibited signal that exists **only in the adjacency** of segments. Reproduced: `202`, `555` and `1234` each pass the detector individually; `202-555-1234` is flagged (`CONCAT_ONLY_SIGNAL=true`). **A different question from P2 and not implied by it** — per-segment admission cannot see a signal created by concatenation (round-7 **R7-03**) |
| **P2b — binding** | on the serialized request, immediately before dispatch | the inspected text is **bound to the exact bytes that cross the wire**, so nothing can be substituted between inspection and dispatch |

**P2 must not run on the serialized JSON.** Round-4 finding **R4-02**, independently reproduced
(`tmp/coach-cc-ai-harness-20260920/probe-r4-json-escape-gap.mjs`): JSON encoding escapes whitespace, and
the shipped phone pattern (`phiScanner.mjs:31`, character class `[-.\s]`) accepts whitespace. A number
separated by newlines or tabs is therefore **detected in memory and missed on the wire** — while the
provider, which decodes the escapes, sees the separators again:

| input | `scanForPHI` in memory | `scanForPHI` on the serialized bytes | provider decodes to |
|---|---|---|---|
| `202`⏎`555`⏎`0199` | `true` | **`false`** | the same three groups — **detected again** |
| `202`⇥`555`⇥`0199` | `true` | **`false`** | the same three groups — **detected again** |
| `202-555-0199` | `true` | `true` | — |
| `123-45-6789` | `true` | `true` | — |

Measured: `FALSE_NEGATIVE_COUNT=2`, `R4_02_REPRODUCED=true`. P2 inspects the **semantic text**; P2b proves
that text is the content the provider will decode. **Scanning the serialized body is not equivalent to
scanning what the provider reads — it is strictly weaker, and it fails in the direction that leaks.**

**P1 alone is insufficient** — assembly can introduce content. **P2 alone is insufficient** — by the
time it runs, origin is lost and a leak cannot be attributed to a channel. **P2b alone is insufficient** —
it inspects encoded text. None substitutes for another, and *relocating the existing detector satisfies
none of them*.

---

## 4. Scope: a dedicated provider request (PART C-3)

P1/P2 apply to a **dedicated provider-request object built for dispatch**. They must **not** be applied
wholesale to the pipeline's options object, which carries non-provider fields such as
`selectedClientId` and a live `sequelize` handle. Projecting that object would either strip execution
context the pipeline needs or admit it into the provider request. **Build the request explicitly; do
not filter the options bag and call it the request.**

---

## 5. Failure propagation — moved to `03f-absorber-chain.md`

Section 5 - the required behaviour per failure condition, the **eight-site absorber chain**, the argument why the chain is not closed, and the trace method that would close it - now lives in **`03f-absorber-chain.md`**, under the same contract id `privacy-boundary@1.2.0`. It was extracted in round 7 when this file reached **305 lines against the 300-line cap**. **Nothing was deleted and §5 keeps its number**, exactly as §6-§7 did when they went to `03c`.

**The one-sentence form, which §2-§4 and §8 still depend on:** a privacy rejection must be a typed, non-retriable error that no generic `catch` may absorb, no failover loop may retry - by provider or by model - no route may flatten into a 200 or a generic 500, and no asynchronous job may continue past it or salvage a result from it. A refusal is **terminal**.

---

### 5.1 Rules (moved from `03-contracts.md` §4.3; rule 2 corrected in round 4)

1. A field not on the list is **dropped**, not passed through.
2. Every allowlisted field is scanned **as part of the assembled body, as semantic text, per provenance
   class** — not individually, and **not after transport encoding** (§3, **R4-02**; `03c` §6.0, **R5-02**).
3. **Fail closed.** If privacy cannot be **established** — see `03c` §6 — the request is **not sent**.
   `503 PRIVACY_UNAVAILABLE`.
4. **Rejected input produces zero provider calls.** Not a truncated call, not a retry, **and not a
   failover to another provider or another model** (absorbers 2 and 3).
5. Regex redaction is **defence in depth, never proof of coverage** (R2-02).
6. **A detector's verdict is valid only within the input class it was calibrated for.** The shipped scanner
   is calibrated on raw user dictation; applying its fuzzy pass to operator-authored prose produces
   false positives by construction (`03c` §6.0, **R5-02**).

---

## 6–7. Release predicate and context channels — moved to `03c` and `03d`

The **release predicate** (what "privacy is established" means, provenance classes, the admission schema)
is specified in **`03c-release-predicate.md`**, and the **context channels** (the C6a/C6b split and the
verified seven-field emission list) in **`03d-context-channels.md`** — both under the same contract id
`privacy-boundary@1.2.0`.

§6–§7 were extracted in round 5 because this file reached **298 of 300 lines** (**R5-08**) and §9's own
instruction is to split rather than breach the cap. That extraction changed the predicate's meaning — the
provenance scoping of P3 is new — which is why the id moved to `@1.1.0` (**R5-06**). **Round 6 then measured
`03c` at 309 of 300 lines**, so §7 was extracted onward to `03d`; the id did **not** move a second time,
because a split moves bytes without changing meaning.

---

## 8. Canary verification (mandatory; tests live in `09-tests.md` T-04)

Inject a **distinct** synthetic canary into **each** of C4/C5/C6a/C6b/C7, then assert on the **final
serialized bytes handed to the provider adapter** — not on an intermediate object. A per-channel canary
is required because one shared canary cannot tell you *which* channel leaked.

Seven assertions are required. **The first two are the ones usually skipped:**

1. **Dispatcher call count.** For a rejected request, assert the provider adapter was called **zero**
   times — instrument the **dispatcher**, not the scanner. This is the assertion that catches a fallback.
2. **The fallback path.** Force a privacy rejection on the classification dispatch and assert it
   surfaces as `503 PRIVACY_UNAVAILABLE` rather than being absorbed into a chat result — and assert the
   **provider failover loop does not re-send** it, **by provider (absorber 2) or by model (absorber 3)**.
3. **Repeated identifiers.** Two occurrences of the same identifier, and two different identifiers, in
   one field — R2-02's missing `/g` means only the **first** is enumerated.
4. **Detector false negatives — by channel, not by content.** Names are not detected at all today
   (R2-02). The assertion is therefore **channel-scoped**: a name arriving through a **context** channel
   must be **blocked by P1** — assert it never reaches assembly, and that the detector's `hasPHI:false`
   never became the reason it passed. **Round-5 R5-01 sharpened this:** because `previousContext` is now
   **server-held state referenced by id** (`03e-admission-schema.md` §6.1), a *replayed* admitted turn is re-emitted as
   user-authored content and is **not** a name "injected into a context channel". The test must assert the
   caller **cannot supply** a context array at all — a supplied one is a rejection — rather than asserting
   that a name in a supplied array is blocked.
5. **Serialization escapes (R4-02).** Run every canary **twice**: once as semantic text and once through
   the **production** serializer, then assert the **provider-decoded** content is clean. Whitespace-separated
   identifiers are the regression case — `202`⏎`555`⏎`0199` and `202`⇥`555`⇥`0199` are detected in memory
   and **missed on the wire** (`probe-r4-json-escape-gap.mjs`: `FALSE_NEGATIVE_COUNT=2`). Include newline,
   tab, and escape-sequence cases; a suite that only tests dash-separated identifiers passes while the
   leak ships.
6. **The chat path is a separate emitter.** `aiChatRoutes.mjs:710` appends
   `buildSelectedScheduledSessionPromptBlock(...)` to `systemPrompt` — route-context-derived content that
   `buildRouteContextLine` never sees. The classifier formatter is **not** a complete emission inventory;
   give this path its own canary and its own P1/P2 coverage.
7. **The false positive is asserted, not assumed away (R5-02).** Assert **both** halves: that the raw
   scanner **flags** the approved template (`scanForPHI(template).hasPHI === true`, matches
   `["dates (≈diabetes)"]` — reproduce with `probe-r5-template-vs-scanner.mjs`), **and** that the gate does
   **not** refuse an ordinary classification request. A suite that only asserts the second half would pass
   against a gate that had simply stopped inspecting operator content; a suite that only asserts the first
   would pass against a gate that refuses all traffic. The pair is the assertion.

---

## 9. Status

**Size — and a rule about self-description.** **A document cannot reliably assert its own line count: this
sentence is part of the count, so writing the number changes the number it states.** Round-5 **R5-08** is the
proof — the previous §9 claimed **293** when the file was **298**, and the seat propagated that stale figure
into two summaries as fact. The first draft of *this* section then wrote *"236"* and *"218"* from
recollection; both were wrong. It was corrected to a measured value — and a **one-line edit to this file
immediately invalidated the correction.** Three attempts, three stale numbers.

**So this section states no number. Run the check instead:**

```bash
# every file <= 300 (06-bans.md §1)
wc -l 03b-privacy-boundary.md 03c-release-predicate.md 03d-context-channels.md \
      03e-admission-schema.md 03f-absorber-chain.md
```

The splits are what keep that true: §6–§7 moved to `03c` at **298 of 300**, §7 on to `03d` when `03c` hit
**309 of 300**, and §6.1/§6.1a/§6.2 on to `03e` when `03c` hit **353 of 300** — all three measured, and all
three measurements are why the splits happened. **The cap is a check, not a claim**: `03c` §8 asserted
compliance at the moment it was in breach, and round 7 then grew the file to 353 **precisely because** that
section had been rewritten to refuse to state a size. *Refusing to measure is not staying small* — so this
section, too, names the command rather than the number.

`[PROPOSED]` throughout. **Not implemented, not exercised, not reviewed in this form.** The round-3
review that produced these requirements is
`Z:/HostileReviews/2026-09-20-041522-coach-command-center-ai-harness-round-3-the.md`; the round-4, round-5
and round-6 replies are `tmp/coach-cc-ai-harness-20260920/REPLY-R4.md`,
`tmp/coach-cc-ai-harness-20260920/REPLY-R5.md` and
`tmp/coach-cc-ai-harness-20260920/REPLY-R6.md`. The adjudication
against the shipped code is the coach-cc package's `ADJUDICATION-R3.md`, `ADJUDICATION-R4.md`,
`ADJUDICATION-R5.md` and `ADJUDICATION-R6.md`.
