# 101 — "Paybolt" Mishearing Cleanup Record

- **Date:** 2026-07-03
- **Author:** Fable (claude-fable-5)
- **Status:** CLOSED — sweep complete, nothing to quarantine

---

## 1. Executive correction

Sean's directive, verbatim intent: **"Paybolt" was a misheard/transcribed rendering of "Fable."** There is no product, module, brand, payment feature, or workstream called Paybolt. Anything that would have been filed under that name is actually **Fable workflow / control-layer / orchestration / Design Brain material**, and this pass builds it under its correct name.

## 2. Sweep evidence

Two sweeps were run on 2026-07-03 from the repo root:

1. `Grep` (tracked/visible files), pattern `[Pp]aybolt`, whole repo → **0 matches**.
2. `rg -li "paybolt" --no-ignore --hidden -g '!node_modules' -g '!.git' -g '!dist' -g '!build'` (includes gitignored + hidden files: `.ai-workflow/`, `.claude/`, local ledgers) → **2 matches, both created by this session to document the correction itself:**

| File | What the reference is | Classification | Action |
|---|---|---|---|
| `.ai-workflow/coordination/claude.lane.md` | This session's lane-claim note stating `"Paybolt" = misheard "Fable"` | Coordination note about the correction (gitignored, auto-pruned) | KEEP — it warns the other agent |
| `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/100-fable-watch-prompt-upgraded-run-prompt.md` | The correction carried forward in the execution plan | Documentation OF the correction | KEEP |

**No local repo evidence of a Paybolt concept predating this session exists.** [VERIFIED — both sweeps above, current session.]

## 3. What each mistaken reference became

The only place "Paybolt" ever lived was the earlier (crashed) session's prompt stream — a prompt artifact, not repo evidence. Its intended content maps as follows:

| Mistaken framing | Correct canonical home |
|---|---|
| "Paybolt workflow / control layer" | `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` |
| "Paybolt design brain" | `docs/ai-workflow/design-brain/` |
| "Paybolt orchestration / model routing" | `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` + `docs/ai-workflow/hermes-agentic-os/` |

## 4. Payment-content check

Because "Paybolt" sounds payment-like, the concern was that payment-specific content might have been invented to justify the name. Sweep result: **no such content exists.** The repo's real payment surfaces (Stripe checkout, cart, storefront packages, Genesis checkout) all predate this workstream, are evidenced by their own routes/components, and are governed by their own rules (CLAUDE.md rule 16/50 high-stakes gating). Nothing payment-related is being mixed into the Fable workflow docs, and nothing needed quarantine.

## 5. Confirmations

- ✅ **Paybolt is NOT canonical** anywhere in this repo, and no local evidence proves it should be.
- ✅ **Fable is the intended concept** — Fable 5 (claude-fable-5), Final Decider per CLAUDE.md rule 46 (amended 2026-06-10) and the Co-Orchestrator Hierarchy.
- ✅ Nothing was renamed or deleted (there was nothing to rename or delete); nothing required quarantine.
- ✅ Future guard: the CLAUDE/AGENTS patch proposal (`110-fable-claude-agents-patch-proposal.md`) includes a one-line "no Paybolt canonical references" note so a future transcription echo cannot re-seed the name.
