# External hostile review — GLM 5.3 — C2/C3 selection slice, 2026-09-13

**Why this file exists.** Every hostile review in this packet before now was
internal: root, or a subagent, reviewing its own work. This is the first review of
the C2/C3 slice by a model that had no part in writing it, and it found a
shipped-code trap that both the author and root had missed. Recording it here so the
finding, the fixes and the two deliberate refusals are durable rather than living in
a temp log.

## 1. What was run, and how it was bounded

| | |
|---|---|
| Transport | `scripts/consult-glm.mjs` (direct Z.ai subscription endpoint) |
| Requested / **served** | `glm-5.3` / **`glm-5.3`** — provider-reported, no substitution |
| Status | `complete` (`finishReason=stop`, `sawDone=true`, `http=200`) |
| Tokens | 28 025 in / 36 820 out (33 050 of them reasoning) |
| Wall | 578.5 s (streaming; GLM walls are routinely >300 s) |
| Ledger round id | `astra-c3-glm-r1` |
| Review content SHA-256 | `97b6519b41567b12cee362e854edff1027df9b12c11562c8380ef3f546bdfd9d` |

**Packet, and its proof.** Built from the exact worktree by
`tmp/astra-hostile-glm-20260913/build-packet.mjs`, which assembles the artifacts and
runs the result through the main checkout's `scripts/lib/redact-egress.mjs` — the
worktree has no `redact-egress.mjs` at all, so evidence came from the worktree and the
egress boundary from the current checkout, as the review skill requires.

```
packet-r1  sha256 cb320e1a2a265d7a14cf64b7b5d9997830cd5a8adc4e13074f289fd30ac078f4
           ~30 490 tokens · 12 artifacts · 0 redaction hits · proofClean=true
```

The four independent proofs (no absolute home prefix, no Windows user path, no email
shape, no secret shape) all passed, and the packet contains no name-like strings —
checked separately, because rule 8 wants IDs only.

**Authorization and cost.** Sean instructed GLM be used through the *subscription*
("we already have a GLM 5.3 and GLM 5.3 Flash subscription"), which is exactly what
`redact-egress.mjs:220-231` enforces: `z-ai/*` models are **refused** on OpenRouter
because routing them there "pays per-token for something already bought". No
OpenRouter call was made for GLM. The seat is serialized by an exclusive lock and
metered by a 15-round checkpoint; the batch was extended once
(`{"event":"batch-approved","roundsApproved":15}` at `2026-09-13T14:28:40Z`) under
Sean's standing instruction to call GLM until fixes run dry. **No incremental spend.**

## 2. Findings and dispositions

Verdict returned: **SHIP-WITH-FIXES**. Nine findings. Seven fixed, one accepted as a
packet defect, one rejected on purpose.

### FIXED

| # | Sev | Finding | Fix, and how it was proven |
|---|---|---|---|
| 1 | MAJOR (blocker-grade) | The decision modal dead-locked on any `decide()` failure | `busy` narrowed to the in-flight phases. **Reverting it reds 7 of 13** in the new gate test |
| 2 | MAJOR | Any unrelated URL param retired the live publication | Key is now `actorId:rawRole\|clientId\|threadId` |
| 5 | MINOR | The acceptance test's 5th case could not fail | Replaced with a default-export spy. **Proven twice**: deleting the Gate reds it; severing `binding` from `useAIChat` reds it |
| 6 | MINOR | Focus stolen back to "Return" on every re-render | `onReturn` held in a ref; effect depends on `[open]` |
| 7 | MINOR | `apply()` laundered the actor epoch | `apply()` preserves the epoch; the actor-change layout effect is its only writer |
| 8 | NIT | "No module-level mutable state" header vs a real `commitCounter` | Header corrected |
| 9 | NIT | "A client NAME is never introduced here" header vs a rendered name | Header corrected; requested scope stays ID-only |

**F1 deserves its own paragraph**, because it is the reason this review earned its
cost. `CoachSelectionDecisionGate` passed `busy={selection.phase !== 'decision'}` while
the dialog renders whenever `pending` is non-null — and **none of the five failure
paths in `decide()` clears `pending`**. So a single failed GET (403, timeout, 409) left
the dialog open with both actions disabled, a Backdrop with no click handler, no close
button, and an Escape key that merely retried the same failing call. **The staff
console was bricked until reload, for pointer/touch users with no exit at all.** The
register had recorded "blocked-return recovery UI not implemented" as a *missing
feature*; the shipped code had turned that missing feature into an unrecoverable trap.
Neither the author's pass nor root's found it.

**F7 is the second reason.** It did not just find a bug — it supplied the *mechanism*
for a gap this session had recorded but could not explain. `apply()` forced
`actorKey: actorRef.current.actorKey` onto every patch, so the commit guard
`stateRef.current.actorKey !== actorRef.current.actorKey` was unsatisfiable by
construction. That is exactly why the earlier can-fail proof for that guard failed and
was honestly reported as unproven rather than claimed.

### ACCEPTED — the packet was the defect (F3, MAJOR, verification gap)

The reviewer correctly observed that `useRequestCoachRouteSelection` and
`useApplyCoachSelectionCommit` — the two effects that turn a route observation into a
request and drive `consumeCommit → apply → ack` — were **not in the evidence**, so the
slice's central property was unverifiable. That is a defect in root's packet, not in
the code, and `controllerEffects.ts` was added to the round-2 packet.

**Its sub-question 3(i) is now CONFIRMED, and it is a real correctness finding.**
`controllerEffects.ts:161-163`:

```js
const observed = applyRef.current(consumed);
if (!observed) return;
port.ackCommit(consumed.commitId, observed);
```

The value acked as "observed" is `applyCommit`'s **own return value** — which, at
`useCoachCommandCenterSelection.ts`, is the instruction's target. So
`useCoachSelectionCommit`'s headline guarantee that it publishes "ONLY when the
observed route/thread tuple matches the ticket exactly" compares the ticket against
what the ticket just tried to set. **The strict match is tautological.**

**Recorded, not patched.** Making the ack observe the *live* route after navigation
settles is a navigation-timing change to the slice's central property. It deserves its
own slice with its own can-fail test rather than a drive-by edit at the end of a
review round. **This is the highest-value remaining C2/C3 item.**

### REJECTED ON PURPOSE (F4, MINOR) — and the reasoning is attackable

The reviewer proposed `enabled: operatorEnabled && hasLivePublication(binding)` for
the actionable intake queue. Root did **not** apply it:
`useCoachIntakeQueue({ scope: 'actionable' })` is plausibly how staff *discover* which
client needs attention, so gating it on a live publication could invert the workflow —
you would need an admitted client before you could see the list of clients to select.
The reviewer could not know the intended workflow from code, and neither can a
code-only reading. Behaviour was left unchanged; the **claim** was narrowed to "the
four C4 boundaries and the three transports". The proposed change is recorded as
needing a product decision.

## 3. Verification root ran

- **196 files / 1160 tests, exit 0** — up from 195 / 1146 before the fixes.
- Type-check via the repo's own command
  (`node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit`)
  → **exit 0, 0 errors**. It caught nothing this round, but the F2 change altered a
  function signature, so it was run deliberately.
- Every can-fail proof was executed and each mutated file restored **byte-identically**
  (SHA-256 checked before and after).
- Committed as `398dc817b`, 6 files, +256/−17.

## 4. What this review did NOT cover

- No browser or mounted run. Everything above is jsdom-level or static.
- The real `/api/ai-chat/target-access` endpoint was never hit; the admission receipt
  is validated against harness shape only.
- Plan 63's unimplemented scope (created-thread adoption, Leave, blocked-return
  recovery UI, real data-router blocker) was out of scope and remains unimplemented.
- Round 1's packet omitted `controllerEffects.ts` (F3) — fixed for round 2.

## 5. Round 2 — same transport, same model, after the fixes

`packet-r2` sha256 `042c3a7463be9f90aa33efa9d0bb585b242117bf682e154b2df631ce844b54a1`,
~26 923 tokens, 8 artifacts, 0 redaction hits, proofs clean. Receipt: `served=glm-5.3`,
`status=complete`, 24 450 in / 34 518 out, wall 458 s, review round `astra-c3-glm-r2`.

**Its headline vindicates the fixes and is worth quoting:** *"the six behavioural fixes
are real and close their findings — none merely moves a symptom."* It traced each one,
including the edges the fixes were meant to close — for F1 it checked whether a
superseded decide could leave the dialog permanently busy, and concluded no such state
is constructible.

**One MAJOR — N1 — recorded, not patched.** The reviewer settled round-1 Finding 3(i)
*against* the design by elimination over the whole implementation space: the ack's
`observed` tuple is the applier's **own echo**, so the strict match compares the ticket
to itself. A live read after `setSearchParams` would see the *pre*-navigation tuple
(React Router does not settle synchronously) and would therefore fail every
tuple-changing commit — which cannot be what happens, because the feature observably
works. It found a second hazard too: `appliedRef` is set **before** `apply`, and
`consumeCommit` is one-use, so a null `observed` strands the commit permanently.

**Why it is not patched here.** Deferring the ack to a settled live-tuple observation
changes the slice's central property; getting it wrong leaves the publication
permanently disabled and routed threads never hydrating — worse than the tautology. It
needs its own slice with the can-fail test the reviewer specified ("mutate the URL
between apply and settle; assert publication stays disabled"). **What was fixed is the
false documentation**: both headers advertised a fence that cannot trip and now state
plainly that the tuple is an echo, so nobody cites the refusal as proof the route was
verified.

**Fixed:** **N5** (one line — `operatorEnabled` now also requires
`isAllowedRawRole(rawRole)`, closing the ghost-actor staff reads; the fence is
role-shaped, not publication-shaped) and **N6** (a failed decision now says why, via a
new pure `failureTextFor`, rendered with `role="alert"` and suppressed mid-flight).

**F4 adjudicated, and root's rejection was upheld on better evidence.** The reviewer
showed the intake queue genuinely *is* pre-selection discovery —
`pickRouteReviewNextMergeRequestId` is a deliberate no-client entry point and the queue
feeds dossier tiles with no target dimension — so refusing to gate it on the binding was
right. But **two parts of root's stated reasoning were wrong**: the workflow-inversion
fear is largely unfounded (the unscoped lane is admitted on staff mount anyway), and the
real defect in the proposed gate would have been that `requestSelection` retires before
every read, so every tuple change would blink the queue off. Recorded, because a right
decision reached on wrong reasoning is still a liability.

**Two packet defects of root's own, both now known:**
1. `git diff` does not include **untracked** files, so the new gate test was missing from
   the round-2 packet and its 7-of-13 can-fail proof could not be verified.
2. Only the *changed hunks* of `useCoachCommandCenterSelection.ts` were sent, so the
   `apply` callback under adjudication was again absent — **third round running** that
   the exact lines being ruled on were the lines omitted.
   Round 3 must send whole files, including new ones.

**Still open from round 2, all MINOR/NIT:** N2 (mount-time double request — the route
effect and the routed-thread effect both fire), N3 (a `busy`-refused route request is
latched and never retried — silent, reload-only), N4 (a sibling effect keys on raw
`searchKey`, so unrelated params re-clear the active thread), N7 (auto-select hydrates
with no admission port; needs a trust-boundary decision), N8 (the reviewer could not
measure the controller from a collapsed paste — root measured 299, under the cap, so
not a finding).

## 6. Root's own two mistakes, both caught by the repo's guards

Recorded because they are the honest half of this section.

- **A Rule 4 violation root wrote.** The N5 rationale block (eleven comment lines)
  pushed `CoachCommandCenter.controller.ts` to **309** lines, and
  `CoachCommandCenter.sectionSplit.test.ts` failed with *"expected 309 to be less than
  or equal to 300"*. The comment was trimmed to five lines; the file is 299. A long
  justification for a one-line change, written into a file already at the cap.
- **Invented CSS tokens.** The N6 notice used `--surface-sunken` and `--accent-warning`,
  neither of which the theme defines, plus a `--t` artifact produced by writing the
  literal `var(--t, #hex)` pattern inside a prose comment. `token-registry-check`
  **blocked the commit** — correctly: an undefined token renders its fallback forever and
  never responds to theming, and the repo already carries 824 such names. The notice now
  uses only `--bg-primary`, `--text-primary` and `--border-elegant`, all confirmed defined.

## 7. Follow-up hooks for the next reviewer

1. **Decide F3(i).** Should the ack observe the live route, and what is the smallest
   honest fix? Add a can-fail test that mutates the URL between `applyCommit` and the
   ack and asserts the publication stays disabled.
2. **Decide F4.** Is the actionable intake queue meant to work pre-selection? If yes,
   the rejection stands and only the claim needed narrowing. If no, apply the gate.
3. **Re-run round 2** (`packet-r2`, sha256
   `042c3a7463be9f90aa33efa9d0bb585b242117bf682e154b2df631ce844b54a1`) and check
   whether the fixes hold and whether anything new appeared.
4. **GLM 5.3 Flash** has not yet reviewed this slice — only `glm-5.3` has.

**Cost note for whoever repeats this.** The GLM seat is an exclusive lock at
`%LOCALAPPDATA%\SwanAI\glm-call.lock` with a 15-round checkpoint. A blocked call
consumes **no** round (`beginGlmCall` throws before appending), and an aborted
in-flight call leaves the lock `unresolved` with **no automated reconciliation path in
this repo** — recovery would be a manual file delete, which must not be done while the
owner pid is alive. During this session another agent (`tcc-hostile-*` round ids) held
the lock for several minutes and root waited rather than competing.
