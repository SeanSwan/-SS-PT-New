# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/54-PACKET-H0-ROUND3.md
**Seed:** (none)
**Tokens:** 8219 in / 5215 out | **Cost:** ~$0.1029 | **Wall:** 156.6s | **finish_reason:** stop

---

## VERDICT

Ship with fixes — one five-minute fix, no redesign, no re-test beyond reading the sentence back to her. The package is otherwise in the state the round-3 reviewer described: the eight prior fixes are real, correctly applied, and I verified the load-bearing ones mechanically rather than taking the changelog's word for it.

## WHAT THE PREVIOUS REVIEWER MISSED

**The Cmd+K fix was scoped to the wrong threat.** Round 3 added "press Cmd+K after incident sessions" because macOS Terminal restores windows across restarts and an incident draft could resurface on a classroom screen days later. That reasoning is correct — and it applies with equal force to *every evening session*, not just incidents. The nightly dump is the exact artefact §0 calls an "undisclosed shadow record": children's first names, developmental observations, family notes. It sits in Terminal scrollback and in Terminal's saved application state, and it will be faithfully restored the next time the lid opens. The reviewer fixed the session they were imagining (the high-stakes incident) and never re-generalised to the data class they themselves defined as sensitive in §0. Three rounds of staring at the incident form made "incident" the only category of child data they could see.

The fix is two sentences, five minutes, tonight:

1. §7's Cmd+K line becomes an end-of-*every*-session habit: "When you're done, close the window — Cmd+W — or press Cmd+K first. Do this every night, not just after incidents." One line on the command card says the same.
2. The rollback in §5 is currently *slightly false*, and it's framed as "the strongest privacy sentence." `ollama rm` + `rm -rf ~/classroom` does not remove what Terminal's saved state is holding. Add "close any open Assistant window first" before the two commands — and delete the now-dead `Assistant.command` from the Desktop while you're there, or she'll double-click a broken icon on Thursday and file it under "the thing stopped working."

I checked the other recently-touched mechanics the reviewer had stared at longest, and they hold: the `sed -n '/^You are/,$p'` boundary genuinely can't match the install notes (no earlier line begins with "You are"), and the `ollama show` verification genuinely closes the empty-SYSTEM hole for the reasons stated. `think false` and `temperature 0.4` are correctly inside the brace block. The acceptance criteria now say what they mean.

## REMAINING BLOCKERS

None. The scrollback gap is a correctness fix to a privacy *sentence and habit*, not a defect that stops tonight — FileVault covers the data at rest, and the exposure is a logged-in screen, which the §9 laptop-placement conversation already constrains.

## EVERY OTHER ANGLE

Checked, no action needed tonight:

- **16GB floor (ops/performance).** §0 stops below 16GB but proceeds at exactly 16GB, where a ~9GB model plus `num_ctx 16384` KV cache plus macOS will swap. "About a minute" could become several. Not a blocker because her own hands-on test tonight runs on her actual hardware and will reveal it — but if that test feels slow, the honest move is to tell her *now*, not let her discover it alone.
- **Gate data survival (strategy).** The five tick-boxes live on the back of a dry-erase laminate in dry-erase marker. Count and record the ticks on Friday *before* anyone wipes or smudges the back, or the day-5 readout loses its only data. Permanent marker for the ticks costs nothing.
- **iCloud Desktop sync (privacy).** If her Mac has "Desktop & Documents" iCloud sync on, `Assistant.command` syncs to Apple — harmless, it contains no child data. Verified nothing with child data ever touches a synced folder. Fine.
- **Rollback completeness (ops).** Covered above — dead Desktop icon.
- **Card vs. §0 tension (UX/legal).** §0 says first-names-only until the director answers; the printed card says "names go here." That's the right default and she'll reconcile it with her director; noting it only so the day-5 readout doesn't misread first-naming as non-adoption.
- **Architecture, model choice, one-model decision, paper-first ordering, allergy gate, statelessness test** — re-derived independently, all sound. The `ollama show` rationale (bare qwen3 passes the behavioural test) is correct and is the single best fix in the package.

## DISSENT

The evidence in this document argues that the product being shipped tonight is the *paper*, and the model is an unproven attachment to it — the runbook itself says so twice ("the model is the optional half"; the 15-minute fallback is all paper). Yet the model is what gets the acceptance tests, the privacy tripwires, the support promise, and the gate. I would have run week one paper-only, added the assistant in week two, and known which half was doing the work. Shipping both tonight means the day-5 readout cannot separate "she used the assistant" from "she used the laminated sheet and happened to have a Terminal open," and it creates a support obligation and a privacy surface for a benefit that has not yet been shown to exceed the notepad. I'm registering this, not blocking on it — the gate's five boxes at least measure the model half directly, and the author's "substrate vs. idea" tripwire shows they know the readout is fragile. But if week one comes back with five ticks and she can't articulate what the assistant did that paper didn't, the correct conclusion is that the paper is the product, and nobody in this package's governance is positioned to reach it.
