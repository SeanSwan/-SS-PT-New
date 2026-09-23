---
date: 2026-09-02
originating_model: claude-fable-5
title: Style reference copies aesthetics; identity needs edit-conditioning - and a promised mode is a hypothesis until rendered
models_used:
  - model: claude-fable-5
    role: hostile reviewer + researcher + builder
    did: attacked its own prior claim, researched the real mechanism, proved it by execution, shipped workflow 05
    cost: subscription
  - model: glm-5.3 / glm-5.3-flash
    role: prior-round hostile reviewers
    did: 11 verified defects (prior packet); did NOT catch this one - it lived in a chat promise, not an artifact
    cost: subscription (Z.ai)
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: a capability promised from memory ("Krea 2 has an image-reference mode") was never executed before being promised to Sean
---

# Style reference copies aesthetics; identity needs edit-conditioning

While planning the avatar pipeline I promised "Krea 2's image-reference mode" would generate
varied shots of one face. Hostile-reviewing my own work as Fable, that claim failed inspection:
the only shipped local template is a STYLE reference - it transfers aesthetic, not identity - and
I had never rendered anything through it. The claim lived only in chat, which is why two rounds of
external review (which saw artifacts, not conversation) never caught it.

The real mechanism, found by research and then PROVEN by execution: **`TextEncodeQwenImageEditPlus`
(reference image embedded into conditioning) + `ReferenceLatent` (reference latent attached)** -
both core ComfyUI nodes, present in 0.34.2, working with the Krea 2 turbo weights already on disk.
Zero new downloads. Hero still re-rendered as the same face in a new scene in 30.0s (seed 99);
ident