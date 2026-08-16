---
title: "Train against frozen contracts, and only against honest baselines"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stamped in system context; Sean set /model claude-fable-5 this session) — on the Rule 68 allowlist"
date: 2026-08-16
decision: "Two-track Qwen fine-tuning program designed: extraction tunes gate on contract freeze; acceptance baseline is base+best-prompt; device-bound source data forces synthetic-only training sets"
status: draft
privacy: "IDs/roles only (T, C1..Cn, demo-client-NNN); no PII, no secrets, no absolute user paths; validated by hermes-learning-validate privacy patterns"
models_used:
  - model: claude-fable-5
    role: Final Decider / plan author
    did: "Grounded recon of the ai-agent-tuning workspace + classroom-copilot R5 state; authored the two-track Qwen fine-tuning master plan; staged (did not fire) the paid review round"
    cost: subscription
skills_touched:
  - id: prompt-watcher
    action: applied
    motivating_failure: "Dictated vision prompt carried transcription artifacts ('Quinn 3.8', 'unsoft') that had to be resolved against the filesystem, not guessed"
  - id: hermes-learning-packet
    action: applied
    motivating_failure: none
---

# Train against frozen contracts, and only against honest baselines

Durable lessons from designing the two-track Qwen fine-tuning program (Swan Coach behavior tune + Classroom Copilot extraction tune) on top of the existing Unsloth workspace.

## The lessons

1. **Never train an extractor against a moving schema.** A fine-tune bakes the output contract into weights. If the record/event contract is still being revised (classroom R5 froze it as slice 1 precisely because mis-emitted semantics are unrecoverable), a training run against the provisional shape is a run you throw away. The gate is: contract freeze → generator → dataset → train. This is the same "semantics are the unrecoverable thing" lesson GLM surfaced for event history, now applied to model weights — weights are event history you can't migrate.

2. **The baseline that matters is base-plus-your-best-prompt, not naked base.** A behavior fine-tune compared against an unprompted base model almost always "wins" and the win is fake — the honest question is whether 600 training rows beat 600 tokens of system prompt. Evaluation flattery is the main way a tuning program lies to its owner.

3. **Device-bound data is a training-data law, not a preference.** If a dataset's source may not leave a device (classroom child data, C1), then training on other hardware means the training set is 100% synthetic by construction, and real data's only role is on-device eval. Third repetition of one doctrine across Hermes (fail-closed cloud fallback), the classroom architecture (on-device inference), and now training: *private data goes to weights-you-control or it goes nowhere.*

4. **Accessibility can be trained, not just built.** Plain-language register, screen-reader-shaped output, one-question-at-a-time patience for older users — these are model behaviors, teachable as SFT slices, and a model that behaves accessibly makes every surface it powers accessible by default. Nobody had written this down as doctrine before.

5. **Fine-tuning pays most at the small end.** The 4B on-device extractor is the highest-value tune in the house precisely because prompting alone runs out at that size and the task is narrow and machine-checkable. The 30B that already works well with a good prompt is the *worst* first target.

## Who did what
Fable 5 alone this session: recon (`ai-agent-tuning` workspace, classroom R5 synthesis, Hermes Qwen memory), plan authorship, privacy-gate enforcement. No model was wrong this session in a way that reached output; the near-miss was Fable's own (below). A parallel unattributed session (vs-claude) was mid-flight on the Desk adversarial harness — its output was consumed as a dependency, not duplicated.

## Skills created or changed
None created. `prompt-watcher` applied as designed. The plan proposes no new skill; it proposes workspace upgrades (U1–U6) in the standalone ai-agent-tuning repo.

## The lesson the review round added (amendment, same session)

**My gates were statistically void and I did not notice until two independent reviewers computed the same binomial.** A ≥7/10 blinded-preference gate passes a coin-flip model ~17% of the time; zero-tolerance gates on n=10 maximize variance, not safety; and one model family generating training rows, authoring eval ideals, AND judging measures self-consistency, not quality. The durable rule: **an acceptance gate is not designed until its false-promotion probability under the null is computed — and the judge may not share a family with the generator.** Companion rule from the same round: *verifiable rules go in deterministic code (inference-time guard layer); only non-enumerable judgment goes in weights* — and correction rows must never name the forbidden artifact they correct (training the retired palette in order to forbid it teaches the palette).

## Mistakes I made
- Nearly treated Sean naming "GLM 5.3 and Kimi K3" in the prompt as sufficient authorization to fire paid consults; the LOCAL_ONLY privacy flag and the standing ask-first law caught it pre-call. Sean then gave the explicit go mid-session and the round fired legitimately.
- Resolved "Qwen 3.8" to the Qwen3 family without the ability to ask first. Handled by tagging the interpretation `[LIKELY]` and gating the plan's S0 on confirmation — but it is still a guess in a load-bearing position.
- **Designed three acceptance gates whose null-pass probability I never computed.** Both reviewers found it independently; the ≥7/10 gate promotes a null-effect tune one time in six. I wrote "never promote because training completed" while specifying instruments that promote by coin flip.
- **Repeat of a documented error class:** when marking the review round FIRED mid-session, I updated §10's slice table but left §11's heading saying "staged, not fired" — an assembly-time self-contradiction. This is the same class as my classroom-R5 packet error (Part 2 vs Part 3 contradiction, written up in that round's synthesis THIS WEEK). Documented, then repeated within days. The surviving fix is procedural, not resolutional: after any status flip, grep the doc for every occurrence of the flipped status word before committing (`rg -n "staged|FIRED" <doc>`), never trust memory of where the status appears.
- Scheduled the cheapest decision-lethal measurement (on-device latency) after the expensive work it gates. Sequenced by track logic instead of by risk retirement.

## Error → fix → repeat ledger
- **Assembly-time doc self-contradiction:** recurred **2× across two workstreams in one week** (classroom-R5 packet; this plan's §10/§11), both times caught by an external reviewer, not by me. Previously written up: yes, in the R5 synthesis. The write-up did not prevent the repeat — proof it was not a fix. New procedural stop: post-status-flip grep sweep of the flipped term across the whole doc before commit.
- **Uninstrumented acceptance gates:** first occurrence this session; stop = null-pass probability computed and recorded in the gate's own text before any gate ships.
- **Premature paid-vendor fire (near-miss):** 0 executions; staging-as-terminal-action held until Sean's explicit go arrived.
- **Dictation-artifact literalism:** 0 repeats after first resolution pass; standing fix is filesystem verification of every proper noun before use.

## External-model calibration
- **GLM 5.3** — $0.00 (subscription), 281s, 17.6k tokens out. Six convergent criticals with Kimi (independent, matching arithmetic) + seven unique verified catches (grammar-decoding baseline arm, VRAM co-tenancy, quantization confound, false-uncertain gaming, thinking-mode leakage, redaction≠anonymization, base-model decision tree). One magnitude miss: estimated Hermes residency 17–18GB vs ~25GB actual (direction correct).
- **Kimi K3** — $0.1684, 258s, 9.7k tokens out. Same six convergent criticals + unique verified catches (sharpest judge-circularity framing, T-voiced fictional-dump corpus, DPO-signal-thrown-away, retired-token self-own, the §10/§11 contradiction, program-level metric gap). Zero findings disproven on verification.
- Both produced genuine DISSENT sections that disagreed with each other (Track C's fate, Stage 3's viability) — resolved by Fable ruling in `docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/03-FABLE-SYNTHESIS.md`. $0.17 total spend for fourteen binding amendments: the round paid for itself roughly a hundredfold.
