---
decision: consult packet for Kimi K3 hostile review — pain chart (BodyMap) upgrade
status: open
supersedes: none
---

# Pain Chart (BodyMap) Upgrade — Kimi K3 Consult Packet — 2026-08-04

Sanitized packet. No secrets, no PII, no exports. All client references are roles/IDs.
Audited against origin/main @ `b17e13d90` (verified worktree; findings below spot-checked by Fable).

## 1. What this surface is

SwanStudios is a production personal-training SaaS (React 18 + styled-components frontend, Node/Express/Sequelize/PostgreSQL backend). The **pain chart** is an interactive front/back human-figure body map where clients and trainers record pain/injury entries (region, side, 1–10 severity, type, description, aggravating/relieving factors). It feeds the "Swan Coach" AI brain: chat context, AI workout-plan generation, bootcamp class generation, client-intelligence risk gates, and trainer dashboards.

Product law: workout-progress-first coaching OS. Trainer-led B2B2C. Pain data is safety-critical: it must constrain generated training plans, and the trainer must stay indispensable (clients get read+do, never decide).

Design law: dark-first, styled-components only, CSS `var(--token, #fallback)` (no raw hex), 44px touch targets, WCAG 4.5:1, Victory charts only, `prefers-reduced-motion` respected. Palette: Midnight Sapphire `#002060`, Ice Wing `#60C0F0` (accents), Arctic Cyan `#50A0F0` (charts/data ONLY), Gilded Fern `#C6A84B` (luxury), Wing Purple `#8B5CF6` (glow/focus), Frost White `#E0ECF4`, Obsidian `#0A0A0F`.

## 2. What exists today (verified)

**Frontend** (`frontend/src/components/BodyMap/`, ~3,790 lines, mounted on admin/trainer/client dashboards + embedded in Biometrics tab and Measurement entry):
- Front+back SVG panels: photorealistic anatomy PNG (`/anatomy/{male|female}-{front|back}.png`) at 0.85 opacity over hand-drawn gender-specific vector outlines; 46 clickable region hotspots with severity-colored ellipses; pinch-zoom 1–5×; muscle/bone label toggle.
- **Gender figures exist** (male/female outlines + PNGs, toolbar toggle, auto-select from profile gender).
- **Photo-as-head exists** (profile photo clipped into an ellipse on the front figure's head, accent ring, decorative/aria-hidden).
- Pain entry slide-out panel (bottom sheet on mobile): region, side w/ mirror-swap, severity slider, type, description, onset date, aggravating/relieving checklists; trainer-only fields (postural syndrome UCS/LCS, AI notes, trainer notes).
- Insight panel: risk badge, 4 metric tiles, safety alerts, severity trend line (Victory), avoid/modify/prep constraint lists, AI "coach context" snippet, active/resolved/all tabs.
- Evidence section: photo/video upload per entry, AI analysis + trainer review gate.

**Backend:**
- `ClientPainEntry` model (table `client_pain_entries`): userId, createdById, bodyRegion (50-value allowlist), side, painLevel 1–10, painType, description, onsetDate, isActive, resolvedAt, aggravatingMovements, relievingFactors, trainerNotes, aiNotes, posturalSyndrome, assessmentFindings JSONB.
- CRUD `/api/pain-entries/:userId` with role gates + active-assignment IDOR checks (404 on cross-user), client-facing field redaction (trainerNotes/aiNotes/posturalSyndrome stripped for clients).
- Swan Coach integration (all shipped): chat context (region/level/type/side/description), de-identified coach context engine (bucketed severity), client-intelligence gates (severity≥7 within 72h → auto-exclude muscles; ≥4 → warnings), fail-closed `pain.status` safety gate (unknown pain blocks plan generation), workout builder muscle-exclusion filter + untagged-exercise fail-safe, bootcamp pain-aware gating (severity≥7 swaps exercises, fail-visible alerts), AI command lane (add/view/resolve/update pain entries with confirmation; client `track_my_pain` self-service).

## 3. Verified defect inventory (hostile-audit output — treat as ground truth)

### A. Identity/figure defects (Sean's stated priority)
- A1. Client-side gender auto-select is DEAD CODE: frontend auth `User` object has no `gender` field, so every client sees the male figure unless they manually toggle. Staff path works (client profile carries gender).
- A2. Wrong-client bleed: when BodyMap is embedded with an explicit `userId` prop (Biometrics tab, Measurements), pain entries load for that client but the head photo + gender come from the *globally selected* client → client A's pain on client B's face/figure.
- A3. Photo-head clip is hardcoded to the vector outline's head (cx=100 cy=24) and identical for both genders; the anatomy PNG renders with `preserveAspectRatio` letterboxing, so the photo can land off the PNG's actual head.
- A4. No separate "body-map head photo" upload exists anywhere — only the main profile photo is reused. (Sean's vision: optional dedicated head photo distinct from main profile photo.)
- A5. Gender is a hard binary male/female; DB `gender` is free-form STRING (prompt layer enumerates Male/Female/Non-binary/Prefer-not-to-say); non-binary values silently render male.
- A6. Static SVG clipPath id duplicates if two BodyMaps mount on one page.

### B. Map interaction/UX defects
- B1. Overlapping hotspots: 44px hit-inflation (r≥22 in a 200×320 viewBox) makes neighbors cover each other — bicep/elbow/forearm, quad/inner-thigh, rear-delt/rotator-cuff are partially unclickable (later array entry wins).
- B2. One shared zoom state drives BOTH front and back panels (pinch one, both zoom).
- B3. `touch-action: none` on mobile — vertical page scroll dies over the figures.
- B4. No zoom affordance/reset button/hint; double-tap-reset undiscoverable.
- B5. Whole map unmounts during every refetch (loading flag) — figure flashes away after each save/resolve.
- B6. Bottom-sheet entry panel: decorative drag handle (no drag-to-dismiss), no `role="dialog"`, no focus trap, no Escape, hidden-but-tabbable 11-field form when closed.
- B7. 46 sequential tab stops on the map, no roving tabindex; anatomical labels aria-hidden (muscles/bones toggle silent for screen readers); labels render ~6.3px (illegible).
- B8. Severity is color-only; moderate `#50A0F0` vs mild `#60C0F0` nearly identical; identical pulse animation for all severities.
- B9. Insight tabs: half-ARIA (no tabpanel/aria-controls/arrow keys). Error text not announced. Evidence section has no loading/empty states, no retry affordances anywhere.
- B10. Raw AI prompt fragment ("Coach context: ...") rendered verbatim to CLIENTS in the insight panel.
- B11. Severity trend line connects UNRELATED body parts (resolved 2/10 ankle + new 8/10 shoulder = "Worsening 2/10 → 8/10"), chart has zero axes/dates.
- B12. Movement guidance is 4 generic regex buckets — every shoulder/arm complaint yields identical "Avoid: Heavy overhead pressing…".
- B13. Token violations: hardcoded hex throughout (`#8B5CF6`, `#C6A84B`, severity scale returns raw hex consumed by 4 files); two theming systems in one folder; 3 files over the repo's 300-line cap (BodyMapSVG 762).

### C. Brain/data-flow defects (verified by execution where marked ✓)
- C1. ✓ Region→muscle ontology covers 16 of 50 intake regions. 34 regions (incl. rotator cuff, biceps, glutes, lower_back_left/right, achilles) map to ZERO muscles → a 9/10 rotator-cuff entry excludes NOTHING from generated plans. Only the generic review-required gate still fires; the muscle-exclusion layer is silently inert, and the trainer explanation still claims "1 muscle group(s) auto-excluded" (false confidence). Bootcamp side fails loud (`unmappedRegion: true`); 1:1 planner side fails silent.
- C2. ✓ `masterPromptBuilder` (workout-generation LLM context) queries ALL pain entries with NO `isActive` filter and labels them `activePainEntries` — 10 resolved entries present as 10 active issues. Also the only reader that forwards `aiNotes` + posturalSyndrome to a prompt.
- C3. ✓ `track_my_pain` (client chat/voice lane) bypasses the region allowlist AND the painLevel validator — any garbage string becomes a DB row; non-numeric level coerces to 1/10 instead of erroring.
- C4. Coach chat context has severity but NO recency: an 8/10 logged this morning and an 8/10 logged 8 months ago (never resolved) render identically. `created_at` is selected then dropped at render.
- C5. No pain trend/delta computation exists anywhere in the backend. The trainer prompt explicitly asks the model to "flag worsening patterns" — data layer never supplies any. 3→5→7 over three weeks produces no alert until 7 is crossed.
- C6. Workout LOGGER is pain-blind: no route reads/writes pain during logging; `WorkoutExercise.painLevel` exists but is hardcoded to 0 on every AI-lane write and never read back; no post-workout pain check-in anywhere. Highest-frequency touchpoint collects nothing.
- C7. NASM corrective chain is disconnected: `PainEntryCorrectiveExercise` junction table (inhibit/lengthen/activate/integrate) exists with ZERO runtime consumers; corrective warmups are driven ONLY by OHSA compensations; `posturalSyndrome` (UCS/LCS) changes prompt text but zero exercises.
- C8. Recency semantics contradict: auto-exclusion keys on `createdAt` (72h) while staleness keys on `updatedAt` — a trainer re-confirming a 9/10 today clears staleness but does NOT restore exclusion.
- C9. Health-data encryption config for pain names two nonexistent columns (`notes`, `severity_notes`) and omits the sensitive real ones (trainerNotes, aiNotes, aggravatingMovements, assessmentFindings).
- C10. `createdById`: model says NOT NULL + onDelete SET NULL (self-contradictory); latest migration relaxed the live column to NULL. Model/migration/DB three-way drift.
- C11. Region allowlist duplicated by hand in two files (currently in sync at 50; both headers claim 48; no test locks them together).
- C12. Admin high-pain-alert query takes a trainerId it never applies — platform-wide scope; safe today (admin-only) but a landmine if opened to trainers.

## 4. Sean's vision asks (the upgrade brief)

1. Male/female figure auto-selected from client profile — FIX the dead client path; handle non-binary/unset gracefully (neutral option?).
2. Head photo on the figure: keep profile-photo default, ADD optional dedicated body-map head photo upload (the main profile photo may be a logo/pet/etc.).
3. Make the chart visually better and more anatomically accurate; premium, not template-y.
4. Hostile review of UI/UX and feature logic; find the gaps he missed.
5. Verify + repair the Swan Coach hive-mind wiring so pain data truthfully flows into: workout plan generation, workout planner, workout logger, chat coaching, and back out to trainer/admin dashboards.
6. Deliverable style: flowchart/mermaid + blueprint + wireframe plan before building.

## 5. Standing constraints (do NOT propose against these)

- Preserve shipped Cortex P0 safety invariants: fail-closed `pain.status` (unknown ≠ no pain), bootcamp pain gating fail-visible semantics, untagged-exercise fail-safe, dispatch eligibility allowlist.
- Trainer indispensability: clients read+do; trainers decide. Client-facing surfaces never expose trainerNotes/aiNotes/posturalSyndrome/assessmentFindings.
- No medical-diagnosis language to clients ("wellness modifications", not treatment). No yoga/meditation vocabulary.
- Zero PII to LLM prompts (IDs/roles only, de-identification stays).
- Victory charts only. styled-components only. No new heavy deps without justification.
- The AI proposal lane must NOT gain pain-write powers (writes stay in the confirmed command lane + deterministic services).

## 6. Your remit (Kimi K3 — hostile product/design reviewer)

You are the hostile second reviewer. Fable (Claude) has its own upgrade plan forming; your job is to find what it and Sean missed and to out-design the current surface. Return:

1. **Hostile findings** — anything wrong/missing in the defect inventory above; rank P0–P3. Attack the feature LOGIC, not just pixels: identity resolution, gender/photo pipeline, severity semantics, trend truthfulness, coach data flow, safety gates.
2. **UI/UX upgrade spec** — concrete, premium, dark-first: figure rendering (PNG vs vector strategy), hotspot interaction model that solves overlap at 44px, severity encoding beyond color, zoom/pan UX, entry-panel flow (mobile bottom sheet + desktop), insight panel information architecture, trend visualization that is truthful per-region, accessibility remediation. Wireframe-level descriptions (ASCII ok).
3. **Feature-logic enhancements** — ranked by client-safety + trainer-coaching value + revenue. Consider: per-region trend/flare-up detection, post-workout pain check-in loop, pain→NASM corrective activation (the dead junction table), recency semantics, neutral/inclusive figure option, dedicated head-photo pipeline, pain-aware plan explanations that never over-claim, trainer alert surfaces.
4. **Coach hive-mind wiring plan** — the minimal set of changes so pain data flows truthfully end-to-end (logger → entries → intelligence → planner/bootcamp/chat → trainer dashboards), preserving §5 invariants.
5. **3 ways the upgraded feature still fails** — adversarial: what breaks it in production, what do users do that we didn't plan for, where does false confidence re-enter.
6. **Build-order recommendation** — independently shippable slices, safety-first ordering.

Be specific enough that a builder can act without asking follow-ups. Do not restate this packet back; spend your tokens on findings and design.
