# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-swa200-final-2026-08-24/PACKET-R5.md
**Tokens:** 3859 in / 23375 out (reasoning: 20535) | total 27234
**Wall:** 384.4s

---

# Q1 — the billing diagnosis

**Verdict: correct in family, unproven in species, and your elimination argument survives.**

I attacked the elimination table and cannot reopen any repo-level cause: `startup_failure` with **zero jobs, zero check-runs, zero annotations** means GitHub declined the run *before any job existed* — that kills runner-label problems (those queue jobs), fork-approval states (those show `action_required`), YAML (invalid workflows emit check-runs *with* file/line annotations), and secrets/OIDC (those fail at step level, inside jobs). The `schedule` failures with no human, branch, or diff kill the event-specific family. Repo-level causes are dead by measurement, and the decline must therefore be **account-scoped**.

**The non-billing survivor you asked for: an account-level Actions restriction — usage-policy hold / account suspension-lite.** It is consistent with *every* observation, including the pre-job silence (the "error" is account state, not file state, so nothing is annotated). Low prior — ~42 runs/day is not mining-scale — but it is the one cause that fits. (A 12-day platform incident also fits trivially; one URL — githubstatus — dismisses it. Do that before anything else.)

**Cheapest distinguishing command:** billing cannot touch public repos (Actions are unmetered for public repos on personal accounts); a policy hold *would*:

```bash
gh repo create ci-probe --public --clone && cd ci-probe && \
mkdir -p .github/workflows && \
printf 'on: [push]\njobs:\n  p:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n' \
  > .github/workflows/p.yml && git add -A && git commit -m probe && git push && \
gh run list --limit 1
```

- **Green** ⇒ platform and account are fine; the block binds to *private* repos ⇒ billing/allowance, **confirmed by observation** — elimination no longer needed.
- **Identical `startup_failure`/zero jobs** ⇒ account-level restriction ⇒ neither billing nor any Q1b candidate fixes it; file a support ticket immediately.

Weaker one-liner first if you like: `gh workflow run <wf> --ref main` — a 403/suspension message on dispatch is the policy signature; a created-then-instantly-dead run is the pre-job decline. And the cross-repo control you fumbled: repeat the hello-world in a **new private** repo — that is the account-vs-repo discriminator your zero-workflow repos failed to provide.

Two sharpness complaints. (1) "Zero successes, **ever**" overreaches: 500 is your fetch window (Aug 14–26), not history — claim the window. (2) If the plan's billing-cycle reset fell *inside* that window, continuous failure weakens plain minute-exhaustion (a reset re-arms included minutes; you'd expect a green day until re-burn) and favors a hard block — spending limit already pinned at $0 with exhausted minutes, failed payment, or burn ≥ allowance/month. One question to the operator settles it. Also: I cannot independently corroborate that `path:"BuildFailed"` + empty `name` is GitHub's specific billing emission — your elimination carries the diagnosis; that string is asserted, not evidenced. Say so in the writeup.

# Q1b — ranked unblock plan

| # | Move | Works given observations? | Cost | Breaks |
|---|---|---|---|---|
| 0 | **Owner opens the billing page + parallel support ticket** | Only move that restores actual CI | 2 min, browser | Nothing. Say it plainly: four review rounds have cost more than this click. If it can't happen, no technical plan substitutes — everything below is a workaround, not a fix. The support ticket also covers the non-billing survivor. |
| 1 | **Run the gate locally, executing the real workflow** | Yes, trivially — zero billing dependency | `act -W .github/workflows/gate.yml` (keeps the workflow as single source of truth), falling back to `scripts/gate.sh` that the workflow *also* calls; Postgres container pinned to the workflow's exact image tag; gate run before each merge round | Attacks, landed: (a) *not continuous* — but current CI is 0/500; it has never gated anything, so local execution **strictly increases** enforcement; (b) *divergence* — mitigated only if workflow and local share one entrypoint; (c) *discipline decay under pressure* — add a pre-merge git hook; (d) the meta-risk: the bridge becomes permanent and the CI debt never resolves. Timebox it: success metric of this bridge is that the billing click eventually happens. |
| 2 | **Self-hosted runner — as a 20-minute experiment, not a plan** | **Uncertain, and you should have flagged this**: the decline is *pre-job*. If the gate is "private repo + account allowance," it may fire upstream of runner selection, and relabeling `runs-on` inherits the block. Two outcomes, both informative: runs execute ⇒ unblocked with free unmetered minutes; identical startup_failure ⇒ gate is upstream, drop this path and the hard-block hypothesis strengthens | Runner on dedicated OS user/container on the desktop | Security verdict for solo private, no external forks: acceptable — the fork-PR threat model doesn't exist; residual risk is supply-chain via `uses:` actions (pin by SHA). Retract the runner before the first collaborator or fork |
| 3 | **Public probe repo** (the Q1 command) | Yes | Minutes | Double duty: discriminator *and* potential free CI home for a **scrubbed** gate. Never mirror the real repo — PII paths plus a documented credential-leak history make the tail risk dominate any convenience |
| 4 | **Burn reduction** | **No — category error.** Declined runs consume zero minutes; you cannot stretch an already-spent allowance by triggering less | — | Useless now, useful later as hygiene. Your paths-filter deadlock point on required checks is correct and stands |

**Rejected: making the real repo public** — production SaaS, client PII paths, credential-leak history in git. Forks of public repos persist even after re-privating. This is the only candidate with unbounded downside.

**Missed:** support ticket (covers the non-billing cause — nothing else does); Codespaces as gate host (separate free allowance, 60 hr/mo); the cycle-reset question; the `gh workflow run` dispatch probe.

# Q2 — sound or procrastination

**Procrastination, and I'll land both findings you asked for.**

**1. The two-week soak is strictly dominated.** Current drift is a *state*: measurable **today** with one read-only diff — load models, `queryInterface.describeTable` (or raw `pg_catalog`) against production with a read-only role, compare to `rawAttributes`. Your own suspicion is correct; your recommendation is worse than it needs to be. Future drift is a *rate*: not measured by soaking production but **enforced deterministically** — ephemeral Postgres in CI/local, run all 38 migrations, diff against models, assert empty. That test runs in minutes, forever, reproducibly. The soak answers neither question better, and its empty log is ambiguous for exactly the reason you identified (no model changes ≠ no drift). Keep only your sequencing advice (patch list last) — and sharpen it to per-entry retirement: an entry dies the moment the snapshot shows its column present *and* a migration owns it.

**2. The `drop:false` finding — landed, with a correction.** Yes: **Option B is safer than you claimed.** Removing the healer cannot break any existing query. But not for the reason you gave. "drop:false ⇒ only adds" is **false**: `alter` calls `changeColumn` on any perceived difference, which *rewrites* column definitions — type, default, nullability, in both directions, tightening and loosening — and adds indexes/constraints; `drop:false` gates only object *removal*. The actual basis for removal-safety is structural: the healer is **idempotent boot-time convergence with persistent effects and no runtime dependency**. Everything it ever did lives in the catalog; after any boot, schema ≈ models; removal freezes that state. So: right conclusion, wrong justification — fix the justification before someone repeats it.

**The caveat that keeps half your caution alive:** naked Option B re-arms the documented silent-drift channel — 21 memorialized columns, 38 unexecuted migrations, and `safe-migrate` *lying about applied-state*. Every future deploy with a schema change redraws. So: **Option B + boot tripwire is safe to do now, immediately after the snapshot** (report-mode diff at startup; non-empty ⇒ fail the deploy loudly). Option B naked is the gun that has already fired 21 times. "Dangerous" was overstated; "harmless" is also false.

**Report-mode implementability:** two routes. (a) Transaction-wrapped `sync` + rollback — Postgres DDL is transactional and v6's QueryInterface honors a passed transaction — but you inherit `alter`'s diff blind spots: index-equivalence false positives and default-comparison quirks, which is very likely why your healing layer logs-and-continues today (that `CONSTRAINT`/`INDEX` logging filter is the scar tissue). (b) ~60-line hand-rolled `pg_catalog` diff — and the pattern already exists in this very file (`information_schema` queries in `addMissingColumns`). Use (b). Two hard requirements: diff **desired-vs-actual**, never replay healer attempts (your own error-and-continue path makes replay swallow failures into false "empty"); and never name-only column checks — that is literally the 21-list's blind spot, missing types/defaults/nullability/indexes.

**Also:** two mechanical bugs are visible now, independent of the authority question — `readdirSync` non-recursive (4 migrations never read) and `safe-migrate` marking failures applied. Fix both; much of the authority debate dissolves once the runner is honest. Note the unification: the ephemeral-DB golden test lives in the Q1b local gate — the unblock plan hosts Q2's decision instrument.

---

**status:** Q1 CONFIRM · Q2 REJECT in part (soak replaced; Option-B finding landed conditionally)
**confidence:** 0.80 (Q1) · 0.85 (Q2)
**findings:** F1=HIGH: One non-billing cause fits all observations — account-level usage-policy restriction/hold; distinguished from billing by a hello-world run in a fresh **public** repo (unmetered ⇒ billing can't block it). F2=MED: "zero successes ever" overreaches the 500-run fetch window; a mid-window billing reset with no green day disfavors plain minute-exhaustion. F3=MED: self-hosted runner may inherit the pre-job decline (gate is likely upstream of runner selection) — 20-min experiment, not a plan. F4=MED: burn reduction is a category error while blocked — declined runs burn zero minutes. F5=HIGH: two-week soak is procrastination; drift-state is a read-only snapshot today, drift-rate is a deterministic ephemeral-DB CI test. F6=HIGH: Option B is safer than claimed — removal is backward-safe because healing is idempotent persistent boot-convergence, **not** because `drop:false` is add-only (it isn't; `changeColumn` rewrites definitions both directions) — but naked removal re-arms a failure channel with 21 documented incidents; pair with a boot tripwire. F7=MED: report mode must diff desired-vs-actual via `pg_catalog`, not `alter`'s internal diff or replayed repairs, or "empty" under-reports. F8=MED: non-recursive `readdirSync` (4 migrations unread) and `safe-migrate` marking failures applied are concrete bugs; fix regardless of authority choice.
**evidence:** 500/500 `startup_failure` with zero jobs, zero check-runs, zero annotations ⇒ pre-job decline; 4 workflows `active` + permissions enabled + `schedule` failures ⇒ not repo-state, not event-state, not YAML; Appendix A error-and-continue loop and name-only column checks ⇒ boot "success" is not convergence; `sync({alter:{drop:false}})` semantics and dev-mode `alter:true`; Appendix B exact-string switch already supports a third mode.
**ruling:** The billing diagnosis stands as account-scoped pre-job decline, with exactly one non-billing survivor, killed by a 3-command public probe. The operator unblocks via the ranked plan — billing click + support ticket in parallel, local gate running the real workflow today, self-hosted as a cheap experiment, burn hygiene only after unblock, public repo rejected. The two-week measurement is replaced by: snapshot today → golden test in CI → flip healing to report-only tripwire → retire the 21-list per entry. Option B was oversold as dangerous, but it is safe only with the tripwire — land it that way.
