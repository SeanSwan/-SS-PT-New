# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** c:/tmp/ss-launch-audit-20260727/docs/ai-workflow/AI-HANDOFF/LAUNCH-AUDIT-FINDINGS-PACKET-2026-07-27.md
**Seed:** c:/tmp/ss-launch-audit-20260727/docs/ai-workflow/AI-HANDOFF/KIMI-LAUNCH-AUDIT-REVIEW-2026-07-27.md
**Tokens:** 6994 in / 2291 out · **Cost:** ~$0.1845 · **Wall:** 37.7s

---

# LOCKED RULING — GO-LIST (execute in this order)

The seed's structural critique stands: the audit hardened code, not operation. With the two resolved challenges struck (script deletion is clean; onboarding mounts don't shadow), the remaining launch risk is **operational**: money, data, silence, and lateral access. Everything below closes one of those. Nothing else blocks launch.

---

## Before the batch push (~today)

**1. Quarantine the WIP branch — [AGENT]**
Snapshot-push `wip/comms-notifications-2026-07-05` to origin, tag it `archive/comms-2026-07-05`, move the working tree to clean `main`. 30 minutes; removes the standing `git add -A` hazard with 5 agents in the repo. The 154 files are **archived, not cherry-picked** — final. One follow-up check folds into item 6.

**2. Rotate every Stripe key the deleted scripts touched — [SEAN]**
The scripts read and rewrote live key material; deleting them changed nothing about exposure. Only Sean has Stripe dashboard access. Rotate, update production secrets, confirm the app boots against new keys. This is the single highest-consequence open item and cannot be delegated.

**3. Stand up observability — [AGENT builds, SEAN approves the destination]**
Error tracking (Sentry or equivalent), 5xx-rate alert, one uptime check on `/health` and `/api/health`. Must exist *before* the batch deploy or the deploy is unverifiable. Agent wires it; Sean confirms alerts reach his phone.

**4. Verify backup + do ONE restore drill — [SEAN executes, AGENT scripts it]**
Agent writes the dump/restore procedure; Sean runs the restore against a scratch database and confirms a real client record round-trips. A backup that has never been restored is a rumor. If no backup job exists, creating one is the blocker, not the audit.

**5. Two-session lateral IDOR probe — [AGENT]**
The 204/232 static result covers unauthenticated exposure only. Agent creates two throwaway accounts (no PII), scripts authenticated-as-A-requests-B's-id across the 232 id-accepting routes, expects 403/404 everywhere not explicitly cross-user-by-design, and **includes the socket layer**: connection auth, room-join authorization, event-level checks. This is the week-one incident shape. Any failure escalates to Sean immediately.

**6. Confirm main's live messaging has moderation + attachment controls — [AGENT audits, SEAN decides]**
The archived branch held the safety layer. If main's shipped messaging lacks attachment-type limits and any moderation/report path, Sean decides: (a) disable attachments/messaging for week one, or (b) accept a minimal safety slice written against current main. Do **not** backport stale code. This is a minors-platform decision only Sean can own.

**7. Reconcile production runtime with the lockfile — [AGENT]**
`archiver` 8.0.0 vs pinned 7.0.1 proves the deployed artifact can diverge from what 7,192 tests validated. Fresh `npm ci` on a Linux environment matching production, diff installed versions against the lock, fix drift. Also triage the 8 failing tests to written dispositions (env-dependent = documented skip, anything real = fix).

## The push itself

**8. Batch deploy with a written rollback — [AGENT prepares, SEAN pulls the trigger]**
One push per the cadence, but with: last-known-good SHA recorded, one-command revert documented, and deploy verification = health probe + one authenticated smoke flow (login → client dashboard → onboarding entry card renders). Sean deploys; if 9am breaks, the revert is mechanical.

**9. Live money-path proof on production — [SEAN, post-deploy, pre-client]**
Real $1 charge → webhook confirmed received → refund → failed-card path. Against the *rotated* keys, on the *deployed* build. This must be Sean: real payment instrument, real Stripe account. No client takes a session until this passes.

## Decided now, executed after launch

**10. Trainer-permission ruling — [SEAN decides in one sentence, AGENT executes]**
Ruling: role-level + active-assignment is **acceptable v1 iff every week-one trainer is Sean or fully trusted staff**. Sean answers that question; if yes, agent moves `trainerPermissionMiddleware.mjs` (563 lines) into the archive tag with the branch — "built but unwired" is not a stable state and half-wiring it later is worse than either pure state. Agent also verifies assignment revocation kills access immediately (one test), because that's the incident that survives even a trusted roster. If any trainer is a contractor: wiring the permission system becomes item 6.5 and messaging attachments stay off until it lands.

**11. Rate limits beyond login — [AGENT]** Registration, password reset, message send, upload size/type caps. Week-one nice-to-have unless item 6 keeps attachments on, in which case upload caps join item 6.

---

## Explicitly deferred — do not spend hours on these

- **236 frontend / 93 backend orphans:** frozen, not deleted, not audited. Post-launch.
- **166 unresolvable test imports:** suite runs; residue quantification is week-two hygiene.
- **Performance, mobile polish, design:** seed's ranking stands — nothing in week one dies over them.
- **Re-litigating the deletions or the onboarding mounts:** resolved with evidence. Closed.

**Bottom line:** GO for launch on this build, conditional on items 1–9 completing in order. Items 2, 4, 6, 9, and 10 are Sean's hands or Sean's judgment — roughly three hours of his time. Everything else runs autonomously in parallel behind item 1.
