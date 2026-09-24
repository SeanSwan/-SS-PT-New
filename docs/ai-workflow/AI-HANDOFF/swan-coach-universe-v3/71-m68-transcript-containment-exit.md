# M68 — Coach transcript containment, local exit

Version 1, 2026-09-13. Implements plan [68](68-coach-transcript-layout-repair.md).
Owner of adjudication: Astra. Bounded implementation: this session. This receipt
supersedes nothing; it records one slice's evidence and the two defects the slice
surfaced. Final combined review remains deferred under Sean's override.

## Claim (narrow, and only this)

On the mounted Coach Talk tab, `.chat-panel` laid its two children —
`CoachIntentBar` and `CoachChatTranscript` — out in a **row**, because the rule
set `display: flex` without a `flex-direction` and CSS defaults that to `row`.
The transcript was therefore crushed to its intrinsic width (~253px at every
viewport) and the shell's `overflow-x: hidden` concealed it from
`document.scrollWidth`. Setting `flex-direction: column` and `min-width: 0` on
the existing `.chat-panel` / `.chat-transcript` rule makes the intent controls
stack above a full-width transcript.

This is a **containment** claim. It is **not** a claim that the Coach workflow,
selection, messages, Desk, Logger, memory or proactivity work. It is **not** a
claim that message-row text containment is proven (see Finding M68-F2).

## Canonical surface receipt (rule 26)

| Item | Evidence |
|---|---|
| Route that mounts the surface | Doc 70 closeout lock: `UniversalDashboardLayout.routes.tsx` -> `CoachCommandCenterPage` |
| Mounted JSX (not a lazy import) | `CoachCommandCenterPage.tsx:162` `<div className="chat-panel" id="coach-tabpanel-talk" role="tabpanel" aria-labelledby="coach-tab-talk">` |
| Children, in DOM order | `CoachCommandCenterPage.tsx:163` `<CoachIntentBar …/>`; `CoachCommandCenterPage.tsx:172` `<CoachChatTranscript …/>` |
| Transcript root | `CoachChatTranscript.tsx:121` `<section className="chat-transcript" …>` |
| Stream root | `CoachChatTranscript.tsx:137` `<div className="transcript-stream" …>` |
| Style owner | `CoachCommandCenter.bridgeStyles.ts:281-297` `CommandBridgeShell` composes dock styles (288) **then** crystalline focus styles (292) |
| Why global overflow hid it | `CoachCommandCenter.shellStyles.ts:38` sets `overflow-x: hidden` on the shell, so the crushed row never widened `document.scrollWidth` |
| Defect | `CoachCommandCenter.crystallineFocusStyles.ts:140-141` (pre-fix) `display: flex;` with no `flex-direction` |
| Frontend API path | None. This slice changes no request, no response, no storage. |
| Backend route | None. |
| Model fields | None. |

## Exact diff scope

Two files, as plan 68 required. No third source file was touched.

| File | Change |
|---|---|
| `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.crystallineFocusStyles.ts` | `.chat-panel, .chat-transcript` gains `flex-direction: column;` and `min-width: 0;`, expanded to one declaration per line, plus an explanatory comment |
| `frontend/e2e/coach-command-center-mobile.spec.ts` | `@matrix` test gains a `geometry` audit block and 8 assertions (see below) |

`AGENTS.md` remains modified-but-unstaged; it is a pre-existing local exception
recorded in packet 70 and is deliberately **not** part of this slice.

## RED — observed on the unmodified stylesheet

Command (from `<worktree>/frontend`), Vite on the task-owned port:

```
$env:BASE_URL="http://127.0.0.1:4990"
npx playwright test --config playwright.coach-mobile.config.ts --project "Responsive matrix Chromium"
```

Result: **FAIL, 1 test, 88 recorded failures across all 20 viewports.** Every
viewport reported at least:

```
chat panel lays its children out as row
intent controls are not stacked above the transcript
transcript escapes the chat panel
```

Measured widths, showing the crush and that it was **independent of viewport**:

| Viewport | Panel width | Transcript width | Transcript width / viewport |
|---|---|---|---|
| P1 XR 414x896 | 372 | 253.125 | 0.611 |
| P2 390x844 | 348 | 253.125 | 0.649 |
| P6 360x780 | 326 | 253.125 | 0.703 |
| P12 floor 320x568 | 290 | 253.125 | 0.791 |
| tablet landscape 1024x768 | 960 | 772.531 | — |
| 1080p 1920x1080 | 1150 | 827.172 | — |
| QHD 2560x1440 | 1248 | 903.875 | — |

The transcript width is constant at 253.125px across every phone viewport,
which is the signature of a flex row resolving a fixed intrinsic size rather
than a percentage of the container. The `@xr` test passed both before and after,
confirming the pre-existing suite could not see this defect — exactly what plan
68 asserted ("existing height/global-overflow checks alone are insufficient").

## GREEN — same command, repaired stylesheet

```
3 passed (51.3s)
  ok 1 [XR Chromium]        @xr   2.2s
  ok 2 [iPhone XR WebKit]   @xr   4.1s
  ok 3 [Responsive matrix]  @matrix 40.4s
```

Matrix runtime 33.4s green vs 34.2s red — the fix is layout-neutral in cost.

### New assertions (all eight can fail; none is vacuous)

1. Talk chat panel is mounted.
2. `.chat-panel` computed `flex-direction` is `column`.
3. The intent bar's bottom is above the transcript's top (real stacking).
4. The transcript does not escape `.chat-panel` horizontally.
5. The intent bar does not escape `.chat-panel` horizontally.
6. `.transcript-stream` has no horizontal overflow (`scrollWidth - clientWidth <= 1`).
7. No text-bearing descendant of the stream escapes its bounds.
8. Transcript width >= 98% of panel width, and >= 80% of viewport width on phones.

Assertions 2-5 and 8 all fired in RED, so they are proven capable of failing.

## Real-browser measurement after the fix

Captured with the same authenticated fixture, provider calls mocked
(`tmp/coach-m68-20260913/m68-geometry.json`, screenshots alongside).

| Viewport | `flex-direction` | intentBar bottom == transcript top | transcript == panel width | stream overflow X |
|---|---|---|---|---|
| mobile 390x844 | column | yes (388.94) | 348 / 348 | 0 |
| mobile 320x568 | column | yes | 290 / 290 | 0 |
| desktop 1440x900 | column | yes (388.94) | 726 / 726 | 0 |
| desktop 3840x2160 | column | yes (693.31) | 1248 / 1248 | 0 |

Screenshots at all four widths were opened and inspected, not merely measured.

## What I believed and then disproved (recorded on purpose)

While inspecting the 390px screenshot I judged that the intent-bar "Client:"
chip and the "Ask or act" input were visually **overlapping**. I measured instead
of acting on the impression. The four children are laid out cleanly with no
overlap at any width:

| Viewport | Change client | Input | Mic | Send |
|---|---|---|---|---|
| 390x844 | 31–86.44 (w 55.44) | 94.44–249.08 (w 154.64) | 257.08–301.08 (w 44) | 309.08–359 (w 49.92) |
| 320x568 | 25–73.61 (w 48.61) | 81.61–188.97 (w 107.36) | 196.97–240.97 (w 44) | 248.97–295 (w 46.03) |

`intentOverlaps` is `[]` at every viewport. Every control meets the 44px minimum
(rule 2). The single measured anomaly is a **2px** internal overflow of the lane
bar at the 320px floor (`intentOverflowX: 2`), which does not escape the panel,
does not clip any control, and is recorded here rather than silently fixed,
because plan 68 forbids expanding this slice's scope without a measured
independent amendment.

## Two defects this slice surfaced (neither is fixed here)

### M68-F1 / new HR16 — the routed thread's messages are never loaded

**Severity: MAJOR. Blocks every "show me my conversation history" journey.**

`chat.messages` is `visibleConversation?.messages || []`
(`useAIChat.ts:1378`), and `activeConversation` is set **only** by
`loadConversation` (`useAIChat.ts:892`). `loadConversation` early-returns
`null` when `capturePublication` yields nothing
(`useAIChat.ts:898-899`), and `capturePublication` returns `null` unless the
auth binding is already published (`useAIChat.ts:415-424`).

`useLoadRoutedCoachThread` (`CoachCommandCenter.controllerEffects.ts:43-66`)
latches its retry guard **before** the call it is guarding:

```
62    if (lastLoadedThreadIdRef.current === routeThreadId) return;
63    lastLoadedThreadIdRef.current = routeThreadId;   // latched optimistically
64    void chat.loadConversation(routeThreadId);        // may silently no-op
```

**Root cause — CORRECTED 2026-09-13 after instrumentation; the first version of
this section was wrong.**

The first draft above asserted a *mount-time auth-binding race*: that
`capturePublication` (`useAIChat.ts:410-442`) returned `null` because the auth
identity was not yet published, so `loadConversation` no-opped at `:898-899`.
**That is refuted.** A temporary `window.__coachTrace` instrumentation (since
reverted) showed the first mount pass reaching the wire:

```
{"at":"loadConversation","requestedId":301,"source":false,"target":null,"captured":true}
{"at":"loadConversation.REQUEST","requestedId":301}
```

`canUseRenderScope()` was true, the identity was authenticated,
`audienceAllowedForActor` passed, and the hook **did** call
`apiService.get('/api/ai-chat/conversations/301')`. `useAIChat.ts:898-899` is not
where this no-ops.

The real cause is two steps:

1. **The request is aborted before dispatch.** `frontend/src/main.jsx:75` wraps
   the app in `<React.StrictMode>` (React 18.3.1). StrictMode's development
   double-invoke runs the `useAIChat` mount-layout-effect cleanup
   (`useAIChat.ts:695-708` — `mountedRef=false`, generation bumps,
   `retireOperationSet`). The captured stack is
   `retireOperationSet ← useAIChat.ts:444 ← safelyCallDestroy ←
   commitHookEffectListUnmount ← invokeLayoutEffectUnmountInDEV ←
   invokeEffectsInDev ← commitDoubleInvokeEffectsInDEV`. The load's
   AbortController is aborted **before axios dispatches**, axios rejects
   `canceled`, and the catch at `useAIChat.ts:922-925` treats a cancellation as a
   silent `null`. Trace: `{"at":"loadConversation.CATCH","msg":"canceled","canceled":true,"valid":false}`.
2. **The latch makes step 1 permanent.** The StrictMode remount re-runs the
   effect, but line 62 sees `lastLoadedThreadIdRef.current === 301` — a ref
   survives the simulated remount — and returns. No retry, ever.

So the *latch* half of the original hypothesis was right; the *trigger* was not.
The sibling `useLoadCoachConversations` (empty dependency array) survives only
because its list request had already been dispatched before the same abort; the
load loses that race.

**Environment caveat, stated rather than glossed:** StrictMode's double-invoke is
development-only, so this exact abort path is the dev server on `:4990`. Whether
the shipped build is broken through some other retirement path is **UNVERIFIED** —
no production build/preview run was performed. The latch defect the abort exposes
is real in any environment, and the bounded retry costs nothing when the first
load lands.

Probe evidence (real browser, authenticated admin fixture, all `/api` requests
logged — `tmp/coach-m68-20260913/probe-thread-load.mjs`):

```
route entry (?threadId=301) -> transcript children: 1  emptyState: true
client switch to 42         -> transcript children: 1  emptyState: true
client switch back to 41    -> (no API calls at all)
History tab + row clicks    -> transcript children: 0

DETAIL-FETCH CALLS: (none)
```

The only conversation request issued in the whole journey is
`GET /api/ai-chat/conversations` (the list). `GET /api/ai-chat/conversations/301`
is never sent, so the transcript renders its empty state even though the thread
carries `messageCount: 2`. The unit suites pass because they inject a
`loadConversation` mock (`CoachCommandCenterPage.shell.test.tsx:154`), so the
binding gate is never exercised — a mock-covered boundary, not a verified one.

**FIXED — see "HR16 repair" below.**

### M68-F3 — the floating mobile command strip overlaps the client-bar card (pre-existing; NOT caused by M68)

**Severity: MINOR visual. Out of M68's two-file scope; recorded so it is not lost
and not mistaken for a regression from this slice.**

Observed while inspecting the HR16 mounted-proof screenshot
(`tmp/coach-thread-hydration/m68-thread-hydration-390x844.png`, 390x844 @3x): the
floating mobile command strip (hamburger and close buttons) sits on top of the
`client-bar` card, and the client-name text is clipped behind it. The intent bar
and the transcript are unaffected — this is the top-of-surface region, not the
region M68 changed.

Independence from M68: the condition is present in the screenshot taken *with* the
M68 fix and the HR16 fix applied, and the M68 `@matrix` gate passes at all 20
viewports including P2 390x844. M68's own measurements put the intent bar and
transcript entirely inside `.chat-panel` with zero escapees, so the overlap is in
a different element pair (`client-bar` vs the floating strip). The existing matrix
`clipped` check covers whether a control escapes the *viewport*, not whether two
elements overlap each other, which is why neither M68 nor the pre-existing suite
caught it.

Not fixed here: plan 68 scopes this slice to two files and forbids expanding scope
without a measured independent amendment. Recording it as the measured input such
an amendment would need.

### Requirement note for whoever takes M68-F3

The natural home is the same mobile geometry gate: add a pairwise overlap
assertion between `.client-bar` and the floating mobile command strip at phone
widths. Do not fold it into M68's commit after the fact.

### M68-F2 — message-row text containment is NOT proven by this slice

**CLOSED by HR16** (see "HR16 repair" below): a routed thread now hydrates and
renders real message rows, so the containment assertions run against them. What
follows is the original limitation, preserved as the state at M68's exit.

The `@matrix` geometry assertions cover the real rendered stream copy, which on
this route is the empty state ("Talk to Swan Coach", the example line, the
"Nothing saves until you confirm." chip). They do **not** cover persisted message
rows, because M68-F1 means no message row can mount. This is stated in a comment
in the spec itself so a future reader cannot mistake the assertion for more than
it is. It is closed only by fixing M68-F1 and then asserting against real rows.

### HR16 repair — 2026-09-13

Committed `2aeb2783e`. `CoachCommandCenter.controllerEffects.ts` now releases the
routed-thread latch when the guarded load resolves `null` (meaning it never took
effect) and caps attempts at `ROUTED_THREAD_LOAD_ATTEMPT_LIMIT` (3) per routed
thread id so it cannot loop. Publication and authorization guards are untouched.

- Unit RED `expected 'none' to be '301'` → GREEN 2/2 (root independently re-ran: 2/2)
- Browser RED `Timeout 20000ms exceeded … Received: 0` → GREEN `1 passed (2.6s)`
- Mounted proof: `.transcript-stream` children **1 → 3**, `emptyState` **true →
  false**, `DETAIL-FETCH CALLS` **none → exactly one**, rows render as
  "You · Log my bench session." and "Swan Coach · Draft ready. Confirm to save."
- `coach-mobile` suite still `3 passed (1.5m)`
- Screenshot inspected (`tmp/coach-thread-hydration/m68-thread-hydration-390x844.png`):
  both bubbles render, no empty state — and it is what surfaced M68-F3 above.

**What is still owed for HR16:** whether the shipped production build was ever
affected. StrictMode's double-invoke is development-only, so the abort path proven
here is the dev server; the latch defect it exposes is environment-independent,
but no `npm run build`/preview run was performed. Do not describe HR16 as a
production incident without that evidence.

## Commands and results

| Command | Result |
|---|---|
| `npx playwright test --config playwright.coach-mobile.config.ts --project "Responsive matrix Chromium"` (pre-fix) | FAIL — 88 geometry failures / 20 viewports |
| same, post-fix | PASS — 40.4s |
| `… --project "XR Chromium" --project "iPhone XR WebKit"` | PASS — 2.2s / 4.1s |
| `npx vitest run src/components/DashBoard/Pages/coach-assistant src/components/CoachIntentBar` | **191 files / 1111 tests passed, exit 0** — SUPERSEDED, see "Stale evidence" below |
| `npm run type-check` | **exit 0** |
| `npm run build` (production Vite) | **exit 0**, built in 22.44s; `CoachCommandCenterPage` chunk 239.46 kB / 62.17 kB gzip |

## Stale evidence (rule 56 / hostile round 1, finding 7)

The `191 files / 1111 tests` line above was true when measured and is **no longer
reproducible**, because two other slices began writing into this same worktree
during the review. Re-running the same command now yields
**192 files / 1113 tests, 1 failed / 1112 passed, exit 1** — the failure being a
brand-new untracked RED test from the HR16 slice
(`CoachCommandCenter.controllerEffects.routedThreadHydration.test.tsx`), which is
expected to fail until HR16 lands. A second run additionally showed one
load-induced flake (`CoachCommandCenterVoiceLifecycle.test.tsx`, which passes in
isolation).

Attribution: M68 is causally isolated from that failure. Only
`CoachCommandCenter.bridgeStyles.ts:14` imports the stylesheet this slice changed,
and the failing test's module graph is `useAIChat` + `controllerEffects` with no
CSS import. The green matrix result recorded below was therefore re-verified after
the repair round and still passes (3 projects, 1.2m). Treat the 191/1111 figure as
a point-in-time observation, not a standing baseline.

Tier-A baseline disclosure (rule 56): the two commands above are scoped
coach-surface runs plus the canonical repo type-check. A whole-repo frontend
baseline was not run in this slice and is not claimed clean.

## Process defect found and corrected in this slice

My first edit put a Markdown-style inline-code span (backticks) inside the
styled-components `css` template literal, which terminates the template string
and broke the module at parse time. It was caught by a 240s browser-suite
timeout, not by a fast signal. Two consequences recorded honestly:

1. The verification order was wrong. The cheap deterministic suites (vitest,
   type-check) should run **before** the expensive browser matrix, so a parse
   break fails in seconds instead of after a 4-minute timeout.
2. Do not place backticks in CSS template literals in this codebase. The repo has
   no guard for this class; the vitest suite is the practical detector.

## Hygiene (rule 38)

New artifacts, all confined to the task temp area and none committed:

- `tmp/coach-m68-20260913/capture.mjs` — evidence capture harness
- `tmp/coach-m68-20260913/probe-thread-load.mjs` — M68-F1 diagnostic probe
- `tmp/coach-m68-20260913/m68-{mobile-390x844,mobile-320x568,desktop-1440x900,desktop-3840x2160}.png`
- `tmp/coach-m68-20260913/m68-geometry.json`, `capture.out.json`
- `frontend/coach-m68-{vitest,typecheck,final,xr,green}.log` — run logs, untracked

## Rollback

Revert the two files in this slice. The stylesheet change is three declarations
on one existing rule; the spec change is additive. No storage, schema, route,
env, provider or flag is involved, so rollback carries no migration step.

## Next

1. HR16 (M68-F1) — wire thread hydration so a routed thread actually loads, with
   a browser-level RED that fails on the missing request.
2. Re-assert R68-2 against real message rows once HR16 lands (closes M68-F2).
3. Then the original HR12 queue.

## Hostile review round 1 — 2026-09-13

Independent reviewer, fresh context, no stake in the change. It restored both
slice files byte-identically after its temporary revert (it reports CSS hash
`E4A00E69…E162300D` verified after restore) and deleted its own probe files.

**Verdict: REVISE — no blocker.** The reviewer independently reproduced the
defect and the fix: reverting the CSS makes `@matrix` fail at all 20 viewports
(`chat panel lays its children out as row`, `transcript width 253.125 does not
fill the panel width 372`), and restoring it passes. It confirmed the
hidden-damage premise directly at 320px — transcript `310.9..564` against panel
`15..305`, i.e. 259px outside, while `document.scrollWidth - innerWidth` stayed 0.

| # | Sev | Finding | Disposition |
|---|---|---|---|
| 1 | MINOR | `min-width: 0` is inert; the comment's causal claim was false (forcing `min-width: auto` back leaves every rect identical at 390/1440) | **REPAIRED** — comment rewritten to attribute the fix to `flex-direction: column` and to record that `min-width: 0` is a defensive guard, not the cause |
| 2 | MINOR | Fail-open hole: `streamOverflowX` / `textEscapesStream` are `null` when the stream is absent, and the only backstop was phone-only, so all 8 desktop viewports could pass with no stream at all | **REPAIRED** — added `record(!geometry.streamMounted, 'transcript stream is not mounted')`, fail-closed at every viewport |
| 3 | MINOR | `textEscapesStream` selector set missed `pre`, `td`, `th`, `h1-h6`, which real Coach message rows render | **REPAIRED** — selector widened; comment names the sources (`CoachMarkdownStyles`, `CoachCommandLogEntry`) |
| 4 | MINOR | The 98% width threshold is not width-invariant: in RED at 1440×900 transcript width equals panel width and is merely displaced, so the check does not fire on desktop | **DOCUMENTED** in the spec — direction/escape assertions carry the desktop case |
| 5 | MINOR | Assertions 6 and 7 cannot detect *this* defect (RED showed stream overflow 0 and no escapes) — not vacuous, just non-discriminating | **DOCUMENTED** in the spec; the reviewer proved they can fire with an injected `nowrap` table (scrollWidth 1238 vs clientWidth 346) |
| 6 | MINOR | `previousElementSibling` is positional coupling and would silently test the wrong node if an element were inserted between the bar and the transcript | **REPAIRED** — added `intentBarIsIntentBar`, asserting the sibling contains `[data-testid="lane-input"]` |
| 7 | MINOR | The doc's green totals became unreproducible mid-review because another slice went live in this worktree | **REPAIRED** — "Stale evidence" section above |
| 8 | MINOR | `flex-direction: column` on `.chat-transcript` duplicates `bridgeDockStyles.ts:12` verbatim | **RETAINED deliberately** — plan 68 scopes the change to "the existing chat panel/transcript"; the duplicate is an inert guard, recorded here rather than silently dropped |

### Can-fail proof for the two new fail-closed assertions

Finding 2's repair was itself proven capable of failing. Temporarily replacing the
`[data-testid="lane-input"]` and `.transcript-stream` lookups with non-existent
probes made the suite FAIL at every viewport with exactly:

```
P1 XR 414x896@2: transcript stream is not mounted
P1 XR 414x896@2: the element above the transcript is not the intent bar
P2 390x844@3: transcript stream is not mounted
P2 390x844@3: the element above the transcript is not the intent bar
…
```

The probes were then reverted and the file confirmed free of residue
(`grep canfail-probe` → no matches).

### Post-repair verification

```
3 passed (1.2m)
  ok 1 [XR Chromium]        @xr     2.4s
  ok 2 [iPhone XR WebKit]   @xr     4.6s
  ok 3 [Responsive matrix]  @matrix 1.0m
```

### Reviewer's explicit non-findings (its search was wide)

`min-width: 0` breaks no child at 320/375/390/414 (ratio 1.0, stream overflow 0,
escapees `[]`, docOverflow 0); `.transcript-top` has no producer anywhere in
`frontend/src`; cascade and specificity are clean (only
`bridgeStyles.ts:14` imports the stylesheet, nothing else styles `.chat-panel`,
`.tab-content` was already column); no other test asserts the old one-line form;
the spec's HR16 honesty comment was independently confirmed true by request
logging; and the 320px lane-bar 2px internal overflow matches this doc's own
disclosure.

### Reviewer's UNVERIFIED (accepted as-is)

The exact RED count of "88" was not recounted (every viewport was confirmed to
fail, not the total); message-row containment remains untestable on this route;
and no second root cause was found at ≥1280px (grid path measures ratio 1.0).
