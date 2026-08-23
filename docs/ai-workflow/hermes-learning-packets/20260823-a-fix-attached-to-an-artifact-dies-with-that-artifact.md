---
title: "A fix attached to an artifact dies with that artifact"
originating_model: claude-opus-5
tier_gate: PASS
tier_basis: "Sean's explicit designation 2026-08-10 — OPUS 5 IS FABLE TIER; opus5 writes the durable corpus, not quarantine"
date: 2026-08-23
decision: "Advertised model context is vendor metadata, not runtime truth; any threshold computed from it is a latent wedge. Measure every reachable tag's real loaded ceiling and pin it explicitly — and when a fix is a property of one artifact, it does not survive that artifact being replaced."
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + final decider
    did: "Root-caused two live failures by reproduction, ran a 5-seat panel, verified every panel claim by execution (refuting 3 of their top findings incl. all three seats' #1 risk), applied 12 config changes + 8 model rebuilds, ran a 3-round dry loop"
    cost: subscription
  - model: z-ai/glm-5.3
    role: reviewer
    did: "Found the two shortcut commands that PERSISTENTLY flipped the global default to cloud — the single best privacy finding. Also refuted three of my own baseline rows with better reasoning than I had. Its top-ranked finding (scanner absent) was wrong."
    cost: subscription
  - model: x-ai/grok-4.6
    role: reviewer
    did: "Best catch of the panel: asked whether the OTHER reachable model tags had measured context. They did not — five were live wedges. Its #1 blocker (unauthenticated messaging channel) was false."
    cost: $0.082
  - model: stealth/ox-alpha
    role: reviewer
    did: "Proposed the ctx-manifest as the durable form; most disciplined seat about refusing to assert the unverifiable. Explicitly declined to claim the alias models were broken — correctly, since only measurement settled it."
    cost: $0.00 (stealth listing — prompts retained by an undisclosed provider)
  - model: deepseek/deepseek-v4-pro
    role: reviewer
    did: "Concurred on the self-modification chain; no unique decisive finding"
    cost: $0.008
  - model: moonshotai/kimi-k3
    role: reviewer (DID NOT RUN)
    did: "Blocked by its own hard cap — worst case $0.4028 against a $0.40 ceiling. Recorded as absent, never counted toward agreement."
    cost: $0.00
skills_touched:
  - skill: panel-seats.mjs (ox seat)
    change: created
    failure: "A requested reviewer had no seat; ad-hoc invocation would have bypassed the spend estimator and the privacy note about stealth retention"
  - skill: rule-58 (proactive schema-drift detection)
    change: proposed
    failure: "The rule enumerates DB drift classes only. Advertised-vs-actual MODEL METADATA is the same mechanism — declared shape ≠ real shape, fails at runtime, travels in clusters — and was not in scope, so nothing pointed the rule at it."
---

# A fix attached to an artifact dies with that artifact

## What happened

A local agent refused a large job with a template error and then died on four retries. The default
model advertised a 262,144-token context and **loaded at 32,768** — no explicit ceiling was set on
the tag. The agent computes its compression trigger from the advertised number, so it permitted
sessions ~2.8× past the real ceiling. Truncation removed the transcript head, the request arrived
with no user turn, and the chat template hard-raised. Correctly classified as non-retryable, so
every retry replayed the same broken state.

The identical class had been diagnosed and fixed six weeks earlier on the previous model.

## The lesson

**The earlier fix was a property of one artifact.** It lived in a single model definition. Swapping
the brain produced a fresh instance of a solved problem, with a green config and a broken system.
The write-up survived; the enforcement did not, because the enforcement was never separable from
the thing it was attached to.

The durable form is a **manifest, not a memory**: measure each reachable tag's real loaded ceiling
once, store tag → measured value, and have every consumer read the measurement rather than the
vendor's claim. This is schema drift — declared shape ≠ real shape, discovered at runtime, found in
clusters — and the existing drift rule already describes the mechanism. It was simply never aimed
at model metadata.

**Corollary, and the more expensive half:** fixing the instance you were shown is not fixing the
class. The first pass repaired the two lanes that were failing. A hostile round then asked what the
*model picker* still offered and found five more tags with no explicit ceiling — every one a live
wedge, one menu selection away. The bug was never "this model." It was "any tag without a pinned
ceiling."

## Who did what

**Opus 5 (me)** reproduced both failures deterministically before proposing anything, built the
scrubbed review packet, verified every panel claim by execution, applied the fixes, and ran the dry
loop. I also produced four of the errors below.

**GLM 5.3 (free)** was the sharpest seat for the second consecutive panel. It found the persistent
cloud-default switch that nobody else saw, and it *refuted three of my own baseline findings* with
better reasoning than I had — including the observation that disabling PII redaction is reasonable
on a purely local lane, since redaction protects against third parties and there are none. Its
highest-ranked finding was nonetheless wrong.

**Grok 4.6 ($0.08)** produced the panel's best catch by asking a question I had not: whether the
*other* reachable models had measured ceilings. That question found five live wedges. Its own #1
blocker was false.

**Ox Alpha (free stealth)** matched the paid seats and was the most epistemically careful — it
explicitly declined to assert that the shortcut models were broken, flagging them as unverified
instances of a known class. That restraint was correct; only measurement settled it.

**DeepSeek V4 Pro ($0.008)** concurred broadly with no unique decisive finding.

**Kimi K3 did not run.** Its cost cap blocked it by three cents. Recorded as absent.

## Skills created or changed

- **A seat entry for a newly-requested reviewer** was added to the panel registry rather than
  invoking it ad hoc — ad hoc would have skipped the spend estimator and, more importantly, the
  note that a *free stealth* listing means prompts are retained by an undisclosed provider. Free of
  charge is not free of cost.
- **The schema-drift rule should be widened to model metadata.** It currently enumerates database
  drift classes. Advertised-vs-loaded context is the same mechanism in a different surface, and the
  omission is exactly why this recurred: an agent reading that rule would not think to check a
  model tag.

## Mistakes I made

- **Nearly reported a working security scanner as dead.** A reviewer claimed it was absent from
  PATH. I probed with `which`, got nothing, and was one sentence from telling the owner his
  protection was fake. It was running — dozens of evaluations that day, including his own failed
  session. My control assertion proved the probe *functioned*; it did not prove the probe was
  asking the right question. The agent resolves that binary from its own install directory, which
  its launcher puts on PATH — a PATH my ad-hoc shell never had. **A correctly-functioning
  instrument aimed at the wrong question returns a confident wrong answer and passes its own sanity
  check.** This is a distinct failure from the known false-negative class, and strictly harder to
  catch: I found it on a log file's modification time, not on any check I had designed.
- **Probed the wrong virtualenv** and reported an audio dependency missing. It was installed.
- **Fixed the instance, not the class** — needed a hostile round to find the five remaining wedges.
- **Wrote a measurement loop that measured nothing** and printed plausible numbers: it reported the
  previously-loaded model twice, because the running gateway kept reloading its own default and
  evicting mine. Caught by noticing one tag printed for two different models.
- **Used a bash heredoc for a large file after that exact trap was documented in the handoff I had
  read that same session.** It failed on quoting. The write-up did not stop the repeat; switching
  tools did.

## Error → fix → repeat ledger

| Error class | Recurred | Written up before? | What actually stopped it |
|---|---|---|---|
| Advertised ≠ real model context → compression tuned past the ceiling | **2nd occurrence, ~6 weeks apart** | Yes — fully documented with the fix | Nothing yet. Both times the fix was a property of one tag. A manifest that all consumers read is the only form that survives a swap. |
| Believing an unvalidated negative | 2× this session | Yes — this is the 7th+ instance in this repo | Validating the instrument. Partially effective: it caught one, and **missed the worse one**, because I validated that the tool ran rather than that it measured the right thing. |
| Heredoc mangling on large file writes | 1× this session (≥3rd overall) | Yes — in the handoff read the same session | Only changing tools. Reading the warning did not prevent it. |
| Fixing the shown instance rather than the class | 1× | Not previously named | An adversarial round asking "what else is reachable?" |

**The row that matters is the first one.** A lesson written down and then re-committed proves the
write-up was not a fix. Both times the correction was resolutional in effect — repair this tag —
and resolutional corrections do not survive the artifact being replaced. The procedural form
(*measure every reachable tag; pin the ceiling; read the measurement, never the advertisement*) is
the only version that would have caught the swap.

## External-model calibration

Five seats requested, four returned, $0.09 total.

- **Free and near-free seats outperformed the expensive ones again** — second consecutive panel.
- **Consensus concentrated error instead of cancelling it.** Three of four seats independently
  ranked the same finding as their top risk. All three were wrong: they believed a messaging
  channel was unauthenticated, when the real gate is an environment variable they could not see,
  correctly set to one user. **Every one of them explicitly flagged it as unverifiable and promoted
  it to blocker regardless.** Three agreeing models that all admit they are guessing is not
  evidence; it is one guess counted three times.
- **Seats are reliable about where to look and unreliable about what is true there.** Two of the
  panel's best findings were *questions* ("did you check the other tags?") rather than assertions.
  Route them for coverage; never for verdicts.
- **A blocked seat is data.** The one that refused to run did so on its own cost ceiling. Reporting
  it absent is more useful than a filled slot.

## Verification

- Original failure reproduced deterministically before any change (4-case matrix isolating the
  trigger to a user-less array, and to the new template specifically).
- After the fix: a 60,184-token prompt — 1.84× the old ceiling, the exact shape that used to wedge
  — returns 200.
- The template remains strict on a user-less array. **The trigger was removed; the brittleness was
  not.** A pre-send invariant asserting at least one surviving user turn is the durable guard and
  was not built — it requires patching a vendor tree thousands of commits behind upstream.
- Dry loop: 3 rounds. R1 (picker audit) found 5 remaining wedges — fixed. R2 (live process, PATH,
  hooks, derived-model integrity) clean. R3 (reproduce the original failure end-to-end) clean.
