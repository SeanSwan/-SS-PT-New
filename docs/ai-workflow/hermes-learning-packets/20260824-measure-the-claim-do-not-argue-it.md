---
title: "Measure the claim, do not argue it"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-24
decision: "Shipped Swan Forge Phase 1.5 (first Forge component on a real production surface) to main e16a68085 after a two-reviewer wiring-gate round. Three P1 findings were disproven by computed-style measurement on the production bundle; two findings were false only because MY review packet omitted the evidence; one 'bug' was an artifact of my own generator misreading the pack."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: review-process / evidence / packet-construction
models_used:
  - model: claude-fable-5
    role: builder + adjudicator
    did: "Built the wiring (file: dep, binding, surface swap, generator, parity test); produced vite-preview computed-style receipts on the mounted CTA; adjudicated both reviews by measurement. Authored the packet omissions that caused two false findings and the generator bug that caused a third."
    cost: subscription
  - model: glm-5.3
    role: reviewer
    did: "REVISE. Correct on: honesty of the 'pixel-parity' claim, blind ...rest spread, parity-parser fragility, composites silently dropped, allow-tag provenance. Wrong on: motion:0 (generator artifact), focus-ring/ease unresolved (measured resolved), chunk placement (lacked the dist receipt)."
    cost: "$0 (subscription)"
  - model: stealth/ox-alpha
    role: reviewer (1 of 2 attempts landed)
    did: "REVISE. Correct on: 'single source of truth' was target-state prose (re-labeled), pixel-parity overclaim, primitive.css :root footprint undisclosed. Wrong on: lockfile 'undisclosed' (committed; my packet diff truncated it), animateOnRender marketing regression (GlowButton defaults are false), focus ring (measured)."
    cost: "$0.0000 (data-egress seat)"
skills_touched:
  - id: forge-wiring-gate
    action: proven
    motivated_by: "The panel's own strongest objection (GLM C2) demanded proof that a zero-runtime catalog component survives a real styled-components surface before Phase 2 spend."
---

## The lesson

**When a reviewer says 'X probably does not resolve / probably breaks', do not answer with reasoning — answer with a measurement.** Both reviewers raised the same P1: the focus ring and easing tokens "cannot be confirmed" under the self-scoped pack class. I could have argued cascade semantics for a page. Instead: `vite preview` of the production bundle, scroll the mounted section, `getComputedStyle` on the live button → `--sw-focus-shadow` resolved, `:focus-visible` ring rendered 2px obsidian + 4px Wing Purple, transitions at 0.22s with the standard ease, `--sw-motion` = `1`, height 44.0. Three P1s closed in one evaluate call, with numbers nobody can re-litigate. The procedural rule: **for any "does it render / resolve / apply" finding, the response is a computed-style or DOM receipt, never prose.**

**Second lesson — the packet you send IS the truth the reviewer sees.** Two findings were false purely because of what I omitted: Ox called the lockfile "undisclosed, therefore blocking" (it was committed; my `git show | tail -60` truncated the diff), and in Phase 1 both reviewers said "no README" (it existed; not in the packet). A reviewer cannot distinguish "absent from repo" from "absent from packet" — every omission returns as a finding, costing a round. Procedural: **packet = full diff (`git show --stat` + complete file bodies), never a tailed excerpt.**

**Third — your own instrument can manufacture a finding.** GLM read `motion: "0"` in the generated theme and correctly inferred "the pack ships dead animation." The pack ships `1`; my generator's last-wins regex had projected the `@media (prefers-reduced-motion)` override. The reviewer was right about the artifact and wrong about the world — and the fix was to the instrument (strip at-rule blocks), then re-measure. **A projection/summary you generate is evidence about your generator first and the system second.**

## Who did what

- **claude-fable-5** built the slice, then caused three false findings (two packet omissions, one generator artifact) and disproved five findings by measurement. The measurement habit was the difference between a one-round and a three-round gate.
- **glm-5.3** delivered the sharpest honesty catch ("pixel-parity" → value parity) and the parser-fragility analysis; its P1s were reasonable inferences from an incomplete packet.
- **stealth/ox-alpha** delivered the "single source of truth is fiction" catch — the generated theme had zero consumers, so the claim was target-state prose; re-labeled per trailhead-truth. Its 429 rate this session: 4/10 calls.

## Skills created or changed

None. Filed SWA-206 for the two out-of-lane enforcement gaps both reviewers flagged (allow-tag provenance by path in the shared guard hook; CI wiring once GitHub Actions are alive again).

## Mistakes I made

- Sent a truncated diff in the review packet → Ox flagged the committed lockfile as undisclosed. Second packet-omission error in two slices (Phase 1: README/specs omitted). Repeat.
- Generator projected the reduced-motion override as the base value → GLM reported dead animation. Fixed + regression test (`--sw-motion` base = 1).
- Wrote "pixel-parity" in an acceptance claim for a token-string test. Both reviewers killed it; renamed to value parity and produced the rendered receipt separately.
- Described the generated theme as "THE single source of truth" while nothing consumed it. Re-labeled "generator proven, adoption pending".
- `| head -5` on the preview server killed it via SIGPIPE; background `&` inside a wrapper made two consult processes unobservable (one died silently on a 429). Relaunched both as blocking background commands.
- Two pre-commit blocks I caused: hex in a generated file (fixed by emitting the guard's allow-tag from the generator) and `var()` text inside a test comment/assertion string (fixed by rewording + tag). Guards were right both times.
- `tsc --noEmit` OOM: burned two attempts extending the base tsconfig before a standalone minimal config proved the binding types clean.

## Error → fix → repeat ledger

| Error class | Repeats this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Review packet omits evidence → false finding | 2 (Phase 1 README; Phase 1.5 lockfile) | yes — Phase 1 packet noted it, then it recurred | Procedural: packet = `git show --stat` + full bodies, never tailed diffs. Added to this packet as the rule. |
| Generated projection misread as system truth | 1 | no | At-rule stripping + `motion` base assertion; lesson: instrument evidence first |
| Overclaimed acceptance wording ("pixel-parity", "single source") | 2 | Rule 75 exists | Both reviewers; renamed + receipts. Procedural: acceptance claims name the METHOD (value-parity, computed-style) not the aspiration |
| Background process made unobservable by shell wrapper | 2 (`&` wrapper, `\| head`) | no | Blocking `run_in_background` commands only; no pipes on long-running servers |
| Pre-commit guard blocks on generated/test text | 2 | no | Generator emits compliance tags; test text avoids `var(` spelling |

## External-model calibration

- **glm-5.3:** 1 call, ~9 findings; 4 real+fixed, 3 disproven by measurement, 2 packet-omission artifacts. Depth seat; strongest on honesty/claims.
- **stealth/ox-alpha:** 2 attempts (1 landed, 1 silent 429); ~7 findings; 3 real (single-source fiction, :root footprint, rollback wording), 3 disproven (lockfile, animateOnRender default, focus ring), 1 duplicate. Closer seat; strongest on "is this claim describing the code or the destination".
