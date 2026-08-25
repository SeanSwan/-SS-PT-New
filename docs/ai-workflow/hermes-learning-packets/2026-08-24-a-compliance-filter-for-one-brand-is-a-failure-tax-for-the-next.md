---
title: A compliance filter written for one brand becomes a failure tax the moment the product serves a second one
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: claude-fable-5 is the Fable-tier Final Decider by definition (CLAUDE.md Co-Orchestrator Hierarchy).
date: 2026-08-24
decision: Every law in a taste/compliance filter is classified as HOUSE (holds everywhere) or BRAND (holds for one workspace); a multi-project surface exposes the profile explicitly and never drops a house law.
status: draft
supersedes: none
models_used:
  - model: claude-fable-5
    role: orchestrator
    did: Wrote the packet, arbitrated three seats against verified code, built the two-lane inversion + taste client + law profiles, ran four hostile rounds, found the LAW4 tax by probing the real module.
    cost: subscription
  - model: glm-5.3
    role: reviewer
    did: Named the law-filter shape mismatch (top finding), the TOCTOU, the sync-vs-27s contract problem, the taste write endpoints, and the FLUX A/B probe protocol.
    cost: subscription
  - model: stealth/ox-alpha
    role: reviewer
    did: Named taste-to-hosted exfiltration, the line-cap breach, an unprobed lane being advertised, and asked whether the house lexicon was enforced at all.
    cost: $0
  - model: qwen3.8:27b-mtp-q4_K_M
    role: reviewer
    did: Named the VRAM concurrency hazard and the unauthenticated write-capable taste server; wrong on the card size and on the product frame.
    cost: $0
skills_touched:
  - name: Rule 9 (no yoga/meditation) + credential phrasing
    change: amended
    why: Now verified to be enforced in code by LAW10 of the law filter, which answers a standing panel question; recorded so no future seat re-asks it.
  - name: hostile-round vantage discipline
    change: proposed
    why: A green unit suite hid a brand-law tax that one real-module probe with a realistic sentence exposed in seconds.
surfaces: [atelier/composeStills, atelier/promptSources, atelier/localStillLane, swanLawFilter, comfyuiLocal, comfyuiGraph]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

The Atelier Still rung was inverted to local-first on the 5090 and the Swan taste brain became a prompt source. In the second hostile round, running the real law filter on a real sentence — "a lone swan on a glacier lake at dawn" — returned `LAW4-optics-not-creatures`. The filter was right by its own charter: for SwanStudios the swan is light behaviour, never a bird. It was wrong for the studio Sean just asked for, which serves *other* websites where NatGeo wildlife is his default subject vocabulary.

The fix was classification, not loosening. Every law was read and sorted: **house** laws (LAW3 anti-AI-slop kill-list, LAW9 retired palette, LAW10 content — yoga/meditation and credential claims) hold in every workspace; **brand** laws (LAW4 creatures, LAW2 gold allowlist) hold only under the default `full` profile and drop only under an explicit, per-request `universal` profile. Every rejection still names its law.

## Why (the rationale Hermes should carry forward)

A filter encodes *whose* taste it enforces, and that ownership is invisible until a second owner shows up. Applied unconditionally, LAW4 would have rejected most of what the taste brain produces for a nature-brand client — a permanent failure tax that looks, from the outside, like "taste mode is broken." Nobody would have found the cause from the error rate alone; the error message names the law, which is the only reason the diagnosis took one probe.

The general form: **a rule that is correct for the system it was written in becomes a defect when the system's scope widens, and it fails silently because it was never wrong — only out of place.** The corrective is not to weaken the rule but to make its scope explicit.

## Reusable pattern / rule Hermes should apply next time

1. When a single-tenant validator is reused by a multi-tenant surface, classify each rule as house or per-tenant **before** wiring it. A rule with no owner recorded is a brand rule waiting to become a tax.
2. Never drop a rule silently. Profiles are explicit, per request, and the response says which profile ran and what it dropped.
3. A hostile round must include a probe of the **real module with a realistic input**. Unit fixtures are written by the same mind that wrote the code and share its blind spots; a real sentence does not.
4. When reusing a validator on a new input *type*, read its signature first — `assertLawful(slots, facets)` fed a bare string is a gate that passes everything.

## Who did what

**Fable 5** built and arbitrated. Found the LAW4 tax — not the panel — by probing the real filter after the panel had returned. Also supplied a wrong absence claim (H3 not installed) by checking one models directory and not `extra_model_paths.yaml`.

**GLM-5.3** had the highest-yield finding of the panel: the law filter is slot-shaped, so the taste tie-in as first drafted would have been a silent no-op. Its FLUX.1-schnell A/B protocol became the probe procedure. Its "~60 lines" estimate for `MediaAsset` persistence was wrong (`r2Key` NOT NULL; only an agent-side presigned upload path exists).

**Ox Alpha** caught the taste-to-hosted exfiltration and forced the local-only pin. It asked whether the house lexicon was enforced anywhere — it is, by LAW10 — which is now recorded so it is never re-asked. Its "two sources of truth for price" was disproven: hosted image models are not in the video catalogue.

**Qwen 3.8 (local, $0)** was right about VRAM concurrency and the write-capable taste server, wrong that the card is 24 GB (it is 32) and wrong to frame this as a multi-tenant SaaS. Its REJECT did not stand; two of its four blockers did.

## Skills created or changed

- **Rule 9 / credential phrasing — amended (verified).** These are enforced in code by `LAW10-content`. Recorded because a paid seat spent a confidence item asking, and the next one would too.
- **Hostile-round vantage — proposed.** Add "one real-module probe with a realistic input" to the dry-loop's vantage list; a green suite and a real sentence disagreed within the same hour.

## Mistakes I made

- **Wrapped taste strings into a slot-shaped filter only because a reviewer named the mismatch; my first draft would have passed everything.** Caught by GLM. **MECHANISM:** before reusing a validator on a new input type, read its signature; a shape mismatch is a gate that passes everything.
- **Applied a brand law to a multi-project surface and did not see it in a green suite.** Caught by running the real module on a real sentence in round 2. **MECHANISM:** every hostile round includes one real-module probe with a realistic input, not a fixture.
- **Wrote the idempotency store at completion in the original S1** — a race three seats found. **MECHANISM:** reserve the key before the work; a check after it is a TOCTOU by construction.
- **Implied H3 weights were absent by checking one models directory.** Caught by reading `extra_model_paths.yaml`; the weights are on a second drive. **MECHANISM:** an absence claim about installed models checks every configured model path, not the default.
- **Spent three failed regex/perl attempts on one visibly broken line** before using an exact-string edit. **MECHANISM:** a byte-exact defect you can see gets the exact-match editor first; regex is for patterns.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Absence claim from one search path | 2 — comfyuiLocal line count (morning), H3 weights (afternoon) | **Yes — this morning's packet, "a stale number you supply comes back as a finding," and the standing INSTRUMENT-CHECK memory** | Reading a second config file. No procedure fired; a reviewer's question did |
| Validator reused on the wrong input shape | 1 | No | GLM |
| Rule correct in its origin, wrong in wider scope | 1 | No | Real-module probe |
| Idempotency recorded after work | 1 | No | Three seats |
| Regex where exact-edit was needed | 3 attempts, 1 defect | No | Switching tools |

**The repeat that matters:** "absence claim from one search path" recurred the same day it was written up, and the INSTRUMENT-CHECK memory already covers it. The write-ups were resolutional ("validate the instrument"); what would have stopped it is procedural — *an absence claim about installed models enumerates every configured path* — so that is the form recorded above.

## External-model calibration

| Seat | Real | Disproven | Cost | Read |
|---|---|---|---|---|
| GLM-5.3 | 6 of 8 blockers incl. the top one | 1 (persistence effort) | subscription | Best prescriptions; its confidence section was again a to-do list |
| Ox Alpha | 4 of 5 | 1 (price two-truths) | $0 | Best at "what will bite"; asked the question that closed a standing gap |
| Qwen 3.8 | 2 of 4 | 2 (card size, product frame) | $0 | State the frame explicitly in the packet; it improves sharply |

## Risks / guardrails

- The local still lane has **never rendered a still**. It ships `claimed` and refuses until probed; the probe is Sean's.
- `stop_comfyui` is still ungated on the box and the MCP allow-list is still a doc.
- No spend ledger; ceilings are per batch. No asset persistence for stills.
- `universal` drops two brand laws by explicit request only; a UI that defaults to it would quietly change what "lawful" means. Default stays `full`.

## Provenance & privacy

`originating_model: claude-fable-5`. Sanitizer: `scripts/scan-secrets.sh` CLEAN on all 14 changed files. IDs/roles only; no client data, no keys, no absolute paths.
