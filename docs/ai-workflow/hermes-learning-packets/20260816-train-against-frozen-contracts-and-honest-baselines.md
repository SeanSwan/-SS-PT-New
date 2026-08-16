---
originating_model: claude-fable-5
date: 2026-08-16
topic: "Fine-tuning program design — contract freezes, honest baselines, and device-bound data law"
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

## Mistakes I made
- Nearly treated Sean naming "GLM 5.3 and Kimi K3" in the prompt as sufficient authorization to fire paid consults; the LOCAL_ONLY privacy flag and the standing ask-first law caught it pre-call. The correct reading: naming reviewers in a dictated vision sets the *plan's* review shape; firing spend still takes an explicit go at fire time.
- Resolved "Qwen 3.8" to the Qwen3 family without the ability to ask first. Handled by tagging the interpretation `[LIKELY]` and gating the plan's S0 on confirmation rather than presenting the guess as fact — but it is still a guess in a load-bearing position.

## Error → fix → repeat ledger
- **Premature paid-vendor fire (near-miss):** 0 occurrences reached execution this session; previously written up (Kimi ask-first memory, 2026-08). What stops it is procedural: the consult scripts are never invoked in the same turn a vision prompt names a vendor — staging the packet is the terminal action.
- **Dictation-artifact literalism:** recurred 0 times this session after the first resolution pass; standing fix is filesystem-verification of every proper noun in a dictated prompt before using it ("unsoft" → Glob the Desktop, found `ai-agent-tuning`).

## External-model calibration
No external/paid model fired this session. GLM-5.3 + Kimi K3 round staged with a born-sanitized packet; their classroom-R5 calibration (GLM $0 / 3-of-3 pre-registered catches; Kimi $0.20 / 3-of-3 with two rated Fatal) is the price/quality baseline that justified staging one more round.
