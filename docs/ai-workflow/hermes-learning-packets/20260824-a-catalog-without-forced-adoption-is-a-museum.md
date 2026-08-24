---
title: "A catalog without forced adoption is a museum"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-24
decision: "Drafted the Swan Component Forge plan (canonical component catalog, Jarvis Coach panel flagship), ran one Ox Alpha hostile review, integrated its REVISE verdict into v0.2. Plan awaits Sean's ratification; no build started."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: architecture / component-platform / swan-coach
models_used:
  - model: claude-fable-5
    role: builder + integrator
    did: "Read the GLM-final Swan Coach blueprint, drafted the Forge plan v0.1 (headless+token split, catalog tiers, Jarvis-as-contract), fired and verified the Ox review, integrated all six breaks into v0.2."
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer (single call, Sean-requested)
    did: "REVISE verdict. Broke the two-layer architecture (tokens cannot change DOM structure), the dark-first catalog law, the fixed-tier-ambiguous token schema, the styled-components leak, T2 scope inflation, and the Victory pin. Added the governance layer both builder plans omitted: forced adoption, drift-linter, rule-of-two, kill criteria, gallery as test matrix."
    cost: "$0.0000 (data-egress seat, 191s, 2002 in / 4968 out)"
skills_touched:
  - id: component-forge-plan
    action: created (brainstorm doc, not a skill)
    motivated_by: "Sean keeps rebuilding the same components per site; wants one ultimate version each, re-skinned per theme, with the Jarvis AI panel as the flagship every future AI site will need."
---

## The lesson

Builder models — mine included — design component platforms as **build phases** (make the components, make the gallery, make the tokens) and omit the layer that decides whether the platform lives: **adoption forcing functions**. Nothing in my v0.1 compelled any site to consume the catalog; SS-PT would have kept its local copies forever and the Forge would have become a museum. The fix costs zero code: "all new UI comes from the catalog or files a written exception," plus a CI drift-linter, rule-of-two admission, and kill criteria for consumerless components. When reviewing any shared-platform plan, ask "what forces consumption?" before "what gets built?".

Second, structural: **a two-layer "headless core + token skin" split is a fiction wherever sites differ structurally.** Tokens change color and radius; they cannot change DOM shape, focus order, or responsive collapse. Without an explicit variant/composition layer, every structural difference becomes a per-site fork done outside the catalog — the exact drift the catalog exists to kill, just laundered. Three layers, always: core / variants / tokens, with a three-tier token schema (primitive / locked semantic / optional component overrides).

Third, the FIX-BEFORE-BUILD interplay: formalizing a backend's contracts (receipts, identity, idempotency) as the portable component API is a legitimate way to make gate work double as product — but only with a hard gate ("frontend starts after F1+F3 merge on origin/main; verified against the live receipt service, never mocks-as-oracle; shipped flag-off until the consumer passes acceptance"). "Built in step with" is unfalsifiable mush and a demo that renders Verified ✓ from a fake oracle violates the very finding it claims to honor.

## Who did what

- **claude-fable-5** drafted v0.1 and got the architecture wrong in two ways (two layers instead of three; dark-first as catalog law). It correctly pre-seeded the risk register (R1–R5/Q1–Q3), which is what let the reviewer answer concretely instead of generically.
- **stealth/ox-alpha** was the model that was RIGHT this session: all six breaks held up, and its absence-first list contained the highest-leverage item (governance) that the builder missed entirely. $0.

## Skills created or changed

None. Candidate if Sean ratifies the plan: the adoption-governance rule should become a numbered CLAUDE.md rule, because it binds future sessions, not just this plan.

## Mistakes I made

- Two-layer architecture in v0.1; tokens-can-do-everything assumption. Caught by Ox, fixed in v0.2, did not recur.
- Catalog-level dark-first mandate that contradicted the multi-site goal. Caught by Ox, fixed in v0.2.
- Git Bash heredoc write of a multi-KB markdown doc failed with `unexpected EOF`; switched to the Write tool. Procedural correction: on Windows, large multiline doc writes go through the Write tool, never `cat << 'EOF'`.

## Error → fix → repeat ledger

| Error class | Repeats this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Tokens-as-universal-theming (structural variation ignored) | 1 (v0.1 only) | no | External hostile review; v0.2 adds the variant layer |
| Heredoc EOF failure on large doc (Windows Git Bash) | 1 | no | Procedural: use Write tool for multi-KB docs |

## External-model calibration

- **stealth/ox-alpha:** 6/6 breaks real, 0 disproven, 8 additive ideas (≥3 high-value), $0.00, 191s wall. Consistent with the 2026-08-23 packets: Ox performs at lead-reviewer quality for architecture/governance work. Cost is DATA (provider retains prompts) — keep packets privacy-safe, never send client data.
