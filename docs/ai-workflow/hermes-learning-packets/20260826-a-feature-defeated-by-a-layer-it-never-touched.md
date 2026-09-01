---
title: "A feature can be defeated by a layer it never touches"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stated: 'You are powered by the model named Fable 5', exact id claude-fable-5) — Rule 68 allowlist member by name"
date: 2026-08-26
decision: "Shipped brand kits (d2451c411) so the studio can render for sites that are not SwanStudios. The kit resolved correctly and applied correctly and the feature still did not work: two layers down, the prompt compiler applied every SwanStudios law to every brand, so a non-Swan site could not render a fox."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: multi-tenancy / enforcement-points / review-packets
models_used:
  - model: claude-fable-5
    role: builder + packet author + Final Decider
    did: "Built brand kits; put the central defect in the packet AS AN OPEN QUESTION instead of spending five minutes probing it; found the deeper compiler bug by sibling sweep while chasing a reviewer's hypothesis."
    cost: subscription
  - model: qwen-3.8
    role: reviewer (free, local)
    did: "Rated the compiler leak P0 and reasoned to it FROM THE PACKET ALONE, without the code: 'if swanPromptCompiler contains hardcoded SwanStudios logic, every non-Swan render is compromised. The name itself suggests a lack of abstraction.' The single most valuable finding of the round, from the free seat."
    cost: "$0 (local)"
  - model: glm-5.3
    role: reviewer
    did: "Sharpest framing of the default: 'if the default is swanstudios, §1's bug is now the default behavior.' Also: kit label without kit version, and that the green number excluded a third of the repo."
    cost: "$0 (subscription)"
  - model: x-ai/grok-4.6
    role: reviewer
    did: "Taste path P0; the one-click brand-law escape hatch in the Swan UI. Its apply-vs-law-order P1 was disproven — the opposite is true."
    cost: "$0.0540"
  - model: stealth/ox-alpha
    role: reviewer (standing seat)
    did: "Kit not persisted on the asset row; default-kit semantics unstated; no authz on kit selection or law override. Returned first try this round."
    cost: "$0.0000 (data-egress seat)"
  - model: moonshotai/kimi-k3
    role: reviewer
    did: "Taste leak; that a recorded lawProfile override is 'an audit footnote, not a control'; and that no verification proves the kit affects a real render — still true."
    cost: "not captured — see below"
  - model: hunyuan-3
    role: reviewer
    did: "Taste path P0, independently."
    cost: "not captured — see below"
skills_touched:
  - id: enforcement-point-sweep
    action: proposed
    motivated_by: "A brand 'mode' was resolved, applied, persisted and surfaced correctly and the feature still did not work, because a law check two layers down never received it. Adding a mode/profile/variant means tracing it to EVERY enforcement point, not just the one being edited."
  - id: panel-spend-capture
    action: proposed
    motivated_by: "This round's per-seat costs were lost when the background task's output buffer rotated. Panel cost must be written to a file by the run, not read afterwards from a task buffer — otherwise the spend disclosure is unverifiable exactly when someone wants to check it."
---

## The lesson

**A feature can be resolved correctly, applied correctly, persisted correctly, surfaced correctly — and still not work, because a layer it never touches enforces the thing it was built to relax.**

Brand kits exist so the studio can render for sites that are not SwanStudios. The kit resolved. It changed the prompt. It selected a law profile. It reached the response and the asset row and the picker. And the feature did not work, because `swanPromptCompiler` calls `assertLawful(slots, facets)` — which takes no profile and applies **every** law. The `universal` profile was consulted on the taste path and nowhere else. Compiling a real brief:

```
"a lone red fox crossing a snowfield at dusk"
  swanstudios -> E_LAW_VIOLATION [LAW4-optics-not-creatures]
  universal   -> E_LAW_VIOLATION [LAW4-optics-not-creatures]
```

LAW4 forbids literal creature form to protect the Swan mark. **A studio built to serve other websites could not draw a fox for any of them.** Every test passed. Every layer I edited was right.

The generalisation: **when you add a mode, a profile, a tenant, or a variant, the work is not "make the new thing flow through" — it is "find every place that enforces the old assumption."** Those places do not announce themselves; they are the ones that never needed a parameter before, so they never took one. A grep for the *new* concept finds nothing there by definition. The grep that works is for the *enforcement*: every call to the law check, the guard, the validator, the filter.

**Second lesson — an open question in a review packet is usually a defect you already suspect.** I wrote "the taste path does not get the kit… is the right answer (a) leave it, (b) apply it, (c) refuse?" and shipped that question to six paid and unpaid reviewers. All six came back saying it was a leak. **They were spending findings on something a five-minute probe would have settled** — and the probe I eventually ran took exactly that long and found something worse. A question I can answer with a command is not a question for reviewers; it is work I have not done yet. Reviewers are for the things I cannot see.

**Third — the free seat found the deepest bug.** Qwen, local and $0, reasoned to the compiler leak *from the packet alone, without the code*: "the name `swanPromptCompiler` itself suggests a lack of abstraction." That is a structural inference from a filename, and it beat every paid seat in the round. Two rounds of calibration now say the same thing: the cheap seats are not the shallow ones.

## Who did what

- **claude-fable-5** built it, asked the panel a question instead of probing it, then found the deeper defect by sibling sweep.
- **qwen-3.8** (free) inferred the compiler leak from a filename and a packet. Best finding of the round.
- **glm-5.3** framed the default bug in one sentence and caught the version-less kit label.
- **x-ai/grok-4.6** taste path and the UI escape hatch; one finding disproven.
- **stealth/ox-alpha** asset provenance and authz, first try, free.
- **moonshotai/kimi-k3** and **hunyuan-3** independently confirmed the taste leak.

## Skills created or changed

- **Enforcement-point sweep (proposed):** adding a mode means grepping the *enforcement*, not the mode.
- **Panel spend capture (proposed):** the run writes its own cost file. This round's per-seat costs were lost to a rotated buffer.

## Mistakes I made

- **I shipped the central defect as an open question.** Six seats confirmed what one command would have shown me.
- **I scoped a fix to where I first hit it instead of to its class.** The apostrophe-in-single-quotes bug was recorded as HELD for generated *test titles*; it recurred in generated *source* the same week.
- **I reordered a gate wrongly** — the taste refusal fired before the law-profile validation, so an invalid profile reported the wrong error. Caught by an existing test, not by me.
- **I could not verify my own spend disclosure.** The per-seat costs rotated out of the task buffer, so this round's total is an extrapolation and is labelled as one.
- **My first brand kit violated the brand's own law.** I listed "gilded fern gold" — true of the CSS palette, false of art direction — and LAW2 refused every brief.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Apostrophe in single-quoted generated strings | 1 | **Yes — 2026-08-24, as "generated test titles"** | Nothing yet. The write-up named the *location*, not the class. Now: any generated single-quoted string gets double quotes |
| Stale restated-code claim in a packet | **0** | Yes, twice | **HELD, second round running.** Generating every claim by command at write time |
| Green suite that never exercised the new wire | **0** | Yes | **HELD.** Falsification is routine now — neutering the change must redden specific tests, and it did |
| Asking reviewers something a probe would settle | 1 | No | A question answerable by a command is work, not a question. Probe first; ship only what survives |
| Unverifiable spend disclosure | 1 | No | The run writes its own cost file |

The pattern across three sessions is now unambiguous: **every correction that named a COMMAND has held; every correction that named a LOCATION has recurred somewhere else.** "Use double quotes in generated test titles" recurred in generated source. "Be careful with numbers in packets" recurred as a gate row. "Generate every restated claim at write time" has not recurred at all.

## External-model calibration

| Seat | Cost | Findings | Real | Note |
|---|---|---|---|---|
| qwen-3.8 | $0 | 2 | 2 | **Best finding of the round**, from a filename and a packet |
| glm-5.3 | $0 (sub) | 6 | 5 | Sharpest framing; 1 disproven (truncation) |
| stealth/ox-alpha | $0.0000 | 4 | 4 | First try, no retry needed |
| x-ai/grok-4.6 | $0.0540 | 5 | 4 | 1 disproven (apply-vs-law order) |
| moonshotai/kimi-k3 | not captured | 4 | 4 | Confirmatory this round |
| hunyuan-3 | not captured | 1 | 1 | Confirmatory |

**Routing read, third round of data.** The free and subscription seats have now produced the round's best finding three times running. Paid seats confirm and elaborate; they have not once been the only source of the deepest defect. For contract-, gate- and design-shaped review the panel that earns its keep is **Qwen + GLM + Ox + HY3**, with Grok added when a *rationale* needs attacking rather than a diff — that is the shape it has been good at twice.
