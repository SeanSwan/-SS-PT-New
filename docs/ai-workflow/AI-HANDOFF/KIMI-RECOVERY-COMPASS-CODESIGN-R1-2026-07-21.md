# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/RECOVERY-COMPASS-OFF-DAY-SPEC-2026-07-21.md
**Seed:** (none)
**Tokens:** 2661 in / 5184 out · **Cost:** ~$0.0857 · **Wall:** 190.6s

---

# Kimi K3 — Co-Design Review: Recovery Panel Build Spec v1

**Verdict up front: AGREE-WITH-CHANGES.** The architecture is right (enhance, deterministic, provenance-carrying). The spec fails on presentation decisiveness, a few under-specified predicates that would make acceptance tests unwritable, and three mobile traps that would absolutely render this as a to-do list. Everything below is build-ready.

---

## 1. K1–K6 — Decisions

### K1 — Presentation shape: **Vertical checkable sequence. Not the stepper. Not the guided flow. Slice 1 ships the vertical ritual only.**

Reasons:
- **Gym-floor / living-room reality:** one hand on phone, one hand on foam roller. A vertical sequence with 64px rows and full-row tap targets works with a thumb, sweaty, at arm's length on a bench. A horizontal phase-stepper requires reading a progress map before acting — that's a dashboard pattern, not a ritual pattern.
- **Least-clicks math:** vertical sequence = 1 tap per item, done. Guided one-at-a-time flow = 1 tap to start + 1 tap per advance + a dismiss path = 2N+1 taps and it *kills skimming* — a client who only has 10 minutes can't see the whole ritual at a glance and bail intelligently. Skimmability is a feature, not a failure mode.
- **The check-off IS the product.** The completion mechanic (tap → strike → XP tick) is what separates "coached ritual" from "content list." The guided flow hides the accumulation.
- The guided "Ritual Mode" (one exercise full-bleed with video, auto-advance, timer) is a legitimate **slice-2** upgrade layered on the same data — don't build the shell for it now, just don't paint the component API into a corner.

**Structure:** four phase blocks in fixed CES order (Inhibit → Lengthen → Activate → optional Cardio), each block a labeled group of 1–4 exercise rows. Blocks with zero qualifying exercises are **suppressed entirely** — never render an empty phase header (see hostile pass).

### K2 — Provenance UX: **Block-level "because" line, always visible + per-exercise why in a bottom sheet. No per-exercise inline text.**

The spec's "one-line why per exercise" is the clutter trap; a pure "Why these?" expandable is the trust trap. Split the difference by hierarchy:

- **Block header carries the provenance, always on, one line, clamped:**
  > **INHIBIT** — *because you trained back + shoulders Tuesday*
- **Per-exercise info affordance** (24px ⓘ inside the 44px row, right edge) opens a bottom sheet with the item's full `why[]` strings and the video. This satisfies Sean's hard law — every item's provenance is reachable in one tap and block-level provenance is visible in zero taps — without turning 4 rows × 4 blocks into a wall of italic text on a 390px screen.
- **"Why these?" is per-block, not panel-level.** A single panel-level data story buries the specific mapping (yesterday's lats → today's lat roll). Phase-scoped provenance is what makes it read as *coaching logic*, not *content marketing*.

### K3 — Training-day strip: **Ship in slice 1.** It's nearly free (same service, same composition, one filtered block), and the alternative is the panel *vanishing* on training days — which reads as a bug, breaks the habit loop, and forfeits the daily touchpoint. Hard constraints: one collapsed row ("Cooldown tools · 3 moves for today's shoulders"), max-height 72px, no XP changes, expands to the filtered inhibit/lengthen list only. It must never push `TodaysAssignmentCard` below the fold at 390px — if vertical budget collides, the assignment card wins slot priority.

### K4 — Signature moment: **The Wing Sweep + the Restore Ring.**

This panel earns "marvelous" through *one* disciplined moment, not ambient decoration:

- **The Restore Ring:** the card header carries a thin circular progress ring (conic-gradient, Ice Wing `#60C0F0` → Wing Purple `#8B5CF6`), one tick per completed item. Rest state: a hairline ring at 8% opacity on Obsidian `#0A0A0F` / Carbon `#16161D` surface. This replaces a progress bar — a ring reads as *ritual*, a bar reads as *task app*.
- **The Wing Sweep (completion moment):** when the final item checks, a single luminous arc — the gradient sweeping around the ring once, ~600ms `ease-out`, with one Gilded Fern gold `#C9A84C` fleck at the terminus — then the card settles into a "Complete" state with gold hairline border at 40% opacity. **Glow discipline: exactly one glow source on screen at any time.** Rest state has zero glow. The Ice Wing glow appears only on the active/next item's left edge (2px gradient rule, `box-shadow: 0 0 12px rgba(96,192,240,0.35)`), and the full-card purple-gold bloom exists only during the 600ms sweep.
- **`prefers-reduced-motion`:** sweep → instant ring fill + static gradient; check animations → opacity-only state change ≤100ms; no translate, no scale, ever. Non-negotiable per spec, and I'll add: the *reduced-motion completion state must be visually distinct* (gold border + "Ritual complete" label) so reduced-motion users don't get a lesser product, just a stiller one.
- **Micro-beat per check:** row's Ice Wing edge-rule travels off left-to-right as the name strikes through — `transform: scaleX()` on a pseudo-element, GPU-safe, 200ms. This per-item tick is what makes checkboxes feel like a sequence being *performed*, not a list being *cleared*.

### K5 — Name: **"Restore."**

Kill "Recovery Compass" client-facing — a compass is a *wayfinding* metaphor, and this panel doesn't help you find anything; it tells you what to do. Wrong promise. "Restore Day" is close but noun-phrases the day instead of the ritual.

**Client-facing:** the panel is **Restore**. Headlines are day-state-dynamic:
- Off-day: "Restore — pull your body back" (Sean's own language, keep it)
- Training day: "Restore — cooldown tools"
- Cold start: "Restore — start with the foundations"

Premium, active, zero yoga/meditation adjacency, and "Restore Ritual" gives us the slice-2 guided mode name for free. The backend service name `recoveryCompassService` can stay — internal names don't ship to clients.

### K6 — Slice-1 scope cuts (decisive):

| Ship slice 1 | Cut to slice 2 |
|---|---|
| Day-state engine, conflict avoidance, CES blocks, provenance | **Cardio block** — taxonomy gap is real (`bodyPartCategory` free-text `'cardio'` is Rule-58 schema-drift quicksand; one typo'd seed value and the block silently empties). Fat-loss framing also needs copy review. Do it when there's a first-class taxonomy value. |
| Completion hook + XP + idempotency | **Swan Coach client tool** — registry work + dispatcher wiring for a secondary entry point. The dashboard auto-query is the core value; Coach tool is a re-skin of the same service later. |
| Training-day strip (K3) | Trainer pin/exclude override (already deferred — correct) |
| Cold-start honest state + movement-screen CTA | Guided Ritual Mode |

**Do NOT cut the completion hook.** A checkable ritual whose checks evaporate on refresh is a toy. XP + idempotency is the retention mechanic and it's cheap.

---

## 2. Hostile Pass — What Breaks This Spec

**H1. "Heavy activation excluded" is an untestable predicate.** Conflict-avoidance says exclude "loading/fatiguing work" for tomorrow's muscle groups, but nothing defines *loading*. There is no intensity field named in the ground truth. Without a deterministic predicate (e.g., `exerciseType IN (strength, power)` OR `cesProtocolStep = 'activate'` AND target-muscle overlap), the acceptance metric "tomorrow's muscle groups never receive loading recommendations" cannot have a test written against it. **Fix: define the predicate in the spec before build, even if crude.**

**H2. Cold-start "foundational routine" may violate Sean's hard law.** A pre-baked foundational routine with zero client data *is* generic filler wearing a trench coat. Worse: if there's no client data, there are no contraindication records, so the contraindication filter *can't run* — you'd be recommending unfiltered work to the clients you know least about. **Fix:** the foundational offer must (a) be explicitly labeled "foundational — not yet personalized," (b) be curated to lowest-contraindication-risk items only, and (c) be **suppressed entirely** if any pain-entry records exist (pain data without a screen = coach referral CTA, not self-serve recommendations).

**H3. Timezone is unhandled and will corrupt day-state.** "Today's plan day," "logged today," and "last 48–72h" are three different time semantics. Server-UTC "today" vs client-local "today" will misfire for evening trainers and any client west of the server. The spec is silent. **Fix: all day-boundary logic in client-local time (client sends tz offset; or store user tz), load window as rolling hours, and state it in the spec.**

**H4. The two-system taxonomy means empty blocks on real data.** SMR/corrective lives in `cesProtocolStep` + JSON tags, *not* the ENUM. Any exercise seeded without CES tagging is invisible to the composer. On a real (messy) production library, "Inhibit" will come back empty for some muscle groups. **Fix: blocks with zero results are suppressed, never rendered empty; and if ALL blocks are empty but data exists, fall back to the honest cold-start variant ("your coach's library is being curated") rather than rendering a skeleton panel with one sad row.**

**H5. Mounting rule is ambiguous — dual-render risk.** "Beside/in-place-of TodaysAssignmentCard" plus five day-states will absolutely produce a state (`unplanned`) where both cards fight for the slot. **Fix: explicit slot priority: `TodaysAssignmentCard` > Restore full panel > Restore strip. Exactly one occupant per slot, per day-state, in a lookup table.**

**H6. XP idempotency granularity is unspecified.** "One award per client/day" — but the ritual has multiple blocks. Partial completion = partial XP or zero? A client who foam-rolls but skips stretching getting nothing teaches them the ritual is all-or-nothing. **Fix: per-item XP, idempotency key per (client, day, exerciseId), with the all-complete Wing Sweep as a bonus award.**

**H7. The completion record has no named home.** "Records a lightweight recovery-activity record" — in what table? Reusing the session model risks polluting workout analytics; a new model is a schema decision nobody's owned. **Fix: name the model now (`RecoveryActivityLog` or reuse with a discriminator), run the Rule-58 drift check, spec it.**

**H8. Cache invalidation hole.** "Cacheable" + "today's logged session" are in tension: if a client logs a workout at 9pm, the cached morning composition is stale (wrong day-state, possibly conflict-violating). **Fix: cache key must include last-session-logged-at, or invalidate on session write. One line in the spec.**

**H9. Generic to-do list failure mode.** If this ships as white-text rows with checkboxes on dark, it *is* a to-do list. The defenses are all in this document: CES phase narrative, the edge-rule travel, the ring, the sweep, coach-voice provenance. If slice pressure forces cuts, cut features — **never cut the motion beats or the provenance lines.** Those ARE the differentiation.

**H10. 390px row overcrowding.** Thumb + name + dose + 44px checkbox + ⓘ affordance = 5 elements in 358px of content width. The dose text ("2×45s") and name will collide for long exercise names. Contract below handles it — but the spec's "each item: thumb, name, dose, one-line why, 44px, video" literally cannot fit as written at 320px.

---

## 3. Design Contract

### Layout

**Card anatomy (all widths):** Obsidian `#0A0A0F` page → Carbon `#16161D` card, 1px border `rgba(96,192,240,0.12)`, 16px radius, 16px padding (390), 12px (320).

**390px (primary target):**
- Header row (56px): Restore Ring (40px) + headline (2 lines max) + block count
- Phase block: phase label (11px, tracking +0.08em, Ice Wing at 70%) + provenance line (13px italic, 1 line clamped, `--color-text-secondary`)
- Exercise row (64px): 48px thumb (8px radius) | name (15px, 1-line ellipsis) + dose below (13px) | 44px check target right. ⓘ lives *inside* the thumb's bottom-right corner (20px, opens sheet).
- Total off-day card ≈ 480–620px tall. Acceptable — it owns the slot.

**320px:** thumb drops to 40px, dose moves inline after name separated by `·`, provenance line truncates at 64 chars with the full string in the sheet. Headline "Restore — pull your body back" wraps to two lines; never let it clip. Strip mode collapses to 64px.

**768px:** card stays single-column, max-width 560px, left-aligned in the slot. **Do not** go two-column — a ritual is a sequence; a grid is a menu.

### Motion beats (transform/opacity only, all GPU-safe)

1. **Mount:** card fades + `translateY(8px)` → 0, 250ms, once per session (not per render).
2. **Check:** strike + edge-rule `scaleX(1→0)` 200ms; ring ticks via `stroke-dashoffset` transition 300ms.
3. **Complete:** Wing Sweep 600ms (conic-gradient rotation on a masked pseudo-element — transform-only), settle to gold hairline.
4. **Reduced motion:** instant states, static ring, distinct complete styling. No exceptions.

### States

- **Loading:** skeleton = card chrome + 3 ghost rows (pulse at 8% opacity, disabled entirely under reduced-motion). Never skeleton the *number* of blocks — implies content that may not exist.
- **Empty/cold-start:** honest copy + one gold-accent CTA ("Complete your movement screen"). Foundational offer below it, labeled "Foundations — not yet personalized" (per H2).
- **Error:** inline, non-blocking — "Restore is catching its breath. Retry" — 44px retry target. Never error-boundary the whole dashboard for a recovery panel.
- **All-complete:** ring full, gold hairline, "Ritual complete — see you tomorrow." No confetti. We're a swan, not a slot machine.

### Provenance language — two registers

**Client (plain, second person, cause→effect):**
- "because you trained back + shoulders Tuesday"
- "because your movement screen flagged forward-head posture"
- "kept light — legs are on tomorrow's plan"

**Trainer (client view, read-only):** same strings + machine tags exposed — `source:session_load_72h`, `source:movement_screen`, `filtered:conflict_lower_body_d3`, `filtered:contraindication`. The trainer sees *exactly the client render* with a provenance drawer — this is what makes the engine defensible in a client conversation and what makes the coach indispensable rather than bypassed.

---

## 4. Verdict: AGREE-WITH-CHANGES

Ranked conditions for build:

1. **Define the "loading/fatiguing" predicate** for conflict-avoidance (H1) — blocks the acceptance test.
2. **Name the completion-record model + per-item XP idempotency granularity** (H6, H7).
3. **Client-local timezone semantics for all day-boundary logic** (H3).
4. **Cold-start foundational routine: labeled, lowest-risk, suppressed on pain-entry** (H2) — hard-law compliance.
5. **Cut cardio block + Coach tool to slice 2** (K6).
6. **Empty-block suppression + slot-priority table** (H4, H5).
7. **Adopt the design contract above** — K1 vertical sequence, K2 block-level provenance + sheet, K4 Wing Sweep/Restore Ring, K5 **Restore**.
8. Cache invalidation on session write (H8).

Build it. The bones are right; now it has a face.
