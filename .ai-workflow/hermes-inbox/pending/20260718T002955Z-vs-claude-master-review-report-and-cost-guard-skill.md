---
surface: vs-claude
utc: 20260718T002955Z
topic: Master Blueprint Review Report (keystone finding: set not uniformly build-ready) + new cost-guard skill
tags: [design-system, cost-discipline, skill, ai-village, build-readiness]
---

## What I did / learned
- **Wrote + pushed the Master Blueprint Review Report** (one ~9k-token consolidation of all 15 KIMI blueprints, on main 0dd1646e9) so the final-decider panel reviews ONE doc, not 15 (~$1 vs ~$20-40). Consolidating surfaced a KEYSTONE FINDING invisible per-document: **the set is NOT uniformly build-ready.** Swan Lens / Dashboards / Store are build-exact; Home/About/Contact/Video came back SEND-BACK — because those marketing PACKETS told Kimi "be premium" without a canonical token sheet or Crystallize mechanics, so Kimi refused to invent the signature artifact. The FIX is in the set: the Swan Lens blueprint DEFINES the token sheet (18 --lens-core-* tokens with hex values) + the Crystallize (useCrystallizeTransition/CrystallizeOverlay). So: build the lens FIRST → its tokens + Crystallize are the single source every surface consumes → re-pass the 4 SEND-BACK marketing surfaces with those as input.
- **Built the cost-guard skill** (.claude/skills/cost-guard/, on main): codifies Sean's cost discipline — map-reduce before the expensive brain, right-size effort/tokens (not maximums by reflex), free-before-paid, scope the input, estimate+confirm before spend, don't re-fire blind. Target <=$3 / ceiling ~$5 per run. Fires before any paid model call or many-file fan-out.

## Why it matters to Hermes
- **Consolidate-then-review is now doctrine (and a skill).** Feeding N docs to an expensive model (Fable $10/$50) is the reflex that burns money; a cheap/free consolidation into ONE report + a small expensive panel cuts a $20-40 run to ~$1 for the same signal. cost-guard enforces this every time.
- **Cross-surface consolidation catches what per-document review misses.** Four blueprints looked fine individually but shared a root gap (no published token sheet). Always do a consolidated cross-surface pass before treating a multi-doc set as build-ready.
- **The design blueprint set's real build-readiness:** build-exact = Swan Lens, Dashboards, Store. Needs re-pass = Home, About, Video (supply lens tokens + Crystallize). Near-ready = Cover/Gallery, Contact, Photography. Universal build gates: CI grep for Galaxy palette incl. rgba() channel literals + var() fallbacks; token sheet must mark text-legal vs decorative (wing-purple text on obsidian fails 4.5:1); Vite flags are BUILD-TIME (flip = redeploy) + lazy-load side-by-side versions.

## State right now
- On main: 15 blueprints + index + Master Review Report + fresh-agent build handoff + cost-guard skill + Hermes memos. Deploy healthy.
- Village NOT fired. The cheap final panel = big-three (consult-fable + consult-sol-high + consult-kimi-design) each on the ONE report ≈ $1; awaiting Sean's go (Rule 16). No 19-brain orchestrator wiring needed for this.
- Design-skill + design-brain remain CANDIDATES (not swapped live until Sean approves).

## Sean owes / blockers
- Go/no-go on firing the ~$1 big-three panel review of the Master Report.
- Skim the Swan Lens blueprint (the keystone) to greenlight the build; then a fresh agent builds per NEXT-CHAT-PROMPT-build-from-kimi-blueprints-2026-07-17.md.
