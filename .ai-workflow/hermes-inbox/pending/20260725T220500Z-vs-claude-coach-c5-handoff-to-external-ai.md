# Swan Coach — C5 handed to an external AI; 6 of 7 slices shipped

**Surface:** vs-claude (Opus 5) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 · **On main:** `9b596d45d`

---

## Status

**6 of 7 slices of the Swan Coach Hive-Mind program are live on main** (20 commits): C0 locate · C0.5 wrong-client hotfix · C1 informed mind · C2 core memory · C2 offline honesty · C3 confirmation tier · C4 intent eval. **C5 (the one intent bar) is the only slice left**, and it is blocked on two decisions Sean owes.

Sean is out of tokens and is handing C5 to ChatGPT. A build handoff was written for an executing AI with zero context.

## The transferable lesson: writing a handoff that survives a model change

Sean's constraint was specific — *"it must be built in the vision you created, not ChatGPT's."* That is a different document from a normal handoff, and the differences are worth carrying:

**1. Name the role explicitly, first.** The document opens with "you are the BUILDER, not the architect. Execute these decisions; do not re-derive them." A capable model handed a design will otherwise improve it, because improving is what it is for. The instruction has to be explicit and early.

**2. Ship the WHY with every load-bearing decision.** Not "build a docked bar" but "build a docked bar **because** an overlay is a mode-switch and a mode-switch fights the ≤2s screen-off goal." A decision without its reason gets silently substituted the moment the builder has a preference. A decision with its reason gets argued with — which is fine, and is the outcome you want.

**3. Teach the codebase's failure law, not just its file map.** The most valuable section is not the file inventory — it is "8 times a planned build-this already existed; grep before building, and grep against origin/main not the local tree." That single rule prevents more damage than the API reference does.

**4. Mark deliberate dormancy loudly.** C3 ships with zero consumers on purpose. Without a flag saying so, a diligent builder "fixes" it by wiring it — which would gate commands behind a confirmation no surface can collect and break the lane.

**5. State the environment's lies.** `node_modules` is empty in both trees; neither test runner installs. An incoming AI will assume it broke something. Naming the constraint, the three workarounds, and the line ("stub to satisfy an import, never to fake a behaviour") saves it from either despair or fakery.

**6. Verify every citation before handing it over.** A wrong line number in a handoff becomes wrong code in a way a wrong line number in a status report never does. All 7 test files and 5 surfaces were confirmed against `origin/main`, and the promised counts were re-run and matched exactly (72 assertions). **The proof bar for a handoff is higher than for a report, because it will be executed rather than read.**

## Also worth carrying

The blocker that stopped C5 is itself a lesson already recorded: a plan cited `resolveAudienceFromPath` as shipped when it existed only in 3 unpushed commits. Verified twice — `git grep` against `origin/main` (0 hits) and `git branch -r --contains` (unmerged to any remote). **Two independent methods for a claim that would otherwise block a stranger's build.**

## Open for Sean

1. Direction: The Lane + client chip (recommended) / The Lock / The Console
2. Audience routing (a) land SWA-64 first / (b) role props now / (c) duplicate — **blocks compilation**
3. C3 tier observe-only first, or C5 ships tier-unaware

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation. No durable packet: the lesson is process-level and complements the two packets already emitted; promote it if handoff-authoring recurs.
