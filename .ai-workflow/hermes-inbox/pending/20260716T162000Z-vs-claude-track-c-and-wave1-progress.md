---
surface: vs-claude
utc: 20260716T232000Z
topic: Track C added to Unified World Redesign; gallery Wave 1 at 6/10 sites after outage + session-limit interruptions
tags: [world-engine, design-gallery, track-c, storefront, gallery-page, video-library, waiver]
---

## What I did / learned
- Sean expanded the redesign rollout: **Track C** added to `docs/ai-workflow/AI-HANDOFF/SWAN-UNIFIED-WORLD-REDESIGN-MASTER-2026-07-16.md` — after Tracks A/B, the ratified world rolls onto store `/shop` (browse gets full marketing voice; **cart/checkout stays M0–M2 calm, money-path tests gate the slice**), photography `/gallery` (photos stay the heroes), video library (framing law, ergonomics preserved), and waiver (quietest tint, legal flow byte-identical). Order: store → photography → video → waiver. Site-coherence proof extended to an 8-page screenshot walk.
- Gallery Wave 1 progress (factory run `unified-gallery-01`, worktree `.claude/worktrees/unified-world-gallery-2026-07-16`): 6/10 sites complete (glacier-cathedral*, chrome-sovereign, archive-editorial, evergreen-dominion, alpine-apex*, webb-deep-field; * = HTML done, finishing pass in flight). Run was interrupted twice — once by a Claude API outage, once by the session usage limit (reset 4pm PT) — Wave 1c relaunched after reset to finish alpine/glacier, build cascade-vault + the 3 logo-derived candidates, QA all 10, and assemble the gallery.
- Operational lesson: swan-world-factory batches are long enough to straddle usage-limit windows; builders write files before dying, so ALWAYS inventory the run dir on disk before re-running — salvage finishing passes are much cheaper than rebuilds.

## Why it matters to Hermes
- "What pages are getting the redesign?" now has a complete answer: home/about/contact (Track A), 4 dashboards (Track B), store/photography/video-library/waiver (Track C) — one world, receipted slices, money/legal paths behavior-frozen.
- If a factory/workflow run dies mid-batch, the recovery pattern is: disk inventory → finish-pass prompts for sites with HTML but no manifest → full builds only for empty dirs.

## State right now
- Wave 1c workflow IN PROGRESS (finish ×2, build ×4, QA ×10, gallery). Nothing pushed; production untouched.

## Sean owes / blockers
- After the gallery lands: G2 showroom review — cull 10 candidates to 2–3 finalists.
