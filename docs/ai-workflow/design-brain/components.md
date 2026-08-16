# components.md — Swan Component Pattern Index (Design Brain core)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Extends:** `design.md` §§9–22 (tokens, surfaces, tiers). **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §C1–C12 — pattern recipes live there; this file maps components onto them and fixes anatomy/states/do-don't.
- Universal: every interactive element ≥44px (rule 2); `var(--token, #fallback)` only (rule 6); dark-first (rule 3); all data-bearing components ship empty/loading/error/success states (design.md §12); motion per `motion.md`.

---

## 1. GlowButton

- **Purpose:** every CTA and action trigger. Variants per design.md §10 (Primary / Accent / Luxury / Ghost / Danger).
- **Anatomy:** 44px+ height, 12px radius, label (Plus Jakarta Sans; Sora on gaming surfaces), optional leading icon, glow layer as pseudo-element (opacity-animated, `motion.md` §2).
- **Dual-Button Glow (both directions, mandatory — design.md §5):** blue bg (Midnight Sapphire/Royal Depth) → **Wing Purple** glow + focus ring; purple bg (Wing Purple) → **Ice Wing** glow + focus ring. Conflicting library advice (LILA BAN class) is rejected, not adapted.
- **States:** default / hover (glow up + 1–2% scale) / active (0.98) / focus-visible (2px glow-color ring, 2px offset) / disabled (40% opacity, no glow) / loading (inline spinner, label persists).
- **Do:** one Primary per view region; Danger gets `--danger` bg and NO glow (destruction isn't celebrated).
- **Don't:** Arctic Cyan anywhere on a button (data-only token); icon-only button without `aria-label`; two primaries side-by-side.

## 2. SheenCard vs low-motion data card (design.md §9)

- **SheenCard (sell/showcase):** C12 sapphire or luxury-gold glass + chrome edge + metallic sheen + glints + hover motion (C7 tilt allowed). For storefront/feature/ascension — anything meant to SELL. Family: C5/C6/C7.
- **Data card (client/trainer/admin/biometrics/program/workout-log):** same geometry and C12 chrome, dark-blue gradient surface, **low-motion**: no pointer tracking, no loops, no hover-only actions, no hidden controls. Compact grouped facts — never the same fact twice on one card; 44px icon buttons; wrap/stack at phone width.
- **Anatomy (both):** C12 baseline (one of the three recipes — never a fourth), 20px radius, title row, fact groups, action row.
- **Don't:** SheenCard treatment on operator/data surfaces; cards nested inside cards (`anti-patterns.md`).

## 3. Metric pill

- **Purpose:** one compact labeled fact (streak, tier, count, status) on cards/rows/headers.
- **Anatomy:** 999px radius pill; Sora uppercase 11–12px label + Fira Code value; 12% token-tint bg + matching 1px border; text+color never color alone.
- **States:** static by default; delta variant colors value Gilded Fern (positive/attention) or Wing Purple.
- **Don't:** pills as buttons unless 44px hit area and focusable; more than ~4 pills per card row before wrapping.

## 4. Stat ticker

- **Purpose:** live/rolling momentum numbers (user dashboard header, admin business health). Family: C9.
- **Anatomy:** Fira Code value (28–48px in dashboards), Sora micro-label, optional media/sparkline anchor per C9 (a bare number row is the banned AI-template KPI row — source §C9 anti-pattern).
- **States:** loading skeleton matching final width (no layout shift); count-up = narrative beat, 2s, fire-once, reduced-motion → final value instantly; error → last-known value + stale badge, never a fake number.
- **Don't:** tick continuously (ambient noise in a calm zone); present mock values as real (data-truth rule).

## 5. Chart panel (C11 — mandatory environment)

- **Purpose:** every Victory chart (rule 10 — Victory only), in every dashboard.
- **Anatomy per source §C11:** chart 60–70% width + narrative column 30–40%: headline, insight line (Cormorant italic), delta (Gilded Fern/Wing Purple), annotation on the moment that matters, next-action CTA footer. Series: **Arctic Cyan `#50A0F0`** primary; Wing Purple/Gilded Fern secondary; theme from `chartTheme.ts`.
- **States:** empty = Cormorant italic sentence explaining why + CTA (never "No data"); loading = geometry-matched skeleton; error = plain words + retry. Lazy via `React.lazy()` + SafeChart boundary.
- **Don't:** bordered box + title + chart (the banned admin template); Recharts; charts fed mock data styled as truth.

## 6. Drill-down modal

- **Purpose:** expand a chart point / row / KPI into detail without navigation.
- **Anatomy:** design.md §11 modal chrome (Graphite C12-obsidian glass, 24px radius, blurred overlay); header names the exact entity drilled into; body = C11 mini-environment or data-card facts; footer = next-action CTA.
- **States:** focus-trapped; ESC closes; **focus returns to the trigger element on close** (WCAG 2.4.3); loading skeleton inside, never a blank modal.
- **Don't:** modal-over-modal (drill again → replace content with breadcrumb back); hover-only drill affordance.

## 7. Command dock

- **Purpose:** operator command entry (Coach Command Center, Hermes surfaces).
- **Anatomy:** docked bar/panel, Graphite surface, input (§11 field spec), command list rows each carrying exactly one T0–T4 tier badge (design.md §15), keyboard-first (↑/↓/Enter, visible focus).
- **States:** idle / typing (filtered list) / armed (T3+ selection shows confirm affordance inline) / executing (row-level spinner, dock stays interactive) / result (links to receipt row, §9).
- **Don't:** execute T3/T4 straight from the dock — route through confirm (§17) or two-step arm (§18); ambient motion (calm zone, `motion.md` §4).

## 8. Coach proposal card

- **Purpose:** Swan Coach / dictation / PLAUD draft output awaiting human approval (design.md §§5, 11).
- **Anatomy:** T1 data card; **"DRAFT" badge** (Swan Lavender pill, top-left, text+color); proposed content diff-style (what will be written, for whom); approve + dismiss buttons ≥44px; provenance line (source: dictation/PLAUD/chat).
- **States:** draft / approving (button loading) / approved (morphs to receipt link) / dismissed (undo toast window) / error (why + retry).
- **Do:** writes land only through approval-gated endpoints (operator bridge §3) — the card is UI over that gate, never a bypass.
- **Don't:** auto-approve on tap-through; hide the dismiss action; render a draft without the DRAFT badge.

## 9. Approval-queue row + receipt ledger row

- **Approval-queue row (Coach Command Center / operator):** anatomy — tier badge (T0–T4 colors, design.md §15) + action summary + target entity + requester/source + age + approve/reject 44px targets; ≥48px row height; keyboard operable. States: pending / selected (detail panel opens) / processing / done. Don't: color-only tier signal; hover-revealed actions.
- **Receipt ledger row:** immutable record of an executed command. Anatomy — timestamp + actor + tier badge + action + target + outcome, values in **Fira Code** (tabular figures, right-aligned numerics per §12 tables); links to rollback note where T4. States: success / failed (single `--danger` accent) / rolled-back. Don't: editable receipts; truncating the target entity on mobile (stack, don't clip).

## 10. Navigation rail (design.md §11)

- **Anatomy:** left rail, icons + labels, collapsible to 72px icon rail; active item = Ice Wing edge + tint; 44px targets. Mobile: bottom tab bar ≤5 items, active = glow dot; Progress/workout never buried below social/profile (Product Core Loop).
- **States:** active / inactive / hover wash / focus-visible ring / collapsed (tooltip labels).
- **Don't:** hover-only flyouts as the sole path; unlabeled icon rail without accessible names.

## 11. Tab system

- **Anatomy:** Sora labels, active = Ice Wing underline/edge + Frost White (inactive 70%); 44px targets; ARIA `tablist/tab/tabpanel` with arrow-key traversal.
- **States:** active / inactive / focus-visible / disabled (rare — prefer hiding); overflow at phone width → horizontally scrollable with visible affordance, never wrapping into two cramped rows.
- **Don't:** tabs that navigate to new routes styled identically to in-page tabs; more than ~6 tabs (regroup instead).

## 12. Form field set (design.md §11)

- **Anatomy:** label above (never placeholder-as-label); field Graphite bg, electric border, Frost White text, 44px min, 12px radius; helper/error 13px below; related fields grouped on one glass panel; one primary action per form.
- **States:** default / focus (Ice Wing border + soft ring — or Wing Purple, one accent per form) / error (`--danger` border + message + `aria-describedby`) / disabled / success (inline check).
- **Don't:** destructive action adjacent to submit; error color as the only error signal; clearing user input on failed submit.

## 13. Empty state (design.md §12)

- **Anatomy:** Cormorant Garamond Italic explanation (why it's empty), one CTA to create the first real thing, optional on-brand still.
- **Don't:** bare "No data"; mock-filled chart as placeholder; multiple competing CTAs.

## 14. Skeleton / loading (design.md §12)

- **Anatomy:** skeleton blocks matching final geometry (no shift on swap); shimmer = ambient tier, reduced-motion → static blocks. Spinners only for sub-400ms or inline-button loads.
- **Don't:** full-page spinner for panel loads; skeletons that don't match the layout they resolve into.

## 15. Toast / banner

- **Toast:** transient confirmation/notice; Graphite C12-obsidian glass; semantic edge (success Ice Wing / info Swan Lavender / warn Gilded Fern / danger `--danger`); auto-dismiss 4–6s **plus** manual dismiss; response-tier enter/exit; `role="status"` (or `alert` for danger); pauses timer on hover/focus.
- **Banner:** persistent surface-level condition (stale data, kill switch armed); sticks until resolved/dismissed; never auto-dismisses a security state.
- **Don't:** toasts for errors requiring action (use inline error); stacking >3 (collapse to count); toast as the only record of a T2+ write (receipt row is the record, §9).

## 16. Confirm modal (T3)

- **Purpose:** gate external-visible actions (design.md §11).
- **Anatomy:** modal chrome per §6; names **exact action + target** ("Send reminder SMS to client #482"); Wing Purple T3 tier badge; confirm button carries the action verb — never "OK"; cancel is the safe default focus.
- **States:** open (focus-trapped) / confirming (loading) / result. Focus returns to trigger on close.
- **Don't:** generic copy ("Are you sure?"); confirm as the initially-focused element; ESC disabled (allowed to cancel — this is T3, not T4 mid-flow).

## 17. Two-step arm modal (T4)

- **Purpose:** destructive/irreversible actions (design.md §11).
- **Anatomy:** step 1 **arm** — typed target name or explicit toggle; step 2 **execute** — danger button (`--danger` bg, no glow) enabled only after arming; Danger `#E5484D` T4 badge; **rollback plan line** visible before execution.
- **States:** unarmed (execute disabled) / armed / executing / done (links receipt + rollback note) / failed. ESC allowed before execution, not mid-execution.
- **Don't:** pre-filled arm input; single-click destructive paths anywhere in Swan; hiding the rollback line to save space.

---

## C-family quick map

| C pattern | Components here |
|---|---|
| C5 shelf / C6 flip / C7 tilt | SheenCard (§2) — sell surfaces only |
| C9 media-first KPI | Stat ticker (§4) |
| C11 chart environment | Chart panel (§5), drill-down modal (§6) |
| C12 glass panel system | Every card/modal/drawer surface above — one of the three baseline recipes, never a fourth |
