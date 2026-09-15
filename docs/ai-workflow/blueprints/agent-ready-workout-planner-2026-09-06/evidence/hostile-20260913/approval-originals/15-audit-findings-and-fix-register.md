# Rolodex, Bootcamp, Planner and Sprint — independent hostile review

Version 1 · 2026-09-13 · Owner: Sean · Architecture/adjudication: Astra · Builder: Luna.

**Verdict: REVISE.** The source review identifies material ownership, persistence, programming-data and lifecycle defects on current main. The prior reviews contain both useful leads and claims already invalidated by later changes. This packet is the repair contract; it is not a claim that fixes have shipped. **Application source changes: none.**

The authorized outcome remains review → implement → test → review/repair. A local workflow configuration/evidence blocker currently prevents starting implementation: the default controller requires a served-model identity that native collaboration does not report. The task-specific `final-astra` path supports explicitly unknown native metadata, but its cadence change requires Sean's instruction. The review-timing choice is pending. No approval is inferred from silence, and no provider review is labeled passed.

## Plain-English Summary

The most urgent repairs protect whose data is being changed and whether saved work stays intact. A submitted Bootcamp child record can override its new parent's ID. Sprint generation and progress streams lack an ownership check. Late Planner requests can populate another selected client's draft. Conflict handling can adopt a newer save revision without loading its content. These should lead the implementation order.

Several defects directly affect training information. Manual intensity reloads as 70%. Some pain exclusions miss equivalent muscle names. A renamed alternative can retain the original movement's demonstration and instructions. Equipment matching can allow a barbell bench press without a bench. PDF and attendance paths can treat an offered alternative as additional performed work.

The supplemental pass found broken UUID blend requests, false client-status advice, class timer resets on navigation, overdue pause/resume replay, wake-lock races, stale Undo, gaps in optional provider input/cancellation, and inconsistent Coach options. These were not adequately covered by the supplied reports.

Visual work should reinforce correct behavior: a clear client/draft/save strip, concise media badges, explicit equipment readiness, inline retry and conflict controls, keyboard-accessible Sprint cards/dialogs, and persistent Bootcamp Run state. Preserve Training Studio, optional Program Map, existing world/lens tokens and advanced controls.

## Technical Summary and evidence

| Evidence | Actual result | Limit |
|---|---|---|
| Current-main worktree | `codex/rolodex-bootcamp-planner-20260913` at `c0cbe538d8ed2ca519bb494cdf3282bf43b76699` | Local baseline; no deployment attestation |
| Prior-review checkout | `f8815a0b1dfba979da4707f3c20e4229009656aa`; 599/2401 commits divergent from inspected origin/main | Old findings cannot transfer automatically |
| `Frontend baseline` (`evidence/hostile-20260913/frontend-baseline-native.log` — not committed; machine-local evidence) | 124 files / 627 tests PASS | Existing test coverage; no new repairs |
| `Backend baseline` (`evidence/hostile-20260913/backend-baseline.log` — not committed; machine-local evidence) | 36 files / 369 tests PASS | Synthetic test mode with unreachable DB URL |
| Isolated RED acceptance | 2 files / 8 intentional assertion failures; zero import/setup failures | Real frontend exports/hooks, synthetic API/Worker |
| Backend probes | 14 primary + 8 boundary observations; both scripts exit 0 | Extracted real functions with synthetic dependencies, not DB integration tests |
| Existing equipment control | 2/2 tests PASS | Demonstrates existing happy-path coverage misses required-equipment failures |
| Preservation | 73 copied source/report files with matching hashes; 13-artifact portable snapshot verified; two sample restores verified | Local preservation, not off-machine backup |
| Live Planner inspection | Read-only mounted V2 page and library inspected; observed identity-chip mismatch and cluttered missing-media treatment | No live generation, client changes or writes; no private browser data packaged |
| Synthetic design preview | Mermaid SVG rendered; desktop and phone layouts inspected without horizontal overflow; equipment-add disabling and conflict save blocking observed | Wireframe only; not application responsiveness or accessibility certification |

Canonical contracts: [reconciliation and requirements](12-hostile-reconciliation-and-repair.md), [server contract](13-server-repair-contract.md), [frontend contract](14-frontend-repair-contract.md). `Interactive repair preview` (`audit-repair-preview.html` — not committed; machine-local evidence). Detailed reports: `backend` (`evidence/hostile-20260913/backend-audit.md` — not committed; machine-local evidence), `backend boundaries` (`evidence/hostile-20260913/backend-boundaries.md` — not committed; machine-local evidence), `frontend` (`evidence/hostile-20260913/frontend-audit.md` — not committed; machine-local evidence), `frontend boundaries` (`evidence/hostile-20260913/frontend-boundaries.md` — not committed; machine-local evidence).

## Fix register

Each row maps to requirement R-Hxx and test Hxx in the canonical addendum. **All rows remain OPEN for application implementation and final validation.** Evidence labels name the original report and finding; they retain the inspected commit and source-line context. P1 means prioritize before normal use of the affected path, not a claim of observed production harm. Provider/attendance conditions are explicit.

| Contract | Priority | Concrete repair and closure condition | Source evidence |
|---|---|---|---|
| H01 | P1 | Allowlist Bootcamp child data; trusted IDs cannot be overridden; invalid inputs cause zero writes | Backend §1 |
| H02 | P1 | One atomic template save; full-group/station exercises and profile/provenance data survive reload | Backend §2 |
| H03 | P1 | Authorize Sprint generation/stream/regeneration before job lookup or headers; normalize IDs | Backend §5.1–2 |
| H04 | P1 | One generation owner, scoped completion/release, one taught transition and history linkage | Backend §5.5–7,9 |
| H05 | P1 | Preserve failed-regeneration memory; stable exercise keys; resume uses prior slots; correct week ordinal | Backend §5.3–4,8 |
| H06 | P2 | Calendar-only dates do not shift by timezone; displayed format equals generated structure | Backend §6 |
| H07 | P1 | Canonical primary/secondary muscle exclusions; cover aliases and reveal unknown severe-pain mappings | Backend §3 |
| H08 | P1 | Profile loading/error fails closed; explicit AND/OR equipment semantics shared across actual callers | Backend §7; Frontend F5 |
| H09 | P1 | Alternative has its own verified identity or a clear unverified state; never inherits original demo/instructions | Backend §4; frontend media boundary |
| H10 | P1 | Client/draft/request ownership guards generation, load, save, backup, blend and Coach results | Frontend F1 + boundary extensions |
| H11 | P1 | Preserve numeric intensity and legacy representation, zero rest, tempo, notes and known exercise metadata | Frontend F2; RED intensity cases |
| H12 | P1 | Freeze revision with loaded content; explicit conflict recovery; activation cannot clear unrelated dirty edits | Frontend F3–F4 |
| H13 | P2 | Latest search wins after delayed load/Worker failure; one scoring contract; errors/retry visible in every consumer | Frontend F8–F9; RED hook cases |
| H14 | P2 | Failed regeneration preserves draft; destructive replacement confirms; dirty signature covers all persisted content | Frontend F10 |
| H15 | P1 | HTTP/SSE failures end pending state; cancel stale listeners; reconnect never repeats generation POST | Frontend F7 |
| H16 | P1 | Export a faithful main-floor script with separate alternatives and one finisher occurrence | Frontend F6 |
| H17 | P2 | Native keyboard activation; dialog focus containment/restore/Escape; selected/pressed semantics | Frontend F11 |
| H18 | P2 | Readable Rolodex/media states and save feedback at phone/desktop/QHD/4K, zoom, reduced motion | Frontend UI direction + root preview |
| H19 | P2 | Respect movement classification, balance small full-body counts and retain session-based rotation history | Backend §7 |
| H20 | P2 | Explicit progression/deload prescription contract; workload does not change impact eligibility | Backend §6–7; server contract |
| H21 | P1 | Send actual UUID blend IDs unchanged; validate absent/invalid values before request | Frontend boundary B1; RED UUID case |
| H22 | P1 | Next-action advice describes only loaded client-plan facts; unknown is never classified as no plan | Frontend boundary B2 + root read-only observation |
| H23 | P1/P2 | Run survives stage changes; pause reconciles overdue deadlines; restart is explicit | Frontend boundary B3–B4 |
| H24 | P2 | Late wake-lock acquisition is released after exit; lifecycle/capability errors are visible | Frontend boundary B5 |
| H25 | P2 | Horizon reorder/Undo compares actual current state before applying and preserves intervening edits | Frontend boundary B6 |
| H26 | P1/P2 before provider activation | Validate prompt inputs at dispatch; attach only bounded anonymous facts needed for claimed judgment | Backend boundary B1–B2 |
| H27 | P2 before provider activation | Abort supported requests on timeout; discard late result; bounded concurrency if cancellation unsupported | Backend boundary B3 |
| H28 | P1 when attendance enabled | One performed variant per slot, valid date/nonempty entries/duration, explicit self-attendance policy, atomic write | Backend boundary B4–B5 |
| H29 | P2 | One stable taught-log operation identity survives retries; planned versus measured history stays explicit | Backend boundary B7 |
| H30 | P2 | Align Coach command ranges/styles/phase with generation; reject unsupported options instead of silently changing them | Backend boundary B6 |

## Prior findings that should not generate duplicate or obsolete fixes

- Current Bootcamp has taught logging/history UI, manual/hybrid profile plumbing, and regeneration exclusions.
- The old nonexistent muscle-column query, station target normalization problem and table-count performance path were already changed; current alias mismatches require a different repair.
- Current Bootcamp selection is randomized; do not “fix” it as wholly deterministic from the old report.
- Current `aiGenerated` depends on the Brain result, and an optional provider seam exists. Those facts do not prove a configured provider, useful model judgment or live inference.
- The logger already exposes library load errors/retry; Planner and Bootcamp still drop that hook state.
- The old client planner implementation is removed and URLs redirect by role. Do not revive it to satisfy stale tests.
- Dormant Audience/Console/checkpoint files are not the mounted Run implementation. Their presence cannot certify resume or cross-device behavior.
- Existing frontend test failures from the old branch were not reproduced on the current baseline. Preserve the new green baseline instead of changing extraction tests blindly.

## Repair and upgrade sequence

1. Validate exact contracts and establish honest workflow evidence. Preserve the immutable audit and RED output.
2. Repair object ownership and atomic persistence, then Sprint claim/retry/calendar behavior. Add real service/route tests and isolated database transaction/race coverage.
3. Repair shared vocabulary/equipment/substitution identity and full saved-content round trips. Keep source display labels separate from normalized logic.
4. Repair Planner async ownership/revisions/UUIDs/dirty-state and cross-client advice; exercise all backup/Coach/load paths.
5. Repair search, generation/SSE recovery, PDF/attendance and Run lifecycle. Verify mounted consumers, not dormant alternatives.
6. Apply scoped visual/keyboard improvements and command/provider contract corrections. Do not activate new provider or attendance capabilities by implication.
7. Run the union of regression tests, type checks/build, synthetic authenticated browser workflows and rendered PDFs; Astra reviews and repairs the combined state until the approved scope has no unresolved findings. Any newly found issue reopens its contract with evidence.

These are logical review groups containing bounded implementation steps; they are not an assertion that the default twelve-call cap covers them. The detailed contracts assess that constraint. No missing reviewer, exhausted quota or unresolved finding can be relabeled as passed.

## Definition of “dry” and remaining boundaries

“Dry” means all accepted requirements in this packet have passing observable acceptance evidence, no unresolved high-priority finding remains in the approved scope, and final review applies to the tested exact source state. It does not mean guaranteed bug-free software.

Current verification gaps: disposable PostgreSQL transaction/constraint/race/migration/restore runs; authenticated synthetic save/reload and role tests; actual PDF render; real media playback; mounted phone/desktop/keyboard/zoom checks after code changes; provider cancellation/identity if that optional feature is subsequently enabled. Production flags, DB records and deployments were not inspected or changed. There was no commit, push, migration, deployment, model reset or new paid provider call.

The original dirty checkout is preserved. Work is confined to the dedicated worktree and its task coordination record. Ready-to-run RED tests and probes remain under `tmp/rolodex-audit-evidence`; portable evidence copies and the complete plan are under this canonical packet. Do not rerun exported backend probes from their evidence directory: their invocation is from the repository root using the original script paths listed in the reports.
