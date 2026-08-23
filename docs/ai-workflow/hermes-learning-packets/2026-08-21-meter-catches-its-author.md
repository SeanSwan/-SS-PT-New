---
schema: 1.1.0
date: 2026-08-21
originating_model: claude-fable-5
tier_basis: claude-fable-5 is Fable-tier by definition (Rule 68 source gate)
topic: A documented lesson repeated anyway — until a machine meter made repeating it impossible
decision: deterministic tier S1-S4 complete; degradation policy fail-closed; margin reset baked into the render compiler
status: shipped (branch claude/design-brain-s1-20260821, commits 8cb4c7d31..6d5684918)
privacy: IDs/roles only; no client data; no secrets (pre-commit staged-blob scan CLEAN on all four commits)
models_used:
  - model: claude-fable-5 / sole builder + hostile reviewer / built S1-S4 of the Design Brain loop across four slices, 33 tests / subscription
skills_touched:
  - id: design-brain loop (scripts/design-brain/loop) / created / motivating failure — the panel-confirmed writer-without-reader disease and generation-time slop priors
  - id: gummy-scroll lesson (memory project_gummy_scroll_fixed_master_prompt_v3) / re-validated the hard way / the recurring overflow class recurred AGAIN in freshly-written code
---

# The write-up was not the fix. The meter is the fix.

## The lesson

In 2026-07 this project documented the "gummy scroll" bug class: unscoped page styles cause horizontal overflow; the surviving correction was recorded as "use `overflow-x: clip`". One month later I — the model that can read that memory — wrote a fresh render compiler (Design Brain S1) with an unreset body margin, shipping exactly that class again: 8px of horizontal overflow at 375px. Two slices later, the browser-capture meter I built in S3 measured the live DOM of my own render and failed it: `scrollWidth 383 > innerWidth 375`. Only then was the class fixed at source (margin reset + `overflow-x: clip` baked into the compiler, not patched per page).

**A documented lesson that depends on the author remembering it will be repeated. The correction that survives is the one a machine applies: a meter that fails the build, or a default baked into the generator.** This is the same law the project already learned for closeout duties (the Stop hooks at n=443) — now proven for design defects: the write-up recorded the fix; the METER enforces it. Rate every "lesson learned" by asking: which gate now fires without anyone remembering?

Corollary proven the same hour: **a verification lane earns trust by catching its own author.** The S3 browser lane's first real run flagged a defect in code written by the same agent that wrote the lane. That is the calibration evidence that matters — planted-defect tests prove a meter CAN fire; catching an un-planted, author-made defect proves it DOES.

## Who did what

claude-fable-5 built all four slices solo (panel-designed, deterministic tier only — no LLM critique exists yet by design) and served as its own hostile reviewer under the dry-loop law: five rounds per slice, with real defects found in rounds 1–3 of every slice (fixture arithmetic, misleading messages, a duplicate identifier, the overflow). No slice shipped from a first draft. No external models were consulted for S1–S4 — every check in this tier is arithmetic, and paying a reviewer to check arithmetic a test can check is spend without signal.

## Skills created or changed

The Design Brain loop itself (state machine, divergence engine, denylist, content linter, browser capture) — created against the failure the six-seat panel unanimously named: artifacts with writers and no consumers, and slop produced at generation time rather than merely uncaught. No .claude skills changed; router integration is deliberately deferred until the loop has its LLM tier (S6), so the skill surface never advertises capability that is half-built — the exact trailhead-truth failure the constitution bans.

## Mistakes I made

- Repeated the documented gummy-scroll overflow class in fresh code (unreset body margin in the S1 render), one month after the project wrote the lesson down. Caught by my own S3 meter, not by my memory. This is the packet's headline lesson.
- Shipped S1's "pixel delta" acceptance claim as attribute-only stamps until my own hostile round flagged it against the panel's "brief ≠ pixels" bar; hero layout now genuinely varies.
- Built a false contrast meter in S1 (button label judged against the section behind the button); caught by test T7, fixed to own-background pairing.
- Wrote a ranking-test fixture whose clone carried both its own and the original's scoring tokens (S2), and two mislabeled/incomplete diagnostics (S2 denylist entry name, S4 exclusion-count message). Every one caught in-session by the dry-loop, none by first-draft care.

## Error → fix → repeat ledger

- **Unscoped-overflow class (gummy scroll):** recurrences across sessions: ≥2 (2026-07 original, 2026-08-21 mine). Was written up before recurring: YES — which is the point. What finally stopped it: a browser meter that fails any render with `scrollWidth > innerWidth`, plus the reset baked into the compiler. Watch: zero recurrences possible in loop-rendered pages now; production React surfaces remain exposed until S8.
- **Labels/messages describing less than the code does** (denylist entry name, exclusion counts): 2 occurrences this workstream, both caught in hostile rounds. Procedural fix: every rejection lane added to a subsystem must appear in that subsystem's failure messages in the same commit.
- **Instrument-not-validated:** 1 occurrence (broken MSYS junctions trusted until `ls` failed); re-probed before use. Prior lesson generalized, no in-class repeat this session.

## External-model calibration

None consulted for S1–S4 (deterministic tier — arithmetic needs tests, not reviewers). The six-seat panel calibration from the 2026-08-21 packet stands unchanged; next external spend is earmarked for S6's critic-model selection, where a different model family from the generator is a hard requirement.
