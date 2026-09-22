---
decision: "Every planned test is NOT RUN until output is pasted; the two baseline failures are preserved with disposition, not waived."
status: open
supersedes: none
---

# 09 — Tests

**Status of everything in §2–§5: `NOT RUN`.** These are specifications. None may be reported as
passing without pasted output.

## 1. Baseline commands (re-measure; do not carry numbers forward)

Run from `frontend/`:

```bash
npx vitest run src/components/DashBoard/Pages/coach-assistant --reporter verbose
npx tsc --noEmit                       # from frontend/, exit code on its own line
for f in <touched files>; do wc -l < "$f"; done
```

**Recorded prior results are `[SUPPLIED]` historical claims, not verified facts of this build:**
coach folder 809 passed / 2 failed (127 files); `useCoachFreestyleDraft` 14/14; dock+page 31/31;
`tsc --noEmit` exit 0 repo-wide. **Re-measure against identified bytes** before relying on any of
them. A number inherited across a refactor is not evidence.

### 1.1 Mutation sensitivity — what it does and does not show

Swapping `commandTextRef.current` → `commandText` in `useCoachFreestyleDraft.ts` failed **exactly
one** test and left 13 green `[SUPPLIED]`. That establishes **mutation sensitivity**: the suite
detects that specific defect. It does **not** establish chronological test-first RED — no RED was
observed before the implementation existed — and it must not be described as such.

## 2. S1 — binding (T-01)

| ID | Given | Expect |
|---|---|---|
| T-01.1 | identical bindings | `sameBinding` true |
| T-01.2 | `authGeneration` differs | false |
| T-01.3 | `captureGeneration` differs | false |
| T-01.4 | `clientId` null vs "c1" | false |
| T-01.5 | `conversationId` differs | false |
| T-01.6 | `tenantId` differs | false |

## 3. S3 — consumption lifecycle (T-02) — **the core safety suite**

| ID | Given | Expect |
|---|---|---|
| T-02.1 | valid binding, non-empty snapshot | `handed-off`; `appendDictation` called **once** |
| T-02.2 | valid binding, empty snapshot | `empty`; **`onCommandTextChange` NOT called** |
| T-02.3 | logout mid-capture (`authGeneration`++) | `rejected:'stale-binding'`; **zero composer writes** |
| T-02.4 | client switched mid-capture | `rejected:'stale-binding'`; zero writes |
| T-02.5 | conversation switched mid-capture | `rejected:'stale-binding'`; zero writes |
| T-02.6 | composer unmounted | `rejected:'missing-target'`; zero writes; buffer purged |
| T-02.7 | **duplicate `onStopped`, same `snapshotId`** | second → `rejected:'already-consumed'`; exactly **one** append total |
| T-02.8 | **delayed callback after a new capture started** | `rejected:'capture-superseded'`; zero writes |
| T-02.9 | responsive remount between stop and consume | one append, not two |

T-02.7/T-02.8/T-02.9 exist because the session hook's protections guard **its** buffer; they say
nothing about a consumer that did not exist when they were written.

## 4. S2 — atomic composer (T-05)

| ID | Given | Expect |
|---|---|---|
| T-05.1 | empty composer | value == dictation, no leading separator |
| T-05.2 | composer "typed" | `"typed\n\ndictation"` |
| T-05.3 | **user edits between capture and append** | edit preserved **and** dictation appended after it |
| T-05.4 | duplicate `snapshotId` | `{applied:false,'duplicate'}`, value unchanged |
| T-05.5 | empty text | `{applied:false,'empty'}`, no separator written |
| T-05.6 | composer cleared between capture and append | dictation lands alone, no stray separator |

**T-05.3 decides the `[UNVERIFIED]` interleaving claim** in `01-architecture.md` §7. Report the
result honestly in either direction — if the current ref-mirror also passes, that is a finding
about the claim, and the claim should be retracted rather than quietly kept.

## 5. Privacy canaries (T-04) — M2/M3 gate, **specification only**

Each channel gets its **own distinct** canary; a shared canary cannot identify which channel leaked.
Assert against the **final serialized provider request bytes**, captured at the adapter.
**Contract:** `03b-privacy-boundary.md` + `03c-release-predicate.md` + `03d-context-channels.md` + `03e-admission-schema.md` + `03f-absorber-chain.md` (`privacy-boundary@1.2.0`).

**Exactly ONE expected disposition per fixture (round-4 R4-05; the disjunction removed in round 5 by
R5-05).** Round 4 required each row to state an *outcome* rather than a *condition*. Round 5 found the
outcomes were themselves a disjunction — *"**absent**, or the request is **refused**"* — and **a disjunction
is satisfied by its worst branch**: a pipeline that silently drops the offending field and dispatches anyway
satisfies both readings. That is the "drop and send" behaviour P1 exists to forbid — `03b` §3 states an
inadmissible input is **rejected, not dropped later**. Each fixture now names **one** disposition:

| Disposition | Meaning | Assertion |
|---|---|---|
| **REFUSED** | the request is **not sent** — `503 PRIVACY_UNAVAILABLE` | dispatcher call count `== 0` |
| **DROPPED** | the field is removed from the envelope and the request **is sent** | canary absent from the bytes **and** dispatcher call count `== 1` |
| **PRESENT** | the value survives to the wire | canary present in the provider-decoded bytes |

**REFUSED and DROPPED are never alternatives for one fixture.** They are different assertions with different
dispatcher call counts, and a fixture that accepts either cannot detect the defect it was written for.

| ID | Marker / canary in | Class | Disposition | Required outcome |
|---|---|---|---|---|
| T-04.1 | `message` (admitted text) | permitted | **PRESENT** | present in the bytes, through production serialization |
| T-04.2 | caller-supplied `previousContext` array | prohibited | **REFUSED** | **zero dispatches.** `03e-admission-schema.md` §6.1 admits `previousContext` **only** as server-held state referenced by id; a supplied array is inadmissible in any form. Covers **R2-01** |
| T-04.3a | `routeContext` (**C6a**) carrying a non-enumerated `source` (e.g. `123-45-6789`) | prohibited | **REFUSED** | **zero dispatches.** Seven emitted fields, `03d` §7.1 |
| T-04.3b | `selectedClientName` (**C6b**) | prohibited | **REFUSED** *if supplied* | **inactive on this route** — the one caller hardcodes `null` (`aiCommandRoutes.mjs:164`). Assert the *classifier's* handling directly; the route cannot produce it |
| T-04.4 | conversation history | prohibited | **REFUSED** | **zero dispatches** |
| T-04.5 | two identifiers of one kind | prohibited | **REFUSED** | **zero dispatches**; covers **R2-02** first-match-only |
| T-04.6 | a spoken client name in a **context** channel | prohibited | **REFUSED** | blocked by **P1** — see §5.1 |
| T-04.7 | scanner throws | — | **REFUSED** | **zero provider calls**; `503 PRIVACY_UNAVAILABLE`; **non-retriable** |
| T-04.8 | any rejected input | — | **REFUSED** | **dispatcher call count == 0** — assert the count, not "no leak" |
| T-04.9 | privacy rejection on the **classification** dispatch | — | **REFUSED** | `503 PRIVACY_UNAVAILABLE` — **not** a chat fallback and **not** a provider failover, **by provider or by model** — see §5.2 |
| T-04.10 | every permitted channel at once | permitted | **PRESENT** | each marker attributable to its own channel |
| T-04.11 | whitespace-separated identifier (`202`⏎`555`⏎`0199`) | prohibited | **REFUSED** | absent **both** as semantic text **and** in the provider-decoded body — **R4-02** |
| T-04.12 | route-context fields via `aiChatRoutes.mjs:710` → `systemPrompt` | prohibited | **REFUSED** | absent — **the chat path is a separate emitter**, not covered by the classifier formatter |
| T-04.13 | the approved template alone | permitted (**O**) | **PRESENT** | the gate **does not refuse** an ordinary classification request — **R5-02**. Asserted **together with** the raw scanner flagging it — see §5.3 |
| T-04.14 | operator-segment integrity: **altered bytes** · **unknown version** · **O check disabled** | — | **REFUSED** / **the suite must FAIL** | **R6-07** — the negative controls that make the O hash check load-bearing. The third is a **mutation** test. See §5.3 |

### 5.1 T-04.6 is a boundary test, not a detector test

`scanForPHI("log a workout for Jordan T., knee felt bad")` returns `hasPHI: false` — the detector does
**not** see names (R2-02, `[SUPPLIED]`). A test asserting "the name was detected" would be asserting a
blind spot as if it were coverage. The assertion is therefore **two-sided**: the **detector** passes it
(proving the blind spot still exists, so the test is honest about what it exercises) **and the boundary
refuses the request** — because P1 rejects an inadmissible input, and P3 alone is never the release
predicate (`03e-admission-schema.md` §6.2).

### 5.2 T-04.9 exists because a `catch` can absorb a rejection

`classifyIntent` awaits a provider call inside a `try` whose `catch` (`intentClassifier.mjs:170`) returns
a **chat fallback** (`:187`). A privacy rejection raised inside that awaited path is converted into a
fallback rather than propagated, so `503 PRIVACY_UNAVAILABLE` is **unreachable** there until the catch
distinguishes a privacy rejection from a provider error (`03b` §5, absorbers 1–7). **T-04.7 cannot pass for
the classification dispatch unless T-04.9 passes** — and whether the live route should reject or fall back is
an **operator decision**, not a test decision.

Note that `:173-184` **already** does the right thing in the narrow case: when classification fails it
re-checks PHI and returns a blocking clarification instead of falling back to chat. That is the shipped
precedent the general fix should follow, and it is evidence that the pattern is acceptable to this codebase.

### 5.3 T-04.13 asserts the false positive in both directions (round-5 R5-02)

The shipped scanner **flags the classifier's own fixed template**:

```
$ node tmp/coach-cc-ai-harness-20260920/probe-r5-template-vs-scanner.mjs
FLAGGED  the fixed template ALONE          ["dates (≈diabetes)"] ["medical_fuzzy"]
TEMPLATE_TRIPS_SCANNER=true
```

The template is extracted **verbatim** from `intentClassifier.mjs:59-90`. *"dates"* appears at `:64` and
`:69`, and `fuzzyMatchPHI` (`phiScanner.mjs:81-96`) accepts it as approximately *"diabetes"* — the length
guard passes (`|5 − 8| = 3` is not `> 3`) and `levenshtein("dates","diabetes") = 3 ≤ ceil(8 × 0.3) = 3`.
Under a naive whole-body zero-match rule this would refuse **every** classification request.

So T-04.13 is **one test with two assertions**, and neither alone is sufficient:

1. the **raw** scanner flags the approved template (`hasPHI === true`, match `"dates (≈diabetes)"`) — proving
   the false positive is real and still present; **and**
2. the **gate** does not refuse an ordinary classification request — proving the boundary is
   provenance-scoped (`03c` §6.0) rather than having simply stopped inspecting operator content.

Assertion 1 alone passes against a gate that refuses all traffic. Assertion 2 alone passes against a gate
that exempts templates outright. **The pair distinguishes a correct gate from both of those failure modes.**

**Round-6 R6-07: the pair does NOT distinguish a gate that bypasses operator inspection entirely — and round
5 claimed it did.** Reproduced counterexample: the raw scanner flags the template, a **bypass gate sends it**,
and **both assertions pass with ZERO operator inspections and ZERO hash checks.** The pair tests the
*outcome*, and a gate that never runs the O check produces the same outcome as one that runs it correctly.
**An O check that is never exercised is not a check.**

**T-04.14 — the negative controls that make the O check load-bearing.** Three fixtures; the third is the one
that matters:

| # | Fixture | Required outcome |
|---|---|---|
| **T-04.14a** | an approved template with **one character altered** | **REFUSED** — hash mismatch |
| **T-04.14b** | a template carrying an **unknown or absent version** | **REFUSED** — not in the registry |
| **T-04.14c** | the O inspection **or** the hash check **disabled in the gate** | **the suite must FAIL** |

**T-04.14c is a mutation test, not an assertion about the product.** A control that passes when the mechanism
is removed is not testing the mechanism — which is precisely how R6-07 slipped through round 5, where the
suite would have stayed green against a gate performing no operator inspection at all.

**And R6-01 changed what the O check IS.** Round 5 specified *"exact match against the enforced pattern set,
plus a version hash."* A shipped Coach chat template refutes the first half: `aiChatService.mjs:241` reads
`- If on Metformin: supplement B12`, and the shipped medication pattern flags it. **O is admitted by hash
identity alone and is never content-scanned** (`03c` §6.0). So T-04.14 is not an optional hardening — it is
the *only* thing standing between "O is verified" and "O is unchecked".

**Why this is a contract test and not a scanner bug report.** All three shipped `scanForPHI` call sites
(`commandAudit.mjs:32`, `commandExecutor.mjs:192`, `intentClassifier.mjs:175`) scan **user-derived text**;
none has ever scanned an assembled provider body. The scanner is not wrong — it is **calibrated for a
different input class**, and the proposed gate would have been the first to feed it another one. Whether the
resolution is provenance scoping (the contract route, taken in `03c` §6.0) or recalibrating `phiScanner.mjs`
itself (a `backend/` change, gated on the operator ruling) is **a recorded decision, not an implementation
detail**.

### 5.4 One disposition the contract states, one the shipped code takes — named, not hidden

`03b` §5 requires **fail closed**: a rejected input produces **zero provider calls**. The shipped pipeline
does not do that today, and it does **two different things in two places**:

| Site | Shipped behaviour | Contract requires |
|---|---|---|
| `commandExecutor.mjs:196-204` (`stepPHIScan`) | **strips** PHI from `ctx.sanitizedInput` and **continues** — the request is sent | **REFUSED** |
| `intentClassifier.mjs:176-184` | **blocks** — returns a clarification, no provider call | **REFUSED** (agrees) |

The two sites disagree with each other, which is why every fixture above must name its disposition: a suite
written against `commandExecutor`'s strip-and-continue behaviour and a suite written against the contract
would both be "green" while asserting opposite things. **Reconciling them is the operator decision in `03b`
§5**, and until it is made, T-04 fixtures assert the **contract's** disposition and are expected to fail
against the shipped code — which is what a specification is for.

## 6. The two baseline failures — PRESERVED, with disposition

**No blanket waiver.** Each is recorded with its evidence and a named disposition. They must still
fail after S0; if either starts passing, the tree changed underneath the baseline and the S0
evidence is void.

### BF-1 · `CoachIntakeResponsiveContract.test.ts`
- **Assertion:** page source contains `activeTab === 'chat' ? 'is-chat-tab'`.
- **Reality `[SUPPLIED]`:** the page says `'talk'`. Verified **at `HEAD`**:
  `git show HEAD:…/CoachCommandCenterPage.tsx | grep -n is-chat-tab` → line 149, `'talk'`.
- **Cause:** a source-text identity test that rotted after a `chat` → `talk` rename.
- **Pre-dates this package:** yes, proven against `HEAD`.
- **Disposition:** **OUT OF SCOPE — intake surface.** Do not fix here (`06-bans.md` §6). Fixing it
  would destroy the S0 baseline comparison.

### BF-2 · `CoachIntakeRetentionCandidates.identity.test.ts:25`
- **Assertion:** page source contains `<CoachIntakeWorkspace`.
- **Reality `[SUPPLIED]`:** occurs **0 times** at `HEAD`.
- **Cause:** same class — an identity test asserting on source text that moved.
- **Pre-dates this package:** yes, proven against `HEAD`.
- **Disposition:** **OUT OF SCOPE — intake surface.**

**Both are `DEFECTS-FOUND` against the intake surface and are recorded in the Rule 86 archive
review as D6. They are not this package's to close, and not waived.**

## 7. S4 receipts (T-06) · S5 UX (T-07) · responsive (T-08) · streaming (T-09) · size (T-10)

| ID | Expect |
|---|---|
| T-06.1–3 | three events emitted separately; `BUFFER_DESTROY` on every terminal path |
| T-06.4 | receipt payload scanned for fragment text → **zero matches** |
| T-06.5 | sink throws → deletion still happens; durability `unacknowledged`, never success |
| T-07.1–4 | capture lock: acquire, refuse-with-reason, release on error, release on unmount |
| T-07.5–12 | permission denied · unsupported · error-retained · empty · rejected-handoff · Esc=Pause · focus trap · discard initial focus on *Keep listening* |
| T-08.1–3 | ten widths: no horizontal scroll, no overlap, all targets ≥44 px |
| T-08.4 | **physical device**: mobile keyboard behaviour after handoff — decides the rAF claim. Emulator result = `NOT RUN` |
| T-09.1–8 | seq gap → error; cancel cancels upstream (**R2-09**); disconnect persists partial; reconnect reconciles by GET; duplicate send → same `messageId`; no auto-retry after ambiguity; delta cannot act; buffer bound enforced |
| T-10.1 | every touched file `wc -l` ≤ 300 — including every document in this package (**R2-10**) |

## 8. Test levels

Unit (pure merge, binding equality) · component (`renderHook`, RTL for overlay states) ·
integration (dock + control + overlay together) · contract (canaries at the adapter boundary) ·
manual/physical (T-08.4, M3 latency).

**How to capture the bytes — one shared rule for both packages (round-4 R4-05).** *"No mock may stand in
for the provider adapter in T-04"* (here) and *"provider adapters are recording fakes"*
(`BLUEPRINT-coach-cc-ai-harness-2026-09-20/09-tests.md`) read as a contradiction. They are not, once the
boundary is placed correctly:

- **Do not stub the assembly or the serializer.** The canary must travel through the **production**
  assembly and the **production** serializer, or the test proves nothing about what ships.
- **Do intercept the network transport.** Replace the outbound HTTP call, not the adapter. Serialization
  stays real; the call becomes harmless and observable.
- **Assert on the captured outbound bytes** — and per `03b-privacy-boundary.md` §8 item 5, assert again on
  the **provider-decoded** content, because JSON escaping is exactly where **R4-02** lives.

A recording fake that *fabricates* the body defeats the test. An intercepted transport that *captures* the
real body is the requirement. Both packages state it the same way, in one shared suite.
