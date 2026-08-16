# MiniMax H3 — US licensing authorization request

- **Date:** 2026-08-11 · **Prepared by:** Opus 5 for Sean
- **Status: SENT by Sean on 2026-08-16.** Awaiting reply. **A pending request is not a grant** — see "After sending" below; nothing changes operationally until a written authorization arrives.
- **⚠ What was sent differs from the body of this document.** The version Sean sent was corrected on 2026-08-16 because the compliance-control list below said "built or in build" for three controls that were **not built**, and omitted the strongest control that now exists. See §"What was actually sent" immediately below — treat that as the record of the submission, and the original block further down as superseded drafting history.
- **Why:** the MiniMax H3 Community License carves out the **US, EU, UK and South Korea**. Sean is US-based, so running the open weights locally for commercial use requires an explicit grant. The **hosted API needs none of this** — it is a normal paid service and is unblocked today.
- **What this unlocks:** zero-marginal-dollar generation on the RTX 5090. Sean's words: *"of extreme importance that I have this option."*

---

## What is actually true (verified 2026-08-11)

| Fact | Status |
|---|---|
| H3 open-sourced 2026-08-03; weights at `MiniMaxAI/MiniMax-H3`; Day-0 ComfyUI support | `[VERIFIED]` |
| On a 32GB 5090: ~21GB pruned INT8 is the community default; peaks ~31.7GB; 8s clips ≈ 2–14 min | `[VERIFIED]` |
| **2K runs locally** via ComfyUI dynamic offloading (the "768p local ceiling" claim was wrong) | `[VERIFIED]` |
| Free for commercial use **under $20M/yr revenue** | `[VERIFIED]` |
| **US / EU / UK / South Korea excluded** from the grant; those regions may submit formal licensing requests | `[VERIFIED]` |
| Grants go to applicants committing to compliance controls + guardrails aligned with local law | `[VERIFIED]` |
| **"MiniMax H3" must be displayed prominently** in any commercial product UI using it | `[VERIFIED]` |
| Training or distilling another model on H3 outputs is prohibited | `[VERIFIED]` |
| Channel: `api@minimax.io`, subject `MiniMax H3 licensing - authorization request` | `[VERIFIED]` |

**Nothing waits on this.** Wan 2.2 (Apache 2.0) remains the local agent-MVP target, and the hosted lane is unblocked. H3-local becomes a drop-in provider entry once a grant arrives — not a workstream.

---

## What was actually sent (2026-08-16) — THIS is the record of the submission

The compliance-control block in the draft below claimed six controls as **"built or in build."**
Checked against the code on 2026-08-16, three were not built, and the strongest control that
now exists was not claimed at all because it did not exist when the draft was written.

Sending it unchanged would have misrepresented our posture to a licensor. The sent version
therefore splits the list, and says so explicitly in the body:

**Stated as IMPLEMENTED TODAY:**
1. **Attribution** — a required field on the provider capability contract; a provider cannot be
   registered or enabled without its attribution string, and the string travels with every
   generated artifact. Enforced by `assertSpecShape` in `shared/providers/video/catalogue.mjs`.
2. **Territorial licence gating** — `resolve()` in `shared/providers/video/registry.mjs` refuses
   H3 for commercial output in an excluded territory unless a written grant is recorded in
   `SWAN_VIDEO_LICENCE_GRANTS`. Fail-closed. *(Not claimed in the original draft — it post-dates it.)*
3. **Human review** — operational.
4. **No distillation** — policy commitment.

**Stated as COMMITTED, NOT YET BUILT:**
5. Per-asset provenance with a `licenceSnapshot` of the licence text in force at generation time.
6. Server-side volume and spend caps, enforced before submission, fail-closed.
7. A prompt policy filter for the video path. *(The image lane has `swanLawFilter.mjs`; nothing
   wires it to video.)*

The sent email states that this separation is deliberate — that it represents actual rather than
intended posture.

**If any of controls 5–7 get built, update this section and consider a short follow-up to
`api@minimax.io`.** The submission is now a dated claim about a moving system; the delta between
what was sent and what is true has to stay visible, or this document resumes lying quietly.

**Operational state until a written grant arrives:**
- H3-local for **commercial** output stays refused — and the code enforces it, so this is not a
  discipline question.
- **Non-commercial local runs need no grant and are not blocked.** Testing can proceed today.
- The hosted lane (`minimax/hailuo-hosted`) needs no grant and is registered as a peer.

---

## THE EMAIL — original draft (SUPERSEDED — see above for what was sent)

> **To:** `api@minimax.io`
> **Subject:** `MiniMax H3 licensing - authorization request`

```
Hello,

I am requesting authorization to deploy MiniMax H3 locally for commercial
use in the United States, per the territorial provisions of the MiniMax H3
Community License Agreement.

ENTITY
  Legal entity:      [[ LEGAL ENTITY NAME ]]
  Registered in:     [[ STATE ]], United States
  Annual revenue:    under USD $20,000,000
  Attested by:       [[ YOUR NAME ]], [[ TITLE ]], 2026-08-__

DEPLOYMENT
  MiniMax H3 runs on a single local workstation (one NVIDIA RTX 5090) as one
  provider inside an internal creative tool used to produce instructional and
  brand media for a personal-training platform.

  - Administrator-only access; single operator.
  - Not resold, not exposed as a public generation service, no third-party
    or end-user access to the model or its weights.
  - All output is reviewed by a human before any publication or client
    delivery.

DISTRIBUTION SCOPE
  [[ internal only / delivered to coaching clients / published publicly —
     pick and describe in one sentence ]]

COMPLIANCE CONTROLS (built or in build)
  1. Attribution — "MiniMax H3" is displayed prominently in the product UI
     wherever H3-derived output appears. Implemented as a required field on
     the provider capability contract, so a provider cannot be enabled
     without its attribution string.
  2. Provenance — every generated asset carries a durable record of provider,
     model version, and the license in force at generation time.
  3. Spend and volume controls — server-side caps enforced before submission,
     fail-closed (an unconfigured cap denies rather than permits).
  4. No distillation — H3 outputs are never used to train, fine-tune, or
     distill any model.
  5. Content guardrails — a policy filter runs on every prompt before
     submission; no depiction of identifiable real people without consent,
     no minors, no deceptive or impersonating content.
  6. Human review — no generated asset is published or delivered without
     operator review.

I am happy to accept additional conditions, reporting obligations, or
periodic re-attestation, and to answer any questions about the deployment.

Thank you for considering this request.

[[ YOUR NAME ]]
[[ TITLE ]], [[ LEGAL ENTITY NAME ]]
[[ CONTACT EMAIL ]]
```

---

## The four fields Sean must supply

1. **Legal entity name + state of registration** — the operating entity, not a trade name.
2. **Distribution scope** — internal only / delivered to coaching clients / published publicly. This is the field the reviewer will weigh most; be accurate rather than minimal.
3. **Your name + title** for the attestation and signature.
4. **Contact email** for their reply.

**Revenue attestation:** under $20M/yr — confirm, and note this is **dynamic**. Re-attest annually; crossing the threshold requires a separate written authorization through the same channel.

---

## After sending

- **Send date: 2026-08-16** (logged). No published SLA exists for these requests; the queue length is unknown, so do not read silence as refusal.
- **Keep Slice 9 blocked** until a written grant arrives. A pending request is not a grant.
- **Do not run H3 weights locally for commercial output in the interim.** The hosted API is the compliant path today and costs ≈$0.64 per 8s 1080p hero.
- **If declined:** Wan 2.2 (Apache 2.0, no application) carries the local lane, and hosted H3 carries quality work. Nothing in the roadmap dies.
- **On grant:** attribution requirement goes live in the UI **before** the first H3-local asset ships, and the license text is captured into the per-asset `licenceSnapshot` field.

---

## Standing business note

The Disney / Universal / Warner Bros. litigation against AI video generators was active as of 2026-05. This does not block the request and is not legal advice — but it is why per-asset provenance (control 2 above) is worth building now rather than retrofitting. If platforms or regulators later demand it, provenance is the difference between a config change and a rebuild.

**This document is not legal advice.** It is a prepared submission based on the published license text. For a commercial deployment of this kind, a short review by counsel before sending is cheap insurance.
