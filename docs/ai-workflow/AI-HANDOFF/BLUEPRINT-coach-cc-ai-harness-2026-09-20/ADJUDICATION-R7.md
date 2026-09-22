# ADJUDICATION-R7 — the seat's verdict on Astra's round-7 hostile review

**Subject:** `BLUEPRINT-coach-cc-ai-harness-2026-09-20` + `BLUEPRINT-swan-coach-live-2026-09-20`
**Review:** round 7 · `Z:\HostileReviews\2026-09-21-021859-coach-command-center-ai-harness-round-7-hostile.md` (filed by the seat from `REPLY-R7.md`)
**Reply packet:** `tmp/coach-cc-ai-harness-20260920/PACKET-R7.md` — SHA-256 `ebe266bac40bf605e57a560170f83ad57b446123ea00e255b600dcb300b55552`
**Reply:** `tmp/coach-cc-ai-harness-20260920/REPLY-R7.md` — 8,997 bytes, verdict **REVISE — five new findings**

---

## 1. Provenance — what was actually run

| Field | Value |
|---|---|
| Transport | `codex exec` via `scripts/consult-astra-subscription.mjs` (ChatGPT subscription) |
| Requested model | `gpt-6-astra` |
| Served model | **NOT OBSERVABLE** — `codex exec --json` emits no model field (`identityUnverifiableReason`). See §4.1 |
| Reasoning effort | `xhigh` |
| Tokens | in **2,967,095** · out **20,011** · reasoning **8,033** |
| Wall | **789.0 s** |
| Mega Blueprint | **not armed** (verified absent from packet and remit before dispatch) |
| Egress redaction | **1 redaction before send** — `<REDACTED-PHONE>` ×1 (`run-r7.log`) |
| Marginal cost | **$0** — subscription leg, no OpenRouter, no metered fallback |

**The input tokens are the finding, not the trivia.** 42,514 (r3) → 1,426,042 (r4) → 1,534,287 (r5) →
1,914,033 (r6) → **2,967,095 (r7)**. `codex exec` is an *agent*: it loads this repo's instruction files and
skill index on every call. **A packet is a guide, not the evidence** — the reviewer reads the tree.

**Round 7's sandbox blocked Git, Node and Bash.** Astra said so plainly in its own reply and marked runtime
claims **UNVERIFIED** accordingly. This matters for adjudication: its two "reproduced" findings were
reproduced in **isolated JS probes over extracted source**, not against the live routes — so the seat
**re-reproduced both** rather than inheriting them (§3.1, §3.2). Astra's honesty about its own evidence
ceiling is the reason this round is usable at all.

---

## 2. Findings — 5 reported, all CONFIRMED

| ID | Sev | Astra's finding | Seat's verdict | Seat's own evidence |
|---|---|---|---|---|
| **R7-01** | HIGH | The interpolation remedy still rejects ordinary classification: `${commandList}` is P-class and its shipped text trips the detector | **CONFIRMED — and WORSE than reported** | `ROLES_WITH_FLAGGED_COMMAND_LIST=3/4`, not 1/4. See §3.1 |
| **R7-02** | HIGH | The seven-site remedy misses the **asynchronous** debate branch; a refusal becomes `null` and the job finishes `complete` | **CONFIRMED, reproduced** | `debate/debateOrchestrator.mjs:405` → `:480-486` `catch` → `return null`. Four `sendChatMessage` callers, not three. See §3.2 |
| **R7-03** | MED | P2's composition contract contradicts hash-only O admission; the segment map has no interface | **CONFIRMED** | `CONCAT_ONLY_SIGNAL=true`: `202`/`555`/`1234` pass individually, `202-555-1234` flags. §3.3 |
| **R7-04** | MED | The admission record has **no producer contract** — specified only on read | **CONFIRMED** | §6.1a now carries a seven-row write-obligation table. §3.4 |
| **R7-05** | MED | Round 6 changed meaning but kept `@1.1.0` | **CONFIRMED — and it is the SEAT'S OWN error** | 22 current-state pins across 12 files; 4 historical mentions preserved. §4.2 |

**Zero of five were rejected.** That is not a good sign for the seat; §4 accounts for why.

---

## 3. What the seat did for each finding

### 3.1 R7-01 — the fix was itself the defect

**Astra's reproduction, 1 role.** The shipped registry entry at `commandRegistry/clientCommands.mjs:149` is
`description: 'Show all active clients'`, interpolated into the classifier's **system** prompt by
`intentClassifier.mjs:57/74` via `buildCommandSummaryForClassifier`
(`baseSchemas.mjs:137-143`). `scanForPHI` flags it: `"all (≈ACL)"` — Levenshtein-1 from a PHI term.

**The seat's reproduction, all four roles** (`probe-r7-commandlist-and-composition.mjs`):

```
[premise ok] admin command list = 11453 chars
FLAGGED role=admin    chars=11453  ["all (≈ACL)","summary (≈surgery)"]
FLAGGED role=trainer  chars=8827
clean   role=client   chars=1169
ROLES_WITH_FLAGGED_COMMAND_LIST=3/4
R7_01_CONFIRMED=true
```

**Three of four roles, not one.** And "summary" is Levenshtein-1 from "surgery" — an unrelated collision in
the same entry set. The defect is not one bad string; it is that **the vocabulary is the content**, which is
exactly what R6-01 said one round earlier and then failed to apply to interpolated values.

**The deeper error, which Astra named and the seat had not.** R6-01's fix scoped *static template* bytes to
hash identity but left *"every interpolation result"* in **P** — so provenance depended on the **mechanism of
arrival** (was this instantiated from a template?) rather than the **source** (who authored it?).
**"Interpolation" is a mechanism, not a provenance class.**

**Applied:** `03c` §6.0 admits substituted **approved** values as **O**; the rule is now
*"a substituted value carries the provenance of its SOURCE, never of the act of substitution"*; the predicate
gained **P2c** (a composition check) and an explicit O clause. §6.1a gained a **producer contract** (§3.4).

### 3.2 R7-02 — a different SHAPE of absorber, which is why six rounds missed it

**Astra's reproduction.** Injecting `PRIVACY_UNAVAILABLE` on debate round 2 → **one additional
provider-boundary call**, two stored successful rounds, final state **`complete`**. Propagating the exception
to `runDebate:217` instead → **`partial`** with a **salvaged plan**.

**The seat's reproduction.** Confirmed the shape: `executeRound:405` calls `sendChatMessage`; its `catch` at
`:480-486` calls `recordDebateFailure`, emits progress, and **`return null`**. Four callers of
`sendChatMessage` exist — the three the round-6 walk found, **plus this one**.

**Why six rounds of `catch`-enumeration missed it, stated as the contract now states it.** Prior sweeps walked
the **synchronous** path: find a provider entry point, follow its callers, type the refusal, propagate it to
an HTTP status. **An asynchronous job has no request left to fail.** There is no status to set, so an
absorber here does not merely swallow a refusal — it renders it **invisible**, and the job reports success.

**Applied:** `03f-absorber-chain.md` §5 gains **absorber 8**, with both consequences the contract must carry —
a refusal inside an async job **cannot become 503** (it must surface as a **terminal job state** via
polling/SSE), and **"terminal" must be enforced, not assumed** (no subsequent provider call, **no salvage**;
a `partial` carrying a salvaged plan is a **leak**, not a degraded success). The lesson paragraph now names
**three dimensions**: nested retries/failover, the outer `catch`, and **every caller including async jobs** —
ending *"That walk has now been requested twice … and performed zero times."*

### 3.3 R7-03 — the interface that cannot carry the requirement

`03b` §3 said content is scanned *"as one string"*; hash-only O makes that impossible, because O is never
scanned. Worse, the segment map the fix requires **has no interface**: `buildProviderMessages` returns plain
`{role, content: string}[]`, which cannot carry per-segment provenance.

**The measured composition signal** (`CONCAT_ONLY_SIGNAL=true`): `202`, `555` and `1234` each pass the
shipped scanner individually; `202-555-1234` is flagged. So per-segment admission **cannot** be a substitute
for a defined composition check — the signal exists only in the adjacency.

**Applied:** P2 rewritten to *"O segments are admitted by **content-hash identity** and are **NOT
content-scanned** … This is **not** a scan of the assembled body as one string"*; **P2c** added as a distinct
predicate clause; the interface requirement stated as **unimplementable as written**, so a builder cannot
mistake the current `string[]` return for a carrying type.

### 3.4 R7-04 — specified on read is not specified

Astra: the admission record's storage and replay checks are defined, but *"neither package specifies the write
interface, when a turn becomes replayable, persistence-failure behavior, or how duplicate/interrupted
submissions affect admission records."* **Every failure mode in this mechanism is on the write side.**

**Applied:** §6.1a gained a seven-row **PRODUCER contract** — Creation, Immutability, Turn identity, Assistant
insertion, Publication ordering, Persistence failure (*"**Fail closed** — never fall back to the transcript"*),
Duplicate/interrupted submission — plus the tests that exercise the write path.

### 3.5 R7-05 — the seat's own error

Astra: `03b:35` requires a version bump for contract changes, and round 6 changed O admission, interpolation
treatment and replay storage while retaining `@1.1.0`.

**The seat argued the opposite in round 6** — reasoning that *a split moves bytes without changing meaning, so
the id does not move*. That reasoning is correct **for the split** and wrong **for the round**: round 6 did
both, and the semantic changes dominate. **The seat was defending a conclusion it had reached about one
change while a different change in the same round required the opposite.** See §4.2.

**Applied:** `@1.1.0` → **`@1.2.0`** at **22 current-state sites across 12 files**. **4 historical mentions
preserved** (`MANIFEST.md:79,104`, `00-README.md:29`, `03b:227`) — a deliberate departure from the usual
"never rewrite history" rule, because a **policy version currently in force** is not a record of what a past
round did. Round 7 itself carried **no** further bump, and `03c` now states why: R7-01…R7-04 changed *how*
the classes are described and closed a write-side gap; the set of admitted inputs is unchanged.

---

## 4. The seat's own errors this round

**4.1 `servedModel` remains unverifiable, and this is a standing note.** `codex exec --json` emits no model
field. Provable: the requested model, the effort, and `reasoningOutputTokens` (r5 4,696 · r6 5,226 · **r7
8,033**). Anything stronger would be an assertion about infrastructure the seat cannot observe. **Recorded
every round rather than assumed once.**

**4.2 The version-bump error was the seat's, and it was argued for.** Full account in §3.5. The generalizable
form: **a round can contain two changes and the seat adjudicated one of them in isolation.** The change rule
in `03b` §1 is about the **contract's meaning**, not about the individual edit — and a round is the unit of
the decision.

**4.3 The cap was breached a third time, and the round-6 fix made it invisible.** No finding named this; the
seat found it by running `wc -l`, and it is the most instructive error of the round:

- Round 6 rewrote `03c` §8 to **refuse to state a size**, on the correct ground that *"a document cannot
  reliably assert its own length."*
- Round 7 then added the R7-04 producer contract to §6.1a. `03c` measured **353 lines against the 300-line cap.**
- **Nothing noticed, because the section that would have said so had been rewritten to say nothing.**

*Refusing to measure is not the same as staying small.* The remedy applied is **a command, not a promise**:
`03c` §8 and `03b` §9 now both carry the `wc -l` invocation, and the instruction is to **run it after every
substantive addition, before the round's findings are declared applied.** This is the third consecutive round
this package has paid for the same defect class (R5-08, R6-08, and now this).

**4.4 Two splits followed, not one.** Fixing `03c` (→ **`03e-admission-schema.md`**, §6.1/§6.1a/§6.2) exposed
`03b` at **305 lines** — the seat's own cross-reference edit had pushed it over — so §5 went to
**`03f-absorber-chain.md`**. Both new files carry the same contract id, neither moved a section number, and
the read order, ownership map and contract lines were updated in `00-README.md`, `03-contracts.md` and
`09-tests.md`. **A split that is not propagated through the ownership map is a second specification** — the
R3-02 failure.

**4.5 A probe produced a false negative, and the seat nearly believed it.** The first run of
`probe-r7-commandlist-and-composition.mjs` reported `chars=0` for every role, which could have been read as
*"the command list is empty, so R7-01 is refuted."* Cause: `commandRegistry/index.mjs:47` requires an explicit
`initializeRegistry()`; import side-effects do not populate the registry. **A probe that produces no
observation has not refuted anything** — this is the seat's own skill §10g, and the seat walked into it. Fixed
by adding the call **plus a premise assertion that throws**, so the failure mode cannot recur silently:

```js
initializeRegistry();
const PREMISE = buildCommandSummaryForClassifier('admin');
if (PREMISE.length === 0) throw new Error('PREMISE FAILED: command list is empty');
```

Production was verified unaffected (`aiCommandRoutes.mjs:115` calls `initializeRegistry()` at module scope).

**4.6 The stale "six" copies survived a round of sweeps, again.** Astra named `03-contracts.md:73–86` and
`09-tests.md:157` explicitly. The `03-contracts.md` copy was not merely a wrong count — **the enumerated table
was missing absorber 7 entirely**, so the table and its own header had been contradicting each other for a
full round while both were being read. Fixed to **eight rows**, with absorbers 7 and 8 distinguished by
*why* they were missed (returned-vs-thrown; synchronous-vs-async).

---

## 5. Not fixed, and why — the honest list

| Item | Status | Reason |
|---|---|---|
| **`previousContext` / date channel** | **OPEN, disclosed** | The authoritative workout/session provenance is unverified and the caller-supplied date channel remains open. Astra explicitly did **not** re-count it. It is disclosed in the packet and unchanged. |
| **Approval laundering** | **UNVERIFIED** | No exploitable registry-write path was demonstrated, by either party. The approval/revocation lifecycle remains unspecified. Replacing a detector with **identity** moves the control to **approval**, and that control is not yet specified — recorded as such rather than claimed closed. |
| **T-04.14 mutation test** | **NOT RUN** | No runnable mutation mechanism exists. The test is a specification. Its effectiveness is **UNVERIFIED**. |
| **Production behaviour change** | **BLOCKED** | Astra's PART E condition 1 requires **Sean's R2-01 operator ruling** first. Five rounds old. |
| **Provider-envelope capture** | **BLOCKED** | S0 prerequisite; not obtainable from this seat. |
| **`lane-staged-guard.mjs:95`** | **OWED** | The one-line fix (`dir/` claims cover nothing beneath them; 14 void claims across 6 of 85 lane files). Not in this package's scope. |
| **`RECOMMENDATIONS-AFTER-R3.md`** | **UNCOMMITTED** | Carried forward; not part of round 7. |

**No file under `backend/` was modified this round, or this session.** Every backend path cited was read only.

---

## 6. Why the loop has not converged

Rounds 3/4/5/6 returned **5 / 5 / 7 / 7** findings. Round 7 returned **5 — and all five confirmed**, with one
being a defect *inside the previous round's fix* (R7-01) and one being the seat's own versioning error
(R7-05).

**The finding count is not falling, and it is not the same five.** The measure that matters is *what kind* of
finding keeps appearing. Two patterns are now named:

1. **The fix introduces the next finding.** R6-01 → R7-01 is a direct chain: the remedy for exact matching was
   a partial remedy that moved the problem one step.
2. **The inventory grows by one item per round** — absorbers 4 → 6 → 7 → **8**. `03f` §5 states the rule the
   seat should have learned two rounds ago: *"An inventory that grows by one item per round is not an
   inventory; it is a symptom."* The contract now states the **method** that would close it and records that
   the method has **not been executed**.

**Round 7's genuine advance** is that both patterns are now written into the contracts as named failure
modes, with the trace method specified — rather than left as a habit the seat keeps re-learning.

---

## 7. Status

**All five round-7 findings CONFIRMED and applied, plus five seat-found defects (§4).** The contract is now
specified across **five** files, all under the **300-line cap**, all sharing `privacy-boundary@1.2.0`, with
section numbers preserved and the ownership map propagated.

**Round 7 is filed, published, indexed and reciprocally linked** (`Z:\HostileReviews`, 81 → 82 reviews,
round 6 → round 7).

**CONVERGENCE: NOT REACHED.** Round 8's packet must open by asking what the *next* absorber's shape is, not by
re-walking the eight already known — and by naming which of the three dimensions in `03f` §5 remains
unexecuted.

`[PROPOSED]` throughout. **Not implemented, not exercised against the live route, not authorised.**
