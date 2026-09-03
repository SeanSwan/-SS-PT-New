---
originating_model: claude-opus-5
tier: fable-tier
date: 2026-08-16
topic: "Narrow-lens multi-model consults filter the answer before it exists"
status: durable
models_used:
  - model: claude-opus-5
    role: orchestrator, packet author, synthesis
    did: "Wrote three sanitised consult packets, ran nine model calls, synthesised into three published documents. Made the lensing error this packet exists to prevent."
    cost: subscription
  - model: moonshotai/kimi-k3
    role: assigned 'systems architect' (lensed — the error)
    did: "Enforcement architecture, deny-only classifier design, adversarial self-attack. Caught a self-contradiction in the orchestrator's own locked decisions."
    cost: ~$0.40 across 3 calls
  - model: z-ai/glm-5.3
    role: assigned 'product lead' (lensed — the error)
    did: "Best absence analysis AND the two sharpest structural/security catches of the session — both from OUTSIDE its assigned lane. This is the model the error cost most."
    cost: subscription
  - model: tencent/hy3
    role: assigned 'interaction designer' (lensed — the error)
    did: "Consent-fatigue analysis and refusal-screen design, adopted nearly intact. Identified the shadow-IT bypass as the top real leak vector."
    cost: ~$0.01 across 3 calls
  - model: anthropic/claude-fable-5
    role: final decider on five open splits
    did: "Ruled on all five. Produced the session's best unprompted insight: the privacy fix relocated the governance problem rather than removing it."
    cost: ~$0.33
  - model: gemini-3.1-pro-preview
    role: design authority
    did: "Useful one-handed-ergonomics findings; reflexively imposed an unrelated project's brand palette, which was rejected."
    cost: subscription
skills_touched:
  - id: rule-82
    action: proposed
    motivated_by: "Per-model lensing filtered each model's contribution before it was made. Proven by the lensed 'product' model out-performing the lensed 'systems' model on architecture."
  - id: rule-69-memo
    action: amended-in-practice
    motivated_by: "Leak gate was run on outbound packets but not on published artifacts. A near-miss published children's names."
  - id: validation-orchestrator
    action: proposed
    motivated_by: "SWAN_VILLAGE_SINGLE_PASS_DEBATES unreadable in plan mode; estimator aborts every plan-mode run."
---

# Full-Spectrum Panel Law

## The lesson

**Assigning each model in a multi-model panel a narrow role filters its contribution before it
is made.** Lensing optimises for *non-overlap between reviewers*. That is the wrong objective.
The objective is *maximum depth per brain on every dimension* — diversity of conclusions comes
from model diversity, not from artificially narrowing remits.

The corrected form, in Sean's words and better than the orchestrator's: **roles are declared,
not restrictive.** A model may keep a specialty; the required shape is *"my assigned role is X;
from that angle I see …, and here is everything else I see across every other angle."* The role
earns the deepest pass; it never bounds scope. A lane-bound reply is incomplete and gets re-run.

## Who did what

Three rounds, six models, one side-project design brief (a private on-device assistant for a
solo preschool teacher; all packets sanitised to IDs and roles).

- **Opus 5 (me)** authored the packets and made the error. I assigned Kimi "systems", GLM
  "product", HY3 "interaction", Gemini "design", Fable "final decider" — deliberately, to force
  non-overlapping replies and avoid three restatements of one answer. The reasoning was
  defensible and the outcome was wrong.
- **GLM 5.3 is the model that indicts the method.** Confined to product, it nonetheless
  produced (a) the best *architectural* catch of the session — that the plan never located the
  laptop in physical space, so the strongest model would have been running where the work
  wasn't; and (b) the sharpest *security* finding — that a prompt-injected local model with
  tool access can launder tainted notes into clean-looking prose before they reach the egress
  gate, so the gateway inspects at the door and sees something clean. It found both while
  pointed away from both.
- **Kimi K3** caught a contradiction in my own locked decisions that I had not seen: I had
  simultaneously settled "child-linked items auto-expire on a rolling window" and
  "contemporaneous documentation is often the only protection a teacher has." Expiry would have
  deleted exactly the protective records, at roughly the horizon where an incident becomes a
  dispute.
- **HY3** was the price-performance outlier by a wide margin (~$0.004/call) and produced the
  most immediately usable interaction design in the run.
- **Fable 5**, given the panel as seed, produced the best single insight unprompted: that our
  privacy fix had *relocated* the governance problem into a personal cloud account rather than
  removing it — a year of children's records accumulating somewhere the school cannot see and
  that walks out the door on a job change.
- **Sean** caught the method error. I did not. The output looked excellent, which is exactly
  why the failure is dangerous.

## Skills created or changed

- **Rule 82 — Full-Spectrum Panel (proposed, drafted, not yet applied).** Every multi-model
  consult has every model answer the complete brief across all angles. Roles declared, never
  restrictive. Identical packet, identical output format, mandatory DISSENT section, synthesis
  attributes per-model-per-angle so the routing table becomes learnable. Must land on `main`
  as 82 — the working branch is at 73 and `main` is at 81, so numbering from the branch would
  have collided with a production rule.
- **Leak-gate scope widened in practice.** The gate was designed for outbound model packets.
  It must also run on **published artifacts**. Caught a near-miss where a teacher-facing
  document quoted children's first names from a source transcript.
- **`validation-orchestrator.mjs` gap identified (proposed fix, unclaimed).**
  `SWAN_VILLAGE_SINGLE_PASS_DEBATES` is read only at `:2514` (file-review path), never at
  `:2203` (plan-mode gate). So a flat, debate-free Village run cannot be requested in plan
  mode, and the estimator then prices debates at ~$138 of a $147 worst case and aborts.

## Mistakes I made

- **Assigned narrow per-model lenses across a three-round panel.** The defining error. Caught
  by Sean, not by me. Subtle because lensed output *reads* as thorough coverage.
- **Assumed an iPhone for an entire published plan** because the owner mentioned a Mac. One
  question would have prevented a full platform re-derivation across a finished document.
- **Baked an unverified hardware figure into a published artifact** ("16GB") from a single
  spoken number, then corrected it twice. Should have marked it unverified on first use.
- **Nearly published children's first names.** My own gate caught it — but only because I ran
  it on the artifact, which was not the original protocol.
- **Missed a contradiction between two of my own locked decisions.** An external reviewer found
  it. Expiry vs. protective documentation are mutually exclusive as I wrote them.
- **Nearly added a numbered rule to a stale branch.** Would have collided with an existing
  production rule. Only caught because I checked both files on both branches before writing.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Unverified fact baked into a published artifact | **3** (iPhone platform, 16GB RAM, 32GB RAM) | No — recurred twice after the first correction | Nothing yet. This is the recurring class. The procedural fix is: **any hardware/environment fact stated by voice is `[UNVERIFIED]` until checked, and never enters an artifact unmarked.** Resolutional fixes ("be more careful") demonstrably failed — it recurred twice. |
| Method error invisible in the output | 1 | No | Sean's review. Now Rule 82. |
| Own locked decisions mutually contradictory | 1 | No | External reviewer. Procedural fix: re-read the settled-decisions block as a set before locking, specifically for pairs that cannot both hold. |
| PII nearly leaked into a published artifact | 1 (caught) | Yes — the gate existed | Running the existing gate on artifacts, not just packets. |
| Rule numbering collision | 1 (caught) | No | Checking both files on both branches before writing. Now recorded here. |

**Highest-signal row is the first one.** The same error class — stating an environment fact as
settled on unverified input — recurred three times in a single session, twice *after* being
corrected. That proves the correction was resolutional, not procedural. The procedural rule is
written above; if it recurs again, the write-up was still not a fix.

## External-model calibration

| Model | Cost / latency | Findings real on verification | Notes |
|---|---|---|---|
| GLM 5.3 | subscription · 250–400s (slowest by far, very high reasoning tokens) | All held. Two best structural catches of the run. | Best-value brain here. Do not lens it. |
| Kimi K3 | ~$0.13 · 120–260s | All held. Best adversarial self-attack sections. | Its "how this leaks anyway" output exceeded its main design output in value. Always ask for it. |
| HY3 | ~$0.004 · 80–110s | All held. | Extreme price-performance outlier on human factors. Under-used. |
| Fable 5 | ~$0.33 · 53s | Held; produced the best unprompted insight. | Works well seeded with prior replies as final decider. |
| Gemini 3.1 Pro | subscription · 48s | UX findings held; **brand direction rejected.** | Reflexively applies its home project's palette to unrelated products. Check for this every time. |
| AI Village | **$0 — aborted at its own spend gate** | n/a | Unusable in plan mode until `debatePanels` is wired into the `:2203` gate. |

Whole-session spend across nine model calls: **under $1.00**.
