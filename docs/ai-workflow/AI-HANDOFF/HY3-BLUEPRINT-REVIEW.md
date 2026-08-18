# BLUEPRINT — Gate Hardening: make the guard travel, and stop trusting memory — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (medium)
**Document:** docs/ai-workflow/AI-HANDOFF/BLUEPRINT-GATE-HARDENING-2026-08-18.md
**Seed:** (none)
**Tokens:** 4170 in / 5576 out | **Cost:** ~$0.0035 | **Wall:** 59.9s | **finish_reason:** stop

---

| ID | severity | claim | evidence | proposed fix |
|----|----------|-------|----------|--------------|
| F1 | HIGH | The wiring meta-test is circular for the CI-authority part: it cannot detect a missing or non-invoking workflow because it only runs when that workflow already calls it. | Meta-test lives in `scripts/design-brain/tests/wiring.test.mjs` and is executed as `brain:wiring` inside `swan-brain-guards.yml` (§1, §2). If the workflow file is absent or does not reference `brain:links`, the test never executes, so it cannot fail. | Treat `brain:wiring` as validating only hook/prepare repo facts; rely on separate assurance (branch protection, repo file lint) that the workflow exists and invokes the suite. Document the limit explicitly. |
| F2 | HIGH | Build order (R1 alone, then R2 later) will make CI red on day one from pre-existing known-red tests, blocking the gate or forcing silent `--allow-fail`. | `verify-world-engine` subtests are red on `main` (SWA-170, §2). CI runs the guard suite; R2 (known-failures pinning) is scheduled *after* R1 in the gantt (§6). Without R2 merged and integrated, the first CI run fails on expected red. | Implement `known-failures.json` and teach the test runner to consult it *before* activating the CI workflow, or launch CI scoped to only the green checks until R2 lands. |
| F3 | MEDIUM | Hook-as-convenience can imply false safety: `prepare` only fires on `npm install`, so a fresh clone without install (or a non-node contributor) gets no hook and may assume local protection. | `package.json` `prepare` script sets `core.hooksPath` (§2); author admits hook is “optional, local” (§1). | Keep CI authoritative; add README/clone-step warning that hook is best-effort only. Do not market hook as protection. |
| F4 | LOW (HYPOTHESIS) | A third unfound correction likely exists: the assumed fast-forward / server-merge bypass may be partially mitigated by repo settings (e.g., merge-commit required, no FF) or an already-present global hook mechanism. | Author grounded two of four (R1, R4) and invites a third (§0, §4). The “bypass even on author’s machine” claim is unverified against branch-protection config. | Verify GitHub branch protection and merge strategy; if FF is forbidden, the local-hook gap shrinks. Adjust blueprint severity accordingly. |
| F5 | LOW (HYPOTHESIS) | R3 consumer scan may duplicate existing `swan-lens-guards.yml` which already filters `frontend/src/**` (a consumer class in R3). | `swan-lens-guards.yml` precedent cited in §0; R3 lists `frontend/src` as ungated consumer. | Confirm overlap; extend lens-guards rather than fork a parallel scanner. |

| open-question | your-position | reasoning |
|---------------|---------------|-----------|
| §2 – workflow path filtering | Agree with split: unfiltered for `brain:consumers` + `brain:wiring`, filtered for `brain:links`. | `brain:links` is corpus-internal (28 files); running it repo-wide invites false positives. Consumers and wiring are explicitly cross-repo facts, so unfiltered is required to catch the R3 failure mode. |
| §3 – expected-failure expiry | Warn at 60 days, never auto-fail is acceptable; ideally also fail if the linked ticket is closed/resolved. | Time-based auto-fail risks breaking CI on an unrelated day; a warning forces human re-decision. Stale entries hiding regressions is the real risk—ticket-status check would be stronger than pure time. |
| §4 – QUOTED exemption mechanism | Marker (`<!-- quoted-defect -->`), with failure message teaching the marker. | Directory exemption (e.g., `AI-HANDOFF/**`) permanently hides real dead refs in those dirs. The measured review-doc problem demands precise exclusion; friction is justified and self-documenting. |
| §5 – npm scripts vs package names | Include npm scripts (cheap, `package.json` local), exclude package names (devDependency absent in CI = false positive). | Scripts are resolvable without `node_modules`; package names require install state. Author’s call avoids CI flakiness. |

### Architecture soundness and the CI/hook split

The proposed shape is fundamentally correct: CI must be the authority because three of four paths to `main` (fresh clone, FF merge, `--no-verify`/server merge) bypass any local hook. The hook is rightly demoted to convenience. My objection is not to the split but to the *meta-test’s claimed coverage of that split*. As F1 shows, `brain:wiring` can confirm the hook file and `prepare` script exist as repo facts, but it cannot confirm the CI workflow itself is present or invokes the gate—because it is a victim of its own invocation. That is not “the guard that guards the guard”; it is a partial lint. The real guarantee must come from repo configuration (required status checks, protected branch) outside the tested code.

### Wiring meta-test: real or ceremony?

It is half-ceremony. Asserting “a workflow references brain:links” from inside the workflow is tautological—if the assertion fails, it never ran. The hook/prepare assertions are useful: they ensure a contributor who *could* get fast feedback actually has the hook wired. But the meta-test should be framed as “hook installation lint,” not “gate presence proof.” Otherwise reviewers will believe CI self-heals, which it does not.

### Third unfound correction (hypothesis)

The author found R1 (copy precedent) and R4 (re-scope) by measuring. A plausible third: the “fast-forward bypass even on author’s machine” may be moot if the repository forbids FF merges (require merge commit or squash). In that case the only true bypass is `--no-verify` and server-side merges, narrowing the hook’s irrelevance further. Alternatively, the consumer scan (R3) may already be partially covered by the existing `swan-lens-guards.yml` frontend filter, meaning R3’s “ungated” claim is overstated. Both are unverified from the blueprint alone and labeled HYPOTHESIS.

### Build order

R1-first is right in spirit but the gantt is wrong in dependency: R2 must land *with* or *before* R1’s enforcement, because the existing red tests will immediately break an unfiltered CI. R3/R4 can follow in any order as long as they import the existing scanner (they do). I would revise the order to: (R1 scaffolding + R2 known-failures integration) together, then flip CI to required, then R3, then R4.

### Final note

The blueprint’s grounding discipline is good; the architectural risk is over‑stating the meta-test and mis‑sequencing the known‑red pinning. Fix those and the travel problem is solved.
