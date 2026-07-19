# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 20260719T015056Z
- **Topic:** Swan design-overhaul — comprehensive NEXT-CHAT handoff prompt written (7/14 shipped, batch closeout)

## What I did / learned
- Wrote + pushed a self-contained resume handoff for the 14-surface design-overhaul program: `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-design-overhaul-2026-07-18.md` (main `47030d025`). Any fresh agent/panel reads it + the tracker and continues exactly.
- **7 surfaces SHIPPED to main this arc (all flag-OFF, Sean-gated):** lens cba39192b, Dashboards 8a8545605, Store bf00e721f, Home 0606edc23, About 816cce70e, Video 7b2b84184, Contact 4e116d3c6. Env flags: DASHBOARD_V2_ENABLED / STORE_V4_ENABLED / HOME_VNEXT_ENABLED / ABOUT_VNEXT_ENABLED / VIDEO_VNEXT_ENABLED / CONTACT_VNEXT_ENABLED (or localStorage ff_* for local preview).
- Handoff captures: git/worktree state, the 7 SHAs+flags, the proven per-surface recipe (foundation/gate/token pattern, consult-kimi --effort medium, bind-only for data/money surfaces), the gotchas (Gemini-is-author-not-gate Rule 46, credential-comment reddens the contract test, reduced-motion needs framer initial=false, absolute kill switch over QA override), the next-work map, and the Living Worlds non-collision rules.

## Why it matters to Hermes
- **PAUSED at #8 Gallery deliberately:** it's billing-critical (`/api/gallery/credits` purchase, VIP conversion, checkout-return, referral — all money-path truth-tested) + SEND-BACK "Core-Loop rewire" (architectural). CLAUDE.md: billing gets no bypass. Recommended a FRESH focused session for it; #9 Photography (non-billing decompose) is the lower-risk alternative next.
- The design-overhaul lane stayed a pure CONSUMER of the lens/world contract throughout — non-colliding with the Living Worlds runtime/design lanes.

## State right now
- Branch `claude/build-swan-lens`; main == `47030d025`; Render deploying docs (no runtime change). All 7 surfaces flag-off → V-prev live. Awaiting Sean's call: fresh session for Gallery vs. take #9 Photography next.

## Sean owes / blockers
- Decide #8 Gallery approach (fresh session recommended) or redirect to #9 Photography.
- Optional: flip any env flag on Render to activate/preview a shipped surface.
