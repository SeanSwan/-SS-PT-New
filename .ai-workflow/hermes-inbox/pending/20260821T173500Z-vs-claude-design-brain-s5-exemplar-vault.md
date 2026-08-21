---
surface: vs-claude
utc: 20260821T173500Z
topic: Design Brain S5 shipped — exemplar vault, spend-gated bake-off, surface-typed materials; three self-inflicted defects found by the dry-loop
tags: [design-brain, swa-185, exemplar-vault, bakeoff, spend-gate]
---

## What I did / learned
- S5 landed on `claude/design-brain-s1-20260821` @ `469389a9e`. Three writers, each with a reader in
  the same commit: the exemplar vault, the blind bake-off harness, and the `awe_photo` materials
  resolver.
- **"Good" is now a picture, not an adjective.** Doctrine adjectives (cinematic/crystalline/premium)
  are refused in generator prompts, because a generator resolves them into glow+blur — the adjective
  IS the slop pathway. Intent now lives in ranked exemplars, budgets and denylists.
- **The vault has two hard laws.** `source: scraped` has no valid representation in the enum
  (licensing — it cannot be expressed, not merely discouraged). And `source: fixture` is excluded
  from consumption unless a caller opts in, with the opt-in recorded in the plan and shouted at the
  CLI, so a fixture-steered run cannot be mistaken for production.
- **Crop ids derive from geometry, never from `skeleton_id`.** Deriving them from the id would make
  the law "never one plate world skinned N ways" tautologically true and enforce nothing. Geometry-
  derived ids make recolored twins collide, and a fleet-wide check turns that collision into a halt.
  Generalisable: *if a uniqueness law is satisfied by construction, it is decoration, not a gate.*
- Bake-off is **built but never fired**. Default invocation is a free estimate; generation needs
  explicit confirm, enforces a hard cap before the first call and between calls, and never retries a
  failure (a retry is an unbudgeted second charge). Zero spend this session.

## Why it matters to Hermes
- If asked about Design Brain progress: S1–S5 are on the branch, **nothing is merged to main**, and
  merge is Sean+Fable-gated. Do not describe S5 as live on production.
- If asked "why does the awe surface fail?" — that is **designed behaviour**, not a bug. Until Sean
  ranks exemplars, `awe_photo` refuses to render rather than invent a hero. `type_data` surfaces
  (storefront) are unaffected and run normally.
- One human step is genuinely blocking S5b: Sean ranking 15–30 examples. Worksheet is committed at
  `docs/ai-workflow/AI-HANDOFF/DESIGN-BRAIN-S5-RANKING-WORKSHEET-2026-08-21.md`.

## State right now
- 60/60 tests pass (33 pre-existing + 27 new), four consecutive clean full-suite runs.
- `brain:loop` 17 meters CLOSED · `brain:loop:awe` 20 meters CLOSED with a plate resolved and decoded
  in a real browser · vault + bakeoff CLIs green · secret scan clean on 26 staged files.
- Vault holds 4 `source: fixture` placeholders only — **0 consumable**. That is the honest state.
- `ASPIRATIONAL(S5b)` tagged, not faked: the blind-sort acceptance needs real anchors and is not claimed.
- Next: S6 (calibrated pairwise critic + motion lane), then S7–S10, then the closing hostile panel.

## Mistakes I made
- **I shipped the repo's most-repeated bug class again — twice in one slice.** `shared/contactSheet.mjs`
  literally documents that this codebase has produced "a count of attempts is not a count of outcomes"
  three times. I made it four and five: (1) I stamped `data-plate-crop` and added an `<img>` but wrote
  **no meter proving the image loaded** — a 404 hero would have passed all 17 gates; (2) `REVISE`
  re-rendered without plates, so an awe surface needing a contrast fix shipped with **no hero at all**
  while `all_meters_pass` stayed `true`. → caught by my own hostile dry-loop rounds 1 and 2, and I
  *reproduced #2 with a runnable script before fixing it* rather than trusting the reading. → rule:
  **measure the OUTCOME (naturalWidth), never the attempt (tag present); and when a second render path
  exists, collapse it to one — two paths where only one is exercised is how this class survives.**
- **I claimed a clean static-intelligence gate off an unvalidated probe.** I parsed fallow's JSON for
  keys (`deadCode`/`items`/`results`) that do not exist, got `0 findings`, and nearly reported the gate
  green. Real baseline is **7,530 pre-existing issues**. → caught by validating the instrument before
  believing its negative. → rule: **an absence claim requires proving the probe can detect a presence
  first.** This is the exact failure my own memory warns about (`validate_probe_before_absence_claim`),
  and I did it anyway — so the write-up alone did not prevent the repeat; only running the shape probe did.
- **I let a test file reach 335 lines, breaching the Rule 4 300-line cap**, and only found it while
  auditing for something else. → caught in dry-loop round 5. → rule: check the cap when appending to a
  file, not at closeout; the pre-commit `frontend-guards` hook does not cover `scripts/`.
- **I declared the parallel-Chromium flake fixed after one green run.** Consolidating browser tests into
  one file did not fix it; run 2 failed again. The real cause was screenshotting in the same tick as a
  viewport resize. → caught by running the suite 3× instead of once. → rule: **a flake is disproven by
  repetition, not by one green run** — I now run 4× before calling an intermittent failure fixed.
- Two smaller ones: a heredoc silently truncated at ~11KB and produced no file (switched to the Write
  tool for large files); and I wrote a doc referencing a worksheet path that did not exist yet — a
  dangling reference I created and then caught in the same round.

## External-model calibration
- None consulted. No paid seat was used and **no spend was incurred** this session. The bake-off harness
  that *would* spend is built, tested at zero cost with an injected generator, and refuses to fire
  without Sean's explicit yes.

## Sean owes / blockers
- **Rank 15–30 exemplars** (the one human step in S5) — worksheet path above. Reply syntax is one line
  per item: `<id> win|fail|borderline — <one clause of why>`. Skipping items is a valid answer.
- Standing, unrelated to this slice: DMARC record in Namecheap (SWA-13); Render API key rotation
  confirmation.
