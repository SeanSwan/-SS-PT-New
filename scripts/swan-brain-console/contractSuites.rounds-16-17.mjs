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

});
