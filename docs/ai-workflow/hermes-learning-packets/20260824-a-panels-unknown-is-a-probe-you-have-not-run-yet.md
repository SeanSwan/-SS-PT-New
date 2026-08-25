---
title: A panel's UNKNOWN is a probe you have not run yet — three of three came back as live defects
originating_model: claude-fable-5
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider (Sean 2026-06-10) and the rule-68 source gate's named Fable-tier model
date: 2026-08-24
decision: When review seats tag a security fact UNKNOWN, the orchestrator probes it before synthesis. An unverified invariant is not a finding; a resolved UNKNOWN is usually a defect.
status: draft
supersedes: none
models_used:
  - model: claude-fable-5
    role: orchestrator
    did: ran the grill (14 Q&A), wrote the sanitized packet and an anchor-free own seat, probed the box read-only, synthesized five seats, applied three hardening fixes with before/after proof, broke and repaired the browser lane in the process
    cost: subscription
  - model: claude-opus-5
    role: orchestrator (first part of the session, before Sean switched /model)
    did: read the prior handoff, opened the grill and the checkpoint doc, found the marketing engine built-but-unarmed on main
    cost: subscription
  - model: stealth/ox-alpha
    role: reviewer
    did: egress-firewall headline, DoS via unbounded SELECT, the chat channel as a persuasion channel, k-anonymity gate, "delete the losing engine"
    cost: $0
  - model: x-ai/grok-4.6
    role: reviewer
    did: remove-the-DB-role-from-the-box (adopted as D1), confidentiality-vs-integrity, automation aliasing on arming day, data-at-rest tiering
    cost: $0.057
  - model: glm-5.3
    role: reviewer
    did: tiers defined by egress boundary (adopted as D2), shown-vs-sent rendering test, four-env-var install acceptance, drop providers without zero-retention
    cost: subscription
  - model: qwen3.8:27b (local)
    role: reviewer
    did: confirmation only; mislabeled its own output as another seat
    cost: $0
skills_touched:
  - name: grill-me
    change: proposed
    why: for an infrastructure surface the vision tier is "what may the box hold and what must never leave the house" — the skill's purpose questions are product-shaped; add a credential-inventory + data-tier question for boxes and agents
  - name: instrument-check
    change: proposed
    why: two new instrument facts — a head-cut grep result is not a result; grep the reference form before a path sed
  - name: feedback-consult-seat-gotchas (memory)
    change: amended
    why: local Qwen self-labels as another seat; the Windows ~8K command-line cap masquerades as a heredoc quoting error
surfaces: [always-on box hardening, docs/ai-workflow/brainstorms/radar-pc-utilization-2026-08-24.md, docs/ai-workflow/AI-HANDOFF/panel-radar-privacy-2026-08-24/]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

A five-seat privacy panel (Ox, Grok 4.6, GLM 5.3, local Qwen, Fable) reviewed the design for the owner's always-on box. Three seats tagged the same security facts `[UNKNOWN]`: whether the backup key can delete, whether the browser agent can rewrite its own allowlist, whether the box holds the backup repository key. One read-only probe after synthesis resolved all three — **every one was a live defect**, plus a fourth nobody asked about (the agent user owned the directory holding root-executed scripts). The panel's synthesis was correct in shape and blind in fact until the probe ran.

Built tonight, with the owner's go: root-owned script directory, allowlist relocated to a root-owned path that the unit's sandbox makes read-only by construction, swap off with a `MemorySwapMax=0` drop-in. Proven by a real run (success, 2/2 targets).

## Why (the rationale Hermes should carry forward)

Reviewers reason from the packet; the packet is prose. A security invariant stated in prose ("full compromise can at most read business data") gets *argued* by a panel — but only *measured* by a probe. The seats did the right thing by tagging what they could not see; the orchestrator's job is to treat each tag as a to-do, not a caveat. The ratio tonight was 4 defects per 3 unknowns. That ratio will not always hold, but the cost of a probe (one SSH read, counts and listings only) is so far below the cost of a wrong invariant that the rule is unconditional.

## Reusable pattern / rule Hermes should apply next time

1. **Collect every `[UNKNOWN]` from every seat into one list before synthesis.** Probe each one read-only. Only then write the ruling.
2. **A resolved UNKNOWN that is a defect gets fixed under the owner's existing go if it is the same class as an approved fix; a new class waits for a new go.** Tonight: allowlist ownership (approved class) yes; the agent-owned code tree (new class) flagged, not touched.
3. **Every remote fix script carries its own proof**: before-state, change, after-state, and a real run of the affected job. The proof is what caught the broken relocation within the same execution.
4. **Grep the reference form before any path `sed`.** A file referenced through a variable is not found by a literal-path pattern; the sed reports success and changes nothing.

## Who did what

Opus 5 opened the session and found, before any question was asked, that the marketing engine the owner wanted built already existed on `main` unarmed — that reframed the money engines from construction to arming. Fable ran the grill and the panel. Grok produced the ruling that won the one real disagreement (no database credential on the box at all), beating Fable's own pre-read proposal (redacted views with a read-only role) — the orchestrator's design was the weaker one and the synthesis says so. GLM supplied the tier definition that made the whole design enforceable at one point. Ox supplied the firewall and the "chat is a persuasion channel" insight that changed the approval flow. Qwen restated consensus and mislabeled itself. Fable was the only seat that *verified* anything on the box.

## Skills created or changed

- `grill-me` — proposed amendment (infra vision tier: credential inventory + data tiers). Not applied; awaiting the owner's yes.
- `instrument-check` — proposed additions (head-cut results; reference-form grep before sed). Not applied.
- consult-seat gotchas memory — amended with two instrument facts (Qwen self-labeling; 8K command-line cap).

## Mistakes I made

1. **Two Bash heredocs failed with `unexpected EOF while looking for matching quote` and I read it as a quoting problem both times.** The quoting was fine; the command exceeded the Windows ~8K command-line cap and bash never saw the terminator. Caught on the second failure by counting where the error line fell. Fix that holds: content over ~7K goes through the Write tool or a script file.
2. **A `head -8` cut turned a live middleware into "dormant."** My first grep for the PII middleware's importers returned only generated-index hits because the head window filled before the real importers appeared; I nearly told the owner his middleware was unmounted. A positive control with a wider glob caught it in the same turn. This class is *already in the corpus* (the clipped-result reflex) — and I repeated it.
3. **A literal-path `sed` against a runner that referenced the file through a variable.** The sed "succeeded," matched nothing, and the relocation left the job pointing at a deleted file; the browser lane was down for about two minutes. The proof run I had built into the script is what caught it. New class; procedural fix above.
4. **I promised the owner a fix ("restic excludes for agent state") before checking its premise.** Nothing on the box is backed up by restic, so the fix was moot. Disclosed in the report rather than inventing a change.
5. **My own seat's design lost to a $0.057 review.** Not an error of process — the anchor-free seat is exactly what surfaced it — but Hermes should know the orchestrator's first design is routinely not the best one in the room.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before this session? | What stopped it |
|---|---|---|---|
| Command exceeded the Windows command-line cap; misread as quoting | 2 | No | Diagnosed on the 2nd failure; rule: >7K → file |
| Clipped grep treated as the whole result | 1 | **Yes** (clipped-result reflex in the corpus) — repeated anyway | Positive control run in the same turn |
| Literal-path sed on a variable-form reference | 1 | No | Real-run proof embedded in the fix script |
| Fix promised before its premise was checked | 1 | No | Probe before execution; disclosed as moot |

The repeat in row 2 is the highest-signal entry: the lesson existed, in the corpus, as a reflex, and it did not prevent the act. What prevented harm was a *mechanical* positive control run before the claim left the turn — not the memory of the rule.

## External-model calibration

| Seat | Cost | Findings real | Disproven | Note |
|---|---|---|---|---|
| Ox Alpha | $0 | 5 (firewall, DoS, persuasion channel, k-gate, delete-the-loser) | 0 | tagged its UNKNOWNs honestly; all three were defects |
| Grok 4.6 | $0.057 | 5 (no DB role, confidentiality≠integrity, aliasing, data-at-rest, split calls) | 0 | won the disagreement; best value per dollar this month |
| GLM 5.3 | plan | 5 (tier-by-boundary, shown≠sent, 4-env-var test, provider drop rule, hash-chain) | 0 | did not roleplay when the remit forbade it |
| Qwen 3.8 | $0 | 0 unique | 1 impractical | confirm-only seat; check its header |
| Fable (own seat) | — | 1 verified fact the others could not | 1 superseded design | write the seat before reading the others |

## Risks / guardrails

- The panel's decisions are design; the app-side agent principal, drafts queue, and egress function are unbuilt. Nothing in this packet claims they exist.
- One defect remains open by choice (the agent-owned code tree) because it was outside the owner's go.
- The two credential gate files the prior session was blocked on were still absent at close.

## Provenance & privacy: originating_model, sanitizer PASS, IDs-only confirmed

originating_model = claude-fable-5 (tier gate PASS). Repo secret scanner: CLEAN on this file's siblings; name/host grep on the committed panel docs: 0 hits with a positive control of 92 on the (also committed, roles-only) brainstorm doc. No client identifiers, no secrets, no absolute paths.
