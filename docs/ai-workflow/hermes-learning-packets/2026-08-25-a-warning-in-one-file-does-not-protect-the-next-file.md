---
title: A warning written in one file does not protect the next file — a defect documented in the codebase recurred in new code that called the same function
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: claude-fable-5 is the Fable-tier Final Decider by definition (CLAUDE.md Co-Orchestrator Hierarchy).
date: 2026-08-25
decision: A defect class that is prevented only by a comment at one call site is prevented at none of the others; the fix is a shape every call must take (explicit grants/enabled arguments) enforced by the callee or a test, not a docblock.
status: draft
supersedes: none
models_used:
  - model: claude-fable-5
    role: builder
    did: Built the Motion rung (server bind, agent-side hash re-verification, UI unlock), repeated a documented env-injection defect in the new module, and caught it with the module's own test.
    cost: subscription
skills_touched:
  - name: registry.resolve() call contract
    change: proposed
    why: The registry silently defaults grants/enabled to process.env; two call sites in one day needed the injected env. Proposed - make the injected form the only form, or lint for calls without it.
surfaces: [atelier/motionBind, handlers/initImageBind, handlers/generateVideo, registry.resolve]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

The Motion rung shipped (`fd2dc5d45`): approval binds `assetId + sha256`, the agent re-hashes at the point of use, the graph animates the approved bytes or nothing. While building the server half I called `resolveProvider(providerId, { commercial, territory })` — and the registry, given no `grants`/`enabled`, fell back to `process.env`. My injected `env` was decorative. The test I had written for "disabled provider refuses" **passed the bind** because the test process's environment enabled the provider.

The handler I had read that morning, `generateVideo.mjs`, contains a docblock describing exactly this defect and exactly this fix: *"Derived from the INJECTED env, not process.env. Letting the registry fall back to its own default would make the env parameter decorative: a test could pass against an injected env while production read a different one, which is the shape of bug that makes a suite worthless."* I had read it. I repeated it one directory over, the same afternoon.

## Why (the rationale Hermes should carry forward)

A comment is scoped to the eye that is on it. It protects the function it sits in; it cannot reach a new caller of the same API in a different file, written by the same author hours later. The defect's true location is the **callee's default** — `resolve()` quietly reading `process.env` when not told otherwise — and a fix at any single call site leaves every future call site exposed.

Two durable forms of the fix exist, and both live outside memory: the callee stops defaulting (make `grants`/`enabled` required, or default them from a passed `env` only), or a test asserts every `resolveProvider(` call in the tree passes them. Either survives a context switch; the docblock did not.

## Reusable pattern / rule Hermes should apply next time

1. **When a comment says "do not let X default", the bug is X's default.** Fix the default, or assert against it, rather than re-documenting the workaround at each caller.
2. **A test that passes for the wrong reason is worse than no test.** The "disabled provider" test passed because the *test process* happened to enable the provider. Any refusal test injects an environment that would refuse and asserts the refusal — it must be able to fail.
3. **Bind at the point of use.** Server-side verification when queueing is necessary and not sufficient; the consumer re-verifies the hash before the bytes are used.
4. **Grep tests for assertions that the thing you are about to build does not exist** and re-anchor them first, disclosed — an absence test is a landmine for the feature it forbids.

## Who did what

**Fable 5** built the slice, repeated the documented defect, and caught it with the new module's own refusal test. The deterministic caps check caught the handler at 312 lines. No external seat ran.

## Skills created or changed

- **`registry.resolve()` contract — proposed:** require `env` (deriving `grants`/`enabled` from it) or add a repo test that fails on any `resolveProvider(` call without explicit `grants`/`enabled`. The docblock form has now failed once within its own repo.

## Mistakes I made

- **Repeated the env-injection defect the handler's docblock warns about.** Caught by my own test. **MECHANISM:** every `resolveProvider` call passes `grants: readGrants(env)` and `enabled: readEnabled(env)`; a call without them is a review blocker in any file.
- **Wrote a refusal test that could pass for the wrong reason** (the process env enabled the provider). Caught when it passed unexpectedly. **MECHANISM:** a refusal test injects an environment that would refuse; if it passes before the code is fixed, the test is wrong.
- **Let the handler reach 312 lines** with error-class handling that belonged beside the error class. Caught by the caps check. **MECHANISM:** semantics live with the error class; a handler gets one call.
- **Left an absence-asserting test in place** for the feature I was building. Caught when it failed. **MECHANISM:** grep tests for `not.toMatch`/`toBeUndefined` on the feature's route or symbol before building it.
- **Wrote a frontend edit as a bash heredoc bash could not parse.** **MECHANISM:** multi-file frontend edits go through a script file.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Injected env made decorative by a callee default | 1 new (+1 latent, documented in the handler) | **Yes — in the codebase itself, in a file I read that morning** | A test that could fail. The docblock did nothing |
| Cap crossed by accretion | 2 today | Yes (this morning) | Caps check both times — the procedural check works; the write-up alone did not |
| Absence assertion left in place for a new feature | 1 | No | The failing test |
| Heredoc parse failure | 1 | No | Script file |

**The repeat that matters:** a defect documented *in the code* recurred in new code by the author who had just read the documentation. This is the strongest evidence yet in this corpus that write-ups — even in-tree ones — are not fixes. The two things that actually stopped defects today were a test that could fail and a deterministic caps check.

## External-model calibration

None ran.

## Risks / guardrails

- A real bound render is unproven (no ComfyUI/R2/DB here). First contact may surface a transport defect in the ticket → download → upload chain.
- The bind refuses on hash mismatch as **permanent**; a legitimately re-uploaded asset under the same key would need a new approval, by design.
- `resolve()` still defaults to `process.env` for every other caller in the tree; the proposed contract change is not made.

## Provenance & privacy

`originating_model: claude-fable-5`. Sanitizer: `scripts/scan-secrets.sh` CLEAN on all committed files. IDs/roles only; no client data, no keys, no absolute paths.
