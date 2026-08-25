---
title: A green suite that cannot fail on a path does not cover it — a quiet default collaborator hides the path from every test
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: claude-fable-5 is the Fable-tier Final Decider by definition (CLAUDE.md Co-Orchestrator Hierarchy).
date: 2026-08-25
decision: After wiring any new side-effect path into an orchestrator, add a test that injects a FAILING collaborator for that path and asserts the failure surfaces; if no existing test would fail when the path is deleted, the path is uncovered regardless of the suite's colour.
status: draft
supersedes: none
models_used:
  - model: claude-fable-5
    role: builder
    did: Built MediaAsset persistence for stills, wired it into composeStills, observed 117 sibling tests stay green while none exercised it, then wrote the three tests that would.
    cost: subscription
skills_touched:
  - name: test-driven-development
    change: proposed
    why: Its red→green discipline covers the unit under test; it says nothing about the orchestrator that gains a new default collaborator. A "mutation check" step — delete the wire, expect a failure — closes that gap.
surfaces: [atelier/persistStills, atelier/composeStills, MediaAsset, atelierComposePersistence.test]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

Persistence for Compose stills shipped (`a35a96b01`): R2 object keyed by the artifact's sha256, `MediaAsset` row with the same `buildProvenance` the video lane uses, fail-closed on unconfigured storage, per-still verdicts that never hide a still. The persister was wired into `composeStills` as a default dependency. I re-ran the four sibling suites: **117/117 green.** Then I asked what those suites had actually done during the run. None injected a persister, so the real one ran, found no R2 credentials, wrote `E_STORAGE_UNCONFIGURED` onto every still — and no assertion looked. The suite was green because the new path fails *quietly by design*. Deleting the wire entirely would also have left it green.

## Why (the rationale Hermes should carry forward)

Coverage is not "the code ran"; it is "a test would have failed". A well-designed side-effect path — one that records its failure instead of throwing — is exactly the kind a green suite cannot see, because the design goal (never hide a still) and the test gap (never assert the verdict) are the same property viewed from two sides. The better the failure handling, the more invisible the gap. Red→green TDD covered `persistStills` itself; it said nothing about the orchestrator that gained a new default collaborator.

## Reusable pattern / rule Hermes should apply next time

1. **Mutation check on every new wire.** After connecting a new collaborator into an orchestrator, ask: which test fails if I delete this line? If the answer is "none", write that test first.
2. **Inject a failing collaborator and assert the failure surfaces.** For a path designed to record rather than throw, the test is "the verdict reaches the caller", not "nothing crashed".
3. **Put idempotency in the key, not in a check.** `atelier/stills/<owner>/<yyyy-mm>/<sha256>.<ext>` cannot be forgotten by a caller; a "did we already do this" check can.
4. **A default collaborator that touches infrastructure loads lazily.** Importing the persister must not open a DB connection — otherwise every unrelated suite pays for it and the coupling is invisible until CI is cold.

## Who did what

**Fable 5** built the module, ran the suites, declared them green, then caught the gap by interrogating what the run had done rather than what it had reported. No external seat ran. The deterministic caps check caught the test file crossing 300 lines.

## Skills created or changed

- **`test-driven-development` — proposed:** add a "mutation check on the wire" step after any orchestrator gains a new default collaborator.
- No new skill files.

## Mistakes I made

- **Declared the slice green on 117 tests that never exercised persistence.** Caught by asking what the default persister did during the run. **MECHANISM:** after wiring a new side-effect path, add a test that injects a failing collaborator and asserts the failure surfaces; if deleting the wire leaves the suite green, the path is uncovered.
- **Let a test file cross the 300-line cap by appending.** Caught by the caps check. **MECHANISM:** a test file past 250 lines gets a sibling file for the next describe block.
- **Asserted on a substring that also appeared inside a longer token** and failed my own edit. **MECHANISM:** assert distinct shapes, never substrings.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Green suite that could not fail on the new path | 1 | No | Interrogating the run, not the report |
| Cap crossed by accretion | 1 | No | Caps check |
| Substring assertion | 2 today (grid edit, earlier) | Yes — this afternoon's memo | Not stopped by the write-up; stopped by the failed assert itself. Procedural form recorded above |
| Absence claim without a control | 0 | Yes | The command shape held |

## External-model calibration

None ran.

## Risks / guardrails

- Real R2 upload and real `findOrCreate` are unproven here (no credentials, no DB). The injected suite + a real-module refusal probe stand in; first contact with R2 may surface a transport defect.
- `projectId` is deliberately null (content_projects FK ≠ workspace); workspace rides in `tags` until S5.

## Provenance & privacy

`originating_model: claude-fable-5`. Sanitizer: `scripts/scan-secrets.sh` CLEAN on all committed files. IDs/roles only; no client data, no keys, no absolute paths.
