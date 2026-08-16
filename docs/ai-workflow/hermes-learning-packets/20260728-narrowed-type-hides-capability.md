---
originating_model: claude-fable-5
date: 2026-07-28
topic: A narrowed type can hide a capability you already have — probe before you assume an architecture blocker
provenance: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
title: the blocker that was a `Pick<>`, and the two bug classes only a real DB finds
tier_basis: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
decision: A narrowed type can hide a capability you already have — probe before you assume an architecture blocker
status: draft
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-provenance; decision<-topic (re-keyed, not re-authored); status=draft (never reviewed against a contract)); originating_model untouched
---

# Learning Packet — the blocker that was a `Pick<>`, and the two bug classes only a real DB finds

**The permanent lesson (generalizes far past this repo):** before accepting that a fix
"requires new infrastructure / a refactor / a tool we don't have," probe whether the
capability already exists and is merely **type-narrowed out of reach**. A blocker that
three review rounds and two sessions treated as "needs Docker + a rewrite" was one
`Pick<DatabaseRuntime, 'query'>` throwing away `withTransaction` on an object whose real
caller was already passing the full runtime.

## 1. The specific instance (SwanGuard passkey login, NB3)
Symptom framing inherited from the reviews: "login verify is 3 loose statements with no
transaction; a cloned authenticator burns the victim's one-time challenge; correctness
requires a testcontainers concurrency suite." Treated as externally gated for two sessions.

What probing actually found:
- `DatabaseRuntime` **already** exposed `withTransaction`.
- `runtime.ts` **already** passed the full runtime into the auth store.
- The store's parameter was typed `Queryable = Pick<DatabaseRuntime,'query'>` — the *type*,
  not the architecture, was the blocker.

Fix shape worth copying: widen to an **optional capability** —
`TransactionalQueryable = Queryable & Partial<Pick<DatabaseRuntime,'withTransaction'>>` —
so production gains atomicity with **zero caller changes** while query-only test fakes
degrade to the previous sequential path with identical guards. A module-private
`Rejected` sentinel thrown inside the transaction converts "reject" into "roll back",
which is what makes the security property (a rejected clone must not consume the
challenge) true rather than merely intended. Long-running or foreign-connection work
(`findOrCreateUser`) stays **outside** the transaction so the lock window is not extended.

## 2. Diagnostic habit to institutionalize
When a plan says "blocked on X," run three probes before believing it:
1. **Capability probe** — does the underlying object/service already expose what's needed?
   (`grep` the interface, not the doc.)
2. **Caller probe** — what does the real production call site actually pass? Narrowing is
   frequently defensive typing added long after the caller became richer.
3. **Cheapest-widening probe** — can the capability be made *optional* so no caller and no
   test changes? Optional capability > mandatory interface change > refactor > new infra.
Docs and prior reviews describe the past; the call graph describes the present. Trust the
call graph.

## 3. The companion lesson: two bug classes that ONLY a real database surfaces
Standing up real Postgres (Docker) on the same day surfaced, within minutes, defects that
an in-memory store could never produce — both of which would have failed in production on
first boot:
- **Missing bind placeholder.** `where token_hash =  and ...` (the `$1` silently absent)
  made session revocation and magic-link invalidation dead SQL — a stolen session could not
  be revoked. Syntactically fine to a human skim; fatal on first execution.
- **UTF-8 BOM in a `.sql` migration.** Postgres rejects a leading BOM
  (`syntax error at or near "﻿create"`), crashing the *entire* migration run. Note the
  asymmetry worth remembering: **`.ts`/`.tsx` BOMs are harmless** (tsc/esbuild strip them),
  **`.sql` and anything fed to a strict parser are fatal.** Fix the file *and* strip BOMs in
  the loader so the class cannot recur.

**Rule that follows:** auth/DB code whose only exercised backend is an in-memory map is not
merge-safe, regardless of how green the unit suite is. The in-memory store proves logic; it
cannot prove *SQL*, *drivers*, *encodings*, or *transaction semantics*. Budget the container.

## 4. Proof discipline that made this land
The claim "the login is now atomic" is unprovable by unit tests using fakes — the fake has
no transaction to roll back. The verification had to assert the **observable consequence**:
after a rejected clone attempt, `passkey_challenges.consumed_at IS NULL` on a real database.
Generalization: **verify the side effect that only the mechanism you added can produce**, not
the mechanism's presence. "Ran in a transaction" is an implementation claim; "the row was
left untouched after rejection" is evidence.

## 5. Applying this
- New blocker claimed → run the three probes (§2) before scheduling infrastructure work.
- Any store/service parameter typed with `Pick<>` → ask what was dropped and whether a
  caller already has it.
- Any auth/DB path → require at least one real-database execution before calling it
  merge-safe; write the smoke as an npm script so it is repeatable, not a one-off.
- Any security fix → phrase the test as the observable consequence, not the mechanism.
