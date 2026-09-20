# ADJUDICATION — round 2 (Astra hostile review)

**Review:** Astra, round 2 · `gpt-6-astra` via `codex-cli` on the ChatGPT subscription
**Effort:** `xhigh` (round 1 ran at `high`) · **reasoning tokens: 7,066** — the effort was *applied*, not
merely accepted (round 1 at `high` produced 3,465 on a comparable call; this is the §0.4a proof)
**Tokens:** in 51,434 / out 10,842 · **Wall:** 339.5 s · **Cost:** $0 (subscription; OpenRouter not armed)
**Served model:** **UNVERIFIED** — `codex exec --json` emits no model field, by construction. Requested
model is provable; the served identity is not. **Do not cite this as a verified-Astra review.**
**Packet:** `tmp/coach-cc-ai-harness-20260920/PACKET-R2.md`, 64,488 bytes, SHA-256 `d96e15b6e2aee131…`
**Reply:** `tmp/coach-cc-ai-harness-20260920/REPLY-R2.md` (17,988 chars) · Mega Blueprint **not armed** —
this was a hostile review, not a re-forge.

**Attribution:** the findings are Astra's; the repository-level adjudication below is the WorkBuddy
seat's. Astra could not read the repo — it reasoned from the packet's inlined excerpts, and it labelled
its grades honestly (supplied fact / independently reproduced / unknown).

---

## 1. Verdict on the retraction (Astra PART A)

Astra returned: **HOLDS for the shown pipeline's `message` path; the broader privacy conclusion remains
UNVERIFIED.**

**The seat concurs, and the distinction matters.** The retraction claimed exactly two things — that
`PIPELINE_STEPS` orders `stepPHIScan` before `stepClassify`, and that the declared order therefore
holds. Astra independently reproduced both from the inlined source. **The retraction stands.**

But Astra found the *reason the seat's supporting comment was still wrong*: ordering is not coverage.
See R2-01.

---

## 2. Findings, adjudicated

Every verdict below was re-measured against the repository, not argued from the review text.

| ID | Astra sev. | Seat verdict | Basis |
|---|---|---|---|
| **R2-01** | HIGH | **CONFIRMED — live** | see §2.1 |
| **R2-02** | MED | **CONFIRMED IN PART — their counterexample REFUTED** | see §2.2 |
| **R2-03** | MED | **CONFIRMED** — already inside the package's scope | §2.3 |
| **R2-04** | MED | **CONFIRMED** (3 of 5 sub-claims); one **REFUTED** | §2.4 |
| **R2-05** | MED | **CONFIRMED** — fixed | §3 |
| **R2-06** | MED | **CONFIRMED** — the seat's own overreach; and it refuted one of the seat's own sub-questions | §2.5 |
| **R2-07** | MED | **CONFIRMED** — fixed | §3 |
| **R2-08** | MED | **CONFIRMED** — fixed | §3 |
| **R2-09** | MED | **CONFIRMED as a mechanism** | §2.6 |
| **R2-10** | LOW | **CONFIRMED** — fixed | §3 |

### 2.1 R2-01 [HIGH] — CONFIRMED, and it is a live leak

**Astra's claim:** `stepPHIScan` scans `sanitizedInput`, but `classifyIntent` then *assembles* a larger
request from `previousContext`, route context, and `selectedClientName` — additions that bypass the scan.

**Measured, and it is worse than the claim's framing:**

- `aiCommandRoutes.mjs:121` — `const { message, selectedClientId, previousContext, routeContext } = req.body;`
  Both context fields are **client-supplied request-body values**.
- `aiCommandRoutes.mjs:166` — `previousContext` is passed into the pipeline **raw, unnormalized**.
- `commandExecutor.mjs:190-206` — `stepPHIScan` scans **`ctx.sanitizedInput` only**, which is `message`.
  It never sees `ctx.options.previousContext`.
- `intentClassifier.mjs:123-125` — interpolates it verbatim into the provider prompt:
  ``contextualMessage = `[Recent context: ${previousContext}]\n\nCurrent message: ${contextualMessage}` ``

**Therefore: PHI placed in `previousContext` reaches a third-party provider unscanned.** The channel is
reachable from the frontend (`useCoachCommand.ts:120` posts `opts.previousContext`).

**Two sub-channels the seat checked and cleared, narrowing the finding:**

- `routeContext` **is** bounded — `normalizeRouteContext` (`aiCommandRoutes.mjs:88-110`) filters it to
  `ROUTE_CONTEXT_KEYS` under a token pattern, plus normalized integers and ISO dates. Not free text.
- `selectedClientName` is hardcoded `null` at `:164`, so that interpolation is **dead in production** —
  consistent with the round-1 finding the seat recorded as not-live.

**Not fixed, deliberately.** Making the scan cover `previousContext` is a **production behaviour change
on the AI path**, and `commandExecutor.mjs` is the file S3 plans to *extract*. The package's H06
("final provider-request capture contains only admitted template content and fields") and its S4
boundary cases already own this. **Patching it ad hoc now would be an unreviewed change in a file
slated for restructuring, outside the review chain.** It is recorded here and put to Sean — see §5.

### 2.2 R2-02 [MEDIUM] — their counterexample REFUTED; a related defect CONFIRMED

**Astra's claim:** `stripPHI("x123-45-6789y", ["123-45-6789"])` leaves the input unchanged, because the
added lookarounds reject adjacent word characters — i.e. *detected but not removed*.

**The seat reproduced it against the shipped functions** (`probe-r2-02-strip.mjs`, calling the real
`scanForPHI`/`stripPHI`, not a reimplementation):

```
case      : R2-02 exact claim: word-adjacent SSN
input     : "x123-45-6789y"
hasPHI    : false          <-- the SCANNER never matches it
matches   : []
stripped  : "x123-45-6789y"
```

**REFUTED.** Their counterexample never gets detected, so there is no detection to fail to strip. The
claim's *shape* — "a detected match may survive stripping" — is not demonstrated by it.

**But the probe confirmed the second half of their finding, which they had ranked as secondary:**

```
case      : TWO distinct SSNs (enumerate?)
input     : "a 123-45-6789 b 987-65-4321 c"
matches   : ["123-45-6789"]                  <-- only ONE
stripped  : "a [REDACTED] b 987-65-4321 c"   <-- the second identifier SURVIVES
```

`scanForPHI` uses `text.match(pattern)` without `/g`, so it collects only the **first** match per
pattern. A message containing two identifiers has only the first redacted, and the scan still reports
`hasPHI: true` — so the pipeline believes it sanitised. **CONFIRMED. This is a real PHI leak.**

**And the probe surfaced a sharper finding of the seat's own — stronger than R2-02's framing.** The
Cortex Contract's own worked example, the exact sentence the seat used to justify D12 in round 1:

```
case      : client name + medical note
input     : "log a workout for Jordan T., knee felt bad"
hasPHI    : false
matches   : []
stripped  : "log a workout for Jordan T., knee felt bad"
```

**A client name and a symptom are not detected at all.** The seat's round-1 argument for D12 asserted
that this sentence "sends both a name and a medical note to a provider during classification" — the
detection half is now *demonstrated false*: the scanner does not flag it. **The D12 argument's example
was wrong even though its conclusion (the gate exists) was right.** Recorded so nobody re-derives it.

**Not fixed.** Same reasoning as R2-01: a change to `phiScanner.mjs`'s matching semantics is a
production behaviour change on the privacy boundary, and S4 owns it
(`coachHarnessPhiScanner.test.mjs` plans `obfuscated_fixture_rejected_or_blocked_by_admission` and a
negative-control case). The seat's round-1 residual — *"coverage is exactly the pattern set"* — was
**too generous**: it framed the limit as "a pattern miss", when the measured failure includes
*partial enumeration of a matched pattern*.

### 2.3 R2-03 [MEDIUM] — CONFIRMED, already inside the package's scope

`commandExecutor.mjs:229-233`: when `getCommand(intent)` returns nothing, the code rewrites
`ctx.intent.intent = 'chat'`. An unknown command therefore becomes a conversational outcome.
**CONFIRMED.** Astra's fix — return an explicit unsupported outcome — is what the package already
specifies: S1's `not_wired_never_falls_back` / `unknown_variant_fails_closed`, and S3's case 6
`ambiguous_action_never_returns_chat_fallback`. No new action; recorded as corroboration that the
package's S1/S3 cases target a real defect rather than a hypothetical.

### 2.4 R2-04 [MEDIUM] — the seat's own comment, CONFIRMED wrong; one sub-claim REFUTED

Astra's four sub-claims against the comment the seat had just written:

1. **"PHI is REMOVED" overstates the proven boundary.** **CONFIRMED** — see §2.1 and §2.2. The comment
   was true of `ctx.sanitizedInput` and false of the assembled provider request. **This is the third
   time this note has been wrong**, which is itself the finding.
2. **"second, independent check" implies more independence than exists.** **CONFIRMED** — it is a
   second *invocation of the same `scanForPHI`*, on the chat-fallback path. "Independent" was the wrong
   word. Corrected to "a re-check with the SAME detector".
3. **`LAST MODIFIED` is stale.** **CONFIRMED** — the header read `2026-04-09` while the seat was
   editing the file. Corrected to `2026-09-20`; `OWNER` left unchanged, as Astra correctly noted there
   is no basis to change it.
4. **"the excerpt proves route-local guards, not the absence of protection in parent mounts."**
   **REFUTED.** The seat checked the mount chain: `core/routes.mjs:642` mounts the route with
   `app.use('/api/ai-command', aiCommandRoutes)`, and **every** `app.use` in that file is a
   path-scoped route mount — there is no bare `app.use(middleware)` and no global PII middleware.
   `piiSanitizationMiddleware` is imported by `aiChatRoutes.mjs` (the chat lane), never by the command
   lane. The claim holds, and it now cites the mount site as well as the route's own guard list.

**Fifth sub-claim, upheld with a correction:** the seat wrote that the other three fields are "sent
VERBATIM". Verified: `useCoachCommand.ts:117-121` posts `message`, `selectedClientId`,
`previousContext`, `routeContext`. `previousContext` is verbatim end to end; `routeContext` is
verbatim **from the client** but normalized to an allowlist **server-side**. The comment now says so.

### 2.5 R2-06 [MEDIUM] — CONFIRMED; the seat's inference was an overreach

The seat's §5 in the round-2 packet asserted the per-process signing key applies *"in every environment
including production"*, inferred from `OPERATION_SIGNING_KEY` occurring nowhere in the repository.

**CONFIRMED as an overreach.** A deployment platform can inject environment variables with no
repository occurrence. The repository search establishes what the *repository* contains; it cannot
establish a *deployment* fact. **The seat's own rule — "a status claim must name whose state it
describes" — was violated by its own claim.** The correct statement is: *the key is set nowhere in this
repository; whether production injects it is UNVERIFIED and needs a caller-produced
configuration-presence receipt.*

**Astra also refuted one of the seat's own candidate sub-findings, and the seat accepts it.**
The seat had asked whether *"Operation expired or not found"* was a misleading message on a
cross-replica confirm. Astra: *"'Expired or not found' accurately includes an invisible replica-local
record; it is not a standalone false-expiry finding."* **Correct — that candidate finding is withdrawn.**
The seat's other sub-question was upheld: a restored record read under a different key would enter the
mismatch branch at `:166-173` and be **logged and audited as `SIGNATURE TAMPERING DETECTED`**, which is
the wrong label for a benign key difference. Today's restore path is UNVERIFIED.

**Astra's scoping of the ordering constraint was also correct and is adopted:** the signing key is
latent, not live, today (the process-local `Map` guarantees a verifying process signed the record), and
it must be enforced in **S2** when records become durable — not as a separate S0/S1 change.

### 2.6 R2-09 [MEDIUM] — CONFIRMED as a mechanism

`intentClassifier.mjs:128-130`: `Promise.race([sendChatMessage(...), timeoutReject])`. Rejecting the
timer settles the race; **it does not cancel the provider request.** The `catch` at `:170` can then
return `chat`, so a timed-out classification can be followed by a chat call while the original provider
request is still in flight. **CONFIRMED** as a mechanism; whether it produces a *duplicate live
request* depends on adapter-internal cancellation the packet did not supply — Astra marked that UNKNOWN
and the seat concurs. The package's `provider_timeout_has_no_automatic_retry_or_mutation` case targets
it; its acceptance must assert **no additional provider invocation**, not merely no mutation.

---

## 3. Fixed in this round

| Finding | Fix |
|---|---|
| **R2-04** | `useCoachCommand.ts` privacy docblock rewritten to the measured truth: names the `previousContext` gap, cites the mount site, corrects "independent check" → "re-check with the SAME detector", records the two probe measurements, and warns the next reader that this note has been wrong twice. `LAST MODIFIED` → `2026-09-20`. **Comment-only — verified: zero non-comment lines changed.** File is 246 lines (cap 300). |
| **R2-05** | `05-slices.md` S0 acceptance now requires an **approved per-slice implementation manifest** (paths, exports, imports, permitted edits, commands with working directories, requirement-linked evidence), explicit extraction targets for touched oversized modules, and the production-repair scope for the eight characterization targets. An unnamed entry is a named S0 blocker. |
| **R2-07** | `09-tests.md` S2 now requires the 120 s → 300 s change to be **pinned**, not assumed: validity at 120 s, rejection at the five-minute boundary, and the creation-to-expiry interval itself. Also flags the `<` boundary comparison and the hardcoded `"(120s)"` string at `destructiveOperations.mjs:151`. |
| **R2-08** | `09-tests.md` traceability table gains an **observable assertion** column, plus an explicit **dispatcher-spy** requirement for H07 (counted invocations, expected 0 — the existing case name asserts a *storage* outcome and could pass while a dispatcher was called), the same spy shape for H01/H05, named procedures for the budget/rollback obligations, and the expected return shape for `rejects_invalid_input_type`. |
| **R2-10** | `03-contracts.md` (352 lines) split at the natural boundary into `03-contracts.md` + `03b-contracts-proposed-artifacts.md`, mirroring the social-bridge `03b-` precedent. Both carry a caller note; `MANIFEST.md` updated with the new document count (11 → 12) and the reason. **All 17 package files are under 300 lines** (manifest convention, `split('\n').length`; `wc -l` reports one fewer). **Corrected 2026-09-20 — twice.** This row first read 170 / 180 / "16 package files"; the first correction, to 179 / 188, was *itself* stale within the same session, because editing the caller notes changes their own line counts. The per-part counts were therefore **removed from the prose and left only in `MANIFEST.md`**, which the splitter regenerates. A number that must stay in sync belongs in one place. |

---

## 4. NOT fixed — deferred with the reason

| Finding | Why not fixed | Owner |
|---|---|---|
| **R2-01 [HIGH]** — `previousContext` reaches the provider unscanned | Production behaviour change on the AI path, in the file S3 plans to extract. The package's H06 + S4 boundary cases own it. Fixing it ad hoc would be an unreviewed change outside the review chain. | **Sean's ruling** — see §5 |
| **R2-02 [MEDIUM]** — only the first match per pattern is enumerated; a second identifier survives | Same reasoning; `phiScanner.mjs` semantics change, owned by S4. | the builder |
| **R2-03 [MEDIUM]** — unknown command becomes chat | Already specified by S1 (`not_wired_never_falls_back`) and S3 case 6. | the builder |
| **R2-06 [MEDIUM]** — signing key latent, not live | Astra's scoping adopted: enforce in **S2** with the durable ledger, plus restart / second-process / missing-key / retained-key-version tests. No S0/S1 runtime change is justified. | the builder |
| **R2-09 [MEDIUM]** — timeout does not cancel | Needs the adapter contract supplied at S0. | the builder |
| Round-1 D1 / D4 / D5 / D6 | Unchanged from round 1. | Sean / the builder |

**Not fixed, and deliberately not re-litigated:** the round-1 findings Astra did not re-raise. Round 2's
remit was the retraction, executability, and what round 1 missed — not a re-audit of round 1.

---

## 5. The one thing that needs Sean's ruling

**R2-01 is the only finding in this round that is a live privacy leak, and the seat did not patch it.**

A coach's `previousContext` — client-supplied free text — is interpolated into the provider prompt
without passing the PHI scan. Bounded options:

1. **Extend `stepPHIScan` to cover `previousContext` (and any other assembled context) before
   classification.** Additive, matches the existing design (the step already strips), and makes H06's
   "final provider-request capture" true. *Con:* touches `commandExecutor.mjs`, which S3 restructures.
2. **Leave it to S4 as the package specifies.** *Pro:* respects the plan and the review chain; the fix
   ships with its boundary tests. *Con:* a known live leak stays open until the build runs.
3. **Drop `previousContext` from the request entirely** if the classifier does not demonstrably need it.
   *Pro:* removes the channel rather than policing it. *Con:* may degrade classification quality.

**The seat recommends option 1, scoped to the context channels only, with the existing strip semantics —
but not unilaterally, because it changes what a coach can send to a production AI path.** This is a
ruling for the *build*, not a blocker on this commit.

---

## 6. Verdict (Astra PART E, adjudicated)

Astra returned **HALT for implementation dispatch under this package's own checkpoint rules**, on the
grounds that S0 lacks essential source and interface evidence and the privacy comment needed revision.

**The seat concurs with the HALT, and notes its scope.** It is a HALT on *dispatching a builder against
this package* — which is correct and is what the package's own readiness receipt already says
(`Implementation readiness: S0 gate not passed`). **It is not a HALT on committing the review, the
package and the two comment corrections.** The package is explicitly `PLAN DRAFT — INTEGRATION
EVIDENCE REQUIRED`; the HALT is its intended state until S0 is satisfied.

Astra's own calibration is worth preserving: on PART B it observed that the S0-deferred dependencies
are *"an acknowledged gate, not seven separate defects"*, and it declined to inflate them into findings.
That is the difference between a review and a complaint.

**Still unproven:** production callers and context values, final provider admission, deployed
signing-key configuration, the corrected frontend `error` branch (`useCoachAssistant.ts:105-111` was
never inlined — Astra marked it UNVERIFIED rather than agreeing, which was the right call), the omitted
`03-contracts.md` contents in their pre-split form, all runtime tests, and archive filing.
