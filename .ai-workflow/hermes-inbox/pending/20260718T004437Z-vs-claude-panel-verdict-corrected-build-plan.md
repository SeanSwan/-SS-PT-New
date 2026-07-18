---
surface: vs-claude
utc: 20260718T004437Z
topic: Big-three panel ruled on the blueprint set — GO on vision + a Slice-0 plan-fix; corrected build plan on main
tags: [design-system, ai-village, build-plan, cost-discipline]
---

## What I did / learned
- **Ran the cheap final panel** (Fable + Sol-5.6-high + Kimi-design, each on the ONE Master Review Report, ~$0.31 total — validating the cost-guard map-reduce: same signal a $20-40 19-brain run would give). Verdicts: Fable **GO-WITH-CHANGES** ("Build", keystone endorsed); Sol **UNSOUND** (real plan-rigor holes); Kimi **ACCURATE-WITH-CORRECTIONS** + a meta-catch (the panel reviewed the SYNTHESIS, not the 15 blueprints — no --seed — so strategy validated, source-fidelity unverified).
- **Synthesized → GO on the vision, run a Slice-0 foundations/plan-fix first.** On main: PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN-2026-07-17.md (supersedes Master Report §5 + the fresh-agent handoff build order).
- **The panel caught real things my consolidation missed:** (1) status contradictions (I labeled Contact 3 ways — SEND-BACK is Home/About/Video only); (2) I oversold the keystone — tokens+Crystallize do NOT supply the marketing pages' signature moment + CTA hierarchy, so the re-passes need full design deliverables; (3) **the de-Galaxy grep gate is a hole** — it misses named colors aqua/cyan (= #00FFFF exactly), 8-digit/space-rgb/hsla, SVG fill/canvas/.theme.ts, and binary assets (a starfield PNG passes every grep) → needs token/AST lint + perceptual asset review + gate-zero self-application; (4) Fable-vs-Sol conflict (lens-owned tokens vs standalone artifact) resolved by Kimi: author the token schema + Crystallize contract as standalone versioned artifacts DURING the lens build — do both.

## Why it matters to Hermes
- **A dissenting panel is worth more than a rubber-stamp.** Fable alone said "build"; Sol's UNSOUND + Kimi's corrections hardened the plan for ~$0.20 more. When a design/architecture set is about to drive a big build, run the 2-3 dissent brains, not just the decider.
- **grep is NOT a real enforcement boundary for a banned palette.** Named colors (aqua/cyan = #00FFFF), alpha/shorthand hex, rgb() spacing variants, SVG/canvas/theme-object colors, and binary image assets all evade it. Use token/AST linting + perceptual asset review + self-application to the new tokens. This is a reusable lesson for any "ban a color/pattern" task.
- **Two reversibility modes must be distinguished:** build-time flag = redeploy rollback (NOT instant); runtime remote-config = both chunks deployed, instant rollback. Money/PII surfaces need runtime. ErrorBoundary alone is not fail-closed; additive-only backend is not reversible when there are dual writes/uploads/jobs.
- **When you run a review panel, ATTACH the source (--seed), not just your synthesis** — else the panel validates strategy but cannot verify fidelity (Kimi's catch).

## State right now
- On main: 15 blueprints + index + Master Review Report + fresh-agent handoff + cost-guard skill + 3 panel verdicts + the corrected build plan. Deploy healthy.
- The corrected plan = Slice 0 (7 fixes) -> Lens(+de-Galaxy AST lint day0) -> Dashboards -> Store, with Home/About/Video re-passes in parallel once tokens freeze, then Contact -> Cover/Gallery.
- Design-skill + design-brain remain CANDIDATES; the panel says approve them FIRST (or mark non-authoritative) since they encode the build rules; Sean = human owner ratifies.

## Sean owes / blockers
- Ratify the corrected plan + the Skill/Brain candidates (approve-first) to start Slice 0.
- Then a fresh agent (or this lane) builds per PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN + NEXT-CHAT-PROMPT-build-from-kimi-blueprints.
