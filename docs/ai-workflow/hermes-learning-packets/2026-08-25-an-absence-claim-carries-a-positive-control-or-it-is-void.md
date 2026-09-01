---
title: An absence claim carries a positive control in the same command, or it is void
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: claude-fable-5 is the Fable-tier Final Decider by definition (CLAUDE.md Co-Orchestrator Hierarchy).
date: 2026-08-25
decision: Any "X is absent / missing / not found" produced by a search, walk, or probe must include, in the same command, a search for something known to be present; if the control is also absent the finding is void and the instrument is the bug.
status: draft
supersedes: none
models_used:
  - model: claude-fable-5
    role: builder
    did: Built the Compose surface, ran four hostile rounds on it, repaired a junctioned node_modules that broke the production build, and produced a false "chunk absent" reading for the third time in one day.
    cost: subscription
skills_touched:
  - name: instrument-check
    change: proposed
    why: Its resolutional form ("validate the instrument") was written up twice today and did not prevent a third recurrence; the procedural form — a positive control in the same command — is what this packet proposes as the skill's required output shape.
surfaces: [content-studio/AtelierCompose, frontend/vite.config, frontend/tsconfig.atelier.json, hermes-inbox]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

The Compose tab shipped (`7c8743705`). During its proof, `vite build` reported success and my walk of `dist/assets/` found no `AtelierCompose` chunk. I nearly reported the chunk absent. What stopped me was not procedure: the *sibling* Render Queue chunk — which shipped last week and is known to exist — was "absent" from the same walk. That contradiction, not a rule, made me read `vite.config`, where `chunkFileNames: 'v3/[name].[hash].js'` sends every chunk to `dist/v3/`. The Compose chunk was there, 16,638 bytes, referenced from the Hub chunk.

This was the **third** false-absence reading in a single day — after a stale line count fed to a review panel, and an "H3 not installed" claim that had checked one models directory while `extra_model_paths.yaml` pointed at another drive. Each had been written up before the next occurred.

## Why (the rationale Hermes should carry forward)

The corpus already holds the lesson "validate the instrument before believing a negative" — and it did not fire, three times, for the same author, on the same day. A resolutional lesson is a promise to remember; it dies at the first context switch. The lesson has to become a **shape the command takes**, because a shape does not need remembering.

The shape: an absence claim is two searches, not one. The second search targets something the author already knows is present, executed by the same instrument in the same command. Three outcomes:

- control present, target absent → the absence is real;
- control absent → the instrument is wrong; the finding is void; fix the instrument;
- control present, target present → the original claim was about to be false.

Today's chunk walk would have failed the control on the first try (the Render Queue chunk was missing from `dist/assets/` too), before any conclusion was drawn.

## Reusable pattern / rule Hermes should apply next time

1. **No absence claim without a positive control in the same command.** `ls dist/assets | grep Atelier` is not a finding; `ls dist/assets | grep -E "Atelier|CreatorRenderQueue"` with the second known-present is.
2. **For a directory walk, read the emitter's config first.** Build tools rename output paths for cache-busting; a `dist/assets` assumption is a memory, not a measurement.
3. **A sibling file is precedent for shape, not proof of existence.** `var(--card-dark)` was copied from a shipped sibling and is defined nowhere; the deterministic pre-commit guard caught it, the author did not. Grep the token against the theme before using it.
4. **Long-running proofs write the full log to a file.** `| tail -6` on the build discarded the only copy of the error and cost a second 30-second build.

## Who did what

**Fable 5 (builder).** Wrote the surface, found two real defects in its own hostile rounds (nested interactives inside `<label>`; a hardcoded 16:9 frame that would show a portrait candidate as a landscape crop), and produced the false chunk-absence reading. The **pre-commit token guard** — a deterministic hook, not a model — caught the undefined `--card-dark` that the author had copied from a sibling. No external seat ran this slice.

## Skills created or changed

- **`instrument-check` — proposed amendment.** Its current guidance is the resolutional sentence that failed three times today. Proposed required output shape: every absence claim states its positive control and the control's result, in the same evidence block. A claim without a control is rejected by the skill, not by the author's memory.
- **`frontend/tsconfig.atelier.json` — created.** The reproducible instrument for a scoped type-check through a lazy-loaded tab's whole import graph when the full project OOMs; `NODE_OPTIONS=--max-old-space-size=16384 npx tsc -p` completes in ~4 minutes with 0 errors.

## Mistakes I made

- **Walked `dist/assets/` for a build that emits `dist/v3/` and read "absent" as truth.** Caught only because the trusted sibling chunk was absent too. **MECHANISM:** every absence claim from a walk includes a known-present control in the same command; a missing control voids the finding.
- **Piped the build through `tail -6` and lost the error.** Caught when I needed the message and did not have it. **MECHANISM:** long proofs write the full log to a file; summaries derive from the file.
- **Copied an undefined token from a sibling styles file.** Caught by the pre-commit guard. **MECHANISM:** grep any token used in a new file against the theme definitions before use.
- **Nested button groups inside `<label>`.** Caught in round 1. **MECHANISM:** a label wraps exactly one control; groups get a `div` plus a visible caption, asserted by a render test.
- **Hardcoded the still frame's aspect ratio.** Caught in the design pass. **MECHANISM:** a frame showing a generated asset takes the aspect the request specified.
- **Junctioned a stale checkout's `node_modules` into a fresh worktree** to save install time; the production build then failed on a dependency main had added. **MECHANISM:** a worktree cut from a branch far ahead of the source checkout gets its own `npm ci`; a junction is acceptable only when both trees share a lockfile.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Absence claim from an unvalidated instrument | **3** (line count → weights dir → chunk walk) | **Yes — twice today, before the 2nd and 3rd** | A trusted control coincidentally going missing. No procedure fired |
| Copying a sibling's latent defect | 1 | No | Deterministic pre-commit guard |
| Log truncated before reading the error | 1 | No | Re-running with file capture |
| Nested interactive in a label | 1 | No | Own hostile round |
| Environment shortcut misreported as code failure | 1 | No | Diffing `package.json` between the two checkouts |

**The repeat that matters:** the absence-claim class was documented after recurrence 1 and again after recurrence 2, and recurred a third time within hours. Both write-ups were resolutional. This packet's decision line is procedural — a command shape — and the proposed `instrument-check` amendment moves enforcement out of the author's memory and into the skill's required output.

## External-model calibration

No external or paid seat ran this slice. The most effective reviewer was a deterministic hook.

## Risks / guardrails

- The Compose surface is proven by build, type-check, unit and DOM-render tests — **not** by a live authenticated browser journey; no backend runs in this environment. Scoped claim only.
- `CreatorRenderQueue.styles.ts` carries the same undefined `--card-dark` token three times; its fallback renders forever. Hygiene item, not touched.
- Both lanes are off on Sean's machine until SWA-207's probe and/or a hosted budget. The UI says so in text; it does not pretend otherwise.

## Provenance & privacy

`originating_model: claude-fable-5`. Sanitizer: `scripts/scan-secrets.sh` CLEAN on all 8 committed files. IDs/roles only; no client data, no keys, no absolute paths.
