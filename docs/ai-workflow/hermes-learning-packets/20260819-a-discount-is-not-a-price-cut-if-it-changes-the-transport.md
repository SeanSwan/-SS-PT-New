---
title: "A discount is not a price cut if it changes the transport"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stamped, self-reported in environment block) — on the Rule 68 tier_allowlist in _schema.json"
date: 2026-08-19
decision: "Reject OpenRouter ':batch' listings for interactive review (50% off, but async 24h transport, saves ~$0.09/review); pin the Sol seat to -pro; verify catalog pricing live rather than trusting committed constants"
status: draft
privacy: "Model IDs, repo-relative paths, and public vendor pricing only; no PII, no secrets, no credentials, no absolute paths"
supersedes: none
models_used:
  - model: claude-fable-5
    role: Final Decider — investigation, build, hostile review, synthesis
    did: "Verified the OpenRouter catalog live, resolved the two-listing question, built scripts/consult-panel.mjs, found and fixed a 2x pricing drift in scripts/consult-sol.mjs, self-reviewed to dry across 4 rounds"
    cost: subscription
  - model: qwen3.8:27b-mtp-q4_K_M (local Ollama)
    role: live smoke-test seat — proved the panel spawn/remit/index path end-to-end
    did: "Returned a contract-conforming review (496 in / 769 out, 7.0s) confirming the five-heading remit survived the spawn boundary intact"
    cost: "$0 (local, private)"
skills_touched:
  - id: consult-panel
    action: created
    motivating_failure: "Sean had to invoke four separate consult scripts by hand to assemble one hostile review, so in practice the panel rarely ran complete"
  - id: consult-sol
    action: amended
    motivating_failure: "Hardcoded pricing was exactly 2x the live catalog rate, silently doubling every cost figure the script ever reported"
  - id: panel-and-model-routing-reference
    action: created
    motivating_failure: "The ':batch' economics finding is non-obvious and would be re-litigated by the next person who sees a 50%-off listing"
  - id: full-spectrum-panel-law
    action: applied
    motivating_failure: "Prior session lensed each seat into a narrow role, filtering contributions before they were made; the new panel gives every seat the identical full-surface remit and pins that rule in-code against future 'helpful' edits"
---

# A discount is not a price cut if it changes the transport

## The lesson

A vendor listing that is **50% cheaper for the same model** is not automatically
the better buy. OpenRouter's `:batch` variants are genuinely the same weights at
exactly half price — and genuinely unusable for interactive work, because the
discount is not a price cut on the same product. It is a *different transport*:
an async job API (`POST /api/beta/batches`, poll for status) with a **24-hour
completion window**.

The decisive move was not comparing prices. It was **computing the absolute
saving on a real workload**: a typical review packet (~20k in / 8k out) costs
$0.17 standard and $0.085 batched. **The 50% discount is worth nine cents.**

Percentages hide magnitude. "50% off" reads as a major win; "$0.09" reads as
what it is. When a discount is expressed as a ratio, convert it to absolute
dollars on your actual workload before letting it drive an architecture change —
a 50%-off lane that costs a day of latency is a bad trade at this volume and a
good one at 10,000x the volume. The number that decides it is the absolute
saving, not the ratio.

## Who did what

**Fable 5 (me)** did the whole chain: catalog verification, the build, the
hostile pass, and the synthesis. No external paid model was consulted — the
question was factual (what does this listing actually do?) and answerable from
the vendor's own API and docs. Spending a paid review seat on it would have been
waste; the catalog is authoritative and free.

**Qwen 3.8 (local, free)** served as the live smoke-test seat. Its value here was
not its review quality but that it is **free and real** — it proved the spawn
path, the shared-remit propagation across a Windows process boundary, and the
INDEX rendering without spending anything. A free local model is the right
instrument for proving plumbing works before paid seats are ever fired.

**Nobody was wrong on the facts this session** because the facts were checked
against the vendor API rather than asserted. That is the whole point.

## Skills created or changed

- **`scripts/consult-panel.mjs` (new)** — motivated by the absence of any single
  command to run the panel. Sean had four consult scripts and had to orchestrate
  them by hand, which meant in practice the panel rarely ran complete.
- **`scripts/consult-sol.mjs` (amended)** — motivated by a confident, dated,
  wrong comment. See the ledger below.
- **`PANEL-AND-MODEL-ROUTING.md` (new)** — motivated by the fact that the
  `:batch` listing will keep looking attractive to the next person who sees it.
  A decision that isn't written down gets re-made, usually worse.

## Mistakes I made

- **Nearly shipped an infinite hang.** I renamed a promise callback to `settle`
  but left `resolve` imported from `node:path`. The two failure-path
  `resolve(...)` calls would have invoked `path.resolve` on an object and never
  settled the promise — the panel hangs forever, but **only when a seat fails**.
  The happy path is clean, so tests would not have caught it. Found by grepping
  my own diff for the renamed identifier.
- **Wrote help text the code didn't honor.** My first spend gate blocked every
  seat, while the printed hint told Sean `--seats glm,qwen` would run free —
  which would still have dry-run. I described intended behavior, not actual.
- **Over-claimed coverage in generated output.** The INDEX said "full panel" when
  1 of 4 seats ran. A partial panel that reads as complete converts a missing
  perspective into false confidence downstream.
- **Nearly propagated a stale constant.** `consult-sol.mjs` carried
  `$5/M in, $30/M out` in an authoritative dated comment. Live catalog: $2.50/$15.

## Error → fix → repeat ledger

**Class: a committed constant describing live external state.**

- **Recurrences this session: 2.** (1) `consult-sol.mjs` pricing, 2× wrong,
  silently doubling every cost line it ever printed. (2) My own INDEX estimator,
  which would have reported the full requested-set cost even when paid seats were
  gated out of the run — the same shape of error, authored by me, minutes after
  I'd fixed the first one.
- **Already written up before recurring?** Yes, in spirit — this repo already
  runs a drift-check discipline built on exactly this class. Knowing the class
  existed did not stop me from re-creating it.
- **What actually stopped it:** a procedural step, not vigilance. `curl` the live
  catalog before quoting any price, recorded as a copy-pasteable command in the
  reference doc. "Be careful with constants" would have failed; a command that
  takes two seconds does not.

The transferable form: **any constant that mirrors an external system's current
state is a cache with no invalidation.** Vendor pricing, model IDs, rate limits,
context windows. Either fetch it or date-stamp it with the command to re-check.

## External-model calibration

No paid external model was consulted this session, deliberately. The question
("which of these two listings is cheaper and why") was **factual and
vendor-authoritative** — the OpenRouter catalog API and docs answer it for free
and with more authority than any model's training memory would. Firing a paid
review seat at a factual lookup is the most common way panel budget gets wasted.

Calibration note for routing: **paid seats earn their cost on judgment, not on
facts.** Route factual questions to the source; route judgment to the panel.

Qwen 3.8 (free, local) is confirmed useful as a **plumbing prover** — a real
model call that costs nothing, ideal for validating a new harness before paid
seats touch it. Recommend this as standard practice for any new consult script.
