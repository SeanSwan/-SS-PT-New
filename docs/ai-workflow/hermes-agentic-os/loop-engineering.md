# Loop Engineering (Level 3)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — how run history improves skills without letting them improve themselves
- **Companions:** `./run-logs-and-self-improvement.md` (what the loop consumes and the propose-only policy it enforces) · `./skills-to-automations.md` (the rungs a loop can demote a skill down) · `./audit-receipts.md` (the raw signal) · `./approval-gates.md` §6 (drift auto-revokes approvals)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. The loop

Run → receipt → pattern → proposal → human apply → re-earn trust. That is the whole loop, and the two human-shaped links in it are structural, not provisional. Skills get better because their receipts are read, not because they rewrite themselves at 3am. A skill that runs without its receipts ever being reviewed is not automated — it is abandoned with the engine on.

## 2. When to update a skill

Signals worth acting on, all of them readable from the receipt stream and the run logs:

- **Repeated manual correction.** Sean edits the same section of every morning briefing, or rewrites the same clause in every follow-up draft. Three identical corrections = the prompt is wrong, not Sean's mood.
- **Failure clustering.** The same command produces `failed`/`partial` receipts against the same input class. Fix the contract or narrow the declared inputs — don't widen the retry count.
- **Refusal clustering.** Repeated `refused` receipts mean either an injection probe (escalate, don't edit) or a legitimate need the registry doesn't cover (propose a row, don't loosen validation).
- **Silent drift in usefulness.** A digest nobody opens, a nudge always dismissed. The improvement may be deletion — registry §13's 90-day-unused review applies to automations too.
- **Environment change.** An API response shape changed, a template's referent moved. Update deliberately, with the diff, rather than letting the skill degrade into workarounds.

## 3. When NOT to self-modify

**Never silently. Propose-only, Sean applies.** A skill, agent, or the runner may draft an improvement to its own prompt, contract, schedule, or scope — as a T1 proposal doc with evidence attached (`./run-logs-and-self-improvement.md` §4). It may not apply the change, hot-patch its own prompt, "temporarily" widen its inputs, or A/B test itself in production. The distance between "the automation tuned itself" and "the automation cannot be audited" is zero. This mirrors the repo-wide rule that agents propose CLAUDE.md changes and Sean applies them — the same constitution-amendment posture, applied to runtime behavior.

Also not self-modification but equally banned: quietly changing *interpretation*. If a skill's fixed prompt contract is ambiguous about an input it just met, the run fails closed and files an attention item; it does not improvise a reading and keep going.

## 4. Automation-drift prevention

Prompts are code and get code discipline:

1. **Pin prompt versions.** Every registered command with an LLM step records a prompt version (content hash) in its registry row; every receipt for that command carries the hash it ran with. A receipt whose hash doesn't match the registry is a drift alarm, not a curiosity.
2. **Diff prompt changes like code.** A prompt change is a file diff in this repo, reviewed like any slice (rule 46 chain for substantial changes), with the *reason* — the receipt pattern from §2 — cited in the change. No prompt edits in place on the 5090 outside the repo's view.
3. **One contract per call.** Shared prompt fragments are versioned once and referenced, so a fix lands everywhere it applies instead of forking across skills.
4. **Scope is part of the version.** Inputs schema, tier, trigger, and template set are versioned with the prompt. Widening any of them is a change even if the prose is untouched.

## 5. The approval-reset rule

**An approved automation whose prompt, scope, or tier changes REVERTS to manual until re-approved.** The trigger suspends, open queue entries for the command auto-revoke (`./approval-gates.md` §6), and the clean-run count restarts (`./skills-to-automations.md` §7). This is deliberately expensive: it makes "small tweaks" cost something, which is the only known cure for drift-by-a-thousand-tweaks. The re-approval may be fast — Sean reads the diff, the evidence, and says yes to the specific new version — but it is never skipped, and version N's approval is never inherited by version N+1.

## 6. Improvement-prompt templates

Proposals follow fixed shapes so review is cheap. Two seed templates:

**Correction-pattern proposal**
```
skill: <name> · prompt-version: <hash>
evidence: receipts <ids> + the manual edits (diffs) from runs on <dates>
pattern: <one line — what keeps getting corrected>
proposed change: <exact prompt/contract diff>
expected effect: <what stops needing correction>
risk: <what could regress; which receipts would show it>
reset acknowledged: reverts to manual, clean-run count restarts
```

**Failure-cluster proposal**
```
skill: <name> · prompt-version: <hash>
evidence: failed/partial receipts <ids>, common input class: <description>
root cause: <contract gap | input drift | upstream change> — with the probe that proves it
proposed change: <diff — narrow inputs | fix contract | split command>
non-goal: what this deliberately does NOT try to fix
reset acknowledged: as above
```

Proposals land in the vault outputs/ lane, get linked from the morning briefing, and wait. An unreviewed proposal expires in 30 days — stale proposals are noise, and the pattern will re-present if real.

## 7. The health metric

**A loop is healthy when its receipts get boring.** Same outcome, same shape, no attention lines, corrections trending to zero, prompt hash unchanged for weeks. Boring receipts are the product this level ships. The inverse also holds: a skill whose receipts are *interesting* — surprises, partials, corrections — is not ready for its next rung, whatever the calendar says. When every receipt in the digest is boring, the system is working; when someone stops reading them because they're boring, the silence check (`./audit-receipts.md` §5) is what keeps that safe.
