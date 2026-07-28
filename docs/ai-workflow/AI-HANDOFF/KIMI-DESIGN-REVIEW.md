# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/ss-launch-audit-20260727/docs/ai-workflow/AI-HANDOFF/LAUNCH-AUDIT-FINDINGS-PACKET-2026-07-27.md
**Seed:** (none)
**Tokens:** 1928 in / 5590 out | **Cost:** ~$0.0896 | **Wall:** 187.2s

---

# Hostile Review: SwanStudios Launch-Readiness Audit

**The structural problem with this audit, stated once up front:** its own headline finding invalidates its core method. Section 1.2 proves that static mount/guard resolution *lied* — a file looked live and wasn't. The audit absorbed that lesson for dead code but not for live code: "204/232 fully guarded" rests on the same mount-graph resolution that was proven fallible, validated by exactly one live probe, unauthenticated. The audit verified what the code *is*. Launch hurts come from what the system *does*.

---

## 1. Is the auth conclusion too confident?

**Yes. The method structurally misses every bug that requires a valid session to reach.**

- **Lateral IDOR between two legitimate users is untested.** One unauthenticated probe proving the front door is locked says nothing about user A reading user B's data. The 232 id-accepting routes each need a two-session live probe: authenticated as A, request B's id, expect 403. That is the week-one incident shape — a trainer or client who pokes a URL — and it has zero runtime coverage.
- **The audit's own finding undermines its guard resolution.** `gamificationRoutes` looked mounted and wasn't. The inverse failure — a route that looks guarded but resolves through a different mount, an earlier shadowing router, or middleware ordered after the route — produces an *unguarded live route that static analysis scores as guarded*. The audit found two routers stacked on `/api/onboarding` (lines 317/319) and apparently did not resolve which one Express actually dispatches to. First match wins. Until that's traced per-verb, the auth count on that path is unknown, not "0 unguarded."
- **Role-conditional logic inside controllers is invisible to a guard sweep.** A route passes `authorizeResourceAccess` and then branches on `req.body` fields — mass-assignment of role, status, or price; trainer-only fields settable by a client. "Guarded at mount/router/inline" does not see data-dependent authorization.
- **Socket layer is entirely absent.** This is a messaging product. Socket auth middleware, room-join authorization, per-event checks — none of the 1,444 routes cover it, and the packet never mentions it. If messaging ships, the socket plane is the largest unexamined attack surface in the repo.
- **"Cross-user by design" is a claim, not a verification.** Public prekey bundles are enumeration oracles by construction. Follow/unfollow and trainer availability need abuse-case review (scraping, stalking surface for a platform with minors), not a design shrug.
- **Type coercion and lookup-key mismatches** — `:id` string vs number, ownership checked on the wrong parent object (message owned but conversation not joined) — survive every technique listed.

Verdict: the conclusion should be restated as "no *unauthenticated* exposure found." Authenticated lateral movement is unmeasured.

## 2. The 154 uncommitted files

**Archive for launch. But the archive decision is not the real decision.**

- **Finish:** not an option in hours. Merging a workstream written against a main from 1,177 commits ago into a product taking real clients tomorrow is how you ship untested messaging to minors. Highest risk, full stop.
- **Cherry-pick forward:** the seductive trap. The code was written against schema, models, mounts, and auth helpers that have since drifted; its ~30 test files validate it against assumptions main no longer holds. Cherry-picking produces the *appearance* of integration. Worse, 140 sibling files already exist on main in some form — main has its own answer to much of this, and the 154 may conflict semantically with it.
- **Archive:** lowest launch risk, one real cost — the workstream contains **attachment safety and moderation**, and this platform handles minors' data. So the actual question is not "what do we do with the branch," it's: **does main's current messaging have moderation and attachment controls?** If yes, archive cleanly. If no, Sean is launching comms to minors without a safety layer, and the fix is a minimal moderation slice written against *current* main — not a backport of stale code.

Immediate mechanical risk regardless: a dirty tree with 1,216 modified files sitting on a WIP branch in a repo with 5+ parallel agents is an accident waiting for a `git add -A`. Push the branch to origin as a snapshot, tag it, and get the working tree off it today. That's 30 minutes and it protects everything else.

## 3. The unwired trainer-permission system

**Acceptable v1 only under three conditions, and the audit verified none of them.**

1. **All trainers are equally trusted.** Granular permissions govern what a trainer can do to *their own assigned* clients — see payments, message, export, edit vs view. If Sean's week-one trainers are a small trusted staff, role-level + assignment scoping holds. If any trainer is a contractor, assistant, or junior, it doesn't.
2. **Assignment revocation is immediate.** The guard is "trainer-with-**active**-assignment." What happens when an assignment ends — is access cut at revocation, or does a cached session/token preserve it? A fired trainer retaining client data access is a week-one-to-week-four incident, and nothing in the packet tests the revocation path.
3. **No external promise was made.** Someone *specified* 563 lines of granular permission requirements. If a client or parent was told "the assistant only sees workouts, not messages," the gap is a broken commitment, not a v1 deferral.

Separately: the audit's deletion policy is internally inconsistent. It deleted 1,321 lines of unmounted routes as corpses but kept a 563-line unmounted middleware because it "reads as a missing feature." Built-but-unwired code is the worst state — some future agent will wire `requireTrainerPermission` into one router and create half-granular, half-role enforcement, which is worse than either pure state. Decide now: wire it everywhere or quarantine it with the branch. "Built and never wired" cannot be a stable category.

## 4. Deletion judgement

**Directionally correct, verified against the wrong standard.**

"Zero live imports" is a code-graph answer to an operational question. Static import analysis misses:

- `package.json` scripts, CI workflows, cron/Task Scheduler entries, PM2 ecosystem files, Docker entrypoints, and deployment runbooks that invoke scripts by path string. Forty-four scripts lived in the backend root — that is exactly where ops-invoked scripts live. The packet does not state that anyone grepped the ops surface.
- Dynamic `import()` with computed paths and `require(variable)`.

The more serious miss: scripts that **read and rewrote live Stripe key material** existed and presumably ran. Deleting them changes nothing about exposure. Were those keys rotated? If not, the deletion is cosmetic and the compromise window is still open. That question is unanswered in the packet and it's a launch blocker.

Timing: deletion pre-launch is fine *because* the suite now runs — but under the batch-push cadence, none of this is deploy-verified yet. One push carrying deletions plus every other slice, with one verification at the end, means a broken deploy has no bisected culprit and no stated rollback plan.

## 5. What is missing entirely — ranked by week-one hurt

1. **Backup and *tested restore* of production data.** Sean runs real client work tomorrow. One lost client program in week one is a reputational kill. The packet contains zero on backups, migrations, or restore drills. A backup job that has never been restored is a rumor.
2. **Money path, verified live.** Scripts rewrote Stripe keys; keys may be stale or unrotated; nobody has reported a real $1 charge + refund + webhook confirmation against production. A failed or double charge with a real client in week one is direct revenue and trust damage. The constraints mention payment flows; the findings never touch them.
3. **Observability.** One curl of `/health` is not monitoring. No error tracking, no log aggregation, no alerting on 500 spikes means Sean learns about breakage from angry clients. This must exist *before* the batch deploy, or the deploy is unverifiable.
4. **Minors'-data compliance surface.** Parental consent, retention/deletion, messaging moderation (see Q2). The security sweep was IDOR-shaped; the actual worst-case week-one event is a child-safety or privacy incident, and nothing in the method looks at it.
5. **Production environment ≠ lockfile.** `archiver` 8.0.0 installed against a 7.0.1 pin, a Linux `node_modules` on Windows, a Linux-only transitive dep — these are tells that the deployed artifact does not match what the 7,192 tests validated. What else diverges? The suite's greenness applies to an environment that may not be the one serving clients.
6. **Two-user live authorization probe** across the 232 id-accepting routes (Q1). The most likely *security* incident with real trainers and clients.
7. **Rate limits beyond login.** Registration, password reset, message send, attachment upload. Unbounded upload on a platform with minors is both an abuse and a billing vector.
8. **Rollback plan for the batch deploy.** One push, many slices, real sessions the next morning. If it breaks at 9am, what reverts, and how fast?

## 6. Sequencing — hours, not weeks

1. **Quarantine the WIP branch** (snapshot-push, tag, clean tree). 30 minutes; protects against the 5-agent repo hazard before anything else moves.
2. **Runtime errors / observability.** Cheap, and it makes every subsequent slice — including the final batch deploy — diagnosable instead of blind.
3. **Money path.** Live $1 charge, refund, webhook, failed-payment path; rotate any key the deleted scripts touched. Revenue and the highest-consequence unknown.
4. **Schema drift / prod-vs-lockfile reconciliation.** The archiver mismatch proves divergence; find all of it before trusting the suite's verdict on production behavior.
5. **Route exposure / rate limits.** Two-user live probes on the 232 routes, resolve the `/api/onboarding` shadowing, then limits on registration/reset/upload. Static auth is already strong, so this ranks below money and data — but the shadowing resolution is cheap and should not wait.
6. **Performance.** Only matters under real load; Sean's week-one load is knowable and small.
7. **Mobile.** Trainers work from phones, so this outranks design, but nothing in week one dies over it.
8. **Design.** Last. Nothing in week one hurts because of polish.

The through-line: this audit hardened the codebase's *structure* and never touched its *operation*. Week-one pain comes from data loss, money, silence when things break, and a minor's safety incident — in that order — and the current method is structurally incapable of seeing any of them.
