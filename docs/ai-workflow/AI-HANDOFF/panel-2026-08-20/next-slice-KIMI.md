# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/NEXT-SLICE-PLAN-BRIEF-2026-08-20.md
**Seed:** (none)
**Tokens:** 1230 in / 1853 out | **Cost:** ~$0.0315 | **Wall:** 12.3s | **finish_reason:** stop

---

# Hostile Review — "The Surface and the Depth" Slice Plan

**Verdict up front: Slice A as scoped is premature. The plan builds production code on an unapproved direction, on an unpushed branch 25+ commits ahead, with no LCP strategy for a video-first hero. That is three independent ways to lose weeks.**

---

## P0 — Blocks Slice A

**1. [P0] Building V5 before owner approval repeats the original failure mode.**
Fifteen designs died from presenting unvalidated work. The board is render-verified but **owner-verdict-pending** — and Slice A commits the most expensive artifact (a scroll-scrub video hero) to the exact direction not yet approved. The render gate verifies *mechanism*, not *taste*; taste is the owner's call and it hasn't been made.
**Remedy:** Cheapest de-risk = send the owner the board PNGs + a 30-second Loom of the scroll journey *today*, and gate Slice A on a yes/no. If you must parallelize, build only the flag scaffolding + static hero fallback (which you need anyway for reduced-motion) — zero wasted work if the direction dies.

**2. [P0] No LCP/SEO strategy for a video-first hero. This is the front page.**
A scroll-scrubbed video hero with no poster strategy means LCP = video first-frame decode (multi-second on mobile), and crawlers see an empty canvas. The plan mentions neither. This alone should block.
**Remedy:** Extracted poster frame as `<img fetchpriority="high">` (or CSS background) rendered *under* the canvas, liquid-chrome headline as real HTML text (never baked into video/canvas), video lazy-hydrated after LCP. Budget: LCP ≤ 2.5s on 375px/4G, measured in the render gate.

**3. [P0] Shared unpushed branch 25+ commits ahead with a parallel agent (mediasync) is a merge bomb.**
Slice C depends on mediasync output landing on the same line of development. 25 unpushed commits + two agents = guaranteed rebase hell and possible lost work. Nobody owns the merge.
**Remedy:** Push now. Slice A on a short-lived feature branch off main; mediasync delivers *artifacts* (frames/master file) via a designated assets path, not code edits. Rule: no branch lives past 5 commits unpushed.

**4. [P0] Scrub technique is listed as "open" — it is not open, and indecision here wastes a slice.**
`video.currentTime` scrubbing on mobile Safari is janky (seek latency, decoder stalls, iOS inline-video quirks) and burns battery. For a 15s 1280×704 film, **extracted-frames-on-canvas wins decisively**: deterministic frame cost, no decoder in the scroll path, works identically on Safari/Chrome.
**Remedy:** Commit now: canvas + JPEG/WebP frame sequence (~450 frames at 30fps-equivalent scrub density, lazy-loaded in chunks, IntersectionObserver-gated). Kill-switch: if frame payload > ~6MB total or scroll jank > 8ms/frame on 375px, ship the static poster hero and defer scrub to Slice C's 60fps master. `video.currentTime` is rejected except as a desktop-only experiment behind a second flag.

**5. [P0] No rollback story.**
V5 route + feature flag is mentioned, but nothing states the revert path if the hero tanks conversion or perf in production.
**Remedy:** One-line runbook: flag off = V4 served, verified by a smoke test in CI. Flag state must be server/env-driven, not a rebuild.

---

## P1 — Must land during A/B

**6. [P1] The fee page is a dangling pointer.** Copy was P0-fixed to strip fee numbers — which means copy now implies pricing that leads *nowhere*. Users will hunt for it and bounce.
**Remedy:** Slice A must include at minimum a `/pricing` stub or an honest "pricing on consult" block in the CTA path. This is a conversion leak, not polish.

**7. [P1] Zero analytics/conversion measurement anywhere in the plan.** You're rebuilding the highest-stakes page blind. If V5 ships and signups move, you won't know which slice did it.
**Remedy:** Before Slice A ships: event tracking on both CTAs, scroll-depth markers per section, flag-variant tagging. Baseline V4 numbers first or A/B data is meaningless.

**8. [P1] Reduced-motion is scoped as "static hero" only — insufficient.** Slice B ports aurora worlds, liquid chrome, and scroll journeys, each a motion hazard. Vestibular safety is per-component, not per-hero.
**Remedy:** A `useReducedMotion` hook + styled-components theme token consumed by *every* animated component; render gate asserts `prefers-reduced-motion` screenshot per slice.

**9. [P1] Responsive matrix claims 320→3840 but the board was only verified at 1440+414.** Slice A's gate inherits a matrix with no evidence behind 6 of 8 breakpoints. Canvas heroes fail hardest at 320 (memory) and 2560/3840 (frame resolution — 1280-wide frames on a 3840 canvas = visible upscale mush).
**Remedy:** Gate runs all 8 widths per slice; serve 2× frame set (or cap canvas at 1920 with letterbox treatment) above 1440; assert 44px tap targets and 4.5:1 contrast at every width, not just two.

**10. [P1] SAMPLE-tagged mocks (Slice D) are scheduled last but ship first.** Slice B ports event cards and groups into production with fake data. "Keep the surface honest" is vague — vague honesty is how fake events end up looking real to users.
**Remedy:** Move the honesty mechanism into Slice B's acceptance criteria: visible "Illustrative" badge token in the design system, not a code comment. D's API wiring can stay last.

**11. [P1] File-size and architecture discipline unstated for the new code.** The board is a design artifact; V5 is product. A scroll-scrub hero + frame loader + fallback logic will blow past 300 lines in one file if not pre-decomposed.
**Remedy:** Mandate now: `ScrubHero/` split into frame-loader, canvas-renderer, fallback, styles — each ≤300 lines, styled-components only, tokenized colors (no hex literals — the render gate should grep for them).

---

## P2 — Backlog

**12. [P2] Frame pipeline format/weight budget undefined** (WebP vs JPEG, preload strategy, total bytes). Remedy: spec it in Slice C's contract with mediasync: per-frame ≤40KB, total ≤6MB, first 30 frames eager.

**13. [P2] No owner-feedback loop cadence after the verdict.** Remedy: each slice ends with a PNG+video drop to the owner, not just at board milestones.

**14. [P2] 60fps upgrade (Slice C) has no rollback to the 30fps frame set.** Remedy: keep both frame sets addressable; flag between them.

**15. [P2] "Batch-push cadence" is unnamed process smell hiding the branch problem.** Remedy: replace with trunk-based rule from finding 3.

---

## Single Highest-Impact Improvement

**Get the owner verdict before writing one line of V5 hero code — and use the wait to build the flag scaffold, static-fallback hero, poster/LCP layer, and analytics baseline, all of which survive any verdict.** This converts a binary gamble (approved direction × unbuilt hero) into guaranteed-forward progress, and it directly repairs the root-cause failure that killed 15 predecessors: presenting late instead of early.

## Reordered Plan

- **Slice 0 (new, this week):** Owner verdict on board + push/branch hygiene + analytics baseline on V4 + fee stub.
- **Slice A (revised):** Flagged V5 route with **static poster hero first** (LCP-safe, reduced-motion-native), then canvas frame-scrub behind the kill-switch budget. `video.currentTime` rejected.
- **Slice B:** Section ports, each with reduced-motion + 8-width gate + "Illustrative" badge token.
- **Slice C:** 60fps frames via artifact handoff from mediasync (no shared code branch), flag-swappable.
- **Slice D:** Real APIs, unchanged, last.
