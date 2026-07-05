# 110 — CLAUDE.md / AGENTS.md Patch Proposal (PROPOSAL ONLY — NOT APPLIED)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** ✅ APPLIED 2026-07-04 (Sean authorized "do what you feel is recommended to do next" after the hostile-review loop went dry). Patches A+B+C applied to CLAUDE.md, AGENTS.md, ACTIVE-INDEX.md in the working tree — **uncommitted**; commit timing is Sean's. Verified: all linked paths resolve, secret scan of the diff clean, no rule renumbered, Codex's pre-existing AGENTS.md WIP untouched. Final dry-check verifier: check 12 PASS.
- **Design constraint:** the operating files are already heavy. This patch adds **one compact router block + four table rows + one rule amendment note**, and points everything else at the new canonical docs. No existing rule is renumbered or rewritten.

---

## Patch A — new router block (add to BOTH CLAUDE.md and AGENTS.md, directly under the "Four-C Router" section)

```markdown
## Fable Control Layer (added 2026-07-03 — canonical routing for agents & operators)
- **Fable usage policy:** when to spend Fable vs Codex/Claude/Hermes/Village → `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md`
- **Hermes ↔ SwanStudios boundary + T0–T4 command effect tiers** (T0 read · T1 draft · T2 bounded internal write · T3 external-visible · T4 destructive/financial/irreversible; T3/T4 = explicit approval + audit receipt) → `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (this file previously appeared in these docs as a dangling reference; it now exists)
- **AI skill & operator registry** (who owns what, at which tier; unregistered command = BLOCKED; deterministic-vs-agentic boundary) → `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`
- **Hermes Agentic OS** (workflow-audit → skills → automations → loops → memory → command center → distribution; approval gates, audit receipts, kill switches, channels, headless runner) → `docs/ai-workflow/hermes-agentic-os/index.md`
- **Design Brain** (callable design system; `design.md` is canonical, `design.html` mirrors it — design.md wins on conflict; adapters per agent; website archetypes; cinematic factory; QA gates) → `docs/ai-workflow/design-brain/index.md`. Subordinate to `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; loaded by `swan-design-router`.
- **AI Village modes** (LIGHT/FULL/HOSTILE/DESIGN/SAFETY_GOVERNANCE/PRODUCT/IMPLEMENTATION/AGENTIC_OS/GRAPHIFY_OBSIDIAN/FABLE_WORKFLOW; paid modes stay rule-16 gated) → `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/130-fable-ai-village-review-packet.md`
- **Browser Harness:** read-only by default; supervised admin audits (human authenticates, harness observes); any interaction = per-run approval + receipt (bridge §6).
- **Obsidian/Karpathy routing + Graphify quarantine:** raw/wiki/outputs/runs/graph-imports/references/templates, index.md law, quarantine-first imports → `docs/ai-workflow/design-brain/obsidian/` + `docs/ai-workflow/design-brain/graphify/` + `docs/ai-workflow/hermes-agentic-os/memory-and-state.md`
- **Naming note:** "Paybolt" was a 2026-07 transcription error for "Fable" — it is not canonical anywhere and must not be reintroduced (see `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/101-paybolt-mishearing-cleanup.md`).
```

## Patch B — Reference Docs table rows (add to the CLAUDE.md "Reference Docs" table; equivalent rows in AGENTS.md)

```markdown
| Fable Workflow Integration | `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` | Deciding whether/how to use Fable; writing Fable handoffs |
| AI Skill & Operator Registry | `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` | **MANDATORY** before granting any agent/automation a new capability; unregistered = BLOCKED |
| Hermes Agentic OS | `docs/ai-workflow/hermes-agentic-os/index.md` | Any Hermes/operator/automation work — approval gates, receipts, kill switches, T0–T4 |
| Design Brain | `docs/ai-workflow/design-brain/index.md` | Any UI/visual work, alongside SWAN-CINEMATIC-DESIGN-SYSTEM.md (which remains source of truth) |
```

## Patch C — rule amendment notes (smallest possible edits)

1. **Rule 40 (swan-design-router), append one sentence:** "The router also loads `docs/ai-workflow/design-brain/` (design.md canonical, design.html visual mirror); the Design Brain is subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md."
2. **HERMES-SWANSTUDIOS-OPERATOR-BRIDGE row in the existing Reference Docs table:** no text change needed — the link simply resolves now. (Flagging so the reviewer knows it was checked.)
3. **ACTIVE-INDEX.md:** add three lines under active operating docs pointing at the registry, the Agentic OS index, and the Design Brain index. (Exact placement left to the apply pass since ACTIVE-INDEX.md changes frequently.)

## What this patch deliberately does NOT do

- Does not renumber, rewrite, or delete any existing rule (surgical-change discipline).
- Does not change any skill, hook, or setting — `.claude/` is untouched.
- Does not grant any new capability to any agent: the registry it links *restricts* (unregistered = BLOCKED) rather than expands.
- Does not touch production code, tests, or build config.

## Apply instructions (for the approved pass, later)

1. Confirm tree state + lane claims (Rule 67); edit CLAUDE.md and AGENTS.md by explicit path, no `git add -A`.
2. Apply A, B, C; run the secret scan on the diff; verify every new link resolves with a glob.
3. Commit as `docs(control-layer): wire Fable control layer, Agentic OS, and Design Brain into operating files` — after Sean's approval only.

## Rollback

Single-commit revert; the linked docs are additive and can stand unreferenced without breaking anything.
