# GPT-5.6 Terra Pro - Review

**Reviewer:** `openai/gpt-5.6-terra-pro` (high)
**Document:** C:\tmp\BOOTCAMP-V2-EXECUTION-PANEL-2026-08-01.md
**Seed:** (none)
**Prompt SHA-256:** `26fa9bb6af72f87b514a033ebed2dc0189f567b645814ca0ec3fc8493a31dd5f`
**Tokens:** 44190 in / 35722 out | **Cost:** ~$0.6463 | **Wall:** 155.0s | **finish_reason:** stop

---

# Decision Memo — SwanStudios Bootcamp Creator V2

## One-line verdict

**The product direction is sound, but the current slice order is not release-safe: ship a complete operator core—Build, Preflight, and a minimal but real Runner—before AI ranking, swaps, attendance, offline pre-cache, or phone mirroring.**

The existing Slice 0 and Slice 1 work is useful foundation, but it is not yet a releaseable product because there is no visible V2 workflow and no proven runtime loop. Treat those local commits as untrusted until they pass integration, adapter, authorization, and production-shaped runtime tests.

---

## 1. The five highest-risk real-gym failure modes

| Risk | Why it makes the product unusable | Required mitigation |
|---|---|---|
| **1. Timer drift, resume failure, or transition failure during class** | A trainer cannot stop class to repair a timer. A relative countdown tied to render frequency will drift under throttling, backgrounding, or TV display changes. | Headless Runner owns timing. Active segments use `segmentEndsAt` as an absolute epoch. Rendering derives remaining time from `Date.now()`. Persist checkpoints after every meaningful transition. Test throttle, sleep/wake, reload, clock jumps, and loss of network/authentication. |
| **2. V2 makes an illegal or impractical class because adapters, AI, or relaxation rules are wrong** | Equipment, capacity, medical constraints, and station feasibility are safety constraints, not recommendation preferences. | Deterministic validator is authoritative. Hard constraints never relax. AI may only rank already legal candidates. All relaxation is explicit, structured, and visible. Retain server-side S0 ownership checks. |
| **3. The new UI regresses existing manual/hybrid/custom workflows** | Current users already rely on manual edits, custom stations, class styles, PDFs, Floor/Demo, Mark as Taught, and history. A visually better page that removes these is a regression. | Use a compatibility adapter and feature flag inside the existing `BootcampBuilderPage`. Preserve old actions while V2 equivalents are incomplete. Do not create a second product at `/bootcamp-builder`. |
| **4. Audience mode is unreadable or exposes the wrong data** | The TV is the participant interface. If it resembles a dashboard, hides modifications, requires scrolling, or shows participant/pain identity data, the product fails its central purpose. | Dedicated audience renderer with no operator controls, no PII, no aggregate pain counts, and no scroll. Validate physical 4K display legibility at target distance—not just browser screenshots. |
| **5. “Offline readiness” or console-to-TV sync is promised beyond what the architecture can deliver** | A browser cannot reliably guarantee fullscreen, wake lock, audio, media, service-worker storage, and cross-device synchronization in every environment. Pretending otherwise causes live failures. | Make the laptop + externally displayed same-browser audience window the R1 topology. Treat fullscreen, wake lock, audio, and media as progressive enhancements with visible recovery. Do not promise independent-device TV sync or offline media caching until pairing, cache, quota, and recovery behavior are implemented and tested. |

---

## 2. Requirements that need challenge or explicit resolution

### A. “Show all active stations” conflicts with “at most four station cards visible”

The current product supports custom station structures. If a class can have more than four simultaneous stations, these requirements cannot both be true:

- all active stations must be visible; and
- no more than four station cards may be visible.

**Recommended R1 decision:** V2 Runner supports **one to four simultaneous active stations**. A plan with more than four simultaneous stations is marked “not V2 Runner eligible” in Preflight and can remain runnable through the existing legacy Floor/Demo experience until a defined wave/grouping model exists.

Do not silently hide stations, paginate live stations, or make participants scroll.

**Sean decision required:** Is the intended long-term behavior for more than four stations:
1. disallow them,
2. organize them into timed waves, or
3. use a different audience display model?

### B. “Fixed wall-clock end time” conflicts with unrestricted Pause

If Pause freezes segment timing, the actual end time moves. If it does not freeze timing, Pause is not a real pause.

**Recommended behavior:**

- Display both **Planned End** and, when relevant, **Projected End**.
- Normal active timing is absolute-deadline based.
- Pause preserves remaining segment time and changes projected end.
- After a pause, console offers an explicit trainer choice: “continue with schedule slip” or “recover time in next transition,” never silently compressing work.
- The original planned end remains visible for operational awareness.

**Sean decision required:** Should the product ever automatically compress transitions to recover schedule, or must that always be an explicit trainer action?

### C. Long-press emergency swap is not sufficient accessibility

Long-press is unsuitable as the only emergency interaction for keyboard users, some touch users, and assistive technology users.

**Recommended rule:** Keep long-press as an optional shortcut, but provide an explicit, confirmable **“Apply now” emergency action** with an accessible label, confirmation, and audit event. Default swaps remain next-round-boundary only.

### D. “One gesture Start” is correct, but browser capability acquisition cannot be guaranteed

Fullscreen, wake lock, audio-context resume, and media playback must all be requested inside the Start click/tap handler. However, browser/device policy can still deny some requests.

**Do not block class start for optional platform failures.**

- Hard blockers: invalid plan, unsafe capacity, missing required constraints, no valid timeline.
- Start warnings: fullscreen unavailable, wake lock unavailable, audio unavailable, preview media unavailable.
- The class may start with visible degraded status and recovery actions.

### E. 320px proof and TV audience legibility are different product surfaces

A four-station audience board cannot be participant-legible at 320px. The requirement should not force an unusable fake mobile TV view.

**Recommended rule:**

- Build and Console: responsive and usable at 320px.
- Audience display: supported at a documented minimum viewport suitable for the active station count; below that, show a clear “Audience display requires larger screen” state rather than a compressed unreadable board.
- Phone Floor Card is the intentional small-screen companion and belongs in Slice 10.

---

## 3. Visual/UX directions

All directions use the Crystalline Swan system only: dark Obsidian/Carbon/Graphite surfaces; Ice Wing for active state; Gilded Fern for attention/earned state; Wing Purple only for AI provenance; Arctic Cyan only for data; Frost White type. No legacy Galaxy-Swan cyan/purple treatment.

### Direction A — Quiet Command Deck *(recommended)*

A restrained, low-motion operator console. The product feels like reliable studio equipment, not a productivity dashboard.

| Area | Direction |
|---|---|
| **Information hierarchy** | Build: class intent and “Prepare Class” first; generated plan second; constraints/facts third. Preflight: hard blockers first, then readiness warnings, then final Start. Run: phase clock, current instruction, next transition, fixed/planned end, then bounded controls. |
| **Desktop/QHD composition** | Build uses a stable three-zone layout: intent rail, central plan canvas, evidence/constraint rail. Preflight uses a single dominant readiness canvas with a small immutable plan summary. Run uses a full-width clock and instruction field, with controls anchored at bottom. |
| **4K TV composition** | Audience uses large 2×2 station grid for 1–4 stations. Each card contains station name, movement, work instruction, modification cue, and concise “next” signal. Warmup, cooldown, full-group, and finisher use a single hero card. |
| **Mobile behavior** | Build becomes a single-column sequence: intent → plan → facts. Preflight remains a single checklist. Console reduces to phase, clock, status, Pause/Advance; station detail opens as a full-screen sheet. No nested scroll. |
| **Scroll ownership** | One document/main-canvas scroll owner in Build and Preflight. Runner has no scroll in normal operation. Station detail is modal/sheet, not an independently scrolling dashboard region. |
| **Signature visual decision** | A persistent “class truth strip”: duration, people, stations, equipment state, and constraint status shown as text-plus-icon facts, not decorative pills. |
| **Accessibility/reduced motion** | No animation is needed to understand state. Phase transitions use immediate state change plus optional short fade; reduced-motion removes fades/countdown transitions. Full keyboard focus order follows operational order. |
| **Why it could be wrong** | It may feel too restrained if Sean expects a more expressive, premium “showpiece” product. It prioritizes speed and trust over spectacle. |

### Direction B — Timeline Studio

A more editorial planning workspace centered around temporal composition.

| Area | Direction |
|---|---|
| **Information hierarchy** | Timeline and class pacing dominate. Intent config is above or beside the timeline. Constraints, equipment, and facts appear as contextual annotations. |
| **Desktop/QHD composition** | Horizontal timeline as the main center surface; build settings in left rail; inspector/details in right rail. |
| **4K TV composition** | The audience still uses a station board, but current and next phase are represented by a restrained progress ribbon. |
| **Mobile behavior** | Timeline becomes a vertically stacked agenda; horizontal timeline manipulation is avoided on narrow screens. |
| **Scroll ownership** | Build has one vertical owner; the timeline may horizontally pan only if it is not independently scrollable with a mouse wheel. |
| **Signature visual decision** | Class rhythm is visible as a sequence of calm duration blocks: warmup, circuit rounds, transitions, full-group block, cooldown. |
| **Accessibility/reduced motion** | Timeline has textual equivalent agenda; no motion is required to convey progress. Keyboard controls move segment focus and announce timing. |
| **Why it could be wrong** | It risks becoming a planning tool for the trainer rather than an operating tool for the gym. It also invites drag/drop complexity, which is unsafe unless semantic editing and validation are very mature. |

### Direction C — Broadcast Stage Manager

A strong “show control” model that treats class delivery as a live production.

| Area | Direction |
|---|---|
| **Information hierarchy** | Run state is dominant even during Build. Build and Preflight feel like preparation for a broadcast. Current/next/audience state are always visible. |
| **Desktop/QHD composition** | Large live-preview panel, smaller plan editor, operational cue rail. The audience preview is continuously visible. |
| **4K TV composition** | Strong visual hierarchy: giant phase clock, very large current movement names in early rounds, pacing/rep emphasis in later rounds. |
| **Mobile behavior** | Mobile acts as compact control monitor, not authoring canvas: phase, clock, status, Pause, Advance, and modification lookup. |
| **Scroll ownership** | No scroll in Run; Build uses a central scroll owner with pinned preview. |
| **Signature visual decision** | Audience preview always visible in the operator console, making trainer-to-TV handoff visually explicit. |
| **Accessibility/reduced motion** | Preview must not be the sole source of information; all status exists in text. Reduced motion eliminates broadcast-style transitions. |
| **Why it could be wrong** | It can over-emphasize “production” and make ordinary class planning feel intimidating or busy at 6:00 AM. It is also more expensive to implement correctly. |

### Recommendation: choose Direction A, Quiet Command Deck

It best serves the actual operator:

- It is calm under time pressure.
- It makes hard facts and safety constraints easy to inspect.
- It does not depend on animation, large preview surfaces, or complex drag behavior.
- It scales cleanly from laptop planning to 4K audience mode.
- It supports the three-mode workflow without making every mode look like a different application.

Direction B is useful as a secondary planning affordance later—specifically as a read-only pacing visualization—not as the primary interaction model. Direction C is viable only after the Runner is proven and the team has actual trainer feedback about live-console needs.

---

## 4. Corrected dependency plan

## Prerequisite: merge and verify Slice 0 and Slice 1

Before any new visible work:

1. Rebase the local Slice 0 and Slice 1 commits against current `origin/main`.
2. Run schema validation, adapter tests, deterministic generation tests, and existing API integration tests.
3. Confirm generated plans from existing production-equivalent fixtures still preserve:
   - manual, hybrid, generated workflows;
   - all supported class styles;
   - four default and custom station structures;
   - equipment-aware generation;
   - low-impact/joint-friendly behavior;
   - media, PDF, history, and Mark as Taught paths.
4. Do not release these commits alone. They are infrastructure, not a visible product increment.

## Reordered slices

| Phase | Scope | Depends on | Release role |
|---|---|---|---|
| **0. Compatibility foundation** | Slice 0 + Slice 1 verification, schema/versioning, adapters, fixture corpus, route feature flag | Existing production | Required |
| **1. Constraint truth** | Slice 2: relaxation ladder, insufficiency behavior, structured fact chips | 0 | Required |
| **2. Timing truth** | Slice 3: day-aware finishers, full-group distribution, pacing semantics, timeline validation | 0–1 | Required |
| **3. Visible Build + Preflight** | New V2 Build and Preflight surfaces, preservation adapters, readiness model, no decorative shell | 0–2 | Required |
| **4. Runner core** | Slice 5: headless Runner, immutable class-start snapshot, checkpointing, same-browser audience transport | 0–3 | Required |
| **5. Audience renderer** | Slice 6: all audience states, TV legibility, no-PII contract | 4 | Required |
| **6. R1 release** | Operator Core: Build → Preflight → Run | 0–5 | First production release |
| **7. Safe live adaptation** | Slice 7: modifications first, intelligent swaps, frozen snapshot candidate validation | 4–6; deterministic candidate ranking | R2 |
| **8. Progress and accountability** | Slice 8: attendance, guest/walk-in flow, idempotent workout/progress logs, audit trail | 4–7 | R2 |
| **9a. Readiness/degradation improvements** | Split from Slice 9: media manifest, readiness classification, visible degradation ladder | 3–6 | R1 minimum / R2 completion |
| **9b. Offline pre-cache** | Service-worker cache policy, media cache lifecycle, quota/eviction, offline verification | 9a | R3, not R1 blocker |
| **10. Selection intelligence** | Slice 4: deterministic ranking first; optional Swan Coach AI ranking second | 0–3; judgment suite | R3 |
| **11. Phone companion** | Slice 10: read-mostly Floor Card and bounded commands | Stable Runner/session protocol | R3 |

### Why Slice 4 must move later

AI ranking is not on the critical path to a trustworthy class operation. The system must first prove:

- its legal candidate set;
- its constraint relaxation semantics;
- its station/timeline behavior;
- its deterministic fallback;
- its auditability.

Implement a deterministic ranking baseline before introducing an LLM. The LLM should be an optional ranker over a legal candidate list, with deterministic fallback and identical safety behavior if unavailable.

### Why Slice 9 must split

“Offline pre-cache” is materially different from “a class survives network loss after start.”

R1 needs:

- immutable local run snapshot;
- local checkpoints;
- locally available timing;
- graceful missing-media fallback;
- no dependency on API availability once class begins.

R1 does **not** need:

- blanket service-worker caching;
- caching private API responses;
- caching authenticated media without security and licensing review;
- cross-device offline synchronization.

---

## 5. Smallest coherent visible production release: **V2 Operator Core**

This is the smallest release that visibly replaces the old builder experience for eligible classes without shipping a cosmetic redesign or half-wired Runner.

### Included in V2 Operator Core

1. **A real V2 Build mode**
   - Intent configuration.
   - Existing manual, hybrid, and generated workflows preserved.
   - Generated plan shown as a legible class structure, not a raw form.
   - Structured facts show equipment, capacity, day type, constraints, and any relaxation.
   - Existing PDF, media preview, CoachDock, history, and Mark as Taught remain available or are explicitly linked to existing implementation while equivalents are not yet migrated.

2. **A real Preflight mode**
   - Hard blockers: invalid plan, illegal capacity, unavailable required equipment, no valid timeline, unsupported V2 Runner topology.
   - Warnings: missing preview media, no wake lock, fullscreen unavailable, audio unavailable, offline cache unavailable.
   - Explicit class-start snapshot summary.
   - Start button is available only when hard blockers are resolved.

3. **A real Runner**
   - Absolute-deadline clock.
   - Pause, resume, advance, and bounded recovery behavior.
   - Local checkpointing.
   - Resume after refresh/network loss/auth expiry.
   - One-gesture attempt to acquire fullscreen, wake lock, audio context, and initial media.
   - Visual degraded-status reporting if any acquisition fails.

4. **A real TV/audience view**
   - Lobby, Warmup, Circuit Work, Transition, Rest, Full-Group/Finisher, Cooldown, Complete.
   - 1–4 station board only in R1.
   - Participant-safe modifications.
   - No participant identity or aggregate pain disclosure.
   - Same-browser projected display/window as the supported R1 transport.

5. **Minimum resilience and media degradation**
   - Runner always has text instructions and timing.
   - If media is unavailable, use static image if cached/available; otherwise text/form cue fallback.
   - Never fail the class because media preview or playback failed.

### Explicitly excluded from R1

- AI-assisted selection/ranking.
- Intelligent station swap.
- New attendance/progress system.
- Guest/walk-in data model.
- Cross-device TV pairing.
- Offline pre-cache guarantees.
- Phone Floor Card.
- More than four simultaneous audience stations.

This is still a full workflow, not a shell: generate or manually prepare a class, validate it, run it, and show participants what to do.

---

## 6. Constraint and generation implementation rules

### Hard constraints: never relax

Examples include:

- S0 equipment/space-profile ownership authorization;
- equipment count/capacity feasibility;
- explicit safety exclusions;
- incompatible station topology;
- required participant-count limits;
- malformed or incomplete class timeline.

If no valid class exists, return a structured insufficiency result. Do not “helpfully” produce a weak plan.

### Soft constraints: may relax only through declared ladder steps

Examples may include:

- anti-repeat preference;
- preferred exercise variation;
- desired novelty;
- secondary-muscle preference;
- ideal equipment match in explicitly declared Open Gym mode.

Each relaxation needs a structured fact, for example:

```ts
type ConstraintFact =
  | { kind: "satisfied"; code: string; label: string }
  | { kind: "relaxed"; code: string; label: string; reason: string }
  | { kind: "assumption"; code: string; label: string }
  | { kind: "blocked"; code: string; label: string; resolution: string };
```

The UI should render facts as concise, inspectable chips or rows. Do not use AI prose to obscure the reason.

### Open Gym rule

Open Gym must require an explicit user-selected assumption state, such as:

- “Inventory not verified; use common-equipment assumptions.”

It must never appear as verified equipment. Generated plans must carry an assumption fact into Preflight and into the immutable run snapshot.

### AI rule

The deterministic layer produces:

1. legal candidates;
2. reason codes;
3. deterministic baseline ranking;
4. fallback result.

AI may rank or explain that legal candidate set. It may not:

- introduce exercises not in the legal set;
- alter capacity;
- change exclusions;
- infer inventory;
- receive PII or participant identity;
- bypass insufficient-result behavior.

---

## 7. State model and implementation guidance

Use distinct state objects. Do not let UI component state become the source of operational truth.

```ts
type PlanDraft = { /* mutable Build state */ };

type ValidatedClassPlan = {
  schemaVersion: number;
  timeline: TimelineSegment[];
  stations: Station[];
  facts: ConstraintFact[];
  validation: ValidationResult;
};

type RunConstraintSnapshot = {
  classPlanId: string;
  planRevision: string;
  frozenAt: string;
  equipmentSnapshot: EquipmentSnapshot;
  capacitySnapshot: CapacitySnapshot;
  legalSwapUniverse?: LegalSwapUniverse;
};

type RunSession = {
  sessionId: string;
  snapshot: RunConstraintSnapshot;
  status: "lobby" | "running" | "paused" | "complete";
  segmentIndex: number;
  roundIndex?: number;
  segmentEndsAt?: number;
  pausedRemainingMs?: number;
  plannedEndAt: number;
  projectedEndAt: number;
  eventSequence: number;
};
```

### Runner rules

- `segmentEndsAt` is the active timing truth.
- The UI derives remaining time from the current clock; it never decrements a counter as truth.
- Rendering may update less often under throttle without changing time truth.
- Persist checkpoint after start, pause, resume, advance, round transition, swap/modification event, and complete.
- On restore, reconcile the saved checkpoint against current epoch time.
- Detect extreme device-clock changes and show an operator-visible recovery prompt rather than silently producing nonsense timing.
- The audience is a projection of `RunSession`; it does not own independent class state.
- R1 transport should use same-origin same-browser window communication, such as `BroadcastChannel` with a compatible fallback. Cross-device transport is a separate future capability.

### Suggested module boundaries

Keep each file below the required 300 lines through actual responsibilities:

- `domain/classPlan/*`
- `domain/constraints/*`
- `domain/timeline/*`
- `adapters/legacyBootcamp/*`
- `application/generate/*`
- `application/preflight/*`
- `runner/core/*`
- `runner/checkpoint/*`
- `runner/audienceTransport/*`
- `ui/bootcamp/build/*`
- `ui/bootcamp/preflight/*`
- `ui/bootcamp/run/*`
- `ui/bootcamp/audience/*`
- `ui/bootcamp/shared/*`

Use styled-components and shared design tokens. Do not introduce a second styling system.

---

## 8. Migration and API compatibility rules

### Route compatibility

- `/dashboard/admin/bootcamp` and `/dashboard/trainer/bootcamp` remain canonical.
- `/bootcamp-builder` remains an alias to the same `BootcampBuilderPage`.
- V2 is selected by a feature flag or capability condition **inside the same page**, not a competing route implementation.
- No route should have separate business rules.

### Data compatibility

1. Add `schemaVersion` to V2 class-plan payloads.
2. Use additive storage and dual-read support during migration.
3. Preserve original legacy representation until all supported readers can consume V2 plans.
4. Never destructively rewrite old plans in place during read.
5. Adapter conversion must be deterministic and fixture-tested.
6. If a V2 plan cannot safely project to the legacy model, preserve the V2 canonical payload and show a controlled legacy compatibility state; do not silently discard V2 fields.

### API compatibility

- Do not change the existing `/api/bootcamp/generate` response contract in place for existing callers.
- Add V2 response data through explicit version negotiation or an explicitly versioned endpoint, according to repository conventions.
- Keep existing `/api/exercises/library` contract stable.
- Preserve server-side S0 authorization checks regardless of what the client passes.
- All server-generated plans must validate again server-side before persistence.
- New run-session, event, attendance, and progress APIs must use idempotency keys and server-side deduplication.
- Audit event identity should be stable, for example `(sessionId, eventId)` or equivalent immutable event key.
- The server must revalidate swap events against the frozen snapshot. Client-side “prevalidated” does not mean trusted.

### TV and privacy compatibility

- Audience payload is deliberately smaller than console payload.
- Exclude participant identity, attendance identity, notes, medical detail, and pain aggregate counts from audience transport by type design—not just UI convention.
- Add a contract test asserting forbidden fields cannot serialize into audience payloads.

---

## 9. Existing capability at highest regression risk

### Highest risk: S0 equipment and space-profile ownership authorization

Generation changes are underway, and V2 adds new plan/snapshot flows. This makes it easy to accidentally shift authorization into the client or lose it through an adapter.

### Exact preservation test required

Create a server integration test using fixture identities and fixture equipment/space profiles:

1. User/tenant A owns equipment profile A and space profile A.
2. User/tenant B owns equipment profile B and space profile B.
3. Request generation as A with A’s profiles:
   - expect success;
   - expect generated plan references only authorized profile context.
4. Request generation as A with B’s equipment profile:
   - expect existing authorization failure status;
   - expect no plan persisted;
   - expect no fallback to Open Gym unless Open Gym was explicitly requested.
5. Request generation as A with B’s space profile:
   - same failure and no persistence expectations.
6. Repeat through the V2 request path and through the legacy-compatible request path.

This test belongs in required release CI, not only in a local fixture suite.

### Additional preservation matrix

Before V2 exposure, run E2E coverage for:

- manual plan creation and editing;
- hybrid generation and editing;
- generated class creation;
- each supported style family;
- default four-station and supported custom station layouts;
- low-impact/joint-friendly generation;
- equipment-aware generation;
- media preview;
- PDF export;
- Floor/Demo access;
- Mark as Taught;
- class history;
- CoachDock;
- pain-aware gating.

---

## 10. Test strategy

### Domain and generator tests

- Schema parse/serialize round trips across all schema versions.
- Legacy-to-V2 and V2-to-legacy adapter fixtures.
- Property-style tests for:
  - no hard constraint violations;
  - capacity is never exceeded;
  - required primary-muscle inclusion behavior;
  - excluded movements never appear;
  - anti-repeat affects rank but not legality;
  - relaxed facts only occur for declared soft constraints;
  - insufficient-result behavior is deterministic.
- Golden fixtures for every supported class style and station topology.

### Runner tests

Use controllable clocks and deterministic fixtures:

- normal phase transitions;
- browser render throttling;
- background/foreground;
- refresh during work;
- refresh during rest;
- sleep/wake;
- network loss after start;
- expired authentication after start;
- unavailable audio;
- denied fullscreen;
- denied wake lock;
- unavailable media;
- device clock movement forward/backward;
- pause/resume projected-end behavior;
- checkpoint restoration;
- console-to-audience synchronization;
- no PII in audience payload.

### UI and accessibility tests

- Keyboard-only Build, Preflight, and Runner operation.
- Focus visibility and focus order.
- 44px minimum actionable targets.
- WCAG 2.2 contrast validation.
- `prefers-reduced-motion` verification.
- Screenshot and interaction coverage at: 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560, 3440, 3840.
- Physical display test at target 4K display and approximate viewing distance. Browser screenshots are necessary but insufficient.

### Production-shaped manual rehearsal

Run at least one complete simulated class using:

- a laptop;
- an external TV/display;
- a degraded network condition;
- a browser denied one optional capability;
- a real operator who did not build the feature.

The acceptance criterion is not “no console errors.” It is “the trainer can continue conducting class without engineering intervention.”

---

## 11. Production rollout gates

### Gate 1 — Engineering readiness

Required before staging:

- Slice 0/1 rebased and passing.
- Schema and adapter contract tests passing.
- S0 authorization preservation test passing.
- No hard constraint can be relaxed accidentally.
- Feature flag defaults off.
- No destructive database migration.

### Gate 2 — Staging operational readiness

Required before internal use:

- End-to-end Build → Preflight → Run successful.
- Full class completes through all audience states.
- Refresh and network-loss resume verified.
- Audio/fullscreen/wake-lock degradation shown and recoverable.
- TV payload privacy contract passes.
- Responsive and reduced-motion review complete.

### Gate 3 — Internal gym pilot

Required before general exposure:

- Run several real or realistic classes using the intended laptop-to-TV topology.
- Include generated, manual, and hybrid plans.
- Include equipment-limited and low-impact scenarios.
- Capture errors around timing, audience transport, preflight blockers, and compatibility fallbacks.
- Confirm no trainer needs the old builder to rescue an eligible V2 class.

### Gate 4 — Limited production exposure

- Enable V2 only for selected internal/admin usage through the existing route.
- Preserve immediate fallback to legacy behavior for existing plans and unsupported V2 Runner plans.
- Monitor generation failures, preflight blockers, Runner recovery events, capability-denial rates, and legacy fallback rates.
- Do not remove the legacy path based on adoption alone; remove it only after explicit parity review.

### Gate 5 — General production release

Required:

- No unresolved safety, authorization, timing, or privacy defects.
- V2 supports the intended supported class topology.
- Existing capability matrix passes.
- Rollback requires only feature-flag change, not emergency data migration.
- Operational owner signs off on real-gym rehearsal outcomes.

---

## 12. Decisions requiring Sean’s operational or taste input

These should be decided before implementation hardens behavior:

1. **Maximum simultaneous V2 Runner stations:** Is four a permanent product limit, or must waves support larger custom layouts?
2. **Pause policy:** Can the system offer time recovery, or must schedule changes always remain manual?
3. **V2 eligibility behavior:** Should unsupported legacy plans show “Run in Legacy,” “Convert,” or be blocked until edited?
4. **Open Gym policy:** Who may select it, what exact language is acceptable, and should it require acknowledgement each class?
5. **Hard versus soft constraint catalog:** Which day-type, exercise, equipment, and pacing preferences are legally/safely non-negotiable?
6. **AI posture:** Is Wing Purple AI provenance desired in R2/R3, or should deterministic recommendation remain the default for now?
7. **Cross-device audience requirement:** Is HDMI/external-display same-browser operation sufficient for launch, or is independent-TV-device support a launch requirement?
8. **Attendance and guest handling:** Required fields, retention, correction policy, and who can view/edit attendance history.
9. **Media/offline policy:** Which media may legally be cached, how long, and whether a missing video is ever a class-start blocker.
10. **Visual taste:** Whether the recommended Quiet Command Deck should remain intentionally restrained, or whether a more editorial timeline treatment is desired after operational reliability is proven.

---

## Final implementation recommendation

Build **V2 Operator Core** first: new Build, truthful Preflight, headless Runner, and legible audience view for one to four stations. Preserve all existing workflows behind compatible adapters and retain legacy fallback for unsupported plans.

Do not make AI, phone control, full offline caching, cross-device TV sync, attendance, or intelligent swapping prerequisites for the first release. Those are valuable follow-ons, but making them critical path increases safety, migration, privacy, and runtime risk before the core class operation has been proven.
