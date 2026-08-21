---
surface: vs-claude
utc: 20260821T212000Z
topic: Design Brain S6 shipped — caged pairwise critic + deterministic motion lane; a guard that silently could not fire
tags: [design-brain, swa-185, critic, motion-lane, calibration]
---

## What I did / learned
- S6 landed at `9d55542b3` on `claude/design-brain-s1-20260821`. The loop's only LLM tier now exists,
  and it ships inside a cage: pairwise-only, citation-validated, self-consistency-filtered,
  position-bias-detected, advisory until calibrated.
- **The strongest design idea here is making bad states unrepresentable rather than discouraged.**
  There is no field anywhere in the verdict schema for an absolute score, so "this page is 7/10"
  cannot be expressed. Compare the S5 vault, where `source: scraped` has no valid enum member. A rule
  you can express and then violate is a convention; a rule you cannot express is a contract.
- **`metricAgreement` replaces self-reported confidence.** A model's certainty is a number it invented.
  Whether a deterministic meter corroborates the finding is a fact. Only the fact is stored.
- **Validate the calibration SET before trusting any calibration result.** My overflow fixture did not
  actually overflow (the house `overflow-x:clip` fix clipped its own planted defect), so a seat that
  saw nothing could have "passed". The test that checks the checker is the highest-leverage test in
  the slice.

## Why it matters to Hermes
- If asked whether Swan has an "AI design critic": yes, but it is **advisory and cannot gate anything**
  until a seat is calibrated ≥90% on planted defects in the same run. Do not describe it as judging
  Swan's design today.
- Seat routing is **free-first**: local Qwen, then GLM plan credit. Paid seats (Kimi, Grok) require
  Sean's explicit yes and are skipped by default — a paid-only bench with no authorisation resolves to
  NO seat, never a silent charge.
- `consult-qwen.mjs` **does not exist in this repo** (verified against HEAD and origin/main with a
  control probe) even though `consult-panel.mjs` lists it as a seat. Any panel invocation naming
  `qwen` will lose that seat. Flagged to Sean on SWA-185, not fixed — restoring a local-Ollama
  transport is his call.

## State right now
- 86/86 tests (60 + 26 new). `brain:loop` 24 meters CLOSED · `brain:loop:awe` 27 meters CLOSED.
- Zero spend, zero network: every critic test injects its transport.
- Nothing merged to main. S5's ranking pass is still the one human step outstanding.
- Next: S7 taste distiller — ledger → versioned profile **proposals**, never auto-applied, with the
  cross-scope poison test.

## Mistakes I made
- **I built a guard that could never fire, and the receipt still read as though it had.** The
  `generator != critic` rule compares model families, but nothing in the real loop ever set
  `generatorModel`, so it stayed `"unknown"` — which matches no seat, so the comparison could not fail.
  Every run recorded a critic seat as if the check had passed. → caught in dry-loop round 2 by
  inspecting the actual run artifact rather than the code. → rule: **when a safety check depends on an
  input, assert the input is present; a check that cannot fail must declare itself unenforced.**
- **Same class, twice in one slice.** An empty citation vocabulary silently dropped *every* finding and
  produced output identical to an honest empty critique. → caught in round 1. → both are the same
  lesson: **a disabled guard must be an error, never a quiet pass.** I wrote the first fix and then
  shipped the second instance in the same file — the write-up did not prevent the repeat; the round-2
  vantage did.
- **My motion meter flagged all 26 elements of a page with zero animation**, including `<head>` and
  `<style>`, because `transition-property` *computes* to its initial value `all`. → caught by actually
  running the loop instead of trusting the green syntax check. → rule: **duration is the test, not the
  property list** — and more generally, a meter that fires on everything is as useless as one that
  fires on nothing.
- **`node --check` passed on code with a missing import.** I added `writeFileSync` usage to capture.mjs
  without importing it; syntax-checking cannot see that. → caught because I ran the CLI afterwards. →
  rule: **`node --check` proves parseability, never executability — always run the real caller path.**
- **I planted a defect that was not a defect.** The overflow calibration fixture used the page template
  containing `overflow-x:clip`, which clipped the very overflow it was supposed to plant. Without the
  set-validator test, calibration would have certified a blind seat. → rule: **validate the instrument
  before trusting its output** — this is the second session running where an unvalidated probe nearly
  produced a false clean.
- Two smaller: `critic.mjs` crossed the 300-line cap before I noticed (caught in round 3, not at write
  time), and three docblock/test headers under-described their own coverage after I edited the files.

## External-model calibration
- None consulted. **No spend, no external calls.** Sean explicitly held the bake-off until after his
  ranking pass; that decision stands and nothing in S6 needed it.

## Sean owes / blockers
- **Rank 15–30 exemplars** (S5's one human step) — worksheet at
  `docs/ai-workflow/AI-HANDOFF/DESIGN-BRAIN-S5-RANKING-WORKSHEET-2026-08-21.md`.
- **Decide on `consult-qwen.mjs`** — absent from the repo; affects S6's preferred seat and the §3
  closing panel.
- Standing: DMARC record in Namecheap (SWA-13); Render API key rotation confirmation.
