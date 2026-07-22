---
decision: local-release-candidate-blocked-on-final-decider
status: blocked-final-decider
verified_at: 2026-07-21
baseline_ref: eb4bbdd63794d0d842f5e5c107254f8013544367
branch: codex/degate-design-overhaul-20260721
production_mutated: false
---

# S5 Release-Candidate Verification and Closeout Evidence Lock

## Blockers first

The local implementation is not commit-gate approved. Sean authorized a manual Fable subscription review and
explicitly prohibited using the Fable API for this gate. The verified packet is
`S5-final-decider-packet.md`; its SHIP, REVISE, or REJECT verdict has not yet been returned. The final CLEAN x2
loop therefore has not started.

S5 remains uncommitted. The branch remains unpushed. Production, Render configuration, and the production
database are unchanged.

The authenticated production admin click-pass also remains Sean-gated. Local source parity is 34/34, but that
does not prove the deployed authenticated experience.

=== CLOSEOUT EVIDENCE LOCK ===

TASK: Remove design-surface gates, restore an admin-only Design Studio, restrict Launch Control to three feature
controls, enforce full admin navigation parity, and park the rejected overhaul program.

SCOPE: the complete branch delta against origin/main plus the current S5 working tree. The authoritative machine
list is `git diff --name-only origin/main` plus `git ls-files --others --exclude-standard`.

## SECTION 1 - Claim-to-Evidence Lock

Claim made: the local branch directly mounts the seven selected original surfaces, keeps the seven redesigns
inside an admin-only Design Studio, and enforces a three-key Launch Control registry. No live/deployed claim is
made.

Canonical Surface Receipts present: YES.

- `S0-route-and-flag-receipt.md` proves pre-change route seams, the public flag endpoint, backend mount order,
  schema fields, and competing-surface classification.
- `S2-design-studio-canonical-surface-receipt.md` proves the Studio route, mounted component, admin boundary,
  manifest, and preview viewers.
- `S3-admin-parity-and-whitelist.md` proves the 34-entry live navigation source and runtime whitelist.

## SECTION 2 - Forbidden-Language Filter

The closeout avoids speculative success language and does not claim deployment, production correction, or
deletion safety. Destructive cleanup candidates remain pending a separate approved pass.

## SECTION 3 - Dual-Pass Hostile Review

### Runtime and behavior

- stale state / races: no new shared client state or asynchronous mutation flow was added. Launch Control keeps
  its existing request/busy-state pattern; copy distinguishes cached public response from server enforcement.
- null/type mismatches: exact three-key resolver and service contracts passed; retired keys are rejected before
  database lookup.
- route/env/deploy drift: the live probe disproved the handoff's dark-flag assumption. All seven production flags
  were true, so this is documented as a visible rollback to the originals. Retired runtime design keys have zero
  source hits.
- auth/permissions: full-page preview routes use `ProtectedRoute requiredRole="admin"`; the dashboard Studio
  exists only in the admin role registry. The mounted preview route applies native `inert`, capture-phase
  event blocking, and a pointer-events fallback. Launch Control retains `protect` and `authorize(['admin'])`.
- responsive/overflow: synthetic-admin Playwright passed at 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560,
  3440, and 3840 CSS pixels with no document-level horizontal overflow.
- keyboard/focus/touch: Studio controls are buttons with `aria-pressed`; styles retain 44px targets and visible
  focus. Parked preview content is intentionally non-interactive, while its sticky warning remains outside the
  inert subtree. No hover-only selection path was added.
- nested interactive elements / invalid DOM: the Studio uses button cards and separate links; no nested
  interactive control was found in the changed surface.
- imports/paths: Vite transformed 6,707 modules. Static-closure evidence keeps parked redesigns out of canonical
  public page closures.
- happy-path-only logic: tests cover anonymous redirect, invalid preview ID, empty mocked APIs, seven preview
  roots, registry rejection, migration down/up, and protected feature paths.

### Design/product

- the first viewport identifies Design Studio, labels content `PREVIEW - not live`, and presents seven parked
  surfaces as the primary controls;
- viewport controls and legacy archive access remain subordinate;
- every new selection/viewport control was exercised; invalid preview has a recovery state;
- 320/375/414 mobile and 1280-3840 desktop/QHD/4K widths passed without page overflow;
- the page owns vertical scrolling; the iframe is an intentional isolated preview viewport;
- each parked component reached its surface-specific root with all API calls intercepted to safe empty data;
- the signature decision is the persistent preview warning, a sticky in-frame read-only notice, and a framed
  viewport, not a feature toggle.

### Findings repaired before this receipt

1. The handoff incorrectly said redesigns were dark; the live probe proved all seven enabled.
2. Registry-only tests did not prove runtime enforcement; query and mutation whitelist tests were added.
3. A Windows fallback write introduced mojibake; affected files were restored and reapplied byte-safe.
4. Render has two frontend build surfaces; the owner checklist now covers both.
5. A dormant Redux dashboard design env read survived S1; removal is regression-locked.
6. Launch Control falsely promised universal instant/no-redeploy behavior; UI and doctrine now state the truth.
7. Two parked previews failed Swan token discipline through four raw mask hexes; mask colors moved to existing
   token bridges and the lint gate is clean.
8. A later hostile pass found DELETE override clearing bypassed the exact whitelist; service and route
   red-green contracts now reject retired keys before SQL and return the rejection to the caller.
9. Two stale parked-inventory paths were corrected and rechecked against the filesystem.
10. Same-origin parked previews exposed mutation-capable controls. A red-green contract now requires native
    `inert`, capture-phase blocking, a pointer-events fallback, direct-route wrapping, and a sticky in-frame
    warning. Runtime coverage proves inline React, native target-listener, submit, and portal events are blocked;
    The later seven-surface matrix in finding 13 attacks those paths; Fable must independently re-attack them.
11. Real-browser navigation probing found the global Header and Footer were mounted outside the inert preview
    subtree. The app layout now suppresses both on `/design-previews/*` and removes the header offset; a source
    contract and Chromium probe lock zero links outside the preview boundary.
12. The next Chromium pass found parked previews still POSTed `/api/dashboard/track-pageview` on mount. A
    red-green route-rule contract now excludes `/design-previews/*` from analytics. The corrected Chromium
    pass proves the direct preview and Studio iframe are inert, click/submit/navigation stay blocked, no link
    escapes the boundary, and the recorder observes zero non-read API requests.
13. The delayed seven-preview matrix then found React's synthetic `onChangeCapture` did not cancel a
    programmatic native `change` dispatched from an imperatively inserted control. A RED runtime test
    reproduced the target-listener escape. The boundary now installs native capture listeners for change,
    click, input, keydown, pointerdown, and submit in addition to `inert` and React capture. The repaired
    matrix passed all seven direct preview routes plus the Studio iframe: every event class and programmatic
    navigation was cancelled, URLs stayed stable through delayed observation, all links remained inside the
    boundary, and the recorder saw zero writes and zero uncaught page errors. The only request refusal was the
    expected local Socket.IO connection while the backend was intentionally absent.


## SECTION 4 - Substantive Code Review

### Security

- no user input is interpolated into SQL; the board query uses named replacements and mutations follow whitelist
  validation;
- no public or admin API route was added;
- preview routes are admin-only and anonymous navigation redirects; the direct preview mount is mechanically
  read-only rather than trusting the iframe label;
- no client data was used in browser QA; all `/api/**` calls were intercepted;
- no secret, credential, customer name, or private identifier was added.

### Performance

- no database loop, N+1 query, or new data-transfer shape was added;
- parked components are dynamically imported only by the Studio manifest;
- canonical entry plus six public-page chunks were 81.51 KB smaller raw than the fixed baseline receipt;
- the Studio iframe isolates parked preview work from canonical routes.

### Test coverage

- behavior changes were developed against red contracts in each slice;
- frontend final relevant suite after the browser-discovered preview repairs: 22 files, 83/83 tests;
- focused Design Studio source/runtime safety subset within that run: 2 files, 6/6 tests;
- backend evidence: expanded pre-repair suite 9 files, 76/76; fresh post-repair de-gate suite 3 files, 20/20;
- migration, whitelist rejection, route parity, anonymous auth, invalid preview, responsive behavior, feature
  parity, store/gallery money paths, and workout handoff regressions are covered.

### Breaking changes and migration

- the public flags object intentionally shrinks from ten keys to three;
- the transaction deletes only seven retired registry rows and uses the existing override cascade;
- `flag_audit` is untouched and down restores metadata only;
- no Sequelize model or external API shape changed;
- the owner checklist names retired Render keys without exposing values.

### Project conventions

- styled-components and Crystalline Swan token discipline pass;
- no Material UI, Tailwind, new chart library, retired Galaxy palette, or disallowed terminology was added;
- new runtime files stay below 300 lines and document purpose/contracts;
- four local commits use `type(scope): description`;
- S5 is not committed because the Final Decider gate is unresolved.

## SECTION 5 - Verification Evidence

- frontend targeted/regression command after the browser-discovered preview repairs: 22 files, 83/83 tests passed;
- focused Design Studio source/runtime safety subset within that run: 2 files, 6/6 tests passed;
- backend post-repair de-gate command: 3 files, 20/20 tests passed;
- `npm run lint:swan-lens`: 94 files free of retired palette references; 93 consumers, zero raw hex;
- the current modified backend admin-flag route and Launch Control service pass `node --check`;
- `git diff --check`: exit 0, with line-ending conversion warnings only;
- backend untracked audit: empty; the modified-uncommitted audit lists exactly the three intentional S5 files
  (`adminFlagRoutes.mjs`, `launchControlService.mjs`, and its whitelist test) and must be empty after the
  final S5 commit before push;
- standard `npm run type-check` reproduces an 8 GB heap OOM without a TS diagnostic;
- the identical compiler at 12 GB exited 0 again after the native-capture repair:
  `node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --pretty false`;
- `npm run build`: exit 0 after the native-capture repair, 6,707 modules transformed;
- anonymous Studio redirect, seven preview roots, three viewport controls, full width matrix, and invalid ID passed;
- a fresh delayed Chromium matrix proves all seven direct previews plus the Studio iframe are inert, have zero
  outside-boundary links, cancel click/input/change/keydown/pointer/submit/programmatic navigation, keep stable
  URLs, emit zero writes, and throw zero uncaught page errors; the only refusal is the expected local Socket.IO
  connection while the backend is intentionally absent;
- full current changed-file secret scan: 84 files, 0 hits;
- the S5 commit hook has not run because S5 remains intentionally uncommitted.

## SECTION 6 - Post-Task Hygiene

New tracked evidence: S0-S5 receipts, seven Studio screenshots, a parked-surface inventory, and a
non-destructive repo-hygiene inventory.

Temporary QA artifacts outside the worktree:

- `C:\tmp\sspt-design-studio-playwright.py`;
- `C:\tmp\sspt-design-studio-playwright-full-matrix.py`;
- `C:\tmp\sspt-degate-baseline-20260721`;
- three S2 manifest JSON files under `C:\tmp`;
- S0 screenshots and `C:\tmp\degate-s0-probe.cjs` listed in `S0-production-probe.md`.

No cleanup, archive, move, or deletion is authorized. These remain candidates pending reference checks and
Sean's approval.

## SECTION 6.5 - Hermes Closeout

No continuity closeout was requested. No Hermes memo was emitted. No Fable-tier lesson packet was emitted
because no Fable review completed and provenance remains Codex. The S5 source secret scan is clean.

## SECTION 7 - Residual Risk

Not verified:

- authenticated production click-pass for all 34 post-change admin entries;
- post-deploy routes, assets, public-flags shape, Launch Control rows, migration, and logs;
- Render environment cleanup;
- Fable subscription Final Decider verdict;
- independent Fable validation that no mount effect, timer, imperative navigation, or non-event network call
  bypasses the preview read-only boundary.

Retained feature-control limitation:

- `postSaveHandoff` consumes database overrides end-to-end;
- PRISM UI consumes the override, but its POST route reads `PRISM_CAPTURE_ENABLED` directly;
- dashboard finance is dormant and its controller reads `DASHBOARD_V2_FINANCE` directly.

Required next gate:

1. Paste the current `S5-final-decider-packet.md` into Sean's Fable subscription and return the full verdict.
2. Apply every confirmed finding and rerun the complete local gate.
3. Run two consecutive clean hostile rounds after the last repair.
4. Commit and push only after Fable returns SHIP and CLEAN x2; Sean's standing goal authorizes that final batch.
5. Monitor Render, then run the 34-link click-pass, S4 owner checklist, live routes, logs, and final audit record.

## SECTION 8 - Reporting Order and Status

Blocker: the authorized manual Fable subscription verdict has not yet been returned. The branch is unpublished,
and no final dry-loop claim is made while preview write authority and deployed/authenticated evidence remain open.

STATUS: FAIL - release gate blocked pending the manual Final Decider verdict and post-verdict CLEAN x2.
