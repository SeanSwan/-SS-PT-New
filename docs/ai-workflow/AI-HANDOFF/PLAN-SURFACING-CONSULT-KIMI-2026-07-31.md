# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/AI-HANDOFF/PLAN-SURFACING-CONSULT-BRIEF-2026-07-31.md
**Seed:** (none)
**Tokens:** 3650 in / 1643 out · **Cost:** ~$0.0356 · **Wall:** 61.0s

---

# KIMI K3 — HOSTILE DESIGN/FRONT-END REVIEW: Plan Surfacing Consult Brief

## (a) VERDICT
**SEND-BACK.** Architecturally rigorous, design-invisible. This is a backend brief wearing a design jacket — §5 asks me to attack UX the document never actually specifies. No component specs, no states, no tokens, no motion language, no glyph design. I cannot ratify pixels that don't exist.

---

## (b) Design weaknesses, most-severe first

**1. The signature moment is un-designed.** Sean's emotional ask is "I click my day and SEE MY PLAN." That reveal — session block → modal → planned workout panel — is the product's one chance at a Crystalline Swan moment (projection data materializing as a crystalline overlay over the session), and the brief reduces it to "new panel between info grid and package summary." Inserted *between* sections? That's a cargo manifest, not a reveal. The planned workout should be the **hero of the modal** when a projection exists — focus line, W2·D3 cursor position, exercise rows with set×rep×tempo. Buried mid-scroll below an info grid nobody reads, Sean will still "not recognize the layer as the plan on the schedule" — his stated problem, unsolved by §3.B.5's "polish discoverability" hand-wave.

**2. Zero state matrix.** Not one mention of: empty plan day, plan completed (receipt exists — show a completion state, don't just advance past it), plan inactive/draft, projection fetch failure, 3-name-preview vs full-detail loading skeleton, or the "plan day ≠ session date" mismatch state that the semantic trap (§2 🚨) guarantees users will hit. Every one of these will ship as an accidental dead panel or a toast.

**3. Auto-load interruption pattern is specified as a mechanism, not an experience.** "Materialize cursor day, replace-not-append, one-tap dismiss" — fine as logic, but: does the logger flash empty-then-populated (M3 anti-jump violation the brief itself cites)? Is there a skeleton? Does "Start blank instead" persist for the session or nag every open? Where does the banner live relative to ContextBar — do we now have TWO plan surfaces (chip + banner) competing? Unresolved, and §3.A.2 + §3.A.3 as written create exactly that conflict: auto-load fires, then the chip says "Pull today's workout" — for what, it's already loaded?

**4. Glyph language is a dot.** "World-accent dot/badge on calendar session blocks" — a dot is the cheapest possible signifier and will collide visually with existing status/attendance indicators on those same blocks. Calendar blocks at 414px day-view are already dense; a badge needs a defined z-layer, token, and a legend or it's noise.

**5. CTA hierarchy in the modal is unexamined.** "Open in Logger" (admin/trainer) vs the new planned-workout panel vs existing command panel — three action surfaces, no primary declared. On mobile the modal becomes a scroll-farm with no thumb-pinned action.

## (c) Implementation-fidelity attacks

- **Self-fetching panel with ≤3 props is right, but the brief ignores the loading contract**: modal opens → panel skeletons in → shifts content below it. Without a fixed-min-height skeleton or reserved space, this is a textbook layout-jump violation of the M3 law the brief quotes. Specify `min-height` skeleton or collapse-to-empty.
- **The 65-line prop chain fear is real, but `SessionDetailPlannedWorkoutPanel` self-fetching on `session.userId` re-introduces the nullable-userId edge** (`Session.mjs` userId nullable, `clientName` manual sessions). Manual session = no projection = the panel must render *nothing*, not an error. Not specified.
- **No responsive behavior specified anywhere.** The projection layer in day view, the modal panel at 375/414, exercise rows with tempo/rest metadata — exercise rows are the highest-density component in the app; cramming sets/reps/weight/tempo/rest/notes into a modal at 375px needs an explicit collapse pattern (name + set scheme primary, tempo/rest in expansion). Silence here guarantees an unreadable wall.
- **Touch targets**: coexistence chip, per-session glyph, plan chip — all currently unspecified; chips and dots historically ship at ~24px. Every new affordance needs the 44px floor called out by name.
- **Focus/keyboard/reduced-motion**: not mentioned once in the entire document. Modal panel insertion changes tab order; auto-load changes logger initial focus; "Open in Logger" route transitions need reduced-motion variants. Non-negotiables, absent.
- **Line-cap accounting is honest but incomplete**: BodyPanels at 295 + a new panel = breach; the brief says "budget an extraction" without naming the extraction target. Name it now (SessionDetailBillingPanel is the obvious amputation candidate) or S4 stalls mid-PR.
- **styled-components/tokens**: zero mention of which tokens the panel, glyph, or chip-promotion use. Given the retired-Galaxy-Swan rejection rule, this brief must state Crystalline Swan token usage explicitly or someone will reach for the old cyan.

## (d) THE one highest-impact change

**Make the planned-workout panel a crystalline "plan reveal," not a data section.** When a session has a projection: the modal's top zone (above the info grid) renders a Crystalline Swan hero — plan title, `W2·D3` cursor marker, focus line, and exercise rows with a faceted-glass surface (`var(--crystalline-surface, ...)`, 1px gradient border, no drop shadows — flat depthless surfaces are the enemy). GPU-safe stagger-in (opacity/transform only, `prefers-reduced-motion` → instant). The W·D cursor position is the "you are here" pin — that's the signature moment that makes the plan feel *alive on the schedule*, and it doubles as the fix for Sean's discoverability complaint. One component, one token set, one motion spec — and it makes Strong/Hevy look like spreadsheets.

## (e) What a design-savvy competitor out-builds here

- **Fitbod/Hevy** would show the plan day *inline on the calendar day cell* — expandable, no modal required. This plan keeps everything behind a click. A day-view inline expansion is the real "see the plan from the schedule."
- **TrueCoach** would show completion state ON the calendar (done/upcoming/missed visual language per day) — the completion receipts already exist; this brief never surfaces them visually. Massive miss: the schedule should show plan *progress*, not just plan *existence*.
- **Strong** would make "start this workout" a single thumb-reachable primary action from the day, preloading the logger — the brief gates that behind admin/trainer and defers client wiring to "optional slice S5." The client's path to "open schedule → tap today → train" is the entire point of Sean's ask and it's the last, optional item.

**Bottom line:** the architecture is sound; the design surface is a vacuum. Send back with: (1) hero-panel spec with tokens/motion/states, (2) full state matrix including nullable-userId and completed-receipt states, (3) resolution of the chip-vs-auto-load duplication, (4) client-facing start-path promoted from optional to core, (5) explicit skeleton/no-jump contract for the self-fetching panel.
