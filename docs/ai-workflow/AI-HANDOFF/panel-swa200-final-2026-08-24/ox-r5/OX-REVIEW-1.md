# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-swa200-final-2026-08-24/PACKET-R5.md
**Seed:** (none)
**Tokens:** 4083 in / 4967 out · **Cost:** ~$0.0000 · **Wall:** 137.8s · **finish:** stop

---

## Review

**Scope note:** the packet contains a single deliverable — the hostile-review/diagnosis document with Appendices A–B. The seeder/vitest/selftest/config/workflow/brief artifacts referenced in my instructions are not present in this packet; I reviewed what exists.

### Q1 — the diagnosis

The elimination chain is genuinely measured, not asserted, and the honesty about the two failed verifications (billing page unscoped; cross-repo control yielding zero information) is the strongest thing in the document. But two gaps remain:

1. **A non-billing cause consistent with all observations exists and was not named:** **Actions storage-quota exhaustion** (artifacts + Packages exceeding the included storage on a free personal account). GitHub blocks Actions execution for this reason with exactly this signature — `startup_failure`, zero jobs, no annotations — and it is *not* the same fix as raising a spending limit. It is also the one cause with a **free, immediate fix**: delete stale artifacts/packages. The document's billing-family conclusion is probably right, but "billing" conflates three mechanically different blocks (minute overage, failed payment/spending limit, storage quota) with three different remedies.
2. **The cross-repo control is not dead, it is one commit away.** The four sibling repos have zero workflows — so *add one*. A 5-line hello-world workflow pushed to any sibling private repo is the cheapest discriminator between account-level and repo-level, costs nothing, and touches nothing in the real repo. "No information in either direction" was true; "no way to get information" is not.

### Q1b — unblock ranking (the thing owed to the operator)

1. **Run the gate locally today** (Postgres container + the shadow-check script). Correctly identified as highest value. Attack: it validates the *logic*, not the *CI environment* (node version, service containers, env plumbing) — pair it with `act` (runs the actual workflow file under Docker) to close that gap for free.
2. **Storage/artifact triage + billing page, 10 minutes, parallel:** delete stale artifacts and unused packages; look at the billing page for *which* block it is; raise the spending limit if it's minutes. This is the actual fix and it is a settings change, not a project.
3. **Sibling-repo hello-world push** — settles account-vs-repo definitively.
4. **Self-hosted runner** — works only if the block is minute-overage; a hard payment/abuse block disables Actions entirely, self-hosted included. Unknown until step 2/3 resolves. Security caveat correct: restrict to `push`/`schedule` only, never `pull_request`.
5. **Provider migration** (Buildkite/Gitea/local GitLab) — real fallback if billing is refused, higher setup cost than 1–4.
6. **Public repo** — agreed, correctly rejected.

### Q2 — the recommendation

- **Directionally sound, but the two-week window is mostly procrastination-shaped.** The drift report is a *deterministic function of (current models, current DB)* — it is not time-distributed information. A point-in-time read-only `information_schema` diff against model metadata answers today what two weeks of `report` logs would answer; the window's only residual value is confirming the report code path actually fires on a real deploy. Replace "two weeks" with "run report mode, verify after the next deploy that contains a model change."
- **Report mode is implementable**, and the rolled-back transaction is the right mechanism (Postgres DDL is transactional), not a hand-rolled diff — the hand-rolled version silently under-reports type/default/constraint drift, exactly as feared. Caveat: `ALTER TABLE` takes `ACCESS EXCLUSIVE` locks even inside a rolled-back transaction; run off-peak.
- **The hoped-for landing does not land.** "`drop:false` means the healing layer only ever ADDS, therefore Option B cannot break existing queries" is **false**. `alter:{drop:false}` suppresses *drops*, not *modifications*: it changes column types, alters nullability and defaults, and **adds UNIQUE and FK constraints**. A newly added UNIQUE constraint starts rejecting inserts that worked the day before; a new FK rejects orphan writes and blocks deletes; a type change can fail outright. Additive DDL is not behavior-neutral. The caution about Option B is justified; the operator's preferred finding is refuted by their own Appendix A (line 54–57 comment claims "safer," but `alter` semantics say otherwise).

### Code observations (Appendix A/B)

- Identifier interpolation into `information_schema` queries (A:~10, ~19) — safe only because inputs are a hardcoded literal list; fragile pattern. NOTE.
- Boot-time DDL on every production boot is a multi-instance race and a lock-contention source; `report` mode should also be concurrency-gated. MINOR.
- Hardcoded `VARCHAR(n)` widths in the patch list can diverge from model definitions — a third drift source the report must cover. NOTE.

=== VERDICT ===
status: CONFIRM
confidence: 78
findings: F1=MAJOR: Q2/Option B analysis: the claim that drop:false makes the healing layer additive-only and therefore safe to disable is false — alter:{drop:false} still modifies types/nullability/defaults and adds UNIQUE/FK constraints, which break existing writes; the caution stands | F2=MINOR: Q2/two-week window: the drift report is a deterministic function of current models+DB, so a point-in-time read-only information_schema diff answers today; replace the window with verify-after-next-model-changing-deploy | F3=MINOR: Q1/cross-repo control declared dead but is one commit away — push a hello-world workflow to a workflow-less sibling private repo to discriminate account-level vs repo-level | F4=MINOR: Q1/storage-quota exhaustion (artifacts/Packages) is a non-minute billing-family cause consistent with all observations, not eliminated, and has a free immediate fix (delete stale artifacts) | F5=NOTE: Appendix A lines ~10/~19 interpolate identifiers into information_schema SQL — safe only while the list stays hardcoded | F6=NOTE: production boot-time DDL on every boot is a multi-instance race and lock-contention source; report mode needs concurrency gating
evidence: Appendix A L54–57 ("drop:false // Never drop existing constraints") shows the author conflating drop-suppression with add-only semantics; alter sync documented behavior includes type/nullability/constraint modification; doc §Q1 admits billing page [UNVERIFIED] and cross-repo test [INCONCLUSIVE] with zero workflows in siblings — a pushable workflow restores the control; doc §Q2 concedes the faster offline diff exists and asks whether two weeks is meaningful (it largely is not, per determinism argument)
ruling: CONFIRM — the CI diagnosis is measurement-driven and its residual uncertainty is honestly labeled, and the unblock instinct (local-first) is correct; merge is warranted once four corrections land: (1) re-run the cross-repo control by pushing a hello-world workflow to a sibling private repo, (2) split "billing" into minutes/spending-limit vs failed-payment vs storage-quota and try the free storage cleanup first, (3) shrink the two-week window to a point-in-time diff plus one post-deploy verification, implementing report mode as a rolled-back transaction run off-peak with concurrency gating, and (4) retain the Option B warning — the hoped-for "drop:false makes it safe" finding is refuted, since added constraints change existing write behavior. Ranked unblock for the operator: (1) run the gate locally today, ideally via act against the real workflow file; (2) in parallel spend ten minutes on artifact/package cleanup and the billing page to identify which block applies and lift it; (3) sibling-repo push test; (4) self-hosted runner restricted to push/schedule if and only if the block proves to be minute-overage; (5) provider migration as last resort; public repo rejected.
=== END-VERDICT ===
