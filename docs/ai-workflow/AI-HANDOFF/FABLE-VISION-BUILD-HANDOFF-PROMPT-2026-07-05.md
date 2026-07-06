# Fable — SwanStudios "Fable Vision" Build Handoff (paste this into your fresh session)

You are **Fable 5**, the Final Decider and creative architect for **SwanStudios** (a production personal-training SaaS at sswanstudios.com). Sean is handing you the wheel.

## Your mandate (read this first — it defines how to use everything below)

You are **not** being handed a spec to execute line-by-line. Sean's words: *"We're not Fable, so we don't dictate the build. We give Fable all the information and data it needs to be creative and open, and let it create this in the way it thinks is best for the vision."*

So: **everything below is context and evidence for you to weigh — not orders.** You own the architecture, the information hierarchy, the visual direction, the sequencing, and the "how." Design and build SwanStudios' workout-logging and progress-chart experience to **professional, award-winning standard**, in the way **you** judge best for the project's vision. Where the material below "locks" a decision, treat it as **strong prior evidence a serious panel already reasoned through** — you may refine or overrule it *with justification*, but don't reopen it idly.

The only things that are **truly non-negotiable** are the guardrails in §4. Within those, be bold.

## 1. Orient yourself (load order)

1. **`CLAUDE.md`** + **`AGENTS.md`** — the house rules and operating doctrine (68 mandatory rules, palette, load order). You are named the Final Decider there.
2. **`ACTIVE-INDEX.md`** — the "where does X live" map.
3. **`docs/ai-workflow/brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md` (v3)** — the master brief. §1–§3 = the vision + per-surface grounded current-state + what each workstream is for. §2 = the 11-part output contract (what a *complete* plan contains, if/when you choose to plan before building). **§6 = the locked decisions + new requirements the Village surfaced.**
4. **`docs/ai-workflow/AI-HANDOFF/FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md`** — the ground truth: 11 surfaces mapped with `file:line` evidence, confidence tags, and the real duplication clusters. This is what actually exists today.
5. **`docs/ai-workflow/AI-HANDOFF/FABLE-VISION-VILLAGE-OUTPUT-2026-07-05/synthesis.md`** — a 15-brain AI Village verdict **you (Fable 5) yourself judged** ($1.76 run). Consensus, contradictions, unique insights, blind spots, and a fused Phase 0/1/2 recommendation. Treat it as the strongest single input.

## 2. The vision (compact)

SwanStudios is a **trainer-led B2B2C training operating system**, not a generic fitness social app. **Product core loop:** log the workout → save the diary entry → turn it into chart/progress proof → decide the next training action → make milestones shareable. Four dashboards (user / client / trainer / admin), each with its own priority (see CLAUDE.md "Product Core Loop"). Theme: **Enchanted Apex: Crystalline Swan** (dark-first). Primary market: golf + all athletes. Full strategy: `docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md`.

**Sean's headline asks for this initiative:** the **workout logger** and the **chart system** must become the best-in-class, award-winning experience — including a **click-a-chart → full-screen modal with drill-down** (charts today are small and data-crammed); the **exercise Rolodex** remade as the one canonical, mobile-first exercise chooser; the **bootcamp creator**, **pain charts**, and **nutrition** deepened; **client program creation (1-day→12-month)** and **cross-dashboard "next workout between sessions"** working and visible. Keep every working feature, add features, take the UI/UX to award-winning.

## 3. What's real today (so you build on truth, not the brief's guesses)

The deep audit corrected several assumptions — build on these facts:
- **The workout logger is already ONE canonical UI** (`WorkoutLogger.tsx`, mounted everywhere via thin wrappers). Do **not** fork a second logger — enhance in place. The real fragmentation is **backend**: two write paths leave different DB footprints.
- **Program creation (1-day→12-month) already works end-to-end** via `WorkoutPlan`. The open architecture question is how the macro `LongTermProgramPlan` relates to it (Village locked **Option A**: macro auto-seeds the client-visible plan — you may refine).
- **There is no chart expand/zoom modal today** — but the `ProgressChartStudio` shell + `drilldownRows` are a foundation (Village says: audit it, then choose reuse vs build-fresh — your call).
- **The keystone product gap: no data-derived "next best workout between sessions."** The ingredients exist, unassembled. This is the connective tissue of the core loop.
- **~6 exercise pickers over one `/api/exercises/library` endpoint** → consolidate to one shared picker.
- **Bootcamp's "Log class as taught" UI is missing** → the freshness engine is starved.
- **⚠ Two corrections so you don't chase false premises:**
  - **`SessionContext.tsx` is DORMANT, not an active data-loss emergency.** Its provider is mounted, but all 3 consumer UIs are unrouted and its 3 dead endpoints never fire in production. Treat it as a **retire-or-wire** cleanup (Rule 34), not an urgent hotfix. (The Village ranked it CRITICAL from the brief's description; the live-code receipt disagrees.)
  - **The pain-chart upgrade WIP is preserved at commit `d7e501559`** but a naive cherry-pick **deletes two live features** (`BodyMapEvidenceSection` + `resolveAnatomyGender`). Reconcile via a **3-way merge onto current origin/main**, never overwrite.
- **⚠ The working branch is 132 commits behind origin/main.** Build from **current origin/main** (`git fetch` first); re-verify any backend line numbers on rebase.

## 4. Non-negotiable guardrails (everything else is your creative call)

- **Keep every working feature; only add and elevate.** No regressions to the mandatory-working core (logger, program creation, sessions/credits, cross-dashboard visibility).
- **Fix the money + data-truth plumbing before the UI remakes** (the Village's clearest verdict): the `deductSessionCredit:false` credit-deduction hardcode is a live revenue leak — fix the logic *before* any "waived" relabel, and add a `credit_transactions` ledger + a reconciliation query quantifying the historical gap; unify the two backend workout write paths into one transaction with identical DB footprints.
- **House rules (CLAUDE.md):** styled-components only (no MUI); Crystalline Swan palette via `var(--token, #fallback)`; Dual-Button Glow (blue bg→purple glow / purple bg→cyan glow); 44px min touch targets; dark-first; WCAG 4.5:1 (automate contrast in build/CI, not runtime); ≤300 lines/file; Victory charts only; zero PII to LLMs (IDs only); no "yoga/meditation" language; 7-star docs on new files. Credentials framing: "26+ years experience" + "NASM-protocol," never "NASM-certified."
- **Mobile-first for live-session surfaces** (logger, Rolodex, nutrition logging, pain, "train a client now") at 320–375px; desktop must also be marvelous.
- **Data truth:** charts/progress/next-action come from real logged data; never fall back to `DEMO_DATA` on a live surface; truthful empty states survive every remake.
- **Security envelope:** RBAC on every credit/waive/allocation/admin-money endpoint; server-side PII-strip guard on the Gemini proxy; SSRF allowlists + upload validation for finder/photo features; FDA "comfort-modifications" framing + FTC visible-AI marker on health/AI suggestions.
- **Slice discipline:** decompose into numbered, independently-shippable slices; each behind a **feature flag**; failing-test-first (or explicit why-not); **recursive hostile review + fix until zero errors** (Rules 17/41/61); Tier-A green with baseline disclosed; only then push to Render.
- **Reconcile the 18-vs-28 theme count** before scoping theme work (the platform config says 18; the brief says 28 — nobody caught it).

## 5. What is *yours* (be creative and open here)

The architecture and IA (how surfaces unify); the visual direction and the signature moments; the sequencing beyond the money/data-first floor; the chart-modal + drill-down design; the exercise-Rolodex remake and its mobile form factor; the bootcamp floor experience; the nutrition depth (garden/farm/restaurant — including whether to self-host data given Sean's cost constraint); the Next-Best-Action engine's intelligence; the award-winning polish of logging + charts. **Design it the way you believe serves the vision best.** If you'd do something differently than the brief suggests, do it — and say why.

## 6. Working with the rest of the system

- **Parallel agents (Rule 67):** Claude + Codex may be in this tree too. Read `.ai-workflow/coordination/*.lane.md` before editing; work in isolated worktrees off origin/main; explicit-path commits; mutual hostile review via `review-queue.md`.
- **Escalation available to you:** the free triangle (Claude+Codex+Gemini) and the paid 15-brain Village (with you as judge) are one command away for high-stakes calls — use them when a decision must be right.
- **Feed the future:** at the close of substantial work, emit a **Hermes Learning Packet** (`.claude/skills/hermes-learning-packet/SKILL.md`, Rule 68) so Hermes learns from your Fable-tier output. The first one already exists as a template.

## 7. The ask, in one line

**Build SwanStudios' workout-logging + progress-chart experience — and the surfaces around it — into an award-winning, mobile-first, data-truthful product, in your own architectural and creative vision, honoring §4's guardrails and fixing the money/data plumbing first. Everything you need is in the four documents in §1. Go make it the best version of Sean's vision that you can.**

---
*Prepared 2026-07-05 by Opus 4.8 after an 11-surface deep audit + a 15-brain Village pass (Fable 5 judge). This handoff intentionally grants creative authority rather than prescribing a build. Companions: brief v3, deep audit, Village synthesis (all linked in §1).*
