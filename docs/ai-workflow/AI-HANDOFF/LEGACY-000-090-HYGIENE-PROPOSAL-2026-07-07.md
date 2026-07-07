# Hygiene Proposal — legacy 000–090 FABLE-HERMES-WORKFLOW-UPGRADE series (G-14)

- **Date:** 2026-07-07 · **Author:** Fable (E6 custodial beat of the hermes-os loop) · **Status:** PHASE-1 PROPOSAL ONLY — **no files moved, renamed, or deleted** (Rules 32–34). Execution is a separate Sean-approved Phase 2 pass (Rule 37).
- **The risk (G-14):** two parallel numbered series coexist in `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/` — a LEGACY 000–090 lane and the CANONICAL 100–170 lane. A fresh session that opens `080-implementation-slices.md` instead of `140-fable-implementation-slices.md` plans against a superseded slice plan.

## Inventory + classification (Rule 33)

| File | Classification | Superseded by | Evidence |
|---|---|---|---|
| `000-watch-prompt-upgraded-run-prompt.md` | archive-only historical | `100-fable-watch-prompt-upgraded-run-prompt.md` | same role, 100-series is Fable-authored canon |
| `010-local-current-state-audit.md` | **legacy but still referenced** | partially by `170` §A (fresh live inventory) | referenced as prior-audit reading by doc 170's research |
| `020-skill-registry-audit.md` | archive-only historical | the live `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` | registry doc is canon per CLAUDE.md control layer |
| `030-design-brain-spec.md` | archive-only historical | `docs/ai-workflow/design-brain/` (shipped folder) | the built thing outranks its spec |
| `040-claude-agents-md-patch-proposal.md` | archive-only historical | `110-fable-claude-agents-patch-proposal.md` + landed CLAUDE.md edits | patches landed |
| `050-hermes-update-prompt.md` | **legacy but still referenced** | `120-fable-hermes-update-prompt.md` + `170` (which cites 050 as the house FORMAT) | keep until 170 is executed |
| `060-fable-build-prompt.md` | archive-only historical | `OPUS-48-HERMES-OS-BUILD-HANDOFF-2026-07-04.md` | the build handoff superseded it |
| `070-ai-village-upgrade-packet.md` | archive-only historical | `130-fable-ai-village-review-packet.md` | direct 1:1 successor |
| `080-implementation-slices.md` | archive-only historical — **highest mislead risk** | `140-fable-implementation-slices.md` + hermes-agentic-os/implementation-slices.md | slice numbering conflicts with the authoritative plan |
| `090-executive-summary-for-sean.md` | archive-only historical | `150-fable-executive-summary-for-sean.md` | direct successor |

Reference check basis: `grep -rn "0[0-9]0-" docs/ai-workflow --include=*.md` shows inbound references to 050 (from 170) and 010 (research lineage); no runtime/script references any 000–090 file. Classification per current grep — a final reference re-check runs in Phase 2 before any move (Rule 34 wording honored: these are likely relocation candidates pending Phase 2 approval, not "safe to delete").

## Proposed Phase 2 (needs Sean's explicit yes)

1. `git mv` the eight archive-only files to `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/archive-000-090/` (new subfolder, one commit, fully reversible).
2. Keep `010` + `050` in place until doc 170 is executed on the Hermes maintainer; then re-classify both in a follow-up one-liner.
3. Add a 3-line `README.md` at the folder root: "100+ series is canonical; archive-000-090/ is history; 170 is the live Hermes upgrade prompt."
4. No `.gitignore` change needed (tracked docs, not artifacts — Rule 39 n/a).

**Next action:** parked for Sean's yes/no in the loop-close decision queue. Nothing moves until then.
