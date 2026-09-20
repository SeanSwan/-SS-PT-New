# REMEDIATION — round 1 → round 2

**Round 1 review:** `Z:\HostileReviews\2026-09-20-013205-coach-command-center-ai-harness-astra-mega.md`
**Manifest of reviewed bytes:** `REVIEW-MANIFEST.md` (per-file SHA-256 — closes A1-15)

---

## 0. A finding I raised, then killed — D12 RETRACTED

**This section replaces an earlier draft that claimed a new HIGH. The claim was wrong, and the way it was
wrong is the most useful thing in this document.**

### What I claimed

> **D12 [HIGH] — the declared PHI gate before the intent classifier does not exist.**
> `inputSanitizer.mjs:7` declares `Pipeline position: InputSanitizer → PhiScanner → IntentClassifier → ...`.
> `scanForPHI` occurs exactly once in `intentClassifier.mjs` (`:175`), inside the `catch` block. On the happy
> path the coach's sentence reaches a provider with no PHI gate.

### What is actually true

The gate exists, one step upstream of the classifier, in the classifier's **only production caller**.

`backend/services/ai/commandExecutor.mjs`:

```js
const PIPELINE_STEPS = [        // :516-520
  stepSanitize,
  stepPHIScan,                  // ← the gate
  stepClassify,                 // ← the provider hop
  ...
];
```

and `stepPHIScan` (`:190-206`) does not merely observe — it **removes**:

```js
async function stepPHIScan(ctx) {                                   // :190
  const { hasPHI, matches, categories } = scanForPHI(ctx.sanitizedInput);   // :192
  if (hasPHI) {
    ctx.sanitizedInput = stripPHI(ctx.sanitizedInput, matches);      // :198 — REDACTION
    ...
  }
}
```

`stepClassify` (`:209-217`) then passes **that already-stripped** `ctx.sanitizedInput` to `classifyIntent`,
which forwards it to `sendChatMessage` (`intentClassifier.mjs:134`). The steps run in declared order
(`:556`, `for (const step of PIPELINE_STEPS)`).

**So the declaration at `inputSanitizer.mjs:7` is TRUE for the command lane.** There is no unguarded hop.
There is no ruling to make, and **the question I was about to put to Sean is moot** — of the three options I
drafted, **option 2 (redact instead of block) is what the shipped code already does**, at
`commandExecutor.mjs:196-204`.

### How I got it wrong — the mechanism, not the symptom

**I read the module; the invariant lived in the pipeline.** I analysed `intentClassifier.mjs` as though it
were the whole path, found its single `scanForPHI` inside the `catch` block, and concluded the happy path
was unguarded. A guard for a step can live in that step's *caller* — and here it did.

**The refuting evidence was already in my own hands.** I had run:

```
$ grep -rn "scanForPHI" backend/services/ai/
backend/services/ai/commandExecutor.mjs:192:  const { hasPHI, matches, categories } = scanForPHI(ctx.sanitizedInput);
backend/services/ai/intentClassifier.mjs:175:  const phiResult = scanForPHI(message);
```

I read `commandExecutor.mjs:192` as *a different call site* rather than *the gate immediately upstream of
the site I was worried about*. The output was correct; my attribution of it was not. **A search that would
have refuted the claim was run, returned, and mis-weighted.** That is worse than not searching, because it
manufactures confidence.

**Two secondary errors in the retracted draft, recorded so they are not inherited:**

1. Its evidence table cited `commandExecutor.mjs:211` as the *sanitize* step. `:211` is `stepClassify`'s
   `classifyIntent` call. `stepSanitize` is `:175-187`. Wrong line, right file — the kind of citation error
   that survives a skim.
2. It called `intentClassifier.mjs:175`'s scan "the only scan, in the failure path." It is a *second,
   independent* check — defence in depth on the chat-fallback path — not the primary gate.

**And my own fix inherited the error.** The first version of F-1 (below) told readers the classifier reaches
a provider "before any PHI scan runs." That was the same claim, one file over, written *while I was fixing a
false comment*. It has been corrected. **A false comment fixed with a second false comment is still a false
comment** — which is why F-1 is now verified against the pipeline and not against the module.

### What survives — downgraded to an observation, not a HIGH

`stepPHIScan` redacts **only on a positive regex match** (`if (hasPHI)`). Its coverage is therefore exactly
`phiScanner.mjs`'s pattern set: a pattern miss is an unstripped miss, and the text proceeds to the provider.
That is an inherent property of detection-based redaction, not a missing gate — and it is not a defect in the
sense of *the code failing to keep its own promise*. The code keeps its promise; the promise has a known
boundary.

**Recorded as an observation, owner = the builder, carried into `09-tests.md`:** a test that asserts the
*known misses* of `phiScanner.mjs` — i.e. pins the boundary rather than implying it is total. Not urgent, and
deliberately **not** a behaviour change.

### The transferable lesson

> **A module-scope read cannot establish a pipeline-level invariant.** Before assigning a severity to
> "unguarded hop X", read X's only production caller and check whether the guard runs there. `grep` for the
> guard function is necessary and *not* sufficient — the result must be attributed to a position in the
> control flow, not just to a file.

This matters more than usual in this tree: `commandExecutor.mjs` is **885 lines** (`REVIEW-MANIFEST.md`), and
an 885-line module is precisely where "the guard is in the caller" becomes easy to miss.

**Credit where it is due:** round 1 (Astra) did not make this mistake — it never claimed D12. The retracted
finding was mine, introduced during remediation.

---

## 1. Fixed this round (documentation only — no behaviour changed)

Both fixes correct a comment that **stated something false**. Neither touches logic, so neither needs a test;
both are verified by re-reading the code they describe.

### F-1 — `useCoachCommand.ts` privacy claim (round-1 D2) — FIXED, then corrected again

**Was:** `PRIVACY: selectedClientId passed as an ID — no names sent to backend.`
**Why false:** the same call sends `message`, `previousContext`, `routeContext` — and `message` is raw free
text that routinely contains client names.
**First fix — itself wrong.** It asserted the classifier reaches a provider "before any PHI scan runs." That
was the D12 error, reproduced in a comment (see §0).
**Now:** states the route has no PII middleware, then names the layer that *does* handle it — the pipeline's
`stepSanitize → stepPHIScan → stepClassify` order, with `stepPHIScan` stripping PHI before the provider hop —
plus the residual caveat that stripping happens only on a positive regex match, and that
`commandAudit.redactParams` redacts audit storage.
**Verified:** `235` lines (was 214) — still under the Rule 4 cap of 300. SHA-256 in `REVIEW-MANIFEST.md`.

### F-2 — `useCoachAssistant.ts` lane-routing docblock (round-1 A1-07, downgraded) — FIXED

**Was:** `├─ fallback_to_chat | error  → chat lane (sendMessageWithConversation)`
**Why false:** `:105-109` returns on `error` without reaching the chat lane; the chat call at `:111` is a
separate branch reached only by an explicit `fallback_to_chat`.
**Now:** `error` is its own branch, marked **"chat lane NOT reached"**.
**Verified:** `244` lines (was 243).

> **Four recorded instances in this workspace of *a documented promise the code does not keep*:**
> `REFERENCE.md` § Theme lens round 6 A1-02 · theme-lens cross-tab `followRef` · round-1 D2 · round-1 A1-07.
> (The retracted D12 was briefly counted as a fifth. It is not one — the code kept its promise.)
> **It remains the single most productive lens this project has.** Note that D2 and A1-07 are both
> *comments that were false*, and the fix for one of them was briefly a third false comment.

---

## 2. Closed this round

- **A1-15 (reviewed bytes unpinned) → CLOSED** by `REVIEW-MANIFEST.md`: per-file SHA-256 for all 16 wiring
  files, with the HEAD and the dirty-tree warning stated. Re-check a hash before trusting this review.
- **D12 → RETRACTED** (raised by me during remediation; refuted by `commandExecutor.mjs:516-520` + `:190-206`
  — see §0). Not a defect. No ruling needed. Recorded in full rather than deleted, because a finding that
  vanishes without explanation gets re-derived by the next agent.

---

## 3. NOT fixed — deferred, with the reason (no silent omissions)

| Finding | Why not fixed | Owner |
|---|---|---|
| **D1 — `destructiveOperations.mjs:17` is `const pendingOps = new Map();`** (non-durable, process-local, invisible across replicas) | A durable ledger is a **build**, not a patch. The package already specifies the sequence: adjudicate the existing store against the operation contract, then reuse or migrate (`05-slices.md`). Improvising storage semantics is exactly the "builder chooses silently" failure the package forbids. | Sean / the builder — **checkpoint decision** |
| **D4 — `IMPLEMENTATION VERIFIED (LOCAL)` precondition** | Requires producing the backend/recovery reconciliation receipt, which is an audit of the 2026-09-06 packets, not a code change. | Sean — is the receipt owed, or was it never needed? |
| **D5 / A1-10 — registry completeness** | Needs 49 dispatchers × 18 registry files audited. Carried into `09-tests.md` as a test to write, not a defect to fix. | the builder |
| **D6 — `dispatched` proves handoff, not persistence** | Needs a save-path receipt from the workout surface — a new signal, not a comment fix. | the builder |
| **D7/D11 — stale counts, dormant `providerCostTracker`, misnamed tests** | Cosmetic-to-medium; `providerCostTracker` must **not** be wired merely to justify its existence. | the builder |
| **PHI-scanner boundary (ex-D12, downgraded)** | Not a defect: the gate runs and redacts; only its *coverage* is finite. Pin it with a test; do not change behaviour. | the builder |

---

## 4. Ruling needed from Sean

**None blocking.** The one ruling this document previously requested — whether to gate the coach's text
before the intent classifier reaches a provider — was withdrawn when D12 was retracted: the gate exists, and
the shipped behaviour is the redact-instead-of-block option that would have been recommended. **No production
behaviour change is proposed, and none was made.**

Two items remain **decisions rather than rulings**, and neither blocks round 2:

1. **D1 — the durable operation ledger.** Checkpoint decision: adjudicate the existing store, then reuse or
   migrate. Recorded in `05-slices.md`.
2. **D4 — the backend/recovery reconciliation receipt.** Is it owed, or was it never needed?

---

## 5. State

**Two files modified, both comment-only, both uncommitted:**

- `frontend/src/hooks/useCoachCommand.ts` (214 → 235)
- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts` (243 → 244)

Neither is in another agent's lane; both were **clean and unmodified** (mtime 2026-08-16) before this round.

**Nothing of mine is staged, committed, or pushed.** No production contacted. $0 spent.

**⚠️ Corrected — an earlier draft of this file said "Nothing staged," and that was false.** Measured:

```
$ git diff --cached --name-only | wc -l
88
$ git diff --cached --name-only | grep -E "useCoachCommand|useCoachAssistant"
(no output)
```

**88 files are staged, by other lanes, and none of them is mine.** They are the `e2ec7c562` security
follow-up (`.gitignore`, `backend/utils/startupMigrations.mjs`, the email-guard and mutation tests), the
`scripts/creator-brains/console/**` tree, and the social-bridge blueprint docs. **Stated explicitly because
"nothing staged" reads as "the tree is quiet"** — and if another lane commits those 88 files, they land on
this branch. Neither of my two files is among them.

**Note on HEAD:** this work began at `ffe4f805e`. While it was in progress, **other lanes advanced the branch**
to `026458dc6` (creator-brains-console D7 relocation) and then `e2ec7c562` (email-guard false negatives).
**Neither commit touches the coach CC AI wiring** — verified: neither appears in
`git log -- backend/services/ai/ backend/routes/aiCommandRoutes.mjs frontend/src/hooks/useCoachCommand.ts`.
`main` is at `2b3e7a62a` and is untouched by this work. Because HEAD moved, the commit hash is *less* able to
identify the reviewed bytes than ever — which is the argument `REVIEW-MANIFEST.md` exists to make.

**Round 2 is UNBLOCKED.** The previous draft held it back pending a D12 ruling that is no longer required.
Round 1 is still **not dry** on the four remaining HIGH (D1–D4) and the deferred items in §3 — round 2 should
review the current state, manifest in hand.
