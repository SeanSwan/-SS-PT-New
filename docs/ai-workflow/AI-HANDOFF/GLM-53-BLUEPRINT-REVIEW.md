# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/BLUEPRINT-GATE-HARDENING-2026-08-18.md
**Tokens:** 3751 in / 18496 out (reasoning: 15217) | total 22247
**Wall:** 278.2s

---

# REVIEW — Gate Hardening blueprint

**Verdict: the shape is right, and the diagnosis is right, and I am still not letting it through as written.** The blueprint's central claim — "CI is the authority" — is a *repository-settings fact*, and nothing in the artifact table installs it. As scoped, R1 can ship completely and main can still rot through three paths, one of which is the repo owner. You fixed "the guard didn't travel" and left "nobody has to pass the guard" unstated. Everything else below is amendment, not redirection.

---

## 1. THE STRUCTURAL HOLE: authority is asserted, not installed

A workflow file makes CI *run*. It does not make CI *blocking*. Blocking is four settings, none of which appear in §2's artifact table, none of which are visible from a fresh clone — which means `wiring.test.mjs` is structurally blind to all of them:

1. Branch protection on `main` with the brain checks listed as **required status checks**
2. Enforcement **including administrators**
3. **Require branches up to date before merging**
4. `CODEOWNERS` on `.github/workflows/**` and `scripts/design-brain/**` (see §6 below — this one is a security issue in an agent-authored-PR repo)

Point 2 is the one that should sting. The original defect was "the guard worked only on the owner's machine." If admins can direct-push, the rebuilt system's largest residual bypass is *the owner* — the exact person whose local hook was the original band-aid. Your four-path mermaid diagram in §1 has a fifth red path you didn't draw: privilege.

Point 3 matters specifically because of R3. The consumers gate's whole value is *cross-PR interaction*: PR A renumbers corpus sections (green — corpus internally consistent), PR B adds a consumer citation far away (green — doesn't touch corpus). Merge both without up-to-date enforcement and the rot lands with every check having passed. Path-scoped gates composed of cross-file invariants are exactly the case "require up to date" exists for.

There is also a real payoff you never claim: **required checks fail closed.** If someone deletes or disables the workflow at 2am, the required check never reports and *all merges block*. That property — deletion is harder than neutering — is the actual defense against your own worst-case scenario, and it's the one thing `wiring.test.mjs` cannot provide.

I accept the honest limitation: branch protection is not checkable from a fresh clone (your own soon-to-be-stated principle — gates assert repository facts, never environment facts — applies; org settings are environment). The compensating control is process: an ENFORCEMENT doc listing the four settings, landed *with* R1, plus a one-time **kill-the-gate drill** as an acceptance test — file a PR that deletes the workflow and confirm it cannot merge. If you can stomach an elevated token, a weekly scheduled audit via `gh api .../branches/main/protection` closes the loop; if not, the drill is the minimum.

**Coverage matrix — who catches what decay scenario:**

| Decay scenario | Caught by |
|---|---|
| Workflow neutered (`continue-on-error`, `\|\| true`, vanishing `paths:`) | `wiring.test` — *only if extended per §2 below* |
| Gate script deleted, workflow intact | CI step fails immediately (missing npm script) |
| Gate script edited to always-pass | Nothing in this blueprint → CODEOWNERS + golden baselines |
| Workflow deleted wholesale | Required checks (fail-closed merge block) — **settings, not code** |
| Check un-required in settings | Nothing → scheduled audit or drill |
| Owner/admin direct push | `include_administrators` — **settings, not code** |

Right now the bottom three rows of your own threat model are uncovered, and the blueprint reads as though the top row is the whole model.

---

## 2. R1 — right, with three amendments

**Amendment 1: unfiltered, all four gates.** Your proposed split filters the check that scans 28 files and runs the check that scans 2,031 files on every push. That is the maximum-cost / minimum-protection arrangement by your own numbers — `brain:links` costs milliseconds; the cost argument for filtering it is zero. Two further problems: (a) required status checks × `paths:` filters is a well-documented footgun (PRs stuck on "expected — waiting for status"; the workarounds are ugly), and you'd be adopting the complicated version to save nothing; (b) the filter hardcodes the corpus location, so the one PR that should *most* trigger `brain:links` — moving or renaming `docs/ai-workflow/design-brain/` — is the one PR where the filter stops firing. If consumers ever gets slow, optimize the scanner. Don't narrow the trigger.

**Amendment 2: `wiring` is pinned to R1's shape and will rot on arrival.** The checklist asserts "a workflow references BRAIN_LINKS?" — but you ship consumers and artifacts three sections later, and a workflow that silently drops *them* still passes wiring as specced. Derive the expected set from `package.json`: enumerate every `brain:*` script and assert the workflow invokes each one, and invokes nothing that isn't one. Bidirectional closure, single source of truth. Also: string presence ≠ execution. Assert the trigger lines (`push`/`pull_request` targeting `main`), assert no `continue-on-error`, no `|| true` in gate steps, and `permissions: contents: read` on the workflow.

**Amendment 3: the hook must be honest, and fast.** To your question — no, a selective hook is not worse than nothing, *provided nothing exists only in the hook* (true post-R1) and the hook's own failure text says "local convenience; CI is authoritative." The real risk is inferred coverage: the owner sees it fire and concludes protection exists. Also note agents delete gates for two reasons at 2am — confusing reds *and slow gates* — and this blueprint designs only against the first. Put a soft runtime budget on the hook; if consumers ever costs seconds, scope the hook to links + wiring.

On "protection or ceremony": protection against **decay-by-edit**, not decay-by-settings or wholesale deletion (matrix above). It's worth keeping exactly that strongly stated — the blueprint currently blurs the layers, which will cause over-trust.

---

## 3. R2 — right mechanism, one hidden prerequisite, one missing direction

**The prerequisite nobody named: which CI job runs the test suite?** R1's workflow runs `brain:*` only (per your wireframe). `known-failures.json` is consumed by whatever parses TAP output — if no CI job runs the suite today, R2 is a pin file wired to nothing, which is the defect this entire effort exists to name, one level up. Either R1's workflow includes a suite job, or the blueprint states the existing one. As written, R2's dependency edge is missing from the gantt.

**There are three failure directions, not two.** Unlisted red, listed-green — and **orphaned entry**: a listed test whose suite path was renamed or test deleted matches nothing and must fail. Otherwise a refactor silently converts the pin file into decoration.

**Pin at subtest granularity.** You say two *subtests* are red; the JSON example lists the parent name. If one subtest gets fixed, parent stays red and nothing prompts you to split the entry — and the both-directions semantics only really work per-subtest. Matching key: file path + full nested name, exact.

**State the determinism assumption and the hang policy.** A hung test is neither red nor green; the wrapper needs a timeout that counts as unlisted red. And say explicitly whether the pinned suites are deterministic file-scanners — because the first flaky test will either get pinned after one bad day (permanent quarantine) or randomly block PRs, and the blueprint is silent on which you're choosing.

**Expiry: your instinct is right but incomplete.** Warn at 60d in PRs, never fail there. Escalate to hard-fail at 90d *in the weekly scheduled audit only* — soft in the hot path, hard on a cadence, so the re-decision is forced without breaking an unrelated Tuesday.

---

## 4. R3 — recall is the acceptance criterion, and the blueprint doesn't state it

The gate inherits `refsIn()`'s grammar. A consumers gate that *under-recognizes* reports 0 dead forever while rot continues — that's worse than no gate, because it claims coverage. The session found 11 in-code citations and 2 dead root-doc refs. **Ship criterion: the gate finds ≥ those 13, or every miss is explained.** Make it a test.

Three smaller specs that don't exist yet: (a) scan scope — the exclusion list (`node_modules`, `dist`, lockfiles, `.git`) is unstated; (b) the marker — `<!-- quoted-defect -->` is alien inside `.ts`/`.js` comments; use a per-line, language-neutral token (`quoted-defect:` on the citation line), which is also more reviewable than block markers; (c) PROSE — "no instrument exists" is understated: `sectionsOf()` already enumerates the title strings; what's missing is a matcher you trust. You don't need to trust it to *count*: put the PROSE count in a baseline file now so drift is visible in diffs, ratchet when the matcher proves stable. Report-only tiers with no number attached rot into permanence, because nothing pushes on them.

---

## 5. R4 — the re-scope is correct; now guard the exemptions

Endorsed: standing gate, no sweep, and the DOES-NOT-EXIST discovery is the best thing in the blueprint. Two additions:

**Exemptions are where the next rot lives, so they need inverse checks.** If someone ever *creates* `canon/route-manifest.json`, the doctrine asserting it doesn't exist becomes a fictional mechanism in the opposite direction — and your gate passes it. Fail when a DOES-NOT-EXIST artifact starts existing. Same for `<!-- runtime -->` markers whose file appears in-tree. An exemption that isn't itself guarded is the defect class reincarnating inside the fix.

**Expect a third exemption class: templated paths.** `docs/<area>/README.md`-style generic prose is backticked, file-like, and legitimately unresolvable. Your classifier boundary (path-root + extension) should send anything ambiguous to the report tier — which is your own §7 principle ("will not ship a check I cannot prove fails correctly") applied to the classifier instead of the check.

**And apply your own §0 method to your own scope boundary.** R4 gates artifact citations *inside the corpus*. But `AGENTS.md`/`CLAUDE.md`/`.claude/skills` citing a script that doesn't exist is precisely where an agent reads a pointer and acts on it — arguably harder than corpus rot. Measure backticked file-like tokens in the agent-facing docs before dismissing; if the count is small, extend R4 there. The blueprint's §0 corrected R4 once; this is the same correction knocking a second time.

---

## 6. What you didn't propose — ranked

1. **The enforcement/settings package** (§1) — the thing that makes "CI is authoritative" true.
2. **The suite-running CI job** that R2 silently depends on.
3. **R4 over agent-facing docs**, measured first.
4. **Guarded exemptions** — DOES-NOT-EXIST inverse check, stale runtime markers.
5. **Pin §0's measurements as golden fixtures.** 17 cited / 2 exempt; 11 + 2 consumer citations; 28 files / 75 refs. You measured, then discarded the measurements. They are regression tests for the scanners themselves — including against decay-by-edit of the gate code (matrix row 3), which nothing else covers.
6. **CODEOWNERS on `.github/workflows/**` and `scripts/design-brain/**`.** In a repo where agents author PRs, the workflow is a privileged surface (CI is code execution) and the gate is self-modifiable by the thing it gates. Wiring can't catch an *added* step with secrets. Human review on those paths is the standard answer.
7. **Ratchet/baseline file** for exemption counts and PROSE — converts every soft tier into a monotonic signal, and catches lazy `<!-- runtime -->` marking by agents taking the exit ramp.
8. **Kill-the-gate drill** as one-time acceptance: prove a workflow-deleting PR is unmergeable.

---

## 7. Your five questions, directly

1. **CI-authoritative / hook-convenience split** — right split, insufficiently installed. Authority is settings (§1); the hook is fine if honest and fast (§2, amendment 3).
2. **Wiring: protection or ceremony** — protection against decay-by-edit only; strengthen per §2 amendment 2, state its ceiling per the matrix, and get the fail-closed property from required checks, which is the piece that actually answers "who deletes this at 2am."
3. **The four open questions:**

| § | Position |
|---|---|
| §2 paths | **Unfiltered, all four.** Your split maximizes cost, minimizes protection, and walks into the required-checks trap. |
| §3 expiry | Warn@60 in PR, fail@90 in scheduled audit only. |
| §4 marker | Marker, yes — per-line, language-neutral, taught in the message, counted in the summary. The friction is the feature. |
| §5 npm/package | Agree — and generalize: *gates assert repository facts, never environment facts.* `node_modules` is environment. This rule will kill other bad checks later; write it down. |

4. **What's missing** — §6, items 1–3 are required; 4–8 strongly recommended.
5. **The failure copy** — mostly doing the job: ordered remedies and inline exemption syntax are exactly right, and the last-resort positioning matters. Three additions. **First, a local repro command as line one** (`npm run brain:artifacts`) — nothing de-escalates a 2am agent like being able to see the red locally. **Second, the direction-2 message for R2 is your most dangerous copy in the whole system** — "test passes but CI red" reads as a broken gate and is the single most likely deletion trigger. It must open with "this is the gate working," name the ticket, and include the exact JSON lines to delete. **Third, add a `--json` reporter alongside the human copy** — your stated reader is an agent at 2am; give agents a stable machine surface and keep the prose for the humans they wake up.

One process note: the blueprint demands measurements from reviewers' proposals (correctly — it caught R4) but sets no acceptance criteria for itself. Minimum set before code: fresh-clone wiring pass, kill-the-gate drill, R3 recall ≥ 13, R4 golden 17/2. A gate whose own installation is verified by vibes is the defect with a checklist.
