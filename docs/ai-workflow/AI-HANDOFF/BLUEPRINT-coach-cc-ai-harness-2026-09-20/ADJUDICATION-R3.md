# ADJUDICATION — Astra round 3 (Coach Command Center AI harness)

**Round:** 3 · **Reviewer:** sable (WorkBuddy seat) / `gpt-6-astra` via `codex-cli`
**Adjudicated:** 2026-09-20 · **Against:** `e8072247d` (the seat's last commit is `b5607b75e`)
**Seat verdict:** `HALT`, **advisory only**. Rule 46's Final-Decider gate is **not** satisfied by this
document, and nothing in it authorizes a merge or a commit.

## 0. Provenance

| Artifact | SHA-256 | Size |
|---|---|---|
| `tmp/coach-cc-ai-harness-20260920/PACKET-R3.md` | `c8eec28a88b15814da42ff94bb07679d7a80754e28933b19db0b007c352344b8` | 22,940 B / 427 lines |
| `tmp/coach-cc-ai-harness-20260920/REPLY-R3.md` | `a3dc02979c5dc173ae3e195898f5c08880182bc7af982f6cd23ebf44eecb1f2c` | 10,373 B / 94 lines |

Transport `codex-cli` · requested model `gpt-6-astra` · **served model NOT OBSERVABLE** (`codex exec
--json` emits no model field) · effort `xhigh` · `reasoningOutputTokens: 6249` (round 2 at the same
effort: 7,066 — same order, so depth was applied) · `megaBlueprint: false` · billing
`chatgpt-subscription`, **marginal cost $0**.

Both artifacts are under the gitignored `tmp/` tree (`.gitignore:146`), so neither is committed; their
hashes are the provenance record of what was dispatched and what came back.

## 1. Method — re-measured, not read

Every finding was re-measured against the **shipped** code rather than against the review text, and the
two questions the seat could not answer from the packet were answered by probe:

- `tmp/coach-cc-ai-harness-20260920/probe-r3-routecontext-channel.mjs` — exercises the shipped
  `ROUTE_CONTEXT_TOKEN_PATTERN` directly, and asserts the emit chain `intentClassifier.mjs:25 → :36 →
  :50 → :114 → :116 → :133` by exact line content. Result: `EMIT_CHAIN_COMPLETE=true`.
- `tmp/coach-cc-ai-harness-20260920/verify-line-refs-r3.mjs` — mechanically verifies all **23** line
  references written into the corrected docblock. Result: `BAD_LINE_REFS=0`.

## 2. Disposition of the three findings

| id | seat severity | Adjudication | Status |
|---|---|---|---|
| **R3-01** | MEDIUM | **CONFIRMED** — and the seat's own §3.1 pre-answer was **wrong** (§3.1 below) | PROVEN |
| **R3-02** | MEDIUM | **CONFIRMED, and broader than framed** — the seat's package contains *zero* references to the sibling, not merely no reference to its remedy | PROVEN |
| **R3-03** | HIGH | **CONFIRMED and upgraded from SUSPECTED to PROVEN** — the seat can read the full sibling contract, which the reviewer could not, and verified its rule set is exactly five rules with no success predicate (§5.1) | PROVEN |

The seat's answers to the three falsification targets the packet posed:

- **B1 — not a false dichotomy, and not a contest.** The two designs are complementary: Option 1 closes
  the demonstrated omission (`stepPHIScan` covers `ctx.sanitizedInput` while `stepClassify` receives
  more), and a final-serialized-body gate is what establishes a property of the assembled request.
  Neither alone is sufficient, and **relocating the existing detector does not repair its coverage
  limits** (R2-02). The seat's belief that Option 1 is the weaker fix is **confirmed but incomplete**:
  Option 1 is not merely weaker, it is **under-specified** — it never enumerated `routeContext` (D-A).
- **B2 — C6 is overstated, not wholly dead.** The reviewer agreed with the seat that
  `selectedClientName` cannot arrive through the quoted route, and disagreed that this makes the row
  dead. See §3.1.
- **B3 — the central correction HOLDS; no fourth substantive error established in it.** The reviewer
  asked for two precision edits and one maintenance change, all applied (§7).

## 3. Where round 3 corrected the seat

### 3.1 The C6 pre-answer was wrong — in the seat's own characteristic failure shape

The packet told the reviewer that the sibling's channel-map row
`C6 | routeContext / selectedClientName | R2-01 unscanned` was "a dead row". The reviewer's answer:
**"C6 conflates two different cases"** — `selectedClientName` is inactive on this route, while
`routeContext` **remains client-controlled after normalization**.

That is correct, and it is now proven by probe (D-A, §4). The seat's error was to generalise a
half-truth: `selectedClientName` *is* dead, and the seat extended that verdict to the whole row.
**This is the identical failure shape the seat's own docblock has been wrong three times for** — *"the
claim inherited the scope of the last read rather than the scope of the code."* The seat made that
error inside the very packet that asked the reviewer to attack it. It is recorded here rather than
quietly fixed, because the pattern is the finding.

Worse for the seat: the sibling package's own `03-contracts.md:156` and `09-tests.md` T-04.3 **already
treat `routeContext` as an unscanned R2-01 channel.** So did the seat's own round-2 archive entry — in
its finding, though not in its table (D-A, §4). The sibling was right; the seat's package was
incomplete, and the seat's comment called `routeContext` "bounded" and "not a free-text channel".

### 3.2 The packet mis-described the classifier's `message` parameter

The packet's §2.2 said the `scanForPHI` re-check at `intentClassifier.mjs:175` examines *"the original
parameter, not the assembled `contextualMessage`"*. The reviewer: on this route that parameter **is
already `ctx.sanitizedInput`** — sanitized and PHI-stripped — *"it is not the original raw request."*

Verified: `commandExecutor.mjs:211` passes `ctx.sanitizedInput` as the classifier's `message`. The
seat's point (it is not the bytes that left the process) stands; its description of *what the parameter
is* did not. Corrected here.

### 3.3 The seat's candidate defect was withdrawn — correctly refused

The seat had flagged `intentClassifier.mjs:142-144` (the `!result.ok` branch returns `intent: 'chat'`
without the PHI re-check that the `catch` performs) as a candidate defect. The reviewer declined to
endorse it without the fallback bytes: *"Do not report an additional fallback bypass without those
bytes."*

Measured: that branch returns a **literal object** and dispatches **no provider call**. There is no
dispatch to bypass. **The candidate defect is withdrawn as stated.** The reviewer's refusal was the
right call and the seat adopts it. A residual routing question (where an `intent: 'chat'` result is
then handled) is recorded as **UNVERIFIED** in §8, not as a finding.

## 4. Defects found during adjudication, not in the reply

### D-A — `routeContext` is a second unscanned channel for R2-01 [MEDIUM]

- **Evidence (probe, re-runnable):** `probe-r3-routecontext-channel.mjs`.
  `ROUTE_CONTEXT_TOKEN_PATTERN` (`/^[a-z0-9_-]{1,80}$/i`) — **PASS** for `Jordan`, `Jordan_T`,
  `123-45-6789`, `987-65-4321`, `mrn_883721`; fail for `Jordan T.` and for an 81-char token.
  `buildRouteContextLine` (`intentClassifier.mjs:28-51`) re-emits normalized route values
  (`:36` gates, `:50` builds `` `[Route context: …]` ``), they are appended at `:116`, and the whole
  string is sent as the `user` content at `:133`. `stepPHIScan` scans `ctx.sanitizedInput` **only**
  (`commandExecutor.mjs:192`), and no PHI scan covers route context.
- **Reach:** `routeContext` arrives from `req.body` (`aiCommandRoutes.mjs:121`) and is normalized at
  `:167` to three token keys (`source`, `intent`, `surface`) plus four typed fields. So an
  authenticated caller can place an ≤80-char token — an SSN, an MRN, a date, a bare single-token name —
  into a field that is then interpolated into the provider prompt **unscanned**.
- **Why it is MEDIUM and not HIGH:** the charset excludes whitespace and the length is capped, so
  free-text PHI cannot pass; this is materially narrower than `previousContext`, which is unbounded
  free text. Same class, smaller mouth. It is graded honestly in both directions rather than inflated
  to match R2-01.
- **Why it still matters:** the round-2 archive entry **contradicts itself on this exact field.** Its
  §1 "Confirmed" table (`2026-09-20-024101-…:78`) records *"`routeContext` is bounded … **CONFIRMED** —
  not a free-text channel"*, while the same document's R2-01 evidence (`:90`) names "route context" as
  an addition that bypasses the scan, and its fix (`:104-105`) requires *"separate synthetic canaries
  in `message`, `previousContext`, and `routeContext`"*. **One table called the channel closed; the
  finding in the same file treated it as open.** The seat then inherited the *table*, not the
  *finding*, into the source comment. That is the seat's recurring failure shape, now recorded a
  fourth time — and the first time it has been caught inside a prior review rather than inside the
  seat's own prose.
- **Fix:** Option 1 must enumerate **every** assembled context channel, `routeContext` included; and
  per B1 it still does not by itself establish a property of the assembled body. See §8.

### D-B — a fail-closed privacy gate cannot surface `503` through `classifyIntent` [MEDIUM]

- **Evidence:** `intentClassifier.mjs:170` catches every error from the awaited dispatch, and `:187`
  returns `{ intent: 'chat', … }`. A gate that throws inside the dispatch path `classifyIntent` awaits
  is therefore **converted into a chat fallback**, not propagated.
- **Consequence for the sibling:** its `03-contracts.md` §4.3 rule 3 promises `503
  PRIVACY_UNAVAILABLE`, and `09-tests.md` T-04.7 asserts exactly that ("scanner throws → zero provider
  calls; `503 PRIVACY_UNAVAILABLE`"). **T-04.7 cannot pass for the classification dispatch** unless the
  gate is placed at or above the classifier — a placement the contract does not specify.
- **This is R3-03's family with a named mechanism.** R3-03 says the contract lacks an operational
  release predicate; D-B shows that its *failure* predicate is also unenforceable at one of the two
  dispatch sites it must cover.
- **Conditional, and marked so:** the defect depends on gate placement, which is unspecified. Stated
  as a contract under-specification with a concrete failure mode, not as a proven live leak.

### D-C — the token pattern is defined twice [LOW]

`aiCommandRoutes.mjs:69` and `intentClassifier.mjs:25` hold **independent copies** of
`/^[a-z0-9_-]{1,80}$/i`. Identical today. They can drift, and the classifier's copy re-gates values the
route already admitted — so tightening one and not the other produces a silent divergence between what
the route accepts and what is emitted. Single-source the pattern.

## 5. Findings against the sibling package — recorded, NOT fixed

The sibling package `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-live-2026-09-20/` is **untracked**
(`git status --porcelain` → `?? …/BLUEPRINT-swan-coach-live-2026-09-20/`) and belongs to another lane.
**The seat did not edit it and will not.** Two findings land on it:

### 5.1 R3-03 verified — the release predicate does not exist [HIGH]

The reviewer could only mark this SUSPECTED, because the packet quoted one side of the contract. With
the full text available, the seat verified: the sibling's `03-contracts.md` §4.3 rule set is **exactly
five rules**, and it enumerates only the **failure** condition — *"If privacy cannot be established —
scanner throws, times out, or a field is of unexpected shape — the request is not sent."* **What
"established" means is never defined.** Rule 5 simultaneously removes regex coverage as proof
(*"defence in depth, never as proof of coverage"*). So the success predicate — the thing that licenses
sending — is undefined, and `06-bans.md:51` repeats the same undefined phrase. Upgraded to **PROVEN**.

### 5.2 R3-01 verified — C6 needs splitting by field and entry point

`C6 | routeContext / selectedClientName` lumps an inactive input with a live one. Split it: mark
`selectedClientName` inactive **on this route** (one production caller, `selectedClientName: null`
hardcoded at `aiCommandRoutes.mjs:164`), and describe `routeContext` as caller-controlled, structurally
constrained metadata that reaches the provider unscanned (D-A).

The seat's reciprocal obligation — its own side of R3-02 — is discharged in §7. The sibling's side is
for its owner.

## 6. A packet-construction error of the seat's own, disclosed

§3 of the packet asked *"do the two packages compose?"* while supplying **only one side's** contract:
the sibling's §4.3 was quoted, but **this package's own `03-contracts.md` was not**. The reviewer
correctly refused to adjudicate — `[UNKNOWN] … this package's 03-contracts.md contents are not
supplied. No specific contradiction with that unseen contract is proven.`

**The seat's question was unanswerable as posed.** This is a seat error, it is the reason R3-02 and
R3-03 are partly scoped to the sibling, and it is disclosed here rather than quietly repaired by
answering the question in this document. Note also that the seat had `03-contracts.md` open at the
time — this is the same class of mistake as §3.1: reading one side and generalising to two.

## 7. Fixes applied

`frontend/src/hooks/useCoachCommand.ts` — **comment-only.** 263 lines (cap 300). Verified: **zero
non-comment lines** added or removed; `node --experimental-strip-types --check` **RC=0**; all 23 line
references verified mechanically (`BAD_LINE_REFS=0`).

1. **B3 precision** — `routeContext` is now described as caller-controlled structured metadata whose
   *shape* is constrained, replacing the over-broad "neither is a free-text channel".
2. **B3 narrowing** — "the three allowlisted keys are never PHI-scanned" narrowed to the demonstrated
   fact: `stepPHIScan` does not inspect route context.
3. **The held fourth error** — the comment named `piiSanitizationMiddleware` as an imported middleware.
   It is the **module** name; the module exports `piiSanitization`, `strictPiiMiddleware`,
   `permissivePiiMiddleware`, `sanitizeText` (`middleware/piiSanitizationMiddleware.mjs:322-330`), and
   **no middleware called `piiSanitizationMiddleware` exists**. The chat lane imports
   **`strictPiiMiddleware`** (`aiChatRoutes.mjs:72`) and applies it to **one** route,
   `POST /conversations/:id/messages` (`:466`) — not across the lane. This error was found before the
   review was dispatched and **deliberately held back** so the reviewer's verdict would be on the
   artifact it actually saw; it is fixed now.
4. **D-A added** — the second channel, with the measured evidence, so the next reader does not
   re-derive "bounded ⇒ handled".
5. **Astra's `[LIKELY]` maintenance advice** — the "wrong THREE TIMES" history is compressed into a
   short invariant plus a review reference, because a blow-by-blow history rots inside runtime source.

**Cross-reference (R3-02, the seat's half):** this package now names the sibling package and its
privacy contract in this document. The reciprocal link from the sibling, and the version pinning on
both sides, remain outstanding and belong to the sibling's owner.

## 8. Not fixed, and why

- **Everything in §5** — the sibling package is another lane's untracked work. Reported, not edited.
- **R2-01's production behaviour change** — still awaiting Sean's ruling. Three bounded options were
  offered; the seat recommended Option 1. **Round 3 shows Option 1 as written is incomplete**: it must
  enumerate `routeContext` (D-A) and, per B1, does not by itself establish a property of the assembled
  body.
- **D-B's remedy** — gate placement must be specified in the contract before it can be enforced; that
  is the sibling's document, not this package's.
- **A residual routing question, UNVERIFIED:** where an `intent: 'chat'` result is handled downstream,
  and whether that path re-scans. Not a finding — the bytes were not followed, and per §3.3 the seat
  does not report what it has not measured.
- **R2-06** remains **latent**. Round 3 did not make it live; it added a condition — *"require stable
  key configuration before S2 introduces durable or cross-process records."* Adopted.

## 9. Novelty (Rule 86)

The reviewer could not establish archive-level novelty: it had not seen rounds 1–2 in full, nor the
sibling archive review `2026-09-20-015541-s83-coach-harness-work-and-coach-assistant`.

The seat can, and states it plainly:

- **R3-01 and R3-02** adjudicate concerns already raised inside this packet. **Not claimed as
  independent discoveries.**
- **R3-03** overlaps the R2-02 detector family and is scoped to the **sibling's** contract text.
- **D-A is NOT a new channel — and the seat only knows that because it checked.** The first draft of
  this section claimed rounds 1–2 had never enumerated `routeContext`. **That claim was false.** The
  round-2 archive entry already enumerates it twice: in its evidence
  (`2026-09-20-024101-…:90`, *"route context, and `selectedClientName` — additions that bypass the
  scan"*) and in its fix (`:104-105`, *"separate synthetic canaries in `message`, `previousContext`,
  and `routeContext`"*). **What is new is the mechanism and the refutation:** `buildRouteContextLine`
  (`:28-51` → `:116` → `:133`) had not been traced, the pattern's admission of `123-45-6789` and bare
  single-token names had not been measured, and round 2's own **CONFIRMED** row
  (`:78`, *"not a free-text channel"*) is **refuted as stated**. So D-A's novelty is *a contradiction
  inside a prior review*, not *an unlisted channel* — a weaker claim, and the accurate one. The
  distinction matters because the weaker claim is still actionable: the prior review's **table** was
  wrong about the same field its own **finding** got right.
- **D-B is new.** No prior round examined the classifier's `catch` as a privacy-error sink.
- **D-C is new and minor.**

## 10. Status

`HALT` on dispatching a builder — **advisory**. The reviewer's four lift conditions stand, and the seat
concurs with all four. Round 3 was **not dry**, consistent with the packet's own framing: it found a
live defect (D-A) and corrected the seat's own pre-answer (§3.1) and one of the seat's candidate
defects (§3.3).

**Nothing here is committed.** Sean's instruction was *"you fix"*; it did not say *"we commit"*, and the
seat is holding the commit for his word rather than assuming the round-2 authorization carries over.
