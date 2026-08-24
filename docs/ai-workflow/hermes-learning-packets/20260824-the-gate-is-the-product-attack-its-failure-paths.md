---
title: "The gate is the product — attack its failure paths"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-24
decision: "Shipped Swan Forge Phase 1 to main (7521c5053) through a 5-round Ox+GLM panel. Two criticals in my own quality gate survived my dry loop AND the first external reviewer; only the second reviewer caught them."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: quality-gates / instruments / review-process
models_used:
  - model: claude-fable-5
    role: builder + fusion author + final adjudicator
    did: "Built the Forge package + its two gate instruments, ran the dry loops, adjudicated 5 panel rounds, authored all fixes. Missed both instrument criticals in its own gate across 3 self-review rounds."
    cost: subscription
  - model: glm-5.3
    role: reviewer (plan + code rounds)
    did: "Plan round: 23 findings, ~90% adopted (1 partially wrong: claimed var(--sw-*) doesn't resolve inside styled-components css text — it does; its ThemeProvider-JS-object half was right). Code round: caught the accent-phantom-token drift and the at-rule evasion CLASS, plus the waiver double-standard."
    cost: "$0 (subscription), ~27k output tokens/call"
  - model: stealth/ox-alpha
    role: reviewer (3 plan rounds + 1 code round; 3 upstream 429s)
    did: "Plan rounds: adoption governance, push-class self-contradiction, evidence-provenance discipline. Code round, running AFTER GLM's was integrated: found the two criticals everyone else missed — a waiver that masked unparseable colors, and a parser that read commented-out tokens."
    cost: "$0.0000 (data-egress seat)"
skills_touched:
  - id: swan-forge-gate-instruments
    action: created+hardened
    motivated_by: "audit-contrast.mjs and drift-lint.mjs are the Forge's enforcement layer; five specific evasion holes were found and fixture-locked (waiver-masks-null, comment-blind parse, at-rule duplicate, accent phantom token, unowned waiver)."
---

## The lesson

**When a slice ships a quality gate, the gate IS the product — and reviewers (including yourself) instinctively review what the gate catches, not what it fails to catch.** My contrast auditor passed 21 then 35 tests, printed beautiful PASS tables, and could be silently defeated three separate ways: a *waived* pair swallowed **instrument failure** (corrupt hex → null ratio → "WAIVED-FAIL" → exit 0), the parser **read commented-out tokens** (completeness satisfiable by dead declarations), and it measured a token the CSS never consumed (manifest/CSS drift within one hour of writing both). Every one of these is invisible to happy-path testing by construction — the gate's PASSING behavior was tested to death; its FAILING behavior had never once been exercised. The procedural fix that survives: **an instrument slice must ship fixtures for FAIL, UNRESOLVED, missing, duplicate, and expired-waiver paths before the instrument's verdict is trusted** — "does the gate pass on good input" proves nothing about whether it is a gate.

**Second lesson — reviewer sequencing is not redundancy.** Ox's code round ran AFTER GLM's 27-finding round was fully integrated, and still surfaced two criticals GLM missed. Same brief, same packet, zero role-lensing (Rule 82 honored). Two full-spectrum reviewers in sequence — the second attacking the already-fixed state — is qualitatively different from two in parallel: the second round's value concentrated precisely in the corners the first round's fixes had made everyone confident about.

**Third — a waiver mechanism must be at least as governed as the strictest ledger in the same package.** I shipped an owner+expiry EXCEPTIONS ledger and, in the same commit, a bare `waived: true` boolean for contrast. Any escape hatch (waiver, skip, allowlist, suppression) gets the same schema: owner, expiry, scope; expired = hard fail. A permanent waiver is a silent cap wearing a review costume.

## Who did what

- **claude-fable-5** built everything and was WRONG about its own gate three times; its dry loops caught UI/a11y defects (capture-pill CSS-vs-hidden, modal a11y-tree leak, accent glow fidelity) but zero instrument defects — self-review reliably attacked the product, never the instrument.
- **glm-5.3** was the depth seat: highest finding density, one partial-miss (SC var() resolution), everything else verified real.
- **stealth/ox-alpha** was the kill-shot seat: fewer findings, but the two nobody else found, plus the governance-layer catches at plan stage. Its 3/8 upstream-429 rate is the seat's real cost; 4–10 min cooldown retries eventually landed every call.

## Skills created or changed

None this session. Candidate encoded in the plan instead: the Forge's D4 adoption rule becomes a numbered constitution rule at Phase 1.5 close.

## Mistakes I made

- Gate defeatable via waiver-masks-null and comment-blind parsing — survived 3 self-review rounds + 1 external review; caught by reviewer #2. Fixed with regression fixtures.
- Audited a phantom token (`--sw-btn-accent-text`) the CSS never read — wrote manifest and CSS the same hour, drifted anyway. Fixed + SEMANTIC_NAMES↔contract sync test added.
- Unowned non-expiring waiver beside my own owner+expiry ledger. Fixed to {owner, expiry, packs[]}.
- `cd X && A & B &` precedence bug sent reviewer B to the wrong cwd (MODULE_NOT_FOUND). One relaunch lost.
- Reached for `$?` after a pipeline; the exit-status hook blocked it pre-execution. The corpus's most-recurring mechanism nearly recurred through me.
- Deleted a "redundant" per-line comment guard my own new stripper couldn't replace (orphan continuation lines); my new test caught it same-run. Belt+braces restored.

## Error → fix → repeat ledger

| Error class | Repeats this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Instrument failure-paths untested (gate trusted on passing behavior) | 2 instruments, same session (audit + my first test file's coverage) | yes — corpus already carried "a gate nobody validated detects nothing" and I QUOTED it in the test header while still only testing the happy path | Fixture suite for FAIL/UNRESOLVED/missing/duplicate/expired paths, demanded independently by BOTH reviewers |
| Escape-hatch weaker than adjacent ledger | 1 | no | Waiver schema now mirrors EXCEPTIONS.md; expired = exit 2 |
| Pipeline `$?` misread | 0 (blocked pre-execution) | yes — 44 corpus hits, deterministic hook exists | The hook, not memory. Prose never held this; the gate did |
| Shell background-job cwd precedence | 1 | no | Absolute paths in relaunch; noted here as procedural: background branches get their own cd |

## External-model calibration

- **glm-5.3:** 2 calls. Plan: ~23 substantive findings, ~90% adopted, 1 partially disproven. Code: all 3 HIGHs real. Extremely high findings-per-call; subscription cost. Routing: first-seat reviewer for architecture+code.
- **stealth/ox-alpha:** 5/8 calls landed (3 upstream 429). Unique-catch rate highest of any seat when run SECOND on an already-fixed packet. $0 money, data-egress cost. Routing: closer seat after the depth seat integrates; always with cooldown-retry logic.
