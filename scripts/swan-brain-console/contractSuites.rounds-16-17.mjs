/**
 * contractSuites.rounds-16-17 — WHY the round-16 and round-17 suites exist.
 * @module scripts/swan-brain-console/contractSuites.rounds-16-17
 *
 * THE THIRTEENTH RULE 4 SPLIT IN THIS SUBSYSTEM, by SUBJECT: the review rounds that are STILL
 * OPEN. `contractSuites.rounds.mjs` holds rounds 11–15, whose findings are closed and whose
 * suites are now regression cover. This file holds rounds 16 and 17 — the lock and lifecycle
 * repairs still under review — and it is the one that will keep growing while that engagement
 * runs, which is exactly why it is the one that needed its own file.
 *
 * ROUND 21 ENTRIES LIVE HERE TOO, and the filename is now historical rather than descriptive. The
 * round-21 suites answer findings that are equally open, and `contractSuites.test.mjs` names this
 * file as the destination for any newly added suite, so putting them anywhere else would have
 * meant either a third file in the merge or an entry the ratchet refuses. Renaming the file is the
 * honest follow-up and is deliberately left as one: a rename touches the merge, the import and the
 * module id, and it is not worth bundling into a repair whose subject is a test that did not exist.
 *
 * The two together are one map: `contractSuites.test.mjs` merges them and checks coverage against
 * `contractSuites.list.mjs`, so a suite in neither file is reported by name rather than passing.
 *
 * BOUNDS: data only. No imports, no I/O, no clock.
 */
export const SUITE_RATIONALE_16_17 = Object.freeze({
  "scripts/swan-brain-console/lockState.test.mjs": `
    ROUND 17 (2026-09-21), Astra ROUND-16 finding L04 — ONLY \`ESRCH\` ESTABLISHES DEATH.
    Split from \`attemptLock.test.mjs\` along the OBSERVATION/OWNERSHIP boundary: what the OS says
    about a pid, versus who may act on it. The old predicate answered "not alive" for every errno
    except \`EPERM\`, so \`EACCES\`, \`EIO\`, \`EINVAL\`, or a throw with no \`code\` at all each read as
    "the holder is gone" — the one verdict that authorizes reclamation of a LIVE lock. The suite
    drives every errno and the no-code case, and pins both faces (\`probeHolder\` for callers that
    report WHY, \`holderIsAlive\` for the conservative boolean) so they cannot diverge.
  `,

  "scripts/swan-brain-console/attemptLock.identity.test.mjs": `
    ROUND 17 (2026-09-21), Astra ROUND-16 findings L02 and L07 — the IDENTITY half of the lock,
    split from the mechanism half in \`attemptLock.test.mjs\`. L02: reclamation was itself a race,
    because two contenders could both observe a dead pid and both unlink, the second deleting the
    first reclaimer's fresh lock; automatic reclamation is now REFUSED and \`reclaimLock\` is a
    deliberate act. L07: the release compared pids, so two acquisitions inside one process shared
    one and a stale handle could delete the current lock; it now compares per-acquisition tokens.
    The L07 test spawns a real child process, because a hand-written lock naming \`process.pid\`
    tests nothing — \`reclaimLock\` correctly refuses a live holder.
  `,

  "scripts/swan-brain-console/baselineLock.test.mjs": `
    ROUND 17 (2026-09-21), Astra ROUND-16 finding L01 — the wrong RESOURCE locked.
    \`shot-diff.mjs\` took \`resultPath ?? baselineDir\`, a SINGLE path chosen by \`??\`, while an
    \`--update --result X\` run writes BOTH X and the baseline generation: two such runs with
    different \`--result\` values held two different locks over one shared baseline directory and
    interleaved. The resource set is now derived from the RUN MODE in one place. The suite holds
    both directions, because the over-correction is its own defect — an update run locks both
    resources, AND a compare run must NOT lock the baseline it only reads.
  `,

  "scripts/swan-brain-console/renderAttempt.artifact.test.mjs": `
    ROUND 17 (2026-09-21) — the Rule 4 split of \`renderAttempt.test.mjs\` once finding L03's
    refused-start regression took it past 300 lines. The boundary is the failure DIRECTION: the
    parent owns the fence's DECISIONS (which document wins the artifact, in what order, what a
    refused write does), and this file owns what a reader FINDS once a write is allowed through
    — the coherence of the failure document, the documented \`--update\` limit, and the assert that
    \`shot-diff.mjs\` is really wired to the lifecycle. A fence defect publishes the WRONG document;
    a content defect publishes the RIGHT document that says the wrong thing.
  `,

  "scripts/swan-brain-console/app/contrast.declared.test.mjs": `
    ROUND 17 (2026-09-21), Astra ROUND-16 finding L05 — DECLARING THE SURFACE vs RESOLVING it.
    \`decl()\` returned only the FIRST match for a property, so a rule that declared
    \`background\` twice (a fallback then a \`var()\`) had the LATER — and applied — value vanish;
    and \`ownSurface\` returned \`null\` for BOTH "declares no background" and "declares one I
    cannot resolve", which collapses absence with failure. The suite holds both directions: a
    resolvable background must NOT be reported as unresolvable, and a rule with two declarations
    must resolve to the LAST one, because that is the one CSS applies.
    THE MEASUREMENT IS LARGER THAN THE FINDING: 18 of 27 background-declaring rules in the
    shipped stylesheets use \`color-mix()\`, gradients or \`transparent\`, so unresolvable-by-token
    surfaces are the NORM here, not an edge case. The suite asserts \`visited\` is the exact input
    it read, so the count cannot drift without the input drifting with it.
    Split from \`contrast.test.mjs\` per Rule 4, by the question asked: the floor suite asks "does
    the contrast rule hold", this one asks "did I read the declaration correctly in the first place".
  `,

  "scripts/swan-brain-console/app/contrast.scope.test.mjs": `
    ROUND 17 (2026-09-21), Astra ROUND-16 finding L05 — the SCOPE half of the contrast check,
    split from \`contrast.test.mjs\` per Rule 4. Questions of WHICH rules are in scope and whether
    an exemption still deserves to be one: it owns the exception-binding test (every exception
    must be bound to a selector that actually declares the surface it is excused for), moved here
    from the floor suite because it asks the same question — is this excuse still valid? A scope
    defect does not mis-measure a colour; it measures the wrong SET of colours, or lets a stale
    exemption retire a real failure.

    ⚠ ROUND 17 (2026-09-22) ADDED THE OTHER HALF OF THE SAME SUBJECT — Astra L09, the ORDERING
    BETWEEN THE TWO PROPERTIES. L05 fixed the last-declaration-wins rule WITHIN one property;
    \`declaredSurface\` still asked \`decl(body,'background') ?? decl(body,'background-color')\`, which
    answers "does a shorthand exist?" and never asks WHEN. Astra's counterexample —
    \`color:#fff; background:#000; background-color:#fff\` — is white-on-white (1:1, unreadable) and
    the analyzer reported it as 21:1, a comfortable PASS. The shorthand does not outrank the
    longhand; both are longhands' contributions and the cascade settles them by ORDER. The
    \`winningBackground\` pass and its symmetric order test live here.
  `,

  "scripts/swan-brain-console/baselineLock.acquire.test.mjs": `
    ROUND 17 (2026-09-22) — the Rule 4 split of \`baselineLock.test.mjs\` by SUBJECT: the PLAN versus
    the ACQUISITION. The parent asks "is the resource set right?" — a pure function of the run mode.
    This file asks what only exists once locks start being TAKEN: what does a caller hold when an
    acquisition stops halfway, and what does it leave on disk? A plan defect names the wrong resource
    and reports a confident success; an acquisition defect leaks a lock file and the next run
    refuses against a process that is gone.

    It owns Astra ROUND-17 finding L13 — ALL-OR-NOTHING COVERED REFUSAL, NOT THROWING. The loop
    unwound on a returned \`ok: false\` and did not unwind on a THROWN error, so an ENOSPC on the
    second document write left both lock files behind (Astra executed exactly that). It also owns
    the harder half: a \`release()\` that itself throws must not REPLACE the original error, because
    turning "the disk is full" into "a lock could not be released" discards the actionable fact. The
    throw is reachable only through an INJECTED \`acquire\`, which is the honest boundary and is
    stated in the file: the unwind is proven for this function, not for a real full disk.

    It also owns L11 and L12, moved here from the plan suite because both assert that the plan's
    LOCK and the plan's DESCRIPTION cannot diverge — an acquisition seam, not a resource-set
    question. L11: my L01 repair made the ordinary \`shot-diff.mjs\` (no \`--result\`) refuse BEFORE
    MEASURING, because an empty resource set met a guard that refuses an empty directory set; two
    guards each correct alone and lethal together. L12: \`requiredResources\` dropped \`baselineDir\`
    and \`repoRoot\`, so the plan reported the caller's override while the lock used its own default —
    two answers to one question, and the reassuring one was the one printed.
  `,

  "scripts/swan-brain-console/stageReport.test.mjs": `
    ROUND 21 (2026-09-25), hostile review of \`stageReport.mjs\` — the verdict predicate had no
    test AND compared two different populations. It decides the single most consequential branch in
    this chain: whether the gate says "the product is red" or "I could not tell you about the
    product". It lived inline inside \`run()\`'s closure, where nothing could reach it, so it had no
    test at all.

    The two counts were in DIFFERENT UNITS. \`(out.match(/SPAWN-UNAVAILABLE/g) ?? []).length\` counts
    occurrences of a PHRASE; node's \`# fail N\` counts TESTS. They agreed only by coincidence in the
    one measured case (1 vs 1). A second mention anywhere in the text — a re-thrown error, an echoed
    comment — would have made a purely environmental stage read as a PRODUCT failure, which is the
    exact inversion this module was written to prevent.

    The predicate is now an exported pure function (\`classifyStageOutput\`) over a counted
    \`SPAWN-BLOCKER:\` diagnostic line, which the emitter writes exactly once per blocked file; an
    import-time crash fails the FILE, which node counts as one test, so the units agree by
    construction. \`countBlockedFiles\` is exported too, so the marker's shape is asserted rather
    than assumed. The suite pins the real measured TAP shape, the mixed case (blocker + a genuine
    assertion failure must stay FAILED, per Astra's round-18 condition), and — as a standing
    assertion, not a comment — the case where the phrase appears twice and one test failed.
  `,

  "scripts/swan-brain-console/exitCodes.test.mjs": `
    ROUND 21 (2026-09-25), hostile review of \`exitCodes.mjs\` — the module's own header states the
    reason it exists as a module rather than four inline \`return\`s: "a test can now name the
    contract instead of grepping for a literal". The module was extracted, the promise was written
    down, and the test was never written. Seventy lines of vocabulary that CI branches on, with no
    assertion anywhere in the repo.

    It matters more here than for an ordinary module, because the failure is silent and the header
    records it happening before: two of the four codes "drifted into meaning the same thing in an
    earlier round" while they were inline. Collapsing 3 into 2 again breaks no existing test — it
    just makes a busy gate read as a red one, and the documented response to a red gate is to go
    looking at what changed, when the correct response to a busy gate is to wait and re-run.

    The suite pins the four values, their pairwise distinctness, that \`EXIT_NOT_STARTED\` is not
    \`EXIT_ATTEMPT_FAILED\`, that \`EXIT_MEANINGS\` names exactly those four and nothing else, that
    \`exitForCompletedRun\` refuses to guess a failure count, and that \`--update\` can never return
    green — asserted by confirming the count is not even consulted on that path.
  `,

});
