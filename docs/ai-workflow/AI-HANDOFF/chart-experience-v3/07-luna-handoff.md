---
artifact_id: SWAN-CHART-V3-LUNA
owner: lead Codex; builder Luna
version: 3.2
status: SEAN APPROVED; KG0 LOCALLY VERIFIED; KG1 PREFLIGHT NEXT; S1 GATED
supersedes: old T1 migration ladder for future work
---

# Luna: execute the design, do not redesign it

Sean chose the lead/reviewer to own architecture and taste. Your job is faithful, bounded
implementation with evidence. Read README and all linked contracts before changing runtime.
Sean approved the design and whole-product uniformity on 2026-09-04. S0 is authorized now.
S1 remains gated by S0. Lead Codex does not build application code; Luna implements only
after the preceding gates pass. Do not re-ask the frozen design or narrow scope to client15.
Read [the approval and uniformity contract](10-approved-uniformity.md) with this handoff.
Sean subsequently approved kg/lb support. [12](12-worldwide-weight-units.md) adds KG0–KG3;
KG0's dependency-free shared unit module is authorized now in the new isolated current-main
lane. It does not need the dirty SwanChart foundation or DB access. The prior requirement
for all historical units to be known is replaced by explicit unknown-unit quality handling,
not guessed pounds. Full chart slices still require their own entry gates.

## Your first response in the build task

Report source branch/HEAD/dirty state, chosen isolated implementation worktree, copied packet
hash, and any active locks. State exactly which S0 audits you will execute. Do not begin with
“I will improve the design” or scaffold a new dashboard from memory.

Use current `AGENTS.md`, `CLAUDE.md`, continuity and coordination rules. The shared doc-host
branch is NOT the chart build branch. Current chart source is dirty and divergent from the
observed main. Never rebase/reset/stash another agent's work or copy the entire dirty checkout.

## Slices and file boundaries

Paths relative to the reconciled implementation repo. NEW names are exact intended locations;
if existing code now supplies the behavior, document/reuse it instead of creating a duplicate.
Each new file max300 lines; >100 component lines need blueprint header. No “temporary” any.

| Slice | Exact primary files / responsibilities | Entry / exit evidence |
|---|---|---|
| S0 — baseline/parity | Planning receipt only; read chart foundation, every chart adapter, writer units, session intensity/date storage, taxonomy joins, logger/PDF/export callers; inspect Forge inventory and current flag gate | Current origin/main reconciliation plan, no lost dirty changes; ownership resolved; tests runnable against non-production fixture DB; all source audits resolved or explicit STOP |
| S1 — semantics/envelope | NEW `backend/services/charts-v3/metricMath.mjs`, `chartRegistry.mjs`, `chartPeriods.mjs`, `chartQueries.mjs`, `chartEnvelope.mjs`; NEW `backend/controllers/chartExperienceV3Controller.mjs`; additive routing in existing `clientAnalyticsRoutes.mjs`; matched backend tests | M01–M12 pure RED→GREEN; B01a/B02a aggregate; B03/B04 API; B07/B08/B09/B10 writer/query portions; no UI/detail/share dependency; legacy APIs/tier tables unchanged |
| S2 — source detail | NEW `backend/services/charts-v3/chartDetail.mjs`, `chartSnapshot.mjs`; controller detail handler; reuse existing session detail/PDF service after adapter parity | B01b/B02b detail; B05/B06; identical aggregate/detail predicates; real pagination and source-change errors |
| S3 — shared frame lifecycle | Existing `Charts/swan/SwanChart.types.ts`, `SwanChart.tsx`, `useSwanDrill.ts`, events/table/drill/portal files; NEW `Charts/swan/useChartResourceV3.ts`, `chartResourceV3.types.ts`, `chartResourceV3.reducer.ts`, `chartExperienceV3Decoder.ts` | C01–C06, new enabled action handler tests; all old foundation tests retained; no production route switch yet |
| S4 — client experience | NEW `Pages/client-dashboard/ClientProgressStoryGate.tsx`, `ClientProgressStoryV3.tsx`, `.styles.ts`, `.tokens.ts`, `ProgressStorySummary.tsx`, `ProgressChartLibrary.tsx`, `progressStorySelection.ts`, `progressChartRegistryV3.ts`; extend bodies under `Charts/swan/bodies/`; existing `ClientProgressDashboardPage.tsx` gate mount; NEW public flag key in existing `publicConfigRoutes.mjs` | All15 registry entries + correct kind; C07–C10, source mount receipt, faithful preview layout; no duplicate widget pile above/below |
| S5 — feature parity/export | Existing `DashBoard/progress-proof` export/share/session PDF adapters; NEW `chartExportProjectionV3.ts`, `chartSharePreviewV3.tsx`; NEW backend share preview/publish adapter under `services/charts-v3/`; do not alter generic social permissions | X01–X03, old capabilities accounted for; stop if current persistence/idempotency facility cannot serve contract |
| S6 — client verification | Component and real browser suites; no visual redesign while fixing unrelated code | E01–E08 + all prior slice gates, exact screenshots/contrast, real writer→chart→detail, lead hostile review, final decision gate; V3 flag still off until release authorization |
| S7 — all other live consumers | staff `AdminProgressChartsGrid`, `ClientAnalyticsPanel`; detailed NASM; registry gallery; overview/revenue; nutrition/body-map/social/long-tail | Mandatory approved scope, not optional follow-up; U01–U12 in the uniformity contract plus X04; new receipt + chart-specific parity/permissions per cohort; don't reuse client-self routes for staff |
| S8 — retirement | Legacy frame/theme/gallery/template candidates only | Separate Sean cleanup approval + reference/mount checks; no automatic deletion |

S1 query files may split per family (`trainingQueries`, `strengthQueries`, `measurementQueries`)
when approaching300 lines. That split does not authorize changing formulas/fields. All query
helpers have explicit inputs; no imported DB connection at pure test module load time.

Forge policy: chart class exists in catalog but existing SwanChart is the in-flight selected
foundation. S0 must verify current Forge adapter/exception status; add a scoped exception with
owner+expiry through the existing ledger if needed. Do not introduce a third chart frame or
silently import the dormant frame just to satisfy catalog wording. Missing policy mechanism
is a stop for the frame slice; no global instruction edits.

## Per-chart S4 ladder

Migrate in this exact order, proving the card before the next family:

1. Frequency + volume: common week semantics and teaser/locked-detail path.
2. Attendance + sets/reps + duration + intensity: denominators, split units, source identity.
3. Best sets + main lifts + exercise frequency + estimated strength: exercise/rep filters and record truth.
4. Movement mix + muscle-group workload + effort/notes: taxonomy and nonclinical wording.
5. Body weight + body-fat measurements: unit normalization and privacy.

Use one registry entry per ID, one body per actual visual grammar when shared logic genuinely
matches; never a mega-component with15 branches and a dozen undocumented options. Cross-family
reuse must not erase units, source types or unique denominator rules.

## Stop-and-ask protocol

Stop the affected slice immediately when:

- the actual route/model/contract differs materially from this packet;
- load units, timezone, scale or taxonomy cannot be proved;
- a schema migration beyond the bounded fields in12, entitlement/pricing change, new paid dependency or provider call is needed;
- another active lane owns the required file, or the base moved into a conflicting change;
- acceptance conflicts with actual product behavior or a capability would be lost;
- the only way to pass is weaken/skip a test, fabricate data, or broaden a threshold;
- two focused attempts at the same error produce no new evidence;
- implementation needs a visual/product decision not present here.

Paste exactly:

```text
STOP — S<slice> / <test or contract ID>
Expected: <packet file + section, one sentence>
Observed: <actual path:line or command and error>
Impact: <data, UX or boundary affected>
Already checked: <up to two concrete checks>
Decision needed: <one precise question>
Recommendation: <smallest option with tradeoff; do not implement until answered>
Files changed so far: <owned paths only; leave recoverable>
```

Do not replace the requirement with your “best guess.” You may continue a truly independent
already-authorized slice only if dependency graph proves it does not depend on the question;
otherwise stop the task and ask Sean/lead Codex. Never commit around an unresolved P1.

## Verification and review handoff

Per slice: baseline→RED evidence→implementation→focused GREEN→relevant siblings→current
diff review. At cohort boundaries add mounted/browser/auth proof. Record exact commands and
counts. Source-string tests are lint-level evidence only. A static visual study is not a
working interactive screen. No “all charts done” claim until S7 inventory is fully reconciled.

Send the lead: changed paths, before/after screenshots, test IDs/results, semantic deltas,
unresolved questions and exact next slice. Lead hostile review is mandatory input to the
repository's final decision/commit gate; Luna cannot declare itself the final gate.
No extra Astra/provider calls without task authorization; reuse approved review mechanisms.

Approved scope now includes all live cohorts, but not a blanket semantic rewrite. Every S7
cohort has its own entry/exit receipt. Unknown units, money semantics, goal sources, entitlement
or clinical meaning are still stop conditions. Keep one shared frame and lens resolver; any
compatibility adapter delegates to them and cannot introduce a parallel token or theme source.

## Prohibitions

No live client fixtures; no `npm run dev` with unproven DB target; no synthetic data in app
production; no body chart social sharing; no direct SQL strings from query parameters;
no raw dashboard screenshots in exports; no auto-posts; no automatic model coaching;
no MUI/new chart libraries; no untethered animations; no weakening accessibility for polish;
no arbitrary chart deletion; no `git add -A`; no main push/deploy without Sean's explicit approval.

The first deliverable after build authorization is **S0 evidence**, not a redesigned JSX file.

## Current execution cursor

S0 returned; KG0 pure conversion is built by Luna and independently verified by the lead.
[13](13-kg0-verification.md) records the exact isolated lane,27 runtime tests, actual TypeScript
caller checks and review ledger. Do not rebuild it or import the dirty chart foundation.
KG1a's25 test-DB guard cases are verified in17. The16-file model census is adjudicated in18.
KG1b0's24 same-handle cases are verified in20; [22](22-kg1b1-verification.md) records20
actual SQL/model storage cases after the cleanup-ownership repair. All six storage files are
released from editing; the synthetic cluster is stopped. Do not rebuild these completed slices.
Sean's1B/2A decisions are approved in23. Source receipt24 proves the mounted editor and
records its destructive replacement behavior plus trainer middleware shadow. Blueprint25
dispatched KG1c0: only the five pure parser/draft files listed there. [26](26-kg1c0-verification.md)
now verifies those frozen files:25 new behavior tests,2 type groups and31 prior regressions.
Luna is idle; do not rebuild this slice. No existing writer, route, UI, auth or database
activation occurred. Lead gate is verify-kg1c0-contract.mjs; the next scoped revision/row
reconciliation adapter needs its own exact technical blueprint before bounded dispatch.
Do not import the default DB or start from old generic KG1 wording.
Sean's kg/lb product choice is already resolved; unproven historical units remain explicitly
unknown, not a repeated question for Sean.
