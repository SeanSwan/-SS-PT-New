# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:\tmp\BOOTCAMP-V2-EXECUTION-PANEL-2026-08-01.md
**Seed:** (none)
**Tokens:** 2167 in / 7996 out | **Cost:** ~$0.1264 | **Wall:** 265.2s | **finish_reason:** stop

---

# Decision Memo — Bootcamp Creator V2 Adversarial Review

**Reviewer role:** Adversarial product architect
**Scope:** Constraint correctness, real-gym failure modes, slice sequencing, portability, offline resilience, minimum viable visible release, Build–Preflight–Run UX

---

## 1. One-line verdict

The architecture is fundamentally sound — deterministic legality core, AI-as-ranker, frozen start snapshot, absolute-deadline clock are the right laws — but the **slice order is inverted**: it front-loads invisible generator/AI work and back-loads everything visible, offline-critical, and schedule-risky, which directly violates Sean's mandate ("visibly replace, not invisible infrastructure") and guarantees a late-integration cliff between Slices 5–9.

---

## 2. Five highest-risk real-gym failure modes

Ordered by probability × blast radius.

**F1. Mid-class acquisition decay (audio/screen/wake-lock dies silently at minute 20–35).**
One-gesture acquisition at Start is correct, but nothing in the spec addresses *decay*: Chrome suspends AudioContexts after tab visibility changes, wake locks drop on screen-off, HDMI TVs sleep on their own timers, and browsers throttle background tabs. The absolute-deadline clock keeps timing *truth*, but a class where the chime stops and the TV goes dark is a failed class even if the math is right. **This is the #1 way the product embarrasses Sean in front of paying clients.**

**F2. Console-to-audience transport is unspecified — and gym Wi-Fi is hostile.**
"The laptop drives the TV" leaves the sync channel undefined. If it depends on LAN WebSocket or cloud relay, captive portals, client isolation, and congested 2.4GHz gym networks will break it. If it's a second browser window over HDMI, the spec should say so, because the failure modes are completely different (window management, display sleep, resolution detection).

**F3. Relaxation ladder order is a product decision masquerading as engineering.**
When the constraint layer can't satisfy day-type + exclusions + equipment + station count × rounds, *which axis relaxes first* determines whether the trainer gets a slightly-repetitive class (acceptable) or a class that silently drops the day's primary muscle group (a programming lie). Shipped wrong, Slice 2 produces classes that are technically valid and pedagogically wrong, with structured chips that honestly announce a bad tradeoff. Alarm fatigue compounds this: if chips appear on >20% of generations, trainers learn to ignore them.

**F4. Preflight theater: a gate that trains users to click through it.**
If Preflight emits warnings that are frequently ignorable (media not cached for an exercise that never comes up, capacity check against a guessed headcount), the gate becomes ceremonial. Worse: if Preflight *requires* network and the gym's internet is down at 5:50 AM, Start Class is blocked by the readiness gate on a plan that was cached last night. The gate itself must be offline-capable and severity-tiered.

**F5. Service worker and auth expiry interacting with a live run.**
Two specific landmines: (a) a SW update with `skipWaiting` + reload behavior can nuke a running class if a new deploy lands mid-session; (b) expired auth mid-class is handled for *continuation* but Slice 8's post-class writes (attendance, log-back) will hit 401s exactly when the trainer is least able to debug them. Queued writes with idempotency keys and visible "pending sync" state are non-optional, not polish.

**Honorable mention (would be #6):** late walk-ins changing participant count after the constraint snapshot freezes. Capacity validated at preflight against N; N+3 show up; station balance breaks; the swap engine correctly refuses to help because the snapshot is frozen. The spec needs an explicit policy (see §10).

---

## 3–4. Three UX directions for Build → Preflight → Run

### Direction A — "The Rail" (restrained, low-motion) — RECOMMENDED

**Concept:** The class is one timeline object from the first click to Cooldown. Build edits the rail. Preflight annotates the rail. Run plays the rail. There are no three pages; there are three lenses on one object.

- **Information hierarchy:** Phase (Warmup/Circuit/Finisher/Cooldown) → Segment → Station → Exercise → Modification. The rail is always the skeleton; mode determines zoom level.
- **Desktop/QHD/4K composition:**
  - *Build:* vertical rail on the left third (phases as expandable segments), working area on the right two-thirds showing the selected segment's stations. Fact chips render inline on rail segments, not in a separate "insights" panel.
  - *Preflight:* the same rail with each segment edge-lit by severity (Gilded Fern outline = warning, Ice Wing = pass, red = blocker). A right-hand checklist mirrors the rail; clicking a check scrolls the rail to the affected segment.
  - *Run (console):* rail collapses to a thin horizontal progress strip across the top (current segment highlighted, fixed class end-time at the right terminus). Below: current phase clock dominant, station cards in a ≤4-up grid, bounded Pause/Advance.
  - *Run (audience/TV):* full-bleed phase clock + ≤4 station cards. No rail. The TV never shows UI chrome.
- **Mobile behavior:** rail becomes the whole screen — a vertically scrollable phase list in Build/Preflight; in Run the phone shows the Floor Card (current station, modification, next transition) with no rail at all. Phone never attempts to render the console.
- **Scroll ownership:** Build — the right working area owns scroll; the rail owns its own scroll only if it overflows (and auto-scrolls to the selected segment). Preflight — checklist owns scroll, rail follows programmatically. Run — *nothing scrolls on console or TV*; if content overflows, the layout is wrong, not the scroll behavior.
- **Signature visual decision:** one continuous horizontal progress strip, present in all three modes (full rail in Build, edge-lit rail in Preflight, collapsed strip in Run), gives the trainer a persistent spatial memory of "where in the class" every screen refers to. Midnight Sapphire structural field, Ice Wing on the active segment only.
- **Accessibility/reduced-motion:** reduced-motion mode is the *default* aesthetic — transitions are opacity/duration fades ≤150ms; no spatial animation exists to remove. The rail provides a non-color encoding of progress (segment labels + position) so color is never the sole channel.
- **Why it could be wrong:** the rail metaphor assumes classes are linear. AMRAP/EMOM/Tabata blocks and multi-round circuits are *loops*, and a linear rail represents rounds poorly — round 3 of 4 either clutters the rail or hides. If the round/loop representation is clumsy, trainers lose the "what round am I in" glance, which is one of the five participant questions. Mitigation: rounds are a property *inside* a segment node (badge: "R2/4"), never separate rail nodes.

### Direction B — "Console + Stage" (dual-surface cockpit)

**Concept:** The trainer always sees what the room sees. A persistent picture-in-picture live preview of the TV occupies a corner of every console screen in every mode.

- **Information hierarchy:** Audience view is the ground truth; console controls are annotated *around* it. Hierarchy: Stage preview → current phase → controls → upcoming.
- **Desktop/QHD/4K:** Build — form/generation controls left, stage preview showing a simulated audience render right. Preflight — checklist left, stage preview rendering each check's impact (e.g., failing capacity highlights the affected station card in the preview). Run — stage preview top-right at ~25% of console, controls and station management around it.
- **Mobile:** stage preview is dropped entirely (phone shows Floor Card only). Console-preview parity is desktop-only — this must be stated or someone will try to make it responsive and fail.
- **Scroll ownership:** left control column scrolls; stage preview is fixed and never scrolls.
- **Signature visual decision:** WYSIWYG audience preview with a subtle Gilded Fern frame labeled "ROOM VIEW," making the two-surface mental model explicit instead of implied.
- **Accessibility/reduced-motion:** preview updates are state swaps, not animations; fully compatible. Live region announcements on the console mirror what changed on the stage.
- **Why it could be wrong:** (1) It doubles rendering cost — two live views of Run state, one of which must stay synchronized through network loss and throttling; the preview is a second consumer of the Runner state machine and a new class of desync bugs. (2) It invites the exact "nested-scroll dashboard" failure the brief forbids, because the preview competes for space and pushes controls into scroll regions. (3) In Build and Preflight the preview is mostly decorative — the audience view doesn't exist yet — so it spends premium pixels on a simulation. Highest dev cost of the three.

### Direction C — "The Deck" (station-first spatial metaphor)

**Concept:** Stations are physical cards. Build is dealing and arranging cards on a board. Preflight is cards showing edge validation (green/red edges, shake on error). Run is cards dealt onto the TV, with the active station card raised.

- **Information hierarchy:** Station card is the atom; phase is the table region the cards sit in.
- **Desktop/QHD/4K:** Build — a board with phase regions, drag/drop station cards, Rolodex drawer at bottom. Preflight — same board, cards get edge states, failed cards pulse. Run console — board compacts to active-phase cards only. TV — ≤4 cards dealt large.
- **Mobile:** drag/drop collapses to tap-to-assign; card board becomes a single-column stack. The spatial metaphor survives at 375px only with real effort and is effectively absent at 320px.
- **Scroll ownership:** the board is a pan/zoom surface on desktop — this is a liability; pan surfaces and the "one scroll owner" law are in tension.
- **Signature visual decision:** the card deal — stations animating from console to TV at phase transitions — is the most memorable, most "premium OS" moment of the three directions.
- **Accessibility/reduced-motion:** weakest of the three. Reduced-motion mode must replace the deal, the shake, and the raise with instant state swaps, at which point the direction's entire signature is gone and you're maintaining two products. Drag/drop requires a full keyboard-accessible alternate path (assign-via-menu) that doubles interaction surface area.
- **Why it could be wrong:** spatial metaphors optimize for delight at the expense of 6:00 AM error resistance. Wet hands, one hand, 320px, reduced motion, and keyboard operation all tax this direction simultaneously. It's the best demo and the worst operator surface.

## 5. Recommendation: Direction A (The Rail)

At 6:00 AM the trainer needs *recognition*, not *interpretation*. The Rail wins because:

1. **One mental model, zero relearning between modes.** B forces a dual-surface mental model; C forces a spatial one. A's only concept is "the class, at different zoom."
2. **Reduced-motion is free, not a fallback.** A's aesthetic is already static; C's soul is motion; B's cost is synchronization.
3. **The no-scroll Run law is native to A.** A Run screen built from a collapsed rail + clock + ≤4 cards has nothing to scroll. B and C both have to fight their own metaphors to comply.
4. **Cheapest correct implementation.** One timeline component family reused across three modes; no dual rendering (B); no pan/zoom surface and drag/drop accessibility tax (C). At the 300-line file cap, A composes into clean module boundaries most naturally.

Adopt B's stage preview as a **Run-mode-only, post-MVVR enhancement** if the sync transport proves reliable (§6, transport gate). Do not adopt C.

---

## 6. Attack on the slice plan — reordered, with gates

**Structural problems:**

1. **Slices 2–4 are invisible.** Three consecutive slices of generator/AI work before a single pixel changes. This is the exact "invisible backend infrastructure" outcome Sean mandated against.
2. **Slice 3 must precede Slice 5.** The Runner's segment model *is* the AMRAP/EMOM/Tabata pacing model. Building the Runner first guarantees a segment-model refactor.
3. **Slice 5 before Slice 9 violates the offline law by construction.** A Runner built without checkpointing, media degradation, and SW pinning will be re-architected when Slice 9 lands. Merge their cores.
4. **Slice 4 (Swan Coach) is the highest schedule risk and lowest coupling.** It must never gate the visible release. Anti-repeat and ranking can ship as deterministic heuristics; the LLM layer slots in later behind the same interface.
5. **Slice 7 depends on event logging that lives in Slice 8.** Swap/modification events need the log envelope before the swap UI ships.

**Revised order:**

| Order | Slice | Content | Exit gate |
|---|---|---|---|
| G0 | Gate: Schema freeze | After current Slices 0–1. `ClassPlan.schemaVersion` field added now; round-trip property tests (serialize → migrate → validate) against foreign adapters; **one shared `isLegal(candidate, snapshot)` function** declared the single source of legality for generator, preflight, and swap. | Schema versioned; no further breaking changes without migration. |
| 1 | Old Slice 2 + 3 merged | Relaxation ladder + insufficiency + fact chips + day-aware finishers + interval-block pacing. One slice because both are "the generator's output contract" and both feed the Runner's segment model. | **Golden-fixture gate:** ≥50 recorded production generation requests replayed; legality invariants hold (see §8); relaxation ladder ordering tested per axis with expected-first-relaxation assertions. |
| 2 | **New Slice: The Visible Spine** | New Build UI (Rail, Direction A) wired to *existing* generation endpoints reading ClassPlan; save; Preflight as severity-tiered checklist (blocker/warning/info) rendering on the rail; **no Runner yet**. | Sean can build, generate, and preflight a class on the new surface in staging. This is the anti-"decorative shell" gate: everything on screen is wired. |
| 3 | Old 5 + 9 core merged: **Run Core** | Headless Runner state machine (absolute `segmentEndsAt`), local checkpointing, one-gesture acquisition + **acquisition health monitor**, SW update pinning during active runs, media degradation ladder (video → poster → text cue; synthesized WebAudio chime fallback), offline preflight for cached plans. | **Torture test:** 60-min simulated class with airplane mode at minute 5, token expiry at minute 10, tab backgrounding at minute 15, laptop sleep/wake at minute 30, SW update available at minute 40. Zero timing drift; every degradation visible. |
| 4 | Old Slice 6, split 6a | Audience screens: phase-state-driven skeleton (Lobby/Warmup/Work/Transition/Rest/Finisher/Cooldown/Complete) rendered from Runner state. No polish pass. | **Transport gate (decision required, §10):** same-machine second window via `BroadcastChannel` + localStorage fallback is the default; network sync is a non-goal for MVVR. |
| 5 | Old Slice 7 + event envelope from 8 | Trainer console, intelligent swap (exactly three candidates + demoted Browse-all), frozen snapshot enforcement, swap/modification event log (append-only, idempotent). | Swap candidates validated by the same `isLegal` from G0 — assert in test, not by convention. |
| 6 | Old Slice 10 + 6b | Phone Floor Card + audience polish + responsive proof matrix. | Full width matrix 320→3840; 20-ft legibility sign-off (Sean's eyes, real TV). |
| 7 | Old Slice 8 | Attendance, guest/walk-in, workout/progress log-back with queued, idempotent, failure-visible writes. | Offline-write replay test: queue 20 writes offline, reconnect, assert exactly-once. |
| 8 | Old Slice 4 | Swan Coach ranking layer. Deterministic fallback already shipped (it was the default). No PII egress — enforced by a payload allowlist test, not review. | Judgment regression suite green; Wing Purple provenance appears in UI for the first time. |

Net: 8 gated stages instead of 11 ungated slices; the first *visible* artifact ships at stage 2 instead of stage 6; the offline law is enforced before the Runner exists rather than retrofitted after.

---

## 7. Minimum visibly useful release (MVVR)

**Ship = stages G0 through 4 (Run Core + audience skeleton), plus nothing else.**

In:
- New Rail-based Build surface on `/dashboard/{admin,trainer}/bootcamp` replacing the old builder visually and functionally (existing generation endpoints behind it — the old *backend* is fine, the old *screen* dies).
- Severity-tiered Preflight with equipment capacity, timing, station balance, media cache status — fully functional offline for cached plans.
- Run: absolute-deadline phase clock, ≤4-card audience view on a second window/HDMI, transitions with synthesized audio cues, Pause/Advance, checkpoint resume, acquisition-health indicator.
- Legacy alias `/bootcamp-builder` now redirects to the canonical route. Do not maintain two mounts.

Explicitly out (and visibly absent, not stubbed — no inert controls): Swan Coach ranking, phone Floor Card (phone users get the existing experience), attendance log-back, intelligent swap (pre-start manual edit covers the core need).

**Bar for calling it a release:** one real 45–60 minute class, run by Sean, in the real gym, on the real TV, with airplane mode enabled after Start. If that passes, this is already visibly better than the old builder plus a whiteboard. If anything in MVVR can't pass that test, cut it from MVVR rather than ship it weak.

---

## 8. Highest regression risk + exact preservation test

**Most at risk: equipment-aware generation with S0 ownership gating** — because Slice 1 changed the live generator's contract (day-type integration), and this is the path where a silent regression selects exercises requiring equipment the trainer doesn't own, or a 403 becomes a 200.

**Preservation test (must exist before stage G0 closes):**
A golden-request replay harness:
1. Fixture corpus of ≥50 production-shape generation requests covering every equipment profile, class style (pyramid, superset, ladder, descending, chipper, countdown, density, contrast, partner), joint-friendly/low-impact boards, and custom station structures.
2. Replay through the V2 generator asserting **legality invariants** (not output equality — ranking may legitimately change):
   - every selected exercise's equipment set ⊆ the resolved equipment profile;
   - excluded exercise IDs absent from output;
   - day-type primary-muscle inclusion present unless a recorded, chip-surfaced relaxation occurred;
   - pain-aware modification rules applied per aggregate requirements;
   - requests with a non-owned equipment/space profile return 403 on `/api/bootcamp/generate` (S0 preserved verbatim — replay the actual authorization matrix: owner, non-owner, admin, unauthenticated).
3. Round-trip: every generated plan serializes to ClassPlan, validates, and re-validates identically after a foreign-adapter round trip.

Secondary watch-item: **PDF export and Mark as Taught** against ClassPlan-shaped data (the read-model change is where these break) — one snapshot test each in stage 2.

---

## 9. Implementation guidance (agent-executable)

**Legality core**
- Single exported function `isLegal(candidate, snapshot): LegalResult` where `LegalResult = { ok: true } | { ok: false, violations: Violation[] }`. Generator, preflight checks, and swap candidate filter all import it. Any PR adding a second legality implementation fails review by lint rule if enforceable, by convention otherwise.
- `snapshot` is a frozen value object created at class start: `{ schemaVersion, equipmentProfileId, equipmentSet, spaceProfile, stationCount, stations[], aggregateModificationRequirements, exclusions, seed, participantCount, createdAt }`. Deep-frozen; swaps receive the snapshot, never live profile lookups.

**Relaxation ladder**
- Ordered list of axes, each a named, typed relaxation (e.g., `RELAX_REP_RANGE`, `RELAX_SECONDARY_MUSCLE`, `RELAX_ANTI_REPEAT`, `RELAX_PRIMARY_MUSCLE` — final order is Sean's call, §10). Ladder application is recorded on the plan as structured facts: `{ axis, from, to, reason }[]`. UI chips render from this array; no prose generation anywhere in this path.
- Validator distinguishes `INFEASIBLE` (no plan exists even fully relaxed → hard error with the binding constraint named) from `INSUFFICIENT` (plan exists but relaxed → plan + chips).

**Runner state machine (headless, framework-free module)**
- States: `IDLE → ARMED (acquisitions held) → RUNNING ⇄ PAUSED → BETWEEN_SEGMENTS → COMPLETE → RECOVERING(from checkpoint)`.
- Timing: exactly one clock loop (rAF with setInterval fallback). All positions computed as `now - segmentEndsAt` deltas; **no counter increments anywhere**. Browser throttling may drop renders; it cannot drop time.
- Checkpoint: on every segment boundary and every 5s, write `{ planId, schemaVersion, snapshot, currentSegmentIndex, segmentEndsAt, pausedAccumulatedMs, eventLogTail }` to localStorage (IndexedDB if size demands). Recovery on load offers "Resume class (12:34 remaining in Round 2)" — one tap, no forms.
- Acquisition health: a single visible indicator aggregating {fullscreen, wakeLock, audioContext.state, TV channel alive}. On `visibilitychange`, re-request wake lock automatically. Heartbeat: a near-silent WebAudio buffer every 60s keeps the context warm; if `audioContext.state === 'suspended'` while RUNNING, the indicator goes Gilded Fern and the console shows a one-tap "Restore audio" (requires user gesture by platform law — surface it, don't hide it).
- Service worker: when `runState !== IDLE`, the SW must not `skipWaiting`/reload; gate the update flow on run state and defer to post-class.
- Audience sync (default transport): `BroadcastChannel('swan-run')` publishing `{ state, segmentEndsAt, serverOffsetMs }` at 1Hz plus on-change; audience window is a second tab on the same machine extended via HDMI. Clock skew between windows corrected via the published `segmentEndsAt`, never via message timing.

**Preflight**
- Checks, each `{ id, severity: BLOCKER|WARNING|INFO, evaluate(plan, snapshot, env): CheckResult }`: equipment capacity vs participant count; station balance; total time vs scheduled end; media cache coverage (per degradation tier); audio output available; TV channel alive; offline readiness. BLOCKERs disable Start Class with the fix action named; WARNINGs require one explicit acknowledgment tap (no checkboxes buried in lists); INFO is passive.
- Preflight must run with zero network for any plan whose media is cached.

**Media degradation ladder**
- Per exercise: video → poster frame → text cue (name + tempo + modification). Preflight reports the tier per exercise; Run renders the available tier without layout shift (fixed aspect-ratio media box in all tiers). Synthesized chimes (WebAudio oscillators) are the zero-dependency audio floor.

**Writes (stage 7 groundwork, envelope built in stage 5)**
- All event/attendance/progress writes: `{ idempotencyKey: uuid, planId, occurredAt, payload }` appended to a local outbox first, synced with retry; UI shows "N events pending sync" until acknowledged. Never block Run on writes.

**Styling/architecture constraints**
- styled-components only; enforce 300-line cap via eslint `max-lines` per file — when a component hits the cap, the split is along the rail's natural boundaries (Phase / Segment / StationCard / FactChip / PhaseClock / AcquisitionStatus are already the right modules).
- Token discipline: Arctic Cyan appears only in data visualizations; Wing Purple is *banned from the codebase* until stage 8 (add a lint-adjacent style dictionary test, or it will leak in early and mean nothing later).
- All Run-mode text sized from a `distanceScale` token; TV target: key numerals ≥120px at 4K (validate at 20 ft, not by math alone).

---

## 10. Decisions requiring Sean (labeled — do not let engineering guess these)

1. **Relaxation ladder axis order** (which constraint degrades first). Recommendation: rep ranges → secondary muscle emphasis → anti-repeat → station-count rebalance → primary muscle (never silently). *Sean's coaching judgment owns this.*
2. **TV transport**: same-machine HDMI + BroadcastChannel (recommended, immune to gym Wi-Fi) vs. separate device over network (more flexible, needs the sync layer). This gates stage 4.
3. **Walk-in policy after snapshot freeze**: re-validate capacity only (recommended), never unfreeze legality; and what the TV/console say when capacity is exceeded. Operational call.
4. **Class end-time policy**: hard stop at the fixed wall-clock end (recommended — the spec already promises a fixed end) vs. permitted overrun with visible overrun indicator.
5. **Audio voice/tone** of cues (chime vs. voice; countdown verbosity at transitions). Taste.
6. **Phone Floor Card timing**: confirm it's acceptable that MVVR ships without it (recommended) rather than pulling stage 6 forward.
7. **Old builder retirement**: hard replace on release (recommended) vs. feature-flagged parallel run — and for how long if parallel.
8. **Fact-chip copy tone** for relaxations: clinical ("Primary muscle constraint relaxed: insufficient legal exercises") vs. coached. These chips are the honesty surface; wording is brand.

---

### Assumptions registered

- "Laptop drives TV" was assumed satisfiable by same-machine HDMI; if Sean's real setup is a separate TV stick/browser, the transport gate (§10.2) resolves toward network sync and stage 4 grows.
- Media assets are assumed pre-encodable to poster frames; if the Rolodex media library lacks poster frames, the degradation ladder's middle tier needs a generation job (add to stage 3).
- No PII-to-LLM enforcement is assumed testable via payload allowlist; if the Swan Coach payload is freeform, that's a stage-8 design defect to catch at its own gate, not MVVR's problem.

Repository truth and verified runtime behavior remain authoritative over everything above.
