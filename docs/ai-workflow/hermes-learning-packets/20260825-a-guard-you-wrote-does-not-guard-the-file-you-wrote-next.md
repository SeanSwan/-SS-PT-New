---
title: "A guard you wrote does not guard the file you wrote next"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-25
decision: "Shipped Swan Forge Phase 2 (T1 completion, shell/cluster/auth/chart, Rule 84) after a two-reviewer REVISE round. Three of the defects were violations of laws I had written the same session, in files my own guards did not scan."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: quality-gates / self-review / component-catalog
models_used:
  - model: claude-fable-5
    role: builder + adjudicator
    did: "Built 6 sub-slices, wrote the R3 rule and then breached it in the next file, documented the sticky-toast invariant and violated it six lines later, wrote the border-box law and omitted its own targets; adjudicated ~45 findings, fixed ~32 with tests, deferred the rest with reasons."
    cost: subscription
  - model: glm-5.3
    role: reviewer
    did: "Systemic catches: forced-colors focus blindness across every skin, the R3 breach, two RTL breaks, tab-id collision, Enter/Space double-select trap, motion-gate cast, and a precise list of claims my packet did not evidence."
    cost: "$0 (subscription)"
  - model: stealth/ox-alpha
    role: reviewer (landed first attempt)
    did: "Sticky-danger eviction bug, duplicate aria-current, box-sizing omissions, z-index anarchy, rule-84 governance contradictions, and the rule-of-two 'harvest nostalgia' call."
    cost: "$0.0000 (data-egress seat)"
skills_touched:
  - id: rule-84
    action: created + amended same day
    motivated_by: "A catalog nobody must use is a museum; the first draft had self-service exceptions, no dated enforcement, and a legacy-growth loophole — all found by review, all amended before merge."
---

## The lesson

**A law you write protects only the files your instrument scans — and the instrument was written before the file that breaks the law.** Three defects this phase were self-violations: I wrote "no `order`/reverse (R3)" into nav.css and shipped `column-reverse` in toast.css the same hour — my R3 linter rule only scans theme PACKS, so my own skin evaded my own guard. I wrote "danger toasts must be dismissed" in a docstring and an eviction loop that dropped them six lines below. I wrote a border-box law to fix a 414px overflow and left avatar/pill/badge/select/textarea off its own list. The procedural fix: **when you write a law, extend the instrument to every file class the law names, THEN write the next file** — and every invariant stated in prose gets a test the same commit (the sticky-eviction test would have failed on the first draft).

**Second: adding an audit pair finds a bug the same minute.** Ox asked for a non-text contrast audit of chart series colors; I added five pairs and the very first run failed the light pack's blue at 2.39:1 — a real WCAG 1.4.11 miss that had been invisible because nothing measured it. Absence of a measurement is not evidence of a pass. When a reviewer asks "is X audited", the answer that survives is to add the pair and run it, not to reason that it is probably fine.

**Third: ancestors are not consumers.** I satisfied rule-of-two for six new classes by counting the legacy components they will REPLACE. Both reviewers named it independently ("harvest nostalgia"). A replacement target is a migration TODO; the admission is provisional until the first strangler PR lands. Write "provisional" when it is provisional.

## Who did what

- **claude-fable-5** shipped the work and authored the three self-violations; its own smoke rounds caught the TDZ bug and the 414px overflow but none of the law-vs-file mismatches — self-review reliably checks the product against the spec, not the spec against itself.
- **glm-5.3** caught the systemic class (a11y laws applied asymmetrically: reduced-motion everywhere, forced-colors nowhere).
- **stealth/ox-alpha** caught the invariant-vs-implementation class (docstring says X, loop does not-X) and the governance contradictions in rule 84.

## Skills created or changed

- Rule 84 (Forge-First UI) created, then amended same day: README-only inventory, legacy-growth clause, second-party exceptions ≤90 days, precedence over the 20% cap, dated `--enforce` arming. Motivating failures recorded inline in the rule.

## Mistakes I made

- R3 self-breach (toast.css `column-reverse`) — linter scope gap; fixed + scope gap logged for Phase 3.
- Sticky-toast eviction violating its own docstring — fixed + test.
- Border-box list missing its own targets — extended + disclosed.
- Rule-of-two satisfied by ancestors — downgraded to provisional (repeat of the overclaim pattern from Phase 1.5's "pixel-parity").
- Zero forced-colors handling — law added.
- Gallery TDZ from inserting a block above its dependency — caught by smoke.
- Three tool calls blocked by the heredoc-escape gate; two Edit anchors mismatched on invisible chars in the constitution — recovered via script files.

## Error → fix → repeat ledger

| Error class | Repeats this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Claim names the aspiration, not the evidence ("≥2 consumers", "pixel-parity") | 2 (Phase 1.5, Phase 2) | yes — 1.5 packet wrote it up, then it recurred | Procedural: spec rows say PROVISIONAL until a live import site exists; reviewers re-check |
| Law written, instrument not extended to the new file class | 3 (R3, sticky, border-box) | no | Procedural: extending the guard is part of writing the law; prose invariants get a test in the same commit |
| Asymmetric a11y rigor (one media law, not the other) | 1 | no | forced-colors block as a global law in primitive.css |
| Inline shell scripts with escapes | 3 blocked | yes (hook exists, 123 corpus hits) | The hook, not memory; scratchpad script files |

## External-model calibration

- **glm-5.3:** ~25 findings, ~18 real+fixed, 0 disproven; strongest on systemic/cross-file classes and on "claims vs evidence".
- **stealth/ox-alpha:** ~20 findings, ~14 real+fixed, 1 disproven by design ruling; strongest on invariant-vs-implementation and governance text. Landed first attempt this round (no 429).
