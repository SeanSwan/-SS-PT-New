# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SESSION-SHELL-FULLPAGE-BRIEF-2026-07-30.md
**Seed:** (none)
**Tokens:** 1794 in / 5133 out | **Cost:** ~$0.0824 | **Wall:** 66.7s

---

# KIMI K3 — HOSTILE REVIEW: Swan Session Shell (Consult Packet v2)

**Verdict:** The diagnosis is correct (17 stacked sections, scroll-jump chaos, duplicated surfaces). The prescription is architecturally sound but **operationally dangerous as written**: it under-specifies feature disposition, mis-sequences the migration, and its stage model will break real PT flow. Sean's "straight to the point" is at risk from the very thing meant to deliver it. Approve the concept; block implementation until the Critical items below are resolved.

---

## 1. WEAKNESSES RANKED BY SEVERITY

### 🔴 CRITICAL

**C1 — The 3-stage model is a wizard. Real sessions are non-linear.**
Setup → Train → Finish implies sequence and gating. Reality: a PT logs sets *while cueing*, changes the plan mid-session, skips warmup entirely, adds a superset at exercise 6, and writes session notes *during* rest periods — then saves 40 minutes later. Any design where "Finish" is a place you *go to* (rather than an action available everywhere) fails the primary user. The packet never states whether stages are gated, skippable, or re-enterable. That ambiguity is fatal at this stage.

**C2 — No section→zone disposition table. Features will be silently dropped.**
The packet inventories 17 sections, then maps roughly 10 of them into zones. Unmapped or ambiguous: `SessionStatsBar`, `ScheduledSessionStatusBanner`, `WorkoutDraftGateBanner`, `ActivePlanContextStrip`, `LearningModeToggle`, `NASMPhaseGuide`, `SaveSuccessPanel`/post-save handoff, `ModeBar` (Quick/Detailed + offline). Sean explicitly said "do not forget what we had." Without a written disposition (zone / collapsed-into / deleted-with-justification) for **every one of the 17**, the strangler migration will lose features and nobody will notice until a client does.

**C3 — Merging TimerFAB into a stage-aware action bar is wrong.**
The rest timer is a **cross-stage global**. A client resting after their last set is in "Finish" filling out notes — the timer must still be visible and tappable. A stage-aware action bar that swaps its contents per stage will either hide the timer or duplicate it (recreating the two-timer problem you just fixed). The action bar needs a **persistent segment** (timer + coach toggle) and a **stage segment** (primary action). The packet says "merges… TimerFAB into one surface" without this distinction.

### 🟠 HIGH

**H4 — 10 page recipes × 5 zones with no shared-primitive architecture = duplication bomb.**
The packet says each recipe "defines the zones' arrangement/chrome." If that's 10 bespoke page implementations, you get: 10× the token-law surface area, 10× the reduced-motion variants to hand-write, 10× the 8-breakpoint QA, and guaranteed 300-line-cap violations or — worse — cap compliance via copy-paste. The packet never specifies the zone-primitive layer. This is the difference between 10 recipes and 10 forks.

**H5 — Anti-jump laws are missing the hard half.**
You banned `scrollIntoView` but didn't specify: focus return on sheet/drawer close (rolodex, keypad, coach dock), focus trap *inside* sheets, browser back-button behavior on stage change, per-stage scroll memory (swap back to Train — where am I?), unsaved-stage-exit guard, `aria-live` announcement on canvas swap, and the reduced-motion variant of the canvas swap itself (a slide transition under `prefers-reduced-motion` is still motion). "Focus moves WITH intent" is a slogan, not a spec.

**H6 — Contrast is asserted, not engineered.**
"Wing Purple" coach dock and "World Immersion atmosphere behind all zones" are the two highest-contrast-risk surfaces in the system, and neither has a token strategy. Atmospheric backgrounds behind text-bearing zones require a scrim token (`--swan-zone-scrim`) with a guaranteed effective contrast ≥ 4.5:1, or World Immersion ships as a WCAG violation with nice lighting. Purple-on-dark for Coach *text* (not just accents) needs a verified pair, e.g. a lightened `--swan-coach-fg` on `--swan-coach-bg`, not the brand purple raw.

### 🟡 MEDIUM

**M7 — Migration slice order puts the riskiest merge second.**
Proposed order: Context bar → **Action bar merge** → Stage rail → Coach dock. The action bar merge touches the canonical save path, the sticky bar, and the footer simultaneously — that's your highest-blast-radius slice, scheduled before the harness has page-level coverage. Wrong order (see Q4).

**M8 — Responsive behavior is specified at exactly one breakpoint.**
"iPhone-X-first 375px; 320 never breaks" says nothing about 768/1024 (does the stage rail become a sidebar? does the coach dock become a persistent right panel?), 1440 (max-width? three-column?), or 2560/3840 (an unstretched canvas on a 4K monitor is a 60cm-wide action bar — unusable). Eight breakpoints are mandated; one is designed.

**M9 — "Setup" conflates configuration with training.**
Warmup protocol is *training*, not setup. A client who skips warmup doesn't skip a "stage" — they skip content inside Train. Putting warmup in Setup means the warmup UI vanishes once you advance, and mid-session warmup reference requires navigating backward. Warmup/cooldown protocols belong as collapsible blocks bookending the Train canvas.

### ⚪ LOW

**L10 — No loading/error/empty states per zone.** The runner has an empty state; the shell has none specified for stage canvases, coach dock offline, or plan-picker failure.

**L11 — "10 sharp ultra professional designs" is being treated as a launch requirement.** It's a roadmap. Shipping 4 page recipes excellently beats shipping 10 adequately; the Labs 7 should be explicitly gated behind the conformance harness passing on the core 4.

---

## 2. SINGLE HIGHEST-IMPACT IMPROVEMENT

> **Kill the wizard. Make Train the default canvas, stages freely navigable modes, and mandate: a set is loggable in ≤2 taps from page load on every recipe, at every breakpoint, with every other stage optional and non-blocking.**

This is the one change that simultaneously fixes C1, de-risks the whole remodel against Sean's "straight to the point," and gives you a measurable acceptance test ("cold load → first set logged: count the taps"). Everything else — zones, recipes, anti-jump — is in service of that number. If a recipe can't hit 2 taps, the recipe is wrong, not the mandate.

---

## 3. ANSWERS TO THE SIX QUESTIONS

### Q1 — What breaks in the 3-stage IA
- **Trainer logging during coaching:** any stage navigation between sets is a tax. Train must be the persistent default; Setup and Finish are *reachable from* Train, never prerequisites to it.
- **Mid-session plan changes:** plan picker must live in the Context bar (always visible), not inside Setup. Changing plan mid-Train = sheet over the canvas, no stage change.
- **Skipped warmup:** warmup is a collapsible section at the top of the Train canvas, default-collapsed if the plan marks it optional. Not a stage.
- **Verdict:** No 4th stage. Three modes, zero gating, Train-default. Stage state (which mode you're in) persists in the same `ss.runner.*` storage namespace so a refresh mid-session restores position.

### Q2 — Zone corrections
- **Action bar:** split into `persistent segment` (rest timer chip + coach toggle, never unmounts) + `stage segment` (contextual primary). Do not let the stage segment evict the persistent one at 320px — see layout below.
- **Plan-loading affordances (3 → 1):** one "Plan" button in the Context bar opening a sheet with four tabs: Current / Repeat Last / Today / History. This kills `WorkoutPlanAssignmentPicker`, `LoadPlanRow`, and the Setup-stage picker simultaneously.
- **NASM/protocol sections:** warmup + cooldown as collapsed accordions inside Train canvas (top/bottom). `NASMPhaseGuide` + `LearningModeToggle` → a single "Guide" icon-button in the Context bar opening a drawer, closed by default, content lazy-mounted.
- **SessionStatsBar:** slim live stats strip pinned to the top of the Train canvas (Victory `VictoryBar`/`VictoryPie` miniatures, tokenized colors, `height ≤ 120px`, collapsible to one line). Not a zone — canvas content.
- **Banners (scheduled/draft/plan-context):** collapse into one Context-bar status chip with a popover. Three banners → one chip.

### Q3 — Anti-jump laws you missed (add verbatim to the packet)
1. **Focus return:** every sheet/drawer/keypad stores `document.activeElement` on open and restores it on close; ESC closes; focus is trapped while open.
2. **Canvas-swap focus:** on stage change, focus moves to the canvas's `h2` (`tabIndex={-1}`), and an `aria-live="polite"` region announces "Train stage" etc.
3. **Per-stage scroll memory:** each stage's scroll position saved on exit, restored on re-entry. Scroll reset to top happens **only** on first entry to a stage, never on re-entry.
4. **Back-button policy:** stage changes do **not** push history (they're view state, not navigation). Sheets/drawers push one history entry so Android/browser back closes the sheet instead of leaving the page.
5. **Unsaved-exit guard:** dirty intensity/notes in Finish → switching stages is allowed (state persists), but page-unload and style-swap trigger the existing draft-gate.
6. **Reduced-motion swap:** canvas swap is an instant crossfade ≤ 100ms or a hard cut under `prefers-reduced-motion`; sheet entrances become opacity-only.
7. **Accordion law:** in-place toggles animate `max-height`/`grid-template-rows` only, never reflow content above them; animation disabled under reduced-motion.

### Q4 — Migration slicing, lowest-risk order
1. **Slice 1 — Disposition table + Context bar** (pure additive; consumes 3 banners + plan pickers behind feature flag).
2. **Slice 2 — Coach dock merge** (replaces terminal + dictate strip; no save-path touch).
3. **Slice 3 — Stage rail with Train-only** (Setup/Finish are stubs rendering existing sections inline; IA lands before behavior changes).
4. **Slice 4 — Action bar merge** (footer + sticky bar + thumb bars + TimerFAB; save path moves last, behind the now-mature harness).
5. **Slice 5 — Protocol sections into Train canvas; Finish stage assembly.**
6. **Slice 6 — Per-style page recipes (4 core), then Labs 7.**

**Tests to write FIRST (before Slice 1 code):**
- `shell.save-path.canonical.test.tsx` — save through the shell produces byte-identical payload to current footer save.
- `shell.stage-swap.preserves-drafts.test.tsx` — stage-storm: 50 random stage transitions, exercise rows + notes intact.
- `shell.focus-return.test.tsx` — open/close every sheet; assert focus restoration.
- `shell.swap-storm.page.test.tsx` — extend existing harness: style swap mid-stage, mid-rest-timer, mid-draft.
- `shell.no-scroll-jump.test.tsx` — assert `window.scrollY` unchanged across every button interaction in the page (jsdom spy on `scrollIntoView` + `scrollTo`).
- `contrast.recipes.audit.test.ts` — token-pair contrast ≥ 4.5:1 for every recipe's text/background pairs, computed, not eyeballed.

### Q5 — 375px layouts (text sketches)

**Focus Flow (default):**
```
┌─────────────────────────────┐
│ Context: Client·Date·Plan·⏱ │ 44px, sticky
├─────────────────────────────┤
│ [Setup] [Train•] [Finish]   │ stage tabs, 44px
├─────────────────────────────┤
│ Stats strip (collapsed→1ln) │
│ ▸ Warmup (collapsed)        │
│                             │
│   EXERCISE CARDS (runner)   │
│                             │
│ ▸ Cooldown (collapsed)      │
├─────────────────────────────┤
│ [⏱1:24] [LOG SET]     [🎙] │ action bar: persistent + stage
└─────────────────────────────┘
Coach dock = bottom sheet, peek height 56px, drag to half/full.
```

**Ledger Pro (power view):** stage rail collapses to a 3-icon segmented control inside the Context bar; stats strip expanded by default (dense Victory sparkline row); action bar stage segment shows set·rest inline stepper; coach dock is a 48px right-edge tab at ≥768px, bottom sheet below.

**Sheet Stack:** stages are detents of one sheet — Train is the middle detent; drag up → Finish, drag down → Setup. Context bar and action bar fixed outside the sheet. Under reduced-motion: detents become the Focus Flow tab layout (no drag). **Hard requirement:** sheet drag must never hijack scroll inside exercise cards — drag handle only.

### Q6 — The biggest failure mode + the mandate
**Failure mode:** ceremony creep. The remodel *adds* a navigation layer (stages) and 9 alternative skins to a page whose owner complained about friction. If a trainer has to think about what stage they're in, you've rebuilt the problem with better tokens.

**Mandate (write it into the packet as Law 0):**
> **"Train-first, two taps."** Cold load lands on Train. Any set loggable in ≤2 taps. Setup and Finish are optional, non-blocking, and reachable — never required. Any recipe, zone, or interaction that violates this is cut, regardless of how it looks.

---

## 4. BUILDER-EXACT CORRECTIONS

**File architecture (fixes H4, enforces 300-line cap):**
```
runner/shell/
  SessionShell.tsx            ≤120 lines — zone orchestration only
  zones/
    ContextBar.tsx            ≤200
    StageRail.tsx             ≤150
    CoachDock.tsx             ≤250
    ActionBar.tsx             ≤200
  primitives/
    Sheet.tsx                 — shared drawer: focus trap, focus return, history entry
    StageCanvas.tsx           — scroll memory, aria-live, reduced-motion swap
    Accordion.tsx             — in-place, no reflow above
  recipes/
    types.ts                  — RecipeConfig interface
    focusFlow.ts  classic.ts  ledgerPro.ts  sheetStack.ts  …  each ≤150 lines, CONFIG ONLY
```

```ts
// recipes/types.ts — recipes are data, not implementations
interface RecipeConfig {
  id: string;
  stageRail: 'tabs' | 'segmented' | 'detents';
  coachDock: 'sheet' | 'edge-tab';
  statsStrip: 'collapsed' | 'expanded';
  atmosphere?: { world: string; scrimToken: '--swan-zone-scrim' };
  tokens: { accent: string; coachFg: string; coachBg: string }; // token refs only — harness rejects hex
}
```

**Action bar at 320px (fixes C3):** persistent segment left (`min-width: 96px`: timer chip 44×44 + coach 44×44), stage segment right (flexible primary button, `min-height: 44px`, label truncates, never wraps). At ≥1024px: max-width `720px`, centered; at ≥2560px the entire shell column caps at `1440px` — canvas never stretches to 4K width.

**Reduced-motion (add to every animated primitive):**
```css
@media (prefers-reduced-motion: reduce) {
  .stage-canvas, .sheet, .accordion { transition: none !important; animation: none !important; }
}
```

**Conformance harness additions:** breakpoint snapshot suite at 320/375/414/768/1024/1440/2560/3840 per recipe; touch-target audit (every interactive element ≥44×44, computed); computed-contrast audit per recipe token pair; `scrollIntoView`/`scroll-behavior: smooth` static ban extended to `shell/**`.

---

**Bottom line:** Approve the five-zone shell and the strangler plan. Block code until: (1) Law 0 is adopted, (2) the 17-section disposition table exists, (3) the action bar gains a persistent segment, (4) slice order is corrected, (5) the six tests are written. Do those five things and this remodel actually delivers "straight to the point." Skip them and you've built 10 beautiful ways to be lost.
