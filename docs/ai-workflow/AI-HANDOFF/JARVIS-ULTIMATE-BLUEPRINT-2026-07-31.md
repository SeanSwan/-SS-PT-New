---
decision: "ULTIMATE BLUEPRINT (Fable Final Verdict) — Swan Coach Jarvis voice loop + voice-stack collapse + Workout Planner overhaul + 10 planner Lens styles + PLAUD lane. Codex builds BUILDER-SAFE slices; Fable/Opus finishes."
status: open
supersedes: none
---

# JARVIS + PLANNER — ULTIMATE BLUEPRINT (2026-07-31, Fable-locked)

> **Chain:** grounded super prompt (2 repo traces) → AI Village 15-brain ($0.42, 16/18 pass, 40 web
> sources) → Kimi K3 ($0.08 + $0.04) → Opus 5 ($1.03 truncated + $1.54 complete) → **this Fable
> synthesis. Total consult spend ≈ $3.11.** Raw inputs (committed beside this doc):
> `jarvis-coach-planner-superprompt-2026-07-31.md` (ground truth) ·
> `JARVIS-CONSULT-OPUS5-FULL-2026-07-31.md` (**the slice bible — §3-§8 are INCORPORATED as amended by
> §2 below**) · `JARVIS-CONSULT-KIMI-2026-07-31.md` · `JARVIS-VILLAGE-DIGEST-2026-07-31.md`.

## 1. FINAL VERDICT
**LOCKED.** The Opus 5 complete plan (S1–S25) is adopted as the build spine — its §3 cut list, §4
planner spec, §5 lens system, §6 slices/flags, §7 failure modes are binding — **as amended by the
rulings in §2 of this document, which win on any conflict.** Core truths every builder must hold:
- **This is a rewiring, not a build.** The decoder (`parseWorkoutTranscript`) and the talk-back
  (browser TTS + dormant `voiceConfirmationTier`) already exist in production. Six mics become one;
  four parse paths become one; two mappers become one.
- **Truth defects ship FIRST, live, unflagged** (S1–S5). New capability ships DARK behind flags.
- **Voice widens input, never authority.** Cortex gates (409 review, pain exclusions, fail-closed
  eligibility) bind every voice-dispatched action. Nothing ever auto-commits. No client name is ever
  spoken aloud or sent to any TTS provider.
- **Structure before style:** golden snapshots → pure logic → contexts → IA → Rolodex upgrade →
  ONLY THEN the Lens registry, whose default `studio-classic` must render byte-identical to today.

## 2. FABLE RULINGS (amendments that override the inputs)
| # | Topic | Ruling |
|---|---|---|
| A1 | **Signature moment (Kimi d, ACCEPTED — amends Opus S9):** | The VoiceModeOverlay's center object is the **Crystalline Swan orb** — layered clip-path crystal facets, ONE object across all states: idle = slow opacity crossfade shimmer · listening = facets breathe 1.0→1.06 **driven by live mic amplitude** (one rAF writing a CSS custom property, zero React re-renders) · transcribing = facets collapse to a horizontal line · speaking = ±3° facet rotation · barge-in = 150ms snap to listening. All transform/opacity. Reduced-motion = static crystal + state text. A generic waveform is REJECTED. |
| A2 | **Per-field confidence (Kimi e + Opus S8, MERGED):** | One grammar: confident field = default border · low-confidence = `--caution-ember` dotted border + "check this" affordance. Gold NEVER appears on errors/warnings (gold = earned only — Village spec's gold-error mapping is REJECTED). Pain badge uses the caution token, not gold. |
| A3 | **Palette-law corrections to the Village design spec:** | Arctic Cyan is DATA-ONLY — every `--arctic-cyan` glow/focus/checkmark in the Village spec becomes Ice Wing (`--world-accent` seam) or Wing Purple per Dual-Button Glow. All bare-hex blocks are VOID — `var(--token, #fallback)` only. The `no-hardcoded-colors` lint lands as **error**, not warning. The animated border-image "cosmicPulse" is REJECTED (paints, doesn't composite). |
| A4 | **Z-stack + safe-area (Kimi c, ACCEPTED):** | Planner Coach FAB z-60 · VoiceModeOverlay z-90 · ReviewDecodedWorkout sheet z-95 — aligned to the logger shell's existing 70/80/90 scale; the Village's 9000/9999 values are VOID. Focus-restore chain: overlay→sheet→overlay→trigger. Builder content gets `scroll-padding-bottom: calc(FAB + tab bar + safe-area)` so the FAB never occludes the last card's actions. Review-sheet inputs: `min-height: 44px`. |
| A5 | **Style-switcher pagination dots:** | Kimi called `aria-hidden` dots an a11y lie; Opus kept them. RULING: **drop the dots in v1** — scroll-snap + 85%-width cards with next-card peek carries position. Cards `flex: 0 0 85%`, 12px gap. |
| A6 | **Haptics (Kimi e, ACCEPTED):** | `navigator.vibrate?.(10)` on state transitions; double-pulse on commit confirmation. Guarded, no-op where unsupported. Lands in S9/S11. |
| A7 | **World-token tinting:** | Opus §5.4 combine ruling CONFIRMED and extended: new planner surfaces (orb, overlay, review sheet, lens skins) are BORN on `--world-*` tokens with Crystalline fallbacks — the logger's world-seam law (`shell.world-seam.test.ts` pattern) gets a planner sibling in S19 so the "stays blue" bug class can never colonize the new surfaces. |
| A8 | **Digest hygiene (Kimi c-1, ACCEPTED structurally):** | The Village digest contains corrupted chain-of-thought and cross-project contamination. **Codex reads ONLY: this blueprint → the Opus consult doc → the named repo files per slice.** The digest and raw Village outputs are consult archaeology, never builder context. |
| A9 | **Two-phase endpoints:** | Opus self-review #1 CONFIRMED — no new endpoints anywhere in this program. Phase A = existing `/api/ai-chat/transcribe` (+ `strictPiiMiddleware` added to it — closing the gap the voice audit found — FINISHER task inside S7). Phase B = existing parse lane + `transcript` field. |
| A10 | **Sean's standing constraints (binding):** | Exercise Rolodex KEPT (upgraded per S18, never replaced) · Swan Coach is never called "AI" user-facing · trainer indispensability (clients read+do, never decide) · plain speech only, zero command grammar · PLAUD joins the same review surface (S12). |

## 3. CODEX BUILDER EXECUTION CONTRACT (Sean's directive, 2026-07-31)
**Reading order (mandatory, nothing else):** (1) this blueprint end-to-end; (2)
`JARVIS-CONSULT-OPUS5-FULL-2026-07-31.md` §3–§7 for your slice's full spec; (3) the repo files named
in your slice row. Do NOT read the Village digest or raw consult transcripts.

**Slice assignment:**
- **CODEX (BUILDER-SAFE, in order):** S1 → S2 → S3 → S4 → S5 (truth defects + dead code, ship live) ·
  S11 (talk-back wiring; Finisher reviews the tier table) · S13 → S14 (snapshots + pure logic — the
  regression fence) · S17 → S18 (mobile IA + Rolodex upgrade, behind `PLANNER_IA_V2`) · S20 → S21 →
  S22 → S23 → S25 (lenses 2–10, switcher, NBA, plan-vs-actual — after Fable lands S19).
- **FINISHER — Fable/Opus ONLY (do not attempt):** S6, S7, S8, S9, S10 (the voice pipeline + cutover),
  S12 (PLAUD DB-write replacement), S15, S16 (contexts cutover + endpoint selector), S19 (lens
  registry seam), S24 (templates). If your slice's dependencies include a FINISHER slice that hasn't
  landed, STOP and write the breadcrumb — do not improvise the dependency.
- **NEVER TOUCH (any agent):** the byte-pinned `POST /api/workout-forms` body · the 409
  `SWAN_COACH_REVIEW_REQUIRED` ack-retry contract · Cortex gate services · billing/credit code ·
  `package.json` (zero new dependencies) · the M3 anti-jump bans in `runner/**`.

**Per-slice loop (mandatory):** read spec → RED test first (each slice row's acceptance criteria ARE
the tests) → build → run the slice's gates (affected vitest → full `WorkoutLogger/` or planner dir →
tsc real-exit → `npm run build`) → hostile self-review → fix → **commit with explicit paths**
(`type(scope): S<nn> — <summary>` + `Co-Authored-By`) → write the breadcrumb → next slice. Push per
Rule 70 batches. Rule 67: claim your lane in `.ai-workflow/coordination/codex.lane.md` first;
`frontend/src/components/WorkoutLogger/**` may still be claimed by Claude — check before editing.

**Token-runout protocol (Sean's requirement):** the moment you suspect you may not finish the current
slice, STOP building and write `docs/breadcrumbs/CONTINUATION-S<nn>.md` (≤15 lines): DONE (commits +
one-liners) · IN-FLIGHT (exact file, exact state, what's half-written) · NEXT ACTION (the literal
next edit) · GATES NOT YET RUN · OPEN QUESTIONS. Update your lane file. A successor agent (Fable/Opus)
must be able to resume cold from the breadcrumb + git log alone. Never leave uncommitted mid-slice
soup — commit compiling work-in-progress to your branch with a `wip(S<nn>):` prefix if runout is
imminent.

**Handback criteria:** all assigned BUILDER-SAFE slices committed with green gates + breadcrumbs, OR
a runout breadcrumb. Fable/Opus then: verifies every Codex slice (Rule 30 — builder's "done" is a
hypothesis), builds the FINISHER slices, runs the program-level dry-loop to CLEAN×2, flips flags per
the §6.6 gate table, chunk-walks the deploy, posts the board.

## 4. SLICE INDEX (owner-marked; full acceptance criteria live in the Opus doc §6)
Phase 1 LIVE: S1 privacy copy ✅(shipped 2026-07-31) · S2 vocab-bias fix · S3 invisible mic ·
S4 rest-command listeners · S5 dead-code deletion (~800 LOC).
Phase 2 DARK `VOICE_MODE_V2`: S6 useVoiceCapture 🏁 · S7 two-phase decode 🏁 · S8 ReviewDecodedWorkout 🏁 ·
S9 VoiceModeOverlay + crystal orb 🏁 · S10 one-mic cutover 🏁 · S11 talk-back ON.
Phase 3: S12 PLAUD → review inbox 🏁.
Phase 4 `PLANNER_IA_V2`: S13 golden snapshots · S14 pure logic · S15 contexts 🏁 · S16 command panel 🏁 ·
S17 mobile IA · S18 Rolodex upgrade.
Phase 5 `PLANNER_LENS_STYLES`: S19 registry + studio-classic 🏁 · S20-S21 lenses 2-10 · S22 switcher ·
S23 next-best-action · S24 templates 🏁 · S25 plan-vs-actual. (🏁 = FINISHER-ONLY)

## 5. FABLE'S OWN INSIGHT (orchestrator additions neither consultant made)
1. **The trust loop is the product.** Transcript-as-receipt (Opus F2.4) + crystal orb honesty (states
   never lie) + never-auto-commit form ONE contract: Coach shows its work. Every future Coach surface
   inherits it — write it into SWAN-COACH-V1-SPEC when S10 ships.
2. **S1-S5 are also the cheapest demo.** Fixing vocab bias + rest commands makes TODAY'S mic feel
   dramatically better before any new UI exists — ship Phase 1 as its own batch and let Sean feel the
   difference while Phase 2 builds.
3. **The planner world-seam sibling (A7) prevents the exact bug class fixed this morning** from
   re-emerging on 10 new skins — the law must land WITH the registry (S19), not after the styles.
4. **Voice fixtures are reusable gold:** S2's "one eighty five"→185 fixture corpus should grow with
   every real mishearing Sean reports — a regression corpus of HIS gym's noise, worth more than any
   synthetic benchmark. Park it at `backend/tests/fixtures/voice-decode/`.
5. **Lens count discipline:** ship 4 lenses (S20) and pause for Sean's taste-cut before building 6-10
   (S21) — the Runner Styles program proved taste-cuts mid-fleet beat batch-building all ten.

## 6. COSTS + PROVENANCE
Village $0.4158 · Kimi $0.0356 + $0.0769 · Opus $1.0304 + $1.5372 · rail-nav Kimi (same session)
$0.0325 + $0.0356 ≈ **$3.17 total consult spend this session**, all capped and receipted. Provenance:
this synthesis is Fable-authored (`claude-fable-5`); consult docs carry their own model stamps.
