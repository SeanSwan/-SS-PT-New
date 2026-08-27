---
decision: "Swan Coach ownership authorization is complete and pushed. Five live cross-tenant defects closed, seven hostile-review rounds run to DRY, and the verification harness that certified it all was itself rebuilt after it was found blind. The branch is ready for a merge decision to main."
status: shipped
supersedes: docs/ai-workflow/AI-HANDOFF/COACH-OWNERSHIP-HANDOFF-2026-08-26.md
---

# HANDOFF — Swan Coach ownership, ready to merge

**Branch:** `claude/coach-endpoint-truth-v2-20260824` @ `b0606b461`
**PUSHED** (verified: remote tip == local HEAD, unpushed count 0). **NOT merged. NOT deployed.**
24 commits ahead of where the arc began at `26e6f296f`. Cost across everything: **$0.00**.

> **Sean's stated intent for the next session:** merge this to `main` and go live, with GLM 5.3
> and GLM 5.3 Flash consulted to help decide the final calls. This document exists so that can
> happen without re-reading a very long conversation.

---

## 0. READ THIS FIRST — what will cost you time

1. **This work lives in a WORKTREE at `C:/tmp/swan-p1a`, not the main repo.** The main repo at
   `Desktop/quick-pt/SS-PT` is on a different branch entirely. Point every path, every consult
   and every test run at the worktree or you will review the wrong tree.
2. **The consult scripts live on `main`, not on this branch.** `consult-glm.mjs` exists here;
   `consult-qwen.mjs`, `consult-grok.mjs` and `consult-ox.mjs` do not. Run consults **from the
   main repo** with absolute `--document` / `--out` paths into the worktree. Two consults
   exited **0** while printing `MODULE_NOT_FOUND` — read the output, never the status.
3. **Ox Alpha is DEAD and was GLM-5.3 Flash all along.** `stealth/ox-alpha` 404s. Any past
   "Ox and GLM independently agreed" is one lab answering twice. Call Flash by its real name:
   `node scripts/consult-glm.mjs --model glm-5.3-flash`.
4. **The repo baseline is not green** — 25 known-failing tests across 23 files. Use
   `node backend/scripts/test-baseline-gate.mjs`. A bare `vitest run` exits 1 on a good tree.
5. **Source files are CRLF.** A multi-line anchor written with `\n` matches nothing. This class
   has cost time in six consecutive sessions. Use the Write/Edit tools for content with
   backticks or escapes — shell heredocs and `node -e` mangled comments twice on 2026-08-27
   alone, *including a comment about a different mistake*.
6. **`cmd | tail; echo $?` reads tail's status.** A pre-tool hook blocks it. Use
   `${PIPESTATUS[0]}` or redirect to a file.

---

## 1. What this workstream was, in one paragraph

Swan Coach is a natural-language command lane over a trainer-led personal-training SaaS. A
classifier picks one of 139 registered commands; an 11-step pipeline validates, authorizes,
resolves the target client, optionally requires confirmation, then dispatches to a handler.
**Commands never travel over HTTP routes** — dispatch selects a handler by command TYPE, so no
route middleware runs for this lane. Anything a REST route gets free from middleware, this lane
must do itself, and for a long time did not. A prior session proved *role* authorization (no
below-role caller reaches a dispatcher, 303 pairs). This arc asked the different question:
**whose RECORD may a correctly-roled caller act on.**

---

## 2. The five live defects found and closed

| # | defect | why it was reachable |
|---|---|---|
| 1 | **Any authenticated client could read any other client's** gamification profile | `view_xp_streaks` permits a `client` caller, requires a client ref, is not self-service — and the resolver was handed a scope only when the caller was a trainer |
| 2 | **Any trainer could archive any workout plan by id** (destructive) | `delete_workout_plan` declares `requiresClientRef: false`, so the pipeline resolved no client, and the lifecycle service authorizes nothing — while the REST route to that same service is guarded by purpose-built IDOR middleware |
| 3 | **A confirmed operation stayed authorized for 120s after permission was lost** | redemption checked ownership of the pending operation, expiry and an HMAC signature — none of which notice a revoked role or a transferred client |
| 4 | **The resolver fail-OPENED on an uncomputable scope** | `hasTrainerScope === false` meant BOTH "no scope requested" (correct for admin) and "scope requested but unparseable" (must deny), and the code took the permissive reading |
| 5 | **A cross-tenant denial left no server-side record** | the 404-parity response is deliberate and right; the silence in the audit trail was not, so an id-walker looked identical to a typo |

**The shape they share, and the thing to carry forward:** each was a case where one value meant
two things and the permissive reading won, or where a protection was inherited by proximity
rather than called. #2's file header literally claimed parity with the protected REST route
while performing no authorization at all. *Sharing a boundary with a protected caller is not
being protected.*

---

## 3. What shipped — the file map

### Production code
| file | what changed |
|---|---|
| `backend/services/ai/commandExecutor.mjs` | `RESOLVER_SCOPED_ROLES` (named set, so the fall-through case is explicit); non-privileged callers pin to self and fall THROUGH to the real resolver rather than fabricating a record; a trainer whose own id will not parse is refused; `confirmLaneDenialReason` re-authorizes both redemption lanes on current role + current client access |
| `backend/services/ai/clientResolver.mjs` | separates "no scope requested" from "scope requested and uncomputable", refusing the second; shares one coercion with the lane |
| `backend/services/ai/positiveInteger.mjs` | **new leaf module.** One strict coercion for both sites. A leaf because `commandExecutor` imports `clientResolver` — exporting from the executor would make the resolver import its own importer |
| `backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs` | the access check that was absent, via `assertAssignmentOrAdmin` — the same helper the REST middleware uses; denial and absence both audited under distinct codes; `auditQuietly` contains rejections AND synchronous throws |
| `backend/services/ai/destructiveOperations.mjs` | destructive operations now record the client they were AUTHORIZED against, HMAC-signed |
| `backend/middleware/verifyClientAccess.mjs` | re-asserts at the consumer what the WHERE was supposed to guarantee, catching a fail-open SQL construct |
| `backend/services/ai/commandRegistry/baseSchemas.mjs` | `USER_ROLES` matches the model enum (it omitted `user`, the default role) |

### Verification infrastructure — arguably the more durable half
| file | what it is |
|---|---|
| `scripts/mutation-harness.mjs` | breaks the code 46 ways and requires the tests to notice. Reports **three** outcomes — FIRED / SURVIVED / **ANCHOR** — and that third state is why a broken anchor is never mistaken for a vacuous assertion |
| `backend/tests/mutations/ownership.mutations.mjs` | the 46 mutations, committed and re-runnable in one command |
| `backend/scripts/test-baseline-gate.mjs` | **rewritten.** Compared failing FILE NAMES; now compares tests and normalized failure reasons |
| `backend/tests/unit/testBaselineGate.test.mjs` | the gate's own tests — the certifier is now itself under test |
| 5 ownership contracts + 4 unit suites | 60+ assertions, all executing real code paths |

**Run it all:**
```
cd C:/tmp/swan-p1a
node backend/scripts/test-baseline-gate.mjs                                   # exit 0 expected
node scripts/mutation-harness.mjs backend/tests/mutations/ownership.mutations.mjs   # 46/46
```

---

## 4. Verification, and exactly what it does not cover

- Full backend **9757 passed**; 25 known-failing tests across 23 files, matching the per-test
  baseline exactly (gate **exit 0**)
- **46/46 mutations fire**, every file restored byte-identical by sha256
- `node --check` clean; registry import smoke 139 commands; no import cycle (verified by
  loading both modules unmocked); secret scan CLEAN on every file
- Zero frontend files changed
- **DRY on both seats at round 7**, after seven rounds and ~45 findings

**NOT proven — state these, do not let silence imply coverage:**
- **No CI has ever run any of it.** GitHub Actions is billing-blocked at the account level.
  9757 passing tests have never been observed outside one machine.
- **Dispatcher self-gating.** Handlers are mocked throughout; no handler is shown to refuse on
  its own if reached by another means.
- **TOCTOU on plan archive** — the access check sits outside the lifecycle service's row lock.
  `verifyClientAccessByPlanId` has the identical structure, so the window is *shared with the
  REST route* rather than introduced here. Fixing one caller alone would recreate the asymmetry
  this work removed.
- **Real SQL.** The test fake mirrors the resolver's predicates; PostgreSQL is never consulted.
- **A role changing DURING dispatch** — only mint→redemption is closed.

---

## 5. THE MERGE DECISION — what the next session needs

Sean's intent is to merge to `main` and go live. Everything below is what a merge has to
account for. **`main` auto-deploys to Render**, so merging IS deploying.

### 5.1 Before merging — a real pre-deploy checklist

1. **Flush the pending-operations store during deploy.** Adding `clientId` to the HMAC payload
   invalidates the signature of every in-flight operation, and the new denials **consume** the
   single-use operation. Any confirmation minted pre-deploy and redeemed post-deploy burns with
   no retry. Self-healing within 120s, but it will generate signature failures in the first hour
   if not flushed. *(Raised by GLM 5.3, round 3.)*
2. **Fix the Actions billing block first if you want CI to mean anything.** Two minutes at
   github.com/settings/billing. Without it the merge rests on this document's word.
3. **Rebase check.** `main` was ~2,293 commits ahead of the worktree's other branch at last
   look. Confirm what `origin/main` holds, rebase, and **re-run the gate on the rebased tree** —
   a rebase can silently reintroduce a conflict the tests would catch.
4. **The `.claude/settings.json` / worktree noise.** The main repo has a large dirty tree from
   other lanes. Do not `git add -A`. Rule 67 lanes are live and another agent holds locks.

### 5.2 What to ask GLM 5.3 and GLM 5.3 Flash

They have already run seven rounds on the CODE and reached dry. Do not re-run a code review —
ask them the merge questions they have not been asked:

- **Is the TOCTOU window acceptable to ship**, given it is shared with the already-live REST
  route, or does it block? (Both seats have context on it and left it accepted.)
- **Does the pending-store flush need to be a migration/script**, or is a manual step enough?
- **What is the rollback plan** if a denial path misfires in production? The kill switch
  (`AI_COMMAND_WRITES_ENABLED=false`) pauses writes but not reads.
- **Which of the queued items must precede go-live** versus follow it (§6).

Fire both from the main repo, absolute paths into the worktree:
```
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
node scripts/consult-glm.mjs --model glm-5.3 --document "C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/COACH-OWNERSHIP-MERGE-HANDOFF-2026-08-27.md" --out "C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/GLM-MERGE-CALL.md" --remit "..." --max-tokens 32000
node scripts/consult-glm.mjs --model glm-5.3-flash --document "<same>" --out "<...>GLM-FLASH-MERGE-CALL.md" --remit "..." --max-tokens 32000
```

**Treat every returned finding as a HYPOTHESIS (Rule 30).** Verify against the file, mark it
real or disproven, record the tally. Four of the four disproofs this arc were upheld when the
seats re-examined them — the seats are good, and they are still wrong sometimes.

---

## 6. Open items, ranked

| # | item | why it is where it is |
|---|---|---|
| 1 | **Ownership-derivation registry field** — a required declaration per id-taking command (`from_record` / `from_client_ref` / `n/a`) plus an enumeration contract | **The recommended next slice.** GLM Flash's idea, and the best structural one produced. Its failing list IS the residual-risk inventory: it answers whether a second live cross-tenant hole exists among the 138 handlers nobody has read. Converts a one-time manual sweep into a standing invariant |
| 2 | **The ~56 under-specified assignment stubs** returning `{id: 1}` across ten suites | Qwen's pick. They are why the consumer guard is narrowed (absent fields are not mismatches) rather than strict. Pure fixture migration; no production behaviour changes |
| 3 | **TOCTOU on plan archive** | Gemini's pick. Must be fixed for BOTH callers or not at all |
| 4 | **Dispatcher self-gating** | My original pick, which all three seats overruled. Defence in depth behind three gates now proven |
| 5 | **Admin name resolution breaks past 50 clients** (`LIMIT 50` on the fuzzy path) | Real at gym scale, pre-existing. Needs a product call: raise the limit, or `pg_trgm` |
| 6 | **No rate limit or mint quota** on a lane that runs a classifier per request | Flagged by GLM, unaddressed |
| 7 | **`allowedRoles` untrustworthy for 54% of registry rows** | Inherited from an earlier session; unclear what depends on it |
| 8 | **`operation.endpoint` is signed and never read** | A latent invitation to revive a shortcut. Delete it from the signable shape |
| 9 | **Fable + GPT-5.6 Sol reviews** | Prompts were handed to Sean and are still outstanding. Fold in and verify each finding when they return |

---

## 7. The methodology lessons — why this arc took seven rounds

These changed how the work was done and are the reason to trust the result. Full detail in the
learning packets under `docs/ai-workflow/hermes-learning-packets/`.

1. **A green test proves the code passes, not that the test would notice if it broke.** Five
   assertions this arc could not fail as written — a tautology comparing a value to itself, a
   brittle source scan, a fail-closed catch nothing exercised, an assertion verified only to a
   mock, a positive control that passed on the wrong branch of its own disjunction.
2. **Mutation testing catches mechanical vacuity; it has never once caught an assertion that
   was internally consistent and asking a question whose answer was trivially yes.** Three of
   the five were found by a reviewer. That is the case for panels.
3. **Count panel agreement by LAB, not by seat.** Ox Alpha was GLM-5.3 Flash. Convergence
   between them was one prior sampled twice, and it felt exactly like corroboration.
4. **Verify the certifier before trusting what it certifies.** The baseline gate compared file
   NAMES; a file already failing could start failing for a new reason invisibly. Measuring it
   changed the number — "23 failing files" was 6 failed assertions plus **19 files that never
   collect at all**, which a naive assertion count would have read as an *improvement*.
5. **A guard that depends on another module's internals is borrowed, not owned.** The same
   correction was applied three separate times before it became a stated principle.
6. **Prose does not stop recurrence.** The CRLF-anchor trap recurred in six consecutive
   sessions, each time after reading a write-up about it. What contained it was a harness that
   refuses to run on an unmatched anchor — and running that guard taught the precise rule
   (leading newline fine, interior newline not) that no write-up had ever stated.

---

## 8. Where everything lives

| artifact | path |
|---|---|
| This handoff | `docs/ai-workflow/AI-HANDOFF/COACH-OWNERSHIP-MERGE-HANDOFF-2026-08-27.md` |
| Previous handoff (superseded) | `docs/ai-workflow/AI-HANDOFF/COACH-OWNERSHIP-HANDOFF-2026-08-26.md` |
| All seven review rounds + briefs | `docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/` |
| Learning packets (3) | `docs/ai-workflow/hermes-learning-packets/20260826-*.md` |
| Hermes inbox memos (2) | `.ai-workflow/hermes-inbox/pending/20260826T060000Z-*`, `20260827T000000Z-*` |
| Mutation equivalence adjudications | `docs/ai-workflow/mutation-equivalents.md` |
| Linear thread | **SWA-64** — five comments across this arc, newest first |

**Session-start orientation for the next agent:** read §0, §4 (what is not proven), §5 (the
merge checklist) and §6 (open items). That is enough to act. Everything else is depth.
