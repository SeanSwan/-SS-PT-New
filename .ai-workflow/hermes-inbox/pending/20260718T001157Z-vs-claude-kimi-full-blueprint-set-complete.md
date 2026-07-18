---
surface: vs-claude
utc: 20260718T001157Z
topic: COMPLETE KIMI build-exact blueprint set for the whole SwanStudios design surface — committed, pending Village review + build
tags: [design-system, kimi, blueprints, ai-village, build-standard]
---

## What I did / learned
- **Committed the complete KIMI blueprint set** (a74503f40, branch claude/kimi-design-blueprints-20260717 off origin/main 96ac6bd3d, NOT pushed): 15 build-exact blueprints covering every SwanStudios design surface — swan lens (foundation), dashboard system (4 role densities), store, cover/gallery, video, photography, home, about, contact, design-skill redo (candidate), design-brain enhance (candidate), original-prompt review, world-atmosphere, world-generator master prompt. Index: KIMI-BLUEPRINT-SET-INDEX-2026-07-17.md.
- **The build standard baked into every blueprint (Sean's hard rules):** BUILD-EXACT (Kimi = architect; a builder builds it verbatim, zero decisions; Opus injects zero design decisions) · FULL-STACK REAL, no mocks (real API/model binding named, new-backend surfaces flagged) · REVERSIBLE (next-version component + feature flag + additive-only backend; original always revertible). Two Sean design rulings are now brand law: optics-not-creatures (renderer has NO arbitrary-geometry primitive → a creature is unauthorable; whale=sonar light, swan=the Crystallize) and rainbows-as-real-dispersion-physics (never striped arcs).
- **consult-kimi orchestration method (reusable):** the script is a REVIEW tool by construction (template ends "PRODUCE YOUR REVIEW NOW") — to get authoring, override --remit. Empty-response = effort=high burning the whole budget on reasoning → fix with --effort medium. Big build-exact blueprints EXCEED 16k output (store needed 28,837 tokens; dashboards 19k; brain 30k) and take >10 min (store 14 min) → I made max_tokens and the request timeout env-configurable (SWAN_KIMI_MAX_TOKENS / SWAN_KIMI_TIMEOUT_MS, defaults 16k/15min). Those two edits live in the working tree; consult-kimi.mjs is NOT on origin/main (shipped on another branch today) so the edits belong on ITS home branch, not the blueprint branch.
- **Always parse-validate embedded artifacts + re-verify patched docs:** earlier the world-generator's own patched JSON had 3 self-contradictions caught only by a confirm pass; here I node-JSON.parsed canonical WorldScripts and re-ran completeness checks.

## Why it matters to Hermes
- **A complete, build-ready design blueprint set now exists** — when Sean greenlights building, the builder follows these verbatim (per-surface, reversible), not a vague interpretation. This is the design foundation for the next big build phase.
- **Kimi K3 is the design ARCHITECT in this workflow, Opus is orchestrator/verifier only.** Sean's explicit doctrine: "build it exactly the way Kimi would, not the way Opus would reinterpret it." Don't let Opus inject design taste into a Kimi-authored build.
- **AI Village roster ruling (Sean, 2026-07-17):** for the planned Village review of these blueprints — Kimi = DESIGN-SLOT voting brain ONLY (Chinese-provider policy-compliant, no broad exception); Fable 5 available via OpenRouter; GPT-5.6 Sol on HIGH to be added. Fable+Sol+Kimi are NOT wired into validation-orchestrator.mjs yet — wiring = a careful slice + Codex review (touches the Chinese-provider fence + spend gate), THEN cost estimate, THEN Sean confirms the spend (Rule 16). No paid run without the estimate + explicit go.
- **Branch hygiene lesson (again):** the physical checkout is on stale wip (697 behind); consult-kimi.mjs isn't even on origin/main. Cut build/commit branches from origin/main and verify each file's real home before committing across branches.

## State right now
- Blueprint set: COMPLETE + committed (a74503f40, unpushed). Design-skill + design-brain are CANDIDATES — not swapped into the live skill/brain until Sean approves (git preserves originals).
- Kimi spend this session: ~$5.2 across ~18 calls, all design-scoped/PII-free, on verified origin/main. Nothing paid beyond Kimi; the Village is NOT fired.
- NEXT (Sean's decided sequence): Sean skims the foundation blueprints (swan-lens + design-skill + design-brain) → free triangle across the set (launcher down → API path) → wire the Village roster (careful slice + Codex) → cost estimate → Sean confirm → paid ~19-brain Village → build.

## Sean owes / blockers
- Sean is skimming the foundation blueprints now; work paused on his read before more Village/build effort.
- Standing product decisions still open: swan-mark-into-default-world (deferred); home Swan-CTA video is NOT royalty-free (backup hero is required in the home blueprint); B3/B5 Coach voice paywall (earlier).
