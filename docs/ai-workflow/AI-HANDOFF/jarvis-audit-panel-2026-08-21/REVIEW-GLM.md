# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/ss-jarvis-audit-20260821/.panel/PACKET.md
**Tokens:** 5827 in / 11905 out (reasoning: 9207) | total 17732
**Wall:** 172.0s

---

# Hostile Review: Swan Coach "Jarvis Readiness" Audit

## 1. Claims the evidence kills outright

**P0 #1 (client-authored confirmation boolean) — FALSE, and false in the most damning way.** The `/confirm` route at `aiCommandRoutes.mjs:365-378` accepts one field, `operationId`. A repo-wide grep for `confirmed === true` / `confirmation.confirmed` / `req.body.confirmed` returns exactly one hit, an unrelated list filter in `session.service.mjs`. Worse for the audit: its proposed "replacement protocol" — server-minted approval, expiry, approval ID, one-time consumption, immutable params, replay protection — is a **specification of `destructiveOperations.mjs` as shipped**. HMAC over `{id,type,endpoint,commandType,params,createdBy}`, `timingSafeEqual`, 120s TTL, actor-bound retrieval, `pendingOps.delete()` on all six retrieve paths, params frozen at mint, kill-switch re-check at execute. The audit demanded the team build the thing it failed to open. And note the tell: the audit wrote "the backend command route **appears** to accept." A P0 shipped on "appears," without the one grep that disproves it, is a methodology failure, not a finding. The only surviving kernel — step-up auth for top-risk ops and tenant/role in the signed payload — is P2 hardening, not P0.

**The "simulated TTS" claim — FALSE/stale, including the quoted state.** `usePremiumTTS.ts` drives real `speechSynthesis` (`getVoices`, `speak`, `cancel`) at lines 130–171. Grep for `simulat|setTimeout|disabled` in that file: **zero matches**. So not only is "simulates speaking duration with a timer" false, the predicate claim "usePremiumTTS **says** server-side TTS is disabled" is also false — the string doesn't exist. This poisons three places: the "Voice behavior is internally contradictory" P1, the "real vs simulated TTS" drift pair in Jarvis gap #1, and the final assessment's "mixture of dictation, upload transcription, browser TTS and simulated TTS." One grep would have caught all three.

**Derived directives that inherit the falsity.** Phase 0 instructs: "Replace boolean confirmation with server-issued... approval records" (replaces nothing — it exists), "Remove or rename simulated TTS" (invites deleting a working speechSynthesis implementation on a false premise), and "Add an immediate server-side... kill switch" (stale — `aiCommandLaneKillSwitch` middleware sits on the route and `executeConfirmedOperation` re-checks the write switch; the honest item is "extend to per-user granularity"). The completion gate "no sensitive command may execute from a client-authored boolean" enforces a property that already holds — a gate that cannot fail is decoration. The final-assessment sentence "confirmation is not yet bound to a server-issued action challenge" repeats the dead P0, which is how a false premise metastasizes into roadmap.

**The `not_wired` insinuation — stale.** The executive verdict presents `not_wired` as a live bucket ("a definition can exist without being an executable capability"). `commandRegistryCoverage.test.mjs` test 1 asserts **no command falls into raw `not_wired`**. The class exists in the classifier; its membership is empty and CI-lockable. The audit's real point survives only via `manual_only`/`chat_fallback`, and it never noticed the empty bucket is already enforced.

## 2. Real findings, correctly or incorrectly ranked

**CI/branch protection P0 — CONFIRMED, correctly ranked, the audit's best work.** `ai-eval-gate.yml` runs only `npm run eval`; `required_checks.enforcement_level: "off"`; nothing blocks a direct push to main. I concede this fully — with two sharpenings the audit missed: (a) the fix is *config plus wiring*, not test authorship — the unit suite including the registry coverage lock already exists and merely isn't run, so the remediation cost is a workflow edit and a repo-settings toggle; (b) this P0 *interlocks with E2*: with protection off, any direct push that restarts instances silently voids in-flight approvals (see below). The audit treated its two P0s as independent; one amplifies the other.

**134 commands — right number, wrong novelty.** The registry's own `index.mjs:6-12` documents the 119-vs-134 drift and even recounts that two commit messages cited the stale figure. The audit recounted the count without reading the repo's own confession. The P1 "generate a capability truth report" should be re-scoped from greenfield build to **promotion**: `commandExecutionLane.mjs` already produces the lane classification deterministically, and the coverage test already pins membership and has caught drift. Ship a generated, versioned manifest from that classifier and feed the UI from it. Don't propose building what's two-thirds built.

**Process-local state P1 — right pattern, negligent application.** The audit found the in-memory Map defect exactly once, in the *transcription rate counter* — the lowest-stakes instance in the repo — and never grepped for the class. Which brings us to:

## 3. What the audit missed

**E2 — the actual P0, sitting in the file the audit needed to read to verify its fake P0.** `destructiveOperations.mjs:12`: `OPERATION_SIGNING_KEY || crypto.randomBytes(32)`. Unset in prod → HMAC secret is **random per process** → every deploy/restart silently invalidates in-flight approvals. And `:18`: `pendingOps = new Map()` with an inline comment stating **Redis is disabled in production** — the audit hedged ("not coordinated across multiple instances") where the repo states the topology outright. On >1 instance, mint-on-A/confirm-on-B dies with a misleading "expired" error. The repo's own design doc (`GOD-LEVEL-AI-UPGRADE-PROMPT-V3.md:599,806`) mandates the strict form and lists the key in `REQUIRED_ENV`; shipped code silently degrades. The audit never diffed code against the repo's own spec — an audit that proposes "truth reports" but doesn't consume the truth documents in-repo.

**The deeper analytical miss: the HMAC is theater under the current deployment shape.** With a per-process secret *and* a per-process store, no signed payload can cross a trust boundary — there is no adversary path where `timingSafeEqual` matters. The cryptographic rigor is pointed at nothing while the actual failure modes (key lifecycle, shared store) go unhandled. An audit that lectures about "cryptographically server-bound voice approvals" in Phase 3 without noticing where the existing crypto does and doesn't bind hasn't done the threat modeling it's selling.

**The causal chain.** Had the auditor executed one grep to verify "appears to accept," they would have opened `destructiveOperations.mjs` and had lines 12 and 18 in front of them. The fake P0 and the missed real P0 are the same failure.

## 4. Architecture verdict

**Direction: defensible. Over-engineered and mis-ordered as remediation. Actively dangerous in three places.**

- The end-state (unified runtime, tiered memory, read-only-first event engine, PR-gated design sandbox) is a legitimate product ambition. But the seed-proven defects require roughly: an env var, Redis enablement, a workflow edit, a repo-settings toggle, and manifest generation. None require a nine-module `swanRuntime/`. Packaging ambition as remediation is how audits get teams building a brain while the spine is broken.
- **Phase 1 consolidates the wrong thing first.** The audit itself calls the deterministic command lane "one of the strongest parts of the system" — then its first structural move adapter-wraps that best-tested subsystem while the unenforced CI, ephemeral key, and process-local approval store wait. Worse, the consolidation is specified without its one non-negotiable invariant: *NL classification → registry → dispatcher stays deterministic; the runtime may select writes, never author them.* Without that stated, Phase 1 erodes the system's best property.
- **It discards working code three times:** (1) the two-phase-commit in `destructiveOperations.mjs` would be rebuilt to a spec it already satisfies; (2) the `commandRegistryCoverage` lane lock — the only regression test that has provably caught drift — gets orphaned by a parallel "UI Intent Bus" instead of extending the existing typed dispatch union in `coachFrontendDispatchClassifier.mjs`/`coachDispatchEligibilityService.mjs`, which already does payload allowlisting and required-field validation; (3) `usePremiumTTS` faces deletion via Phase 0's false bullet.
- The "72/58/45" scores are unweighted numerology. Delete them; they pad credibility the findings don't support.

## 5. Corrected fix list — dependency-ordered, severity-ranked

1. **[P0, no deps] Set `OPERATION_SIGNING_KEY` in production and hard-fail boot when unset in prod mode.** Restores V3 `REQUIRED_ENV` compliance; ends restart-time invalidation of live approvals. One env var + a guard at `destructiveOperations.mjs:12`.
2. **[P0, no deps] Enable branch protection on main, requiring the existing eval gate immediately.** E6: enforcement is off; this is a settings toggle, not a project.
3. **[P0, after 2] Widen CI to run the *existing* backend unit suite — including `commandRegistryCoverage.test.mjs` — plus tsc, frontend build, lint; then add those as required contexts.** The tests exist; wire, don't write.
4. **[P0-enabler] Provision Redis in production** (the code comment at `:18` says it's off). Unblocks 5 and 6.
5. **[P0, blocked by 4] Move `pendingOps` to Redis**, preserving 120s TTL and making one-time consumption atomic (GETDEL or Lua). Latent single-instance today; deterministic breakage under any second instance.
6. **[P1, blocked by 4] Migrate the transcription counter and AI message quota to the same Redis**; demote localStorage to UX hint. This is the audit's P1, correctly re-prioritized *below* the approval store it never noticed.
7. **[P1, after 3] Generate a versioned capability manifest from `commandExecutionLane.mjs` + registry metadata** (lane, risk, roles, dispatcher/preflight/verification presence, test mapping); UI advertises from it; keep the coverage test as the CI lock. Promotion, not greenfield (E4/E5).
8. **[P1, no deps] Voice truth pass:** retract the simulated-TTS claims from every document including the roadmap; unify recognition modes and TTS behind one service with the audit's state enum (that part was fine); **explicitly preserve `usePremiumTTS`**. Mandatory before anyone executes Phase 0's deletion bullet.
9. **[P2, no deps] Approval hardening — the 10% survivor of the dead P0:** add tenant/role-at-approval to the HMAC payload, step-up auth for top-risk ops, and an adversarial test pack (confirm-without-mint, replay, cross-user `operationId`, expired TTL, post-kill-switch execution). The last two behaviors exist; lock them with tests so they can't regress.
10. **[P2, after 7] Extend the existing typed frontend dispatch union** with navigate/focus/filter/draft/preset intents, receipts, undo — incremental additions under the existing eligibility service and lane lock. No parallel bus.
11. **[P3, after 1–7] SwanRuntime consolidation as explicit product roadmap, not remediation,** with the determinism invariant written into its charter.
12. **[P3, after 11] Memory tiers, then the read-only-first event engine.**
13. **[P3, last] Design sandbox via branch + PR + CI.**

**Bottom line:** one real P0 survived review (CI/branch protection). The other P0 is a hallucination that would have redirected a rebuild of the repo's best security code, and the audit's single confirmed defect class (process-local state) was applied to the one place it matters least while sitting unexamined in the approval store it declared missing.
