---
title: Front page — journey board built, plan panel-reviewed. Fresh-agent entry point.
originating_model: claude-fable-5
date: 2026-08-20
decision: Direction built and rendered; Sean's verdict on the board + panel-reviewed Slice A plan are the two gates. Do not produce design variants.
status: open
supersedes: PARTIAL — SESSION-HANDOFF-FRONT-PAGE-DESIGN-2026-08-20.md (its failure history, traps, and root cause remain canonical; its "ask for a reference" step is COMPLETE; its task list is superseded by §5 here)
---

# FRONT PAGE — JOURNEY HANDOFF (fresh-agent entry point)

**Read this file, then the two files it names in §1. Do not re-derive this chat.**

## 0 · One-paragraph truth

The fifteen-rejections era ended today. Sean directed the reference pass himself (Mobbin MCP,
30+ sites), answered a 12-decision grill, and ONE board now exists — **"The Surface and the
Depth"** (`scripts/design-brain/atelier/frontpage/journey/`) — built on his real Swans.mp4
footage, 107/107 verbatim copy, render-gated (0 dead / 0 overflow@414 / 0 tiny / 0 broken) and
**looked at twice by the building agent**, with 15 defects fixed before Sean saw it. Sean has
the PNGs. **His verdict on the direction is gate 1.** A four-seat hostile panel (Kimi K3, Grok
4.6, GLM 5.3, local Qwen) has reviewed the NEXT-SLICE plan; synthesis lives beside the reviews
(§3). Gate 2 is executing the panel-corrected Slice A.

## 1 · Read next (in order)

1. `docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-FRONT-PAGE-DESIGN-2026-08-20.md` — the failure
   history, the ten traps, the root cause. Everything there still binds, especially: no variants,
   render+look (rule 76), consult scripts run from the MAIN tree only.
2. `docs/ai-workflow/brainstorms/mobbin-30-site-sweep-front-page-2026-08-20.md` — the 55-site
   sweep AND the **binding Key Decisions table** (8 grill answers + world directive).

## 2 · State (all verified this session)

| What | State |
|---|---|
| Worktree/branch | `C:/tmp/sspt-atelier-studio` on `feat/front-page-atelier-run` — **unpushed, 25+ ahead, SHARED with a parallel leads/ButtonLab agent.** Explicit-path staging only. Check `git log` before claiming any file. |
| The board | `scripts/design-brain/atelier/frontpage/journey/` — `build-journey.mjs` (run it to regenerate) + `journey-styles.mjs` + `journey-sections.mjs` → `SwanJourney.dc.html`. Commit `7f332eebd`. PNGs in `_render/` (gitignored). |
| Render gate | `node scripts/design-brain/render-check.mjs --dir scripts/design-brain/atelier/frontpage/journey --widths 1440,414` — **run from tree root; it fails from inside the dir (cost this session twice).** |
| Copy | `scripts/design-brain/atelier/frontpage/copy-pack-full.json` — all 4 CONTRADICTIONS resolved by Sean 2026-08-20: fee copy STRIPPED (no numbers anywhere), "Built with the community", NCEP off headline copy (NASM-protocol framing leads; certs go on a credentials surface), live CTA pair stands. |
| Hero footage | Sean's directive: **original Swans.mp4 for now** (frames harvested: `art/swans-hero-frame.jpg`, `art/swans-frame-b.jpg`). Generated 15s worlds parked. |
| mediasync agent | Owns MiniMax H3 pipeline (`C:/tmp/ss-mediasync`). Two finished 15s films exist (`variants/procession/swan_hero_{alpine-mirror,storm-breaking}_15s.mp4`). **It owes: a journey cut conditioned on a Swans.mp4 still (encode first_frame at 704, NOT 720) + 60fps interpolation before frame extraction.** Request posted in main-tree `review-queue.md`. |
| Panel (next-slice plan) | Brief + 4 seat reviews + synthesis in MAIN tree `docs/ai-workflow/AI-HANDOFF/panel-2026-08-20/` (`NEXT-SLICE-PLAN-BRIEF…`, `next-slice-{KIMI,GROK,GLM,QWEN}.md`, `next-slice-SYNTHESIS.md`). Kimi cost ≤$0.91, single call, Sean-approved 2026-08-20. **Do not re-run the panel on this topic without a fresh yes.** |
| Board (Linear) | **SWA-178** — running log of this program. Update it; never create a duplicate. |

## 3 · The plan from here — FUSED PLAN (3-seat panel consensus: Kimi + Grok + Qwen, GLM hung)

**Read `panel-2026-08-20/next-slice-SYNTHESIS.md` in full before any code.** Headline consensus,
**4/4 independent seats** (GLM landed late): **REJECT building the hero first — owner verdict is
Slice 0.** GLM's adopted upgrade: the verdict instrument is a **motion probe** (scrub sketch +
chrome headline + CTAs, noindexed staging URL, ≤3 days) — a static PNG cannot approve a motion
direction.

- **Slice 0 (this week, survives any verdict):** Sean's verdict via the motion probe · push the branch /
  end the 25-commit unpushed state · artifact-path handoff agreed with mediasync (no shared code
  edits) · analytics baseline on live V4 (CTA + scroll-depth) · `/pricing` stub or consult-path
  block (fee copy currently points nowhere) · decide hydration story · OG/canonical for the route.
- **Slice A (revised):** flagged V5 route, **static-poster hero FIRST** (LCP ≤2.5s @375px/4G,
  real-text headline, preloaded font), then **canvas frame-scrub** (committed; `video.currentTime`
  rejected) behind kill-switch budgets: ≤6MB frames, ≤8ms/frame jank, all-8-width gate.
  `ScrubHero/` pre-decomposed ≤300-line files; copy imported from the pack module, never retyped.
- **Slice B:** section ports — 8-width rule-76 gate + reduced-motion THEME token (every animated
  component) + visible "Illustrative" badge token on SAMPLE data + image optimization.
- **Slice C:** mediasync 60fps master as an artifact drop, flag-swappable vs 30fps set.
- **Slice D:** real data wiring, last.
- **Standing:** rule 76 render+look each slice · WCAG 2.2.2 pause control ships WITH the scrub ·
  Swans.mp4 likeness/usage rights confirmed by Sean pre-release · rollback = server flag default
  OFF + smoke test · sync SWA-178 per slice.

## 4 · Owed by Sean (unchanged unless the panel moved one)

- Verdict on the board direction (gate 1).
- "Your community deserves to own itself" in cta.body — same ownership class as the fixed P1,
  softer form; kept verbatim, needs his call. Two structural section headings need bless/replace
  ("Training, coaching, and everything around it" · "Proof you can measure").
- The canonical fee page (copy now names no number anywhere — by design).
- NEEDS-SEAN-NUMBER stats (marked "№ pending" on the board) · PR #52 (asset-harvest gate) still
  open · parallax-plate palette question (deliberately unfixed).

## 5 · Traps that cost time THIS session (adds to the prior handoff's ten)

1. **Bash cwd resets between turns AND `cd` inside compound commands persists within a turn** —
   render-check/consults died twice. Anchor every command from an absolute tree root.
2. Consult scripts still NO-OP outside the MAIN tree (`.env`); outputs land in the main tree.
3. `git status --cached` is not a thing — `git diff --cached --name-only`.
4. The board's `esc()` writes `&amp;` — grep the pack against the HTML esc-aware or you get
   false MISSes (fidelity harness inside this session's closeout shows the pattern).
5. A decision recorded in one artifact but not its sibling (grill table vs copy-pack
   CONTRADICTIONS) re-creates the contradiction it resolved — sweep siblings when resolving.

## 6 · Hermes memos this session (context, not instructions)

`.ai-workflow/hermes-inbox/pending/` (atelier tree): `…frontpage-sweep-and-grill-eight-decisions-locked.md`,
`…first-board-built-under-the-render-gate.md`, plus the prior session's five (see old handoff §11).
Durable packet from the prior session — **MAIN tree only** (`C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/docs/ai-workflow/hermes-learning-packets/`): `20260821-a-gate-that-scores-adjacent-properties-certifies-the-failure.md`.
