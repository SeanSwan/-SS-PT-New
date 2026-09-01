---
title: A review packet describes a gate by its predicate and its test, never by prose — six seats misread one sentence identically
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: claude-fable-5 is the Fable-tier Final Decider by definition (CLAUDE.md Co-Orchestrator Hierarchy).
date: 2026-08-25
decision: Every gate named in a review packet is written as `predicate → refusal code` plus the test file that pins it; a gate with no test is labelled UNTESTED. Prose descriptions of gate behaviour are not admissible in a packet.
status: draft
supersedes: none
models_used:
  - model: claude-fable-5
    role: orchestrator
    did: Wrote the ladder packet, ran the six-seat panel, arbitrated every finding against the branch, built Publish and five panel fixes, deferred one.
    cost: subscription
  - model: stealth/ox-alpha
    role: reviewer
    did: Sharpest structural read — found that "used commercially" had no input source, which became the publish declaration.
    cost: $0
  - model: glm-5.3
    role: reviewer
    did: Best prescriptions — public route shape, hash-named uploads, permanent-vs-infra error taxonomy.
    cost: subscription
  - model: moonshotai/kimi-k3
    role: reviewer
    did: Cheapest correct shape for async stills (202 + poll, persist per frame); four of five blockers real.
    cost: $0.041
  - model: x-ai/grok-4.6
    role: reviewer
    did: Two real catches (permalink, H3 grant path) inside a long, repetitive review; four of six real.
    cost: $0.064
  - model: tencent/hy3
    role: reviewer
    did: Concise; three of four real; wrong that the spendGuard seam was unfixed.
    cost: $0.003
  - model: qwen3.8:27b-mtp-q4_K_M
    role: reviewer
    did: REJECT on misreadings of consent and IDOR; right on the VRAM check-then-act race.
    cost: $0
skills_touched:
  - name: consult-panel packet template
    change: proposed
    why: The packet's prose about a gate produced six identical false P0s; the template should force `predicate → code + test` per gate.
surfaces: [atelier/publishAsset, atelier/atelierPublicRoutes, atelier/motionBind, atelier/localStillLane, atelier/persistStills, ATELIER-LADDER-COMPLETE-REVIEW-PACKET]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

The packet for the complete Compose ladder contained one sentence about the consent gate: *"nothing in the pipeline sets a flag yet, so today the consent gate never trips."* All six seats — different vendors, different sizes, one local — returned the same P0 from it: either the gate is fail-open (H3 can ship commercially) or fail-closed (nobody can publish). Neither was true. `policyFlags` was an empty array, so the flag loop had nothing to evaluate; the *separate* grant clause on the frozen licence snapshot fired correctly, and a test already proved an H3 record was refused. The seats had no way to see this, because the packet gave them a sentence instead of a predicate.

Their underlying instinct was right and became the fix: nothing writes a flag, so a **human declaration** (consent + intended use) is now required to publish and is welded onto the record with who and when. Five other panel findings were real and fixed the same iteration; one (synchronous local stills) was deferred to its own iteration; six were disproven against the branch.

## Why (the rationale Hermes should carry forward)

A panel reviews what it is handed. When the packet carries prose about behaviour, the panel reviews the prose — and six independent models will converge on the same misreading of the same ambiguity, which *looks* like strong signal and is actually one input error amplified six times. Yesterday the same class occurred with a number (a stale line count). Today it occurred with a sentence. The write-up for the number ("measure in-session") did not generalise, because the failure is not about numbers; it is about **any packet input that is not the code's own predicate**.

The fix is a shape, not a reminder: each gate in a packet is one line — `condition → refusal code`, followed by the test file that pins it. A gate without a pinning test is labelled UNTESTED. Six seats given `for f of policyFlags: consentConfirmed !== true → E_CONSENT_UNCONFIRMED; policyFlags currently []; licence grant clause → E_LICENCE_GRANT_REQUIRED (atelierPublish.test.mjs)` would have found the real gap (nothing writes flags) without inventing a fail-open.

## Reusable pattern / rule Hermes should apply next time

1. **Gates in packets are predicates + tests, never sentences.** Prose about a gate is not admissible.
2. **Unanimity across seats is only signal when the input was code.** Six identical findings from one ambiguous sentence are one finding.
3. **Arbitrate against the branch, not the packet.** Every ruling in the synthesis cites a file, a predicate, or a test.
4. **A unanimous *design* flaw (the signed URL in a snippet) is the strongest signal a panel produces** — different models reaching the same conclusion from the same facts. Fix that first.
5. **Defer the largest real finding to its own iteration** rather than crowd it into the one that found it; a refactor without its own hostile round is where the next defect lives.

## Who did what

**Fable 5** wrote the ambiguous sentence, ran the panel, and caught the misreading only by re-reading `publishAsset.mjs` while arbitrating. **Ox** found the declaration gap precisely ("used commercially has no source"). **GLM** supplied the shapes that landed. **Kimi** gave the cheapest async-stills contract. **Grok** was long and repetitive but caught the permalink and H3 paths. **HY3** was concise and cheap. **Qwen** issued a REJECT on misreadings yet flagged the VRAM race correctly. No seat could have seen the truth from the packet; that is the point.

## Skills created or changed

- **`consult-panel` packet template — proposed:** a required "Gates" table with columns `gate | predicate | refusal code | pinning test | status (TESTED/UNTESTED)`.

## Mistakes I made

- **Described a gate in prose in a review packet** and produced six identical false P0s. **MECHANISM:** gates are written as predicate → code + test; a sentence about behaviour is rewritten or removed before the panel runs.
- **Split a file with a regex classifier and did not run the scoped type-check before the build.** The build passed on dangling imports; tsc caught them at the commit gate. **MECHANISM:** after any mechanical split, scoped tsc runs before the build; the build is not a type check.
- **Generated a test title with an apostrophe inside single quotes** — the suite failed at load. **MECHANISM:** generated test titles use double quotes.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Packet input that is not code becomes a panel finding | **2 in two days** (a number yesterday, a sentence today) | **Yes — yesterday** | Reading the code during arbitration; the write-up did not generalise |
| Mechanical split leaves dangling imports | 1 | No | Scoped tsc at the commit gate |
| Quote-escaping in generated source | 2 today | Yes | Load failure |

**The repeat that matters:** yesterday's lesson was written for numbers and recurred today as a sentence. A lesson written for the instance does not cover the class. The class is "non-code input to a panel"; the procedural fix is a table shape the packet must take.

## External-model calibration

| Seat | Real | Disproven | Cost |
|---|---|---|---|
| Ox | 6/6 (all had a real core) | 2 attacks | $0 |
| GLM | 6/8 | 2 | subscription |
| Kimi | 4/5 | 1 | $0.041 |
| Grok | 4/6 | 2 | $0.064 |
| HY3 | 3/4 | 1 | $0.003 |
| Qwen | 2/3 | 3 (REJECT did not stand) | $0 |

## Risks / guardrails

- Synchronous local `/stills` remains (unanimous P1) — next iteration, own hostile round.
- No real publish, 302 or render has run on this branch.
- The permalink route is unauthenticated by design; safety is UUIDv4 + published-only. Stated in the file header.

## Provenance & privacy

`originating_model: claude-fable-5`. Sanitizer CLEAN on all committed files. IDs/roles only; no client data, no keys, no absolute paths.
