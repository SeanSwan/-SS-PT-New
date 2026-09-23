---
name: the-modern-replacement-can-carry-a-heavier-dependency
title: Confirming an API exists is not confirming it works in your execution mode — the post-deprecation replacement pulled in an asset-library dependency that fails headless
originating_model: claude-fable-5
tier: fable
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider (Sean 2026-06-10); Opus 5 / Kimi K3 designated Fable-tier 2026-08-10
date: 2026-08-25
decision: When a deprecated API is replaced, audit what the REPLACEMENT depends on at runtime — not just that its name resolves. Verify against your actual execution mode (headless, CI, sandbox), because the replacement is often a higher-level construct with dependencies the original never had
status: current
reviewed_by: self (audit prompted by a panel hypothesis that was itself disproven)
supersedes: none
surface: tools/blender (asset pipeline)
commit: 8d6b36ea5
models_used:
  - model: claude-fable-5
    role: builder, auditor
    did: audited every bpy call against documented 4.5 behaviour; disproved the seat's hypothesis; found the heavier defect behind it; replaced the stage with an asset-free bmesh equivalent
    cost: subscription
  - model: glm-5.3
    role: hostile reviewer (prior panel)
    did: hypothesised a crash on Mesh.use_auto_smooth, flagged honestly as a hypothesis. WRONG in mechanism — the pipe never used it. Right about the file: the stage it named held a worse defect
    cost: $0
skills_touched:
  - id: instrument-check
    change: extended
    failure: "the API name resolves" was treated as "the call works". A name check is not a runtime check when the callee loads external resources
  - id: rule-51 (confidence tags)
    change: reinforced
    failure: the previous commit's docblock claimed the module was "written against the 4.5 LTS API", asserting a verification never performed. Now each call is marked OK or UNVERIFIED individually
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# The modern replacement can carry a heavier dependency than the thing it replaced

## What was decided/built (Fable-tier lesson)

A reviewer predicted a Blender pipeline would crash because `Mesh.use_auto_smooth` was removed in 4.1. The prediction was wrong — the pipeline never used it. It used `bpy.ops.object.shade_auto_smooth()`, the sanctioned post-4.1 replacement, which exists and resolves fine in 4.2 and 4.5.

Checking anyway found something worse. The replacement is not a plain operator: it applies a **"Smooth by Angle" geometry-node asset**, loaded from the user's asset library. Upstream carries open reports of it failing with `RuntimeError: No asset found at path`, with background/headless runs among the reported conditions. This pipeline's entire reason for existing is to run `blender -b` in automation.

So the stage most likely to fail on first run was the one that had *already been modernised correctly*. The fix was to stop delegating: mark sharp edges directly in bmesh by face-pair angle and shade smooth. Same pre-4.1 semantics, no asset library, no geometry-node evaluation, works on any 4.x, headless-safe.

## Why (the rationale Hermes should carry forward)

Deprecation guidance optimises for the interactive user. When a low-level property is replaced by a higher-level construct — a node asset, a modifier, a service call, a managed wrapper — the replacement usually gains dependencies the original never had: an asset library, a config lookup, a network round-trip, a UI context. Those dependencies are invisible in the migration note and invisible in the API reference, and they are exactly what breaks in automation.

"I used the current API" is therefore not a safety claim. The safety claim is "I used the current API **and** checked what it depends on **in the mode I actually run**."

The secondary lesson is about review economics: the reviewer's hypothesis was **wrong in mechanism and right in location**. It pointed at the one stage that mattered. A disproven finding that sends you to the right file has paid for itself — which is an argument against scoring reviewers purely on hit rate.

## Reusable pattern / rule Hermes should apply next time

1. **After confirming a replacement API exists, ask what it loads.** Node assets, addons, templates, presets, service endpoints, a UI context. Anything resolved at call time is a dependency your execution mode may not satisfy.
2. **Search the replacement's name plus your execution mode** ("headless", "background", "CI", "docker") before trusting it. The failure reports live there, not in the migration guide.
3. **Prefer the primitive when the high-level construct only saves typing.** Twenty lines of bmesh with no external resolution beat one operator that reaches into an asset library.
4. **Mark each audited call OK or UNVERIFIED individually.** A blanket "written against the 4.5 API" is an unverifiable claim that reads as verification — the same shape as any other confident statement about an artifact you have not checked.
5. **Documentation raises confidence; it does not reach proof.** Say which one you have.

## Who did what

GLM 5.3 supplied the hypothesis and labelled it a hypothesis. I disproved its mechanism and found the real defect one layer down. Neither of us can execute Blender, and both of us said so.

## Skills created or changed

- `instrument-check` extended: "the name resolves" is a weaker check than "the call runs here."
- `swan_pipe.py` now carries a per-call audit table with explicit OK / UNVERIFIED, replacing a blanket claim.

## Mistakes I made

- The previous commit's docblock said the module was "written against the 4.5 LTS API." That asserted a verification I had not performed — the same shape as the false grounding row I shipped to five paid reviewers this morning, at smaller scale. Fixed by marking each call individually.
- I let a high-level operator into an automation pipeline without asking what it loads. The whole point of the module is unattended execution.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| **Confident claim about an artifact I had not checked** | **3** (the false catalog row; "the split didn't break anything"; "written against the 4.5 LTS API") | yes, twice today | Per-item explicit marking. The blanket claim is the tell — a sentence covering N things verifies none of them |
| High-level API pulled into automation without a dependency check | 1 | no | Search the API name with the execution mode before trusting it |

## External-model calibration

GLM 5.3: hypothesis wrong in mechanism, right in location, honestly labelled, $0. **Do not score a seat on hit rate alone** — a disproven finding that points at the right file bought the real defect here.

## Risks / guardrails

- `swan_pipe.py` remains UNRUN. `uv.smart_project` kwargs and `export_scene.gltf` in background mode are both explicitly UNVERIFIED and must be checked on the first real run.
- Nothing installed, nothing pushed.

## Provenance & privacy

originating_model claude-fable-5 · tier gate PASS · secret scan clean · IDs/roles only.
