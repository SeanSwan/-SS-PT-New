# BLUEPRINT — Gate Hardening: make the guard travel, and stop trusting memory — reviewed by Kimi K3

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\BLUEPRINT-GATE-HARDENING-2026-08-18.md
**Seed:** (none)
**Tokens:** 4166 in / 18296 out · **Cost:** ~$0.2869 · **Wall:** 477.0s · **finish_reason:** stop

---

## Findings

| ID | Severity | Claim | Evidence | Fix |
|---|---|---|---|---|
| F-1 | **CRITICAL** | The blueprint never specifies the thing that makes CI "authoritative": a required status check + restricted direct pushes. A workflow that runs but isn't required is the local hook defect reproduced one layer up — present, correct, and non-blocking. The §1 fast-forward path still lands on `main` via direct push, with CI failing *after the fact*. | §1 target diagram shows "Merge allowed / Blocked" with no enforcement mechanism; §2 ships only a workflow file; no mention of branch protection, rulesets, or required checks anywhere in the document. Even if `main` is already protected, a *new* workflow is not automatically a required check. | R1 must include: (a) add the check to required status checks on `main`, (b) disallow direct pushes. These are settings, not repo facts, so the wiring test can't see them — add a CI step that queries the branch-protection API (`gh api repos/.../branches/main/protection`) and fails if the check isn't required. A tripwire, not enforcement — but it makes unenforcement *visible*. Fallback: documented manual step as a blocking prerequisite in the R1 PR. |
| F-2 | **HIGH** (HYPOTHESIS) | R2 has no enforcement surface. `known-failures.json` pins `verify-world-engine`, but no shipped or proposed workflow is named as running that suite. If none does, R2 is exactly "an npm script wired to nothing" — inside the blueprint that exists to fix that defect. | §2 workflow runs `brain:links/consumers/artifacts/wiring` only. §3 says "CI fails" twice without naming the job that runs the suite. Caveat: an existing test workflow may exist that I can't see. | Name the workflow/job that executes the suite with the known-failures wrapper, and add a wiring-test assertion that it exists. |
| F-3 | **HIGH** (part HYPOTHESIS) | CI proves the gate is *installed*; nothing proves it still *detects*. A gate neutered to always exit 0 passes all four wiring assertions. | §2 meta-test checks four existence/string facts. The "73 behavioural tests" are mentioned only as past-tense inventory; the blueprint never says they run in CI. | Run the behavioral suite in CI, and/or add a canary fixture: a planted dead-ref file the gate must flag, asserting exit≠0. One fixture distinguishes "gate ran" from "gate works." |
| F-4 | **MEDIUM** | The wiring test matches string presence, not semantics. It is satisfied by a commented-out job, a dead config line, a `paths:` filter that no longer matches anything, and it cannot detect its own deletion. | §2: "hook file committed / invokes BRAIN_LINKS / package.json has prepare / a workflow references brain:links." Path-filtered workflows fail *silently* — they simply don't run — which is the incident's defect class in a new costume. | Strip comments before matching; assert the workflow's `on:` covers push+PR to `main`; assert every `paths:` entry resolves to a real path in the repo; add one line to the workflow asserting `wiring.test.mjs` itself exists (self-deletion tripwire). |
| F-5 | **MEDIUM** | R2's state machine has a third direction it omits: the orphaned entry. A renamed or deleted test silently drops its quarantine entry — no failure, no signal. | §3 diagram covers unlisted-failure and unexpected-green only. Test names are strings; renames are routine. | An entry matching no executed test fails the build, same as unexpected green. |
| F-6 | **MEDIUM** | Both exemption mechanisms are parsing-fragile and under-specified. "Inside a DOES-NOT-EXIST block" presumably means heading-text matching — and an innocent heading rename re-breaks the gate on the commit that cured the disease. The `quoted-defect` marker has no stated granularity; file-wide, it's directory-exemption in disguise. | §5 flowchart node "Inside a DOES-NOT-EXIST block?" with no definition; §4 marker proposed with no scope. §0 notes the DOES-NOT-EXIST block is what the gate must not flag. | Explicit delimiters (`<!-- does-not-exist:start/end -->`) or a tested heading contract; marker scoped to the line or enclosing fence; report exemption counts so marker-spam is visible. |
| F-7 | **MEDIUM** | The highest-delete-risk message in the entire system has no design: R2's unexpected-green failure. A gate that goes red *because a test passed* violates every agent's mental model of what red means. That is precisely the 2am deletion moment, and §2 wireframes don't cover it. | §3: "a listed test that now passes" fails the build — "the one people forget." §2 wireframes only the artifacts failure. No expected-red summary format exists either. | Spec the copy before build (draft in the design section below). Steady-state output must distinguish expected red from new red so an agent never has to wonder which kind they're looking at. |
| F-8 | **LOW** | The success wireframe's arithmetic contradicts the blueprint's own measured data and is internally ambiguous. In a gate whose entire ethos is "measure, don't remember," the numbers are the trust mechanism — wrong example numbers erode it. | §0/R4: 17 cited, 5 exempt (4 negative + 1 runtime), 0 unresolvable → 12 resolve. §2 wireframe: "17 cited · 17 resolve · 2 exempt" (17 = 17 + 2?). | Correct to measured values; format so cited = resolve + exempt unambiguously ("19 cited · 17 resolve · 2 exempt"). |
| F-9 | **LOW** (HYPOTHESIS) | `prepare` setting `core.hooksPath` may collide with an existing hooks manager or an existing `prepare` script. Last-writer-wins is silent, and silent is the defect class under review. | §2 proposes the script without surveying current `package.json` / hooks tooling. I can't see the repo. | One grounding step: check for existing `prepare`/hooksPath/husky. Make the script idempotent and loud on conflict — warn, never clobber. |
| F-10 | **LOW** | PROSE report-only output decays into noise nobody reads, and a growing count nobody owns. | §4: "report-only, no instrument exists yet," with no cap, trend, or owner. | Print count only, or ratchet (fail if the count grows), and ticket the title-index instrument. |

## Open questions — positions

| Question | Your call | Why |
|---|---|---|
| §2 — path filtering: unfiltered for consumers/wiring, filtered for links? | **Reject the split; run all four unfiltered, unless runtime is measured to matter.** If any filter ships anyway, the wiring test must assert every filter path resolves (F-4). | The author's reasoning is backwards about risk: the filter's failure mode is *silence* — a drifted path means the workflow doesn't run, which reads as green, which is the exact incident being fixed. A 2,031-file regex scan is seconds; the cost asymmetry doesn't buy a drift surface. Filtering is a premature optimization against a non-measured cost. |
| §3 — should expected-failure entries expire? | **Agree: warn, never auto-fail. But strengthen the warning's surface and granularity.** | A calendar that can break an unrelated PR trains rubber-stamp extensions — or gate deletion. However, a warning in a CI log nobody opens is equivalent to silence: route it to a PR annotation (`::warning::`) or a scheduled issue with an owner. Make the threshold per-entry (`reviewBy`) rather than a global 60 days; quarantine lifetimes legitimately differ. |
| §4 — directory exemption vs marker? | **Agree: marker. The friction is the feature.** | Directory exemption is a permanent blind spot located exactly where the highest-risk quoters (review docs) live — the class that "grew every time anyone reviewed it." The friction is paid once per author, then carried forever by the failure message teaching the marker. Conditions: marker scoped to line/fence, exemption counts shown in output (F-6). |
| §5 — include npm scripts, exclude package names? | **Half. Include npm scripts — and don't fully exclude package names. Resolve them against `package.json`'s *declared* dependency maps, not `node_modules`.** | The exclusion reason conflates *declared* with *installed*: "a devDependency absent in CI" is only a false positive if you check `node_modules`. The fictional-package failure mode was doctrine citing packages that exist *nowhere in the repo's declarations* — a declared-deps check catches exactly that class, offline, at near-zero cost. Exclude only installability/network resolution. |

---

## 1. Architecture: the split is right — and it currently stops one hop short

CI-authoritative / hook-convenience is the only correct shape. Hooks are client-side, trivially bypassed, and unreplicable by design; the §1 four-paths diagram is accurate and the conclusion follows. Approve.

**On the silent hook:** the question needs splitting. A hook that is *absent* (fresh clone, no `npm install`) is not worse than no hook — provided the required check exists (F-1). Its failure is invisible but caught at the layer that matters. What *is* worse than no hook is a hook that *runs and pretends*: exits 0 without checking (say, `--if-present` swallowing a missing script), converting "no protection" into "believed protection." A hook nobody has is a documentation problem; a hook that pretends is a trust problem. So: the hook must fail closed, and on failure it should say *"CI enforces this even if you bypass me"* — honest hooks don't get deleted either.

But the architecture section's own language outruns its mechanism. The target diagram says "Merge allowed / Blocked," and nothing in the repository can do the blocking. **The authority isn't the workflow; it's the required status check.** As written, R1 ships a server-side hook that fires after the fact. That is F-1, and it is why I believe it's the unfound correction — more below.

One thing the blueprint gets right by omission: no receipt/attestation plumbing (hook records "I ran," CI trusts the receipt). CI re-executing the check is strictly stronger than trusting a forgeable, stale-able claim. Keep it that way.

## 2. The wiring meta-test: real protection, currently under-specified

Real. It is the regression test for this exact incident, and "73 behavioural tests and zero installation tests" is the correct frame — installation is a behavior. But three honest limits:

1. **It guards the guard's *configuration*, not its *authority*.** The single fact that matters most — is this check required on `main`? — is a settings fact, structurally invisible to a fresh clone. That's F-1's API tripwire.
2. **String-presence is gameable by accident.** A commented-out job, a drifted `paths:` filter, a dead config line all satisfy it. F-4's fixes are cheap and semantic.
3. **It cannot see its own absence.** A test asserting its own existence is impossible; a one-line existence assertion in the *workflow* (the outer shell) is not. Ship it.

With F-1 and F-4 it earns its keep. Without them it's ceremony that produces confidence — worse than no ceremony, for the same reason as the pretending hook.

## 4. The unfound correction

§0's discipline was: ground the recommendation against the repo before building. Applied one more time, grounding R1 against *how GitHub actually enforces things* corrects the headline item: **"make the gate travel" stops one hop short — the workflow travels; the enforcement doesn't.** The blueprint's own mantra condemns it verbatim: *a check added to a gate that cannot block multiplies nothing.* The fast-forward path drawn in red in §1's first diagram remains red in the target — it just gets a nicer log. F-1 is the correction; F-2 is the same disease in a second organ, and both would have surfaced from one grounding pass over "what actually blocks a merge here."

## 5. Design judgment: the failure-message copy

**What already works — keep it:**

- **The three-branch fix is the best thing in the document.** "Never built / exists elsewhere / created at runtime" doesn't presume why the artifact is missing; it partitions reality and hands each branch an exit. This is exactly right for 2am.
- **The fix is copy-pasteable** (`` `probe.json` <!-- runtime --> ``). Fixes that can be pasted get applied.
- **The success box shows counts next to ✔.** "75 refs · 0 defects" answers the first question a skeptical agent asks — *did this gate actually look at anything?* — which is the usual precursor to deletion. Showing "2 exempt" does the same for the exemption mechanism. Counts are the trust mechanism.
- Tone is flat, blameless, file:line precise.

**Where it fails the 2am test:**

1. **The DELETE option is never addressed.** The copy argues for FIX and ignores that the agent has a second, cheaper-looking path. Close it explicitly: *"deleting or disconnecting this check fails brain:wiring and still blocks merge."* One line converts the decision from *fix vs. delete* into *fix vs. fix-the-gate*. Highest-value single line to add. Note the dependency: this line is only *true* once F-1 lands — the wireframe currently promises an enforcement the design doesn't yet specify. Copy and architecture are the same system.
2. **No reproduce command.** The agent's next action should be typed for them: `Reproduce: npm run brain:artifacts`.
3. **No did-you-mean, and the gate already has the data.** It imports `sectionsOf()`; fuzzy-suggest the nearest live target. The mass-casualty event for `brain:consumers` is one renumber killing 13 citations — and that's the moment delete-vs-fix is genuinely contested, because the fix looks like archaeology. "§3 → did you mean §4?" turns 30 minutes into 3. Fix-rate is a function of how close the message gets the agent to the edit.
4. **Options should be verb-first bullets, ordered by likelihood** — not a wrapped paragraph. At 2am, paragraphs get skimmed; bullets get done.
5. **The most dangerous message in the system is undesigned (F-7).** Unexpected-green failing the build reads as *perverse* unless framed as good news with a chore attached. And the steady-state summary must separate expected red from new red, so nobody ever wonders which kind of red they're seeing. Uncertainty about red-kind is where deletion starts.
6. **Fix the arithmetic (F-8).** The example numbers contradict the blueprint's own §0 measurements. The numbers are the trust mechanism; they can't be wrong in the spec.

**Rewritten artifacts-failure:**

```
✖ brain:artifacts — 1 cited artifact does not resolve

  docs/ai-workflow/design-brain/design.md:14
    cites `canon/tokens.json` — not in this repo

  Fix it one of three ways:
    1. Claim is stale?       → delete it, or move it into a DOES-NOT-EXIST block
    2. File lives elsewhere? → cite the real path
    3. Created at runtime?   → mark it: `probe.json` <!-- runtime -->

  Reproduce: npm run brain:artifacts
  Gate wrong? Fix scripts/design-brain/check-brain-artifacts.mjs —
              deleting or bypassing this check fails brain:wiring
              and still blocks merge.
```

**The missing R2 messages:**

```
✖ brain:tests — a quarantined test started passing (this is good news)

  verify-world-engine › World Engine doctrine contract  (SWA-170, quarantined 2026-08-16)

  The defect this entry tracked is fixed. Remove it from
  scripts/design-brain/known-failures.json — stale entries
  silently absorb the next real regression.
```

```
✔ brain:tests   41 pass · 2 expected failures (SWA-170) · 0 new
```

**And the consumers bulk-failure, grouped by cause** — because 13 dead citations from one renumber is one problem, not thirteen:

```
✖ brain:consumers — 13 citations no longer resolve (1 likely cause)

  design.md was renumbered; 13 citations still point at the old anchor:
    CLAUDE.md:12 · AGENTS.md:88 · frontend/src/lens/…  (+10 more)
  Nearest live section: design.md §4 "The Two-speed law"

  Quoting a dead ref on purpose? Mark the line: <!-- quoted-defect -->
```

Finally: when multiple gates fail, print all failures — no fail-fast. Partial red invites "fix the visible one and re-push," which is just deletion with extra steps.

**Bottom line:** the copy is 80% there — the three-branch fix and the counted success box are genuinely good work. It currently argues for FIX and pretends DELETE isn't on the table. Say the quiet part, spec the unexpected-green message, add did-you-mean, and land F-1 so the deterrent line is true.
