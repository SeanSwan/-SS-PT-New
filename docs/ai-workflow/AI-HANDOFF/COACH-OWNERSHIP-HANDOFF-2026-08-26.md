---
decision: "Swan Coach ownership is enforced in two places with two different mechanisms: the pipeline scopes the CLIENT id (step 6), and each handler must scope any OTHER id it accepts. Two live cross-tenant holes were found in that second layer and closed."
status: shipped
supersedes: docs/ai-workflow/AI-HANDOFF/COACH-ENDPOINT-TRUTH-HANDOFF-2026-08-25.md
---

# HANDOFF — Swan Coach ownership

Branch `claude/coach-endpoint-truth-v2-20260824`, 7 commits on top of `d942881d7`.
**Not pushed, not merged, not deployed, not human-reviewed.** No paid seat consulted; $0.00.

Three holes, in two slices. §2 is the first two; §2.3 is the third, found by working down
this file's own open list.

---

## 0. READ THIS FIRST — what will cost you time

1. **Every GitHub Actions gate is dead at the account level** (blanket `startup_failure`,
   scheduled runs included). Nothing validates a merge. Three consecutive sessions have now
   produced fully-verified work that no CI can confirm. `github.com/settings/billing`.
2. **The repo baseline is not green.** 23 files fail for reasons that predate this work.
   Use `node backend/scripts/test-baseline-gate.mjs` — it compares the failing set to
   `backend/tests/known-failing-baseline.json` and exits 0 only when nothing NEW fails. A
   bare `vitest run` exits 1 on a perfectly good tree.
3. **Source files are CRLF.** A multi-line anchor written with `\n` matches nothing. This
   has cost time in four consecutive sessions. Use single-line anchors, and make any tool
   report "anchor not found" as a state distinct from "no effect" — otherwise a broken
   anchor is recorded as a working assertion having nothing to guard.
4. **`cmd | tail; echo $?` reads tail's status.** There is a pre-tool hook that blocks it.
   Use `${PIPESTATUS[0]}` or redirect to a file.

---

## 1. What this slice was for

The previous handoff (§5.1) named dispatcher authorization the next slice; the session
before this one closed it, proving **no below-role caller reaches a dispatcher** across all
303 below-role pairs. It stated plainly what it could not prove, because it mocks the
client resolver:

> nothing here asserts that a correctly-roled trainer cannot act on a client who is not
> theirs.

That is the second ownership question. Role says **what** you may run. Ownership asks
**whose record** you may run it on. This slice answered it, and found two live holes.

---

## 2. The two holes

### 2.1 A client could read any other client (`view_xp_streaks`)

One line in `commandExecutor.mjs` step 6 decided client ownership for the whole lane:

```js
{ trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined }
```

It reads as *trainers are scoped*. It **means** *every role except trainer is unscoped*.
Admin unscoped is deliberate. `client` and `user` were never considered, because the
ternary never mentions them.

`view_xp_streaks` permits a `client` caller, requires a client ref, and is not
self-service — so any authenticated client could name another client's id via
`POST /api/ai-command/execute` and receive their points, level, tier, streaks and
achievements. RBAC passed (the role IS permitted); the capability gate has no policy for
that command; the resolver was handed no scope.

**Fixed** by naming the scoped roles (`RESOLVER_SCOPED_ROLES`) so the fall-through case is
explicit. A non-privileged caller asking for a foreign id is **refused**, not retargeted:
a silent retarget answers a question nobody asked, and on a future write command would
modify the wrong record without reporting an error.

### 2.2 Any trainer could archive any workout plan (`delete_workout_plan`)

`destructive: true`, takes a `planId`, declares `requiresClientRef: false` — so the pipeline
resolves no client at all — and passed the caller-supplied id to
`transitionWorkoutPlanLifecycle`, whose own comment says it applies one *already authorized*
action: it validates `actorId` is a positive integer and records it for audit.

`DELETE /api/workout-plans/:id` reaches the same service through
`verifyClientAccessByPlanId`, middleware written for this exact class. This file's header
claimed it routed "through the same audited lifecycle boundary as the protected REST API."
**The boundary was the same; the protection was not** — commands never travel over routes,
so no middleware runs for this lane.

**Fixed** with `assertAssignmentOrAdmin`, the helper that middleware calls. Denial reuses
the existing `planFound: false` shape, matching the 404-not-403 discipline: an unassigned
trainer is told exactly what a stranger is told.

### 2.3 A confirmed operation was authorized when it was queued, not when it ran

A command requiring confirmation is authorized once, in the pipeline, then parked for up to
120 seconds. Redemption checked ownership of the pending operation, expiry, and — on the
destructive path — an HMAC signature. None of those notice that the caller's role was
revoked, or that the client was transferred to another trainer, inside that window. **The
signature proves the operation was not tampered with; it says nothing about who may run it
now, because it was signed when the caller still could.**

Both this file and the two handoffs before it named this and left it open. 120 seconds is
short, but revocation is precisely the moment someone has a reason to spend it, and a
queued destructive operation is what they would spend it on.

**Fixed** by re-authorizing at the moment of the effect, on both lanes: the caller's CURRENT
role against the registry, and their current access to the operation's client. Current, not
minted — the operation never recorded what it was minted under, and "may this caller act
now" is what every other gate in this lane asks. A type unknown to the registry is refused
only when a dispatcher exists for it: "cannot tell" must not mean "allow", but where nothing
can execute either way, the honest `not_wired` answer beats a permission error that would be
false. The denial message names no permission — a caller whose access was just revoked is
the one person who should not learn which one it was.

---

## 3. The sweep — what this finding is NOT

Every id-shaped parameter on every trainer-runnable command was checked. Seven of eight
classes were already guarded, each by a different mechanism:

| parameter | commands | guarded by |
|---|---|---|
| `clientId` | 43 | pipeline step 6 (after 2.1) |
| `trainerId` | 5 | `resolveTrainerId`, or a hard pin to `ctx.user.id` |
| `sessionId` | 1 | `cancelSessionForAI` compares `trainerId` / `userId` |
| `scheduledSessionId` | 1 | `resolveAiScheduledSessionForLog` |
| `goalId` | 1 | `Goal.findOne` scoped by `userId` |
| `profileId` | 3 | `resolveOwnedProfile` |
| `intakeId` | 7 | filters an already-scoped result set; not a lookup key |
| `planId` | 1 | **nothing** — 2.2 |

The house already had the rule. That is what makes 2.2 a gap rather than a policy question.

---

## 4. What shipped

| file | |
|---|---|
| `tests/api/aiCommandDispatcherOwnership.contract.test.mjs` | 12 tests. Resolver REAL. Every trainer/foreign pair denied AT `resolve_client`, by id and by name. Non-privileged callers scoped to self. Admin's unscoped access asserted as deliberate. |
| `tests/api/aiCommandTrainerScopeOwnership.contract.test.mjs` | 8 tests. `resolveTrainerId` behaviour; every trainer-runnable `trainerId` command constrains the id inside its OWN handler body. |
| `tests/api/aiCommandPlanArchiveOwnership.contract.test.mjs` | 8 tests. Ownership, fail-closed on a throwing lookup, and all three "no" answers indistinguishable. |
| `tests/helpers/fakeClientDirectory.mjs` | A database that mirrors the predicates the SQL carries rather than enforcing assignment itself — so removing the scope clause fails the suite. |
| `tests/helpers/schemaShape.mjs` | Reads parameter names through `.refine()` / `.optional()` wrappers. |
| `tests/helpers/ownershipFixture.mjs` | Shared actors, command sets, handler-body slicing. |
| `services/ai/commandExecutor.mjs` | `RESOLVER_SCOPED_ROLES` + the non-privileged self-scope. |
| `services/ai/dispatchers/workoutPlanCommandDispatchers.mjs` | The access check, and a header that no longer claims a protection it does not perform. |
| `tests/api/aiCommandConfirmLaneReauthorization.contract.test.mjs` | 12 tests. Executes the confirm lane rather than scanning it: mints a real operation, redeems it with a changed actor. Also walks the function body and fails on a dispatch that is not preceded by a gate. |
| `services/ai/commandExecutor.mjs` (again) | `confirmLaneDenialReason`, called on both redemption paths. |

---

## 5. Verification

- 39/39 across the four ownership contracts
- Full backend: **9712 passed**, failing-file set **identical** to `known-failing-baseline`
  (compared as sets — gate exit 0)
- **29/29 mutations fire**, every file restored byte-identical by sha256
- `node --check` clean; registry import smoke 139 commands; secret scan CLEAN
- Zero frontend files changed (`git status` proves it), so no frontend gate was run
- **DRY-LOOP: CLEAN ×2 on each slice (rounds: 7, then 6)**

One mutation SURVIVED before it was closed: flipping the confirm lane's access-lookup catch
to fail OPEN left every other assertion green, because nothing exercised a rejecting
authorizer. A gate that fails open under load works in every test and stops working exactly
when the database is unhappy. That is the third thing this session that reasoning missed and
mutation caught.

### Not proven — stated, because silence reads as coverage

- **Dispatcher self-gating.** Handlers are mocked in the client-ownership contract. It
  proves the pipeline denies before a handler runs; not that a handler would refuse alone.
- **A role that changes DURING dispatch.** §2.3 closes the gap between minting and
  redemption, not between redemption and the write itself.
- **Real SQL.** The fake mirrors the resolver's predicates; it proves the query carries
  them, not that PostgreSQL evaluates them the same way.

### Test delta

**Four** existing suites needed fixture changes; **no assertion was weakened**.

Two mock the model registry without a `findByPk`, which the archive path now calls; both use
admin actors, so the check passes on role alone. `workoutPlanLifecycleMutationWiring`
resolves `findByPk` for EVERY id deliberately, including `'missing-plan'`: that test is about
the SERVICE's not-found rejection, and short-circuiting it earlier would have moved it onto a
different code path while it kept passing.

Two more (`commandExecutorConfirmedOperation`, `commandExecutorErrorDisclosure`) now
initialize the registry. Both `vi.resetModules()` and re-import, leaving the registry
singleton empty; production always has it initialized, because `aiCommandRoutes.mjs` calls
`initializeRegistry()` at module load in the same module that serves `/confirm`. Their prior
state modelled a condition the server never reaches — and an uninitialized registry now
denies everything, which is the right direction for a boot-order accident to fail in.

---

## 6. Open — your call

1. **Merge / deploy**, given §0.1.
2. **Next slice: dispatcher self-gating.** Now that the pipeline is proven to deny, the
   remaining question is whether a handler reached by any other means would refuse on its
   own. Lower stakes than what was just closed — this is defence in depth behind a gate now
   known to hold.
3. **`view_xp_streaks` still lists `client` in `roleRequired`.** Harmless now — a client
   resolves only themselves, which is what `my_xp` already does — but redundant. Removing
   it would start denying at the role gate what currently succeeds, so it was left alone.
4. **The `\n`/CRLF trap became a check, and the check taught the precise rule.** Five
   recurrences here, on top of four sessions, every one after reading a write-up about it.
   The mutation harness now refuses to run on an anchor whose `\n` is anywhere but index 0 —
   and running that guard is what revealed WHY: a LEADING `\n` matches the `\n` half of a
   `\r\n` and correctly anchors a line start; a `\n` in the middle cannot, because the source
   has a `\r` the anchor lacks. Four prose warnings never contained that distinction. The
   harness lives in the session scratchpad; promoting it into `scripts/` is worth a slice.
5. Still open from the previous handoff: `allowedRoles` untrustworthy for 54% of rows; the
   `request_plan_adjustment` fictional-endpoint carve-out; three branches carrying this work.

---

## 7. Where the evidence lives

| artifact | path |
|---|---|
| Durable learning packet | `docs/ai-workflow/hermes-learning-packets/20260826-the-role-you-name-defines-the-ones-you-did-not.md` |
| Hermes inbox memo | `.ai-workflow/hermes-inbox/pending/20260826T060000Z-vs-claude-coach-ownership-two-idors.md` |
| Previous handoff (superseded) | `docs/ai-workflow/AI-HANDOFF/COACH-ENDPOINT-TRUTH-HANDOFF-2026-08-25.md` |
| Prior packet this slice built on | `docs/ai-workflow/hermes-learning-packets/20260826-the-step-before-your-gate-absorbs-your-probe.md` |
