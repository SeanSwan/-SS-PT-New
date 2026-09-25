/**
 * contractSuites.rounds — WHY each suite in `contractSuites.list.mjs` exists, by review round.
 * @module scripts/swan-brain-console/contractSuites.rounds
 *
 * THE TWELFTH RULE 4 SPLIT IN THIS SUBSYSTEM, and like every one before it, by SUBJECT rather
 * than by line count. `contractSuites.list.mjs` carried two things that grow at different rates:
 *
 *   the NAMES       one line per suite, and this gate adds suites in every review round;
 *   the RATIONALE   a paragraph per ROUND, explaining the finding a suite was added for.
 *
 * Round 17's four suites took the combined file to 326 lines, and the 265 comment lines against
 * 55 names was the tell: the rationale had become the file and the list was living inside it.
 * The list is now 90 lines and stays a list as it grows; the reasons live here.
 *
 * HONEST SCOPE — THIS MAP IS INCOMPLETE, AND SAYS SO. 29 of the 53 suites in the list have an
 * entry; the other 24 predate this file and their reasons are only in their own headers. The
 * coverage check in `contractSuites.test.mjs` therefore fails a NEW name with no entry while
 * reporting the legacy gap as a count rather than as a failure — a check that failed on 24
 * pre-existing omissions would be switched off within a round, and a check nobody runs protects
 * nothing. Backfilling them is legitimate future work, not a blocker.
 *
 * Every suite also states its own defect in its own header, and those headers are authoritative
 * about the MECHANISM. This file is about PROVENANCE: which round, which finding, and why the
 * suite is a separate file rather than more tests in a neighbour.
 *
 * BOUNDS: data only. No imports, no I/O, no clock — importing this file cannot do anything.
 * Keys are suite paths exactly as `NODE_CONTRACT_SUITES` writes them.
 */
export const SUITE_RATIONALE = Object.freeze({
  "scripts/swan-brain-console/hostGuard.test.mjs": `
    ROUND 12 (2026-09-20), Astra round-11 finding F21. The Host predicate was inline in the
    request handler, so its malformed-authority cases could only be reached through a socket —
    and so none of them was covered, which is how \`Host: localhost:bad-port\` kept returning 200.
    The predicate now lives in \`hostGuard.mjs\` and this suite owns its matrix; the socket suite
    above keeps proving the handler genuinely calls it.
  `,

  "scripts/swan-brain-console/buildIdentity.test.mjs": `
    ROUND 12 (2026-09-20), Astra round-11 finding F15. \`verifyTarget.mjs\` proved "THIS build" with
    byte comparisons of BROWSER assets, which says nothing about the server's own logic — editing
    \`gateClassify.mjs\` changes no asset, so a process started before that edit serves identical
    bytes and computes different gate statuses. The backend closure is walked from \`server.mjs\`,
    hashed at process start, and published at \`/api/build\`; this suite pins the walk and the
    digest, and the socket suite above proves the real server answers with it.
  `,

  "scripts/swan-brain-console/lineBudget.test.mjs": `
    ROUND 12 (2026-09-20), Astra round-11 finding F20. Rule 4 was guarded by seven per-subsystem
    lists naming 27 of the 78 files in this directory, so a tree-wide ceiling claim rested on
    guards that could only fail to contradict it. This suite discovers the set by walk and
    extension, declares its one exception with a reason and a retirement condition, and fails a
    declared exception that no longer breaches.
  `,

  "scripts/swan-brain-console/mcp/searchDoctrine.test.mjs": `
    ROUND 8 (2026-09-20). Both added with their modules. The completeness check below
    caught them the moment they appeared on disk — which is that guard earning its place:
    \`snapshot.parity.test.mjs\` exists precisely because a suite that was never RUN is
    indistinguishable from a suite that does not exist.
  `,

  "scripts/swan-brain-console/app/asset-routes.test.mjs": `
    ROUND 10 (2026-09-20). Three additions, and two of them are splits rather than new
    coverage: \`registry-route.test.mjs\` went past Rule 4 when it gained the registry-allowlist
    parity check, so its asset-route half became \`asset-routes.test.mjs\` (the two files test
    two different tables). \`style-hooks.test.mjs\` is the class-level guard for "an emitted
    class no stylesheet reads" — the defect round 7 fixed for one element and this round
    found still live on the two lines either side of it.
    
    The completeness check below caught all three the moment they appeared on disk, which is
    the whole reason it exists: a suite that is never invoked is indistinguishable from one
    that passes.
  `,

  "scripts/swan-brain-console/app/judge-persistence.test.mjs": `
    ROUND 11 (2026-09-20). \`judge-persistence.test.mjs\` is a SPLIT, not new coverage: the
    stored-session half of Judge Mode left \`judge-export.test.mjs\` when the round-11 fixes
    pushed it to 339 lines — a Rule 4 breach the Judge Mode guard caught on its first run.
    The two files now cover two subjects: persistence and pairing identity here, the verdict
    reducer and the exported artifacts there.
  `,

  "scripts/swan-brain-console/fleet-population.test.mjs": `
    ROUND 11 (2026-09-20), Astra round-11 finding F04. The population a render run CLAIMS to
    have measured is its own subject, separate from the per-variant pixel decision that
    \`shot-diff.test.mjs\` pins: a subset run used to certify the full-fleet gate because the
    denominator was read from the page being measured.
  `,

  "scripts/swan-brain-console/fleet-data.test.mjs": `
    ROUND 11 (2026-09-20), Astra round-11 finding F07. \`fleetData.mjs\` imported \`skeletons.ts\`
    through a stable URL, so \`import()\`'s cache served stale structure while the registry prose
    was re-read from disk — a mixed-generation fleet under a fresh timestamp. The reader is its
    own subject, so its cache key is pinned here rather than inside the render-gate suite.
  `,

  "scripts/swan-brain-console/panelPopulation.test.mjs": `
    ROUND 12 (2026-09-20), Astra round-11 finding F14. The browser gate's "every panel renders
    content" check measured each panel's innerText and called 20 characters "content" — but every
    panel carries permanent intro copy, so a renderer replaced by a successful no-op passed. The
    container-vs-snapshot table is a pure module, and this suite is what pins it to the real
    readers, reproduces the no-op regression, and proves the OLD check passed on prose alone.
  `,

  "scripts/swan-brain-console/gateEvidence.test.mjs": `
    ROUND 13 (2026-09-21), Astra ROUND-12 findings G01, G02 and G05 — the false-PASS family.
    
    Round 12's brief told Astra that all 22 round-11 findings had been addressed. Astra
    executed the shipped classifier and got \`status: "pass"\` for a document declaring an
    unrecognised mode, for one declaring ninety-nine un-run cases, and for one timestamped 47
    hours in the future. The claim was false. This suite is the reproduction, kept as a
    regression: each test names the mutation that turns it RED, and the last one asserts that
    the REAL gate — the only one in this repository with a committed result — still passes, so
    the fix cannot be "reject more".
  `,

  "scripts/swan-brain-console/gateIdentity.test.mjs": `
    ROUND 14 (2026-09-21), Astra ROUND-13 finding H02 — and the unit Astra ranked #1 before
    this tree may be committed as trustworthy observability.
    
    \`readGateHealth\` read a file because a table said the path belonged to a named gate, and
    never asked the file whether it agreed. Astra executed the shipped reader against a fresh
    document stamped for a DIFFERENT gate, whose own variant rows said one had failed while its
    summary said none had, and which declared it had not covered its population — and got
    \`pass\`. The artifact contract is now a required argument of \`classifyEval\`, and this suite
    pins both halves: the refusals, and the two cases that must NOT be refused (the real render
    producer's artifact, and the real planning artifact, the only committed gate in the repo).
  `,

  "scripts/swan-brain-console/gateIdentity.contract.test.mjs": `
    ROUND 14 (2026-09-21). The other half of H02, and a SPLIT rather than extra coverage:
    together with \`gateIdentity.test.mjs\` the pair breached Rule 4's 300 lines, and the two
    halves are genuinely different subjects. \`gateIdentity.test.mjs\` owns the refusals; this
    owns the cases that must survive them — the real render producer's artifact, the real
    planning artifact, and the seam that would let a caller bypass the contract entirely. The
    shared fixtures moved to \`gateIdentity.fixtures.mjs\` so the two cannot drift apart on what
    a normal artifact looks like, which would silently remove the guard this split protects.
  `,

  "scripts/swan-brain-console/renderAttempt.test.mjs": `
    ROUND 14 (2026-09-21), Astra ROUND-13 finding H03 — her ranked #2, and the same defect
    class as H02 one level out: evidence attached to the wrong observation time.
    
    \`shot-diff.mjs\` published its artifact only after the browser work completed, so a failed
    rerun left the PREVIOUS run's green artifact on disk, fresh and stamped \`mode: "compare"\`,
    and Gate Health reported PASS for a gate whose latest attempt had died. The lifecycle now
    publishes an in-progress artifact before measuring and a terminal failure on a handled
    error; this suite is Astra's own regression — seed a green artifact, force the run to
    throw, read Gate Health — plus the ordering claim, observed from inside the run.
  `,

  "scripts/swan-brain-console/renderFence.test.mjs": `
    ROUND 15 (2026-09-21), Astra ROUND-14 finding J02 — the CONCURRENCY half of H03, and a
    different subject from \`renderAttempt.test.mjs\`, which asks about order in a serial run.
    
    \`attemptId\` was recorded but never consulted, so publication was unconditional: Astra
    reproduced both "A starts, B starts and fails, A finishes and publishes => PASS from A" and
    "D starts and is unresolved, C publishes => PASS from C" with controlled promises. The
    lifecycle now refuses to publish over evidence that is NEWER than the attempt publishing.
    This suite also asserts the cross-process limitation is DISCLOSED rather than implied away,
    and that the J03 baseline staging keeps its ordering.
  `,

  "scripts/swan-brain-console/app/contrast.test.mjs": `
    ROUND 15 (2026-09-21), Astra ROUND-14 finding J08. Round 13's H09 guard proved every
    \`var(--token)\` RESOLVES; it never asked whether the colour it resolves to can be READ.
    \`.judge-right > .judge-side\` shipped at 4.04:1 — below the 4.5:1 floor, at 0.68rem — and
    mutating \`--danger\` to a dark blue left the H09 guard green at about 1.2:1. This suite
    computes the WCAG ratio for every opaque token used as a text colour, and derives the set of
    tokens it checks from the stylesheets so its own scope cannot narrow.
  `,

  "scripts/swan-brain-console/app/contrast.scope.test.mjs": `
    ROUND 16 (2026-09-21) — the NINTH Rule 4 split. L05's partition assertions took
    \`contrast.test.mjs\` to 358 lines; it had already been trimmed once (301 → 299) by shortening
    comments, and doing that again is the same mistake twice — a budget kept by deleting the
    reasoning behind the assertions is not a budget.
    
    The boundary is the failure DIRECTION. In \`contrast.test.mjs\` a text colour is not LEGIBLE
    (the floor, shorthand/literal resolution, rules escaping as uncomputable). Here a declaration
    this suite EXCUSES no longer deserves the excuse: \`NON_OPAQUE\` promises a token's contrast
    cannot be computed statically, and if the token stops being semi-transparent the promise is
    stale and it is unchecked for no stated reason. One ships an unreadable colour; the other
    removes a check tomorrow. They should fail separately.
  `,

  "scripts/swan-brain-console/attemptLock.test.mjs": `
    ROUND 16 (2026-09-21), Astra ROUND-15 finding K01 — cross-process synchronization. The
    publication fence orders two writes that have already happened and decides it from a clock;
    Astra executed three schedules it does not close (equal timestamps, a stale read across
    processes, and a baseline written before the fence refuses the result) and required a lock
    over the whole attempt instead. This suite proves exclusion, reclamation of an abandoned
    holder, refusal rather than theft of a live one, bounded acquisition, and — as a real
    subprocess — that a busy run exits 3 and publishes nothing.
  `,

  "scripts/swan-brain-console/lifecycleEntry.test.mjs": `
    ROUND 16 (2026-09-21), Astra ROUND-15 finding K03 — the lifecycle entry point. \`loadFleetIds()\`
    sat outside \`runAttempt\`, so a manifest failure exited with the PREVIOUS artifact untouched and
    the console reported PASS for a gate the operator had just asked to verify. The guard was a
    source-text regex matching \`loadFleetIds()\` — it survived moving the call back out, which is
    Astra's K05 exactly. This suite copies the console into a throwaway root (with a junction to the
    real \`frontend/node_modules\`, so nothing is stubbed), leaves the manifest absent, and requires a
    FAILED attempt at the result path. Hoisting the call above \`runAttempt\` publishes nothing: RED.
  `,

  "scripts/swan-brain-console/fleetMeasure.test.mjs": `
    ROUND 16 (2026-09-21), Astra ROUND-15 findings K04 and K05 — the browser half, EXECUTED.
    The Rule 4 split moved \`measureFleet\` out of \`shot-diff.mjs\` and carried source-text guards
    with it; Astra deleted the behaviour behind three of them and all three stayed green. This
    suite drives \`measureFleet\` through injected browser and filesystem boundaries and asserts the
    refusals, the recorded failures, the forbidden writes, and the durable incomplete-generation
    marker that makes a mixed baseline set refuse rather than compare.
  `,

  "scripts/swan-brain-console/gateReconcile.test.mjs": `
    ROUND 16 (2026-09-21), Astra ROUND-15 finding K02 — complete render reconciliation.
    \`gateReconcile.mjs\` and \`populationReconcile.mjs\` had no suite of their own: their rules were
    exercised only through \`gateIdentity.test.mjs\` and \`gateIdentity.contract.test.mjs\`, which are
    about PROVENANCE, so a coherence rule could not fail on its own. Astra executed three artifacts
    the reader certified: a summary claiming 20 passes with no rows, a \`written\` row under
    \`mode: "compare"\`, and a population claiming 20 measured rows behind one. The suite also holds
    the over-reach control, built from the producer's OWN functions, that keeps the three new
    tightenings from refusing a real artifact.
  `,

  "scripts/swan-brain-console/gateHealth.producerless.test.mjs": `
    ROUND 16 (2026-09-21), Astra ROUND-15 finding K07 — evidence wording. A missing result file
    produced one detail string for two different situations: a gate whose result is simply not
    committed here, and a gate whose contract declares NO WRITER AT ALL. \`app/app-gates.mjs\`
    rendered both as "never ran", a claim about execution the reader cannot support. Split from
    \`gateHealth.test.mjs\` because that suite is about what a missing result means for the STATUS
    and this one is about whose missing result it is — and because the K07 tests pushed the parent
    past Rule 4.
  `,

  "scripts/swan-brain-console/app/judge-evidence.test.mjs": `
    ROUND 13 (2026-09-21), Astra ROUND-12 findings G04 and G13 — the Judge stored-evidence
    boundary. Round 11 fixed \`judged\` counting object keys instead of verdicts; round 12 found
    the same disagreement one level out (a valid verdict under a key that names no pair was
    counted, so an export could read \`complete: true\` with an empty table), and found
    \`saveState\` returning a success receipt for a store that does not exist.
  `,

  "scripts/swan-brain-console/mcp/readme-contract.test.mjs": `
    ROUND 13 (2026-09-21), Astra ROUND-12 finding G23. The MCP README said "its four tools"
    and tabulated four, while \`TOOL_NAMES\` has five — the same file, forty lines later,
    explaining that the count is five. The fix is to have no count and make the table the
    list; this suite ties that table to \`TOOL_NAMES\` so it cannot drift again.
  `,

  "scripts/swan-brain-console/doctrine.test.mjs": `
    ROUND 11 (2026-09-20), Astra round-11 finding F17. The Doctrine reader reported a parse
    failure as a healthy empty table, so a corrupt catalogue and a real one looked identical on
    screen. MISSING / INVALID / OK are three states with three different fixes, and this suite
    produces all three from a real temporary tree.
  `,

  "scripts/swan-brain-console/app/app-banner.test.mjs": `
    ROUND 11 (2026-09-20). \`app-banner.test.mjs\` covers F08 (two writers assigning the status
    banner, so the second erased the first). \`app-judge-render.test.mjs\` covers F11 (every redraw
    focused pair one, and focus IS the keyboard cursor) — it drives the real renderer against a
    stub document because a plan-level test cannot observe focus.
  `,
});
