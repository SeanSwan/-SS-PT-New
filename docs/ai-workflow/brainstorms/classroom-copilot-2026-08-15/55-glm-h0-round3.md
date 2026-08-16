# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/54-PACKET-H0-ROUND3.md
**Tokens:** 8142 in / 11997 out (reasoning: 10662) | total 20139
**Wall:** 203.8s

---

## VERDICT

**Ship tonight.**

Every fix claimed in "what changed" is present as described — parameters inside the brace block, no trace of `/no_think`, the `nano` warning with its failure mechanism, `ollama show` with the empty-SYSTEM rationale, paper-before-Ollama, FileVault first with the overnight note, the notepad, the tightened acceptance criterion, rollback, `Cmd+K`, the update tripwire, the gate, her closing-and-reopening it. The paper artifacts, which I saw for the first time this round, were checked specifically for cross-artifact contradiction — the six asks on the command card match the prompt's list exactly, the sheet's bucket definitions match the prompt's verbatim in substance, and every field the prompt tells the assistant to probe for (time, witnesses, what she did, who told, when) exists on the incident form. Nothing blocks tonight.

## ANYTHING REMAINING

None.

## WHAT I W WOULD WATCH IN WEEK ONE

*("I")* **Tuesday evening, alone, is the real acceptance test.** Tonight she performs for an audience. The signal is 9pm Tuesday: does she open it unprompted, and what happens in her first ninety seconds at the bare `>>>`. If she types one small guarded question instead of a real dump, she's testing you, not using it — go back Wednesday, don't wait for day 5. One caution: do **not** ask her to text you a screenshot; that puts names in iMessage the night you taught her names never leave the laptop. Look at outputs on the machine when you visit.

**Attribution creep after a correction — the fabrication failure most likely to actually occur.** Not inventing a child from nothing; that's what temp 0.4 and the top/bottom rules suppress. The realistic version: she corrects one mix-up ("no, that was M"), and the model then quietly assigns other *unidentified* notes to M. Watch its next reply after any correction — placeholders must stay placeholders. If identity propagates, that is worse than the original mix-up and invisible unless someone looks. Add it to the support promise: "after you correct it, check who it thinks did what."

**The first dictated dump.** Tonight's test is typed; the real input is unpunctuated voice-to-text with phonetic toddler names. Watch the first dictated sort — does it split run-ons correctly, and does it treat a mis-heard name as `[which child?]` or confidently adopt the variant? And once, dictate with Wi-Fi off: if dictation answers offline, the entire pipeline, mic to model, is proven local. If it doesn't work offline, the dictation layer is server-based and that half of the privacy sentence is wrong — catch it before she trusts it with names, not after.

**The allergy gate under lazy phrasing.** Tonight's probe is polite. Real requests are rushed: "something sensory for tomorrow, quick." Playdough is flour. Run one lazy-phrased request yourself Thursday; if the gate misses, it's a one-line prompt tightening, not a redesign.

**The first real incident — a when, not an if, with twelve two-year-olds.** Three signals: does she reach the paper form same-day; does the chat stay a drafting aid or become "just getting it down" with nothing filed (the exact failure this package exists to prevent); and does the school have its own official form — if so, hers is the supplementary same-hour note and the school's gets filed too. Discovering the school's process after a dispute is far worse than before.

**The Ollama update nag is the most likely way the privacy sentence silently expires.** The tripwire is written for you; she will not re-run a Wi-Fi-off test after clicking "update" on a Thursday. Check the menubar yourself at your Thursday visit, or give her one explicit rule: "if it ever asks to update, text me first."

**Long-session decay, specifically "daily notes for everyone."** Whole-class notes — twelve dictated entries, forty turns — is the temptation that breaks "one conversation per evening." Watch mid-session for middle-of-prompt rules softening (buckets leaking into plain answers, second questions appearing). If it becomes real usage, teach batching: half the class, new conversation, other half.

**The notepad's physical reality on day 3.** The capture chain has one link, and it's either in the apron pocket or on a shelf by Wednesday. A blank notepad plus "I remembered it all" means the evening dumps quietly starve. Fix is logistics — lanyard, clip, pencil tied on — not concept.

**First-names-only raises the mix-up rate.** Until the director answers the policy question, common first names across a dozen toddlers is exactly where `[which child?]` gets harder. Expect more placeholders and more one-line corrections; that's correct behavior. The pattern to catch early is two unticked evenings *after* a mix-up — that's trust loss, not non-adoption.

**The day-5 readout: ask for the walkthrough, not the verdict.** "Walk me through Tuesday, from opening it to closing it" is less contaminated than any rating, even self-reported. Keep the label you promised — directional.

## DISSENT

Two dissents stand, neither blocks tonight.

First, the standing one: you install, support, gate, and evaluate. The tick-boxes fix observability, not bias, and the "directional" label mitigates without dissolving it. If this goes further, the day-5 result should be read by someone who didn't build it. Second, my clean verdict is a verdict on text — I cannot execute the model. It is conditional on §4's behavioural probes actually running tonight: the statelessness check, the allergy check, and the placeholder check are the load-bearing verification, and they are in the runbook where she or you will run them. If any fails on the real model, this verdict is void — rebuild, don't rationalize.

One non-blocking nit for the record: the rollback deletes the model and `~/classroom` but leaves `Assistant.command` on the Desktop — a dead icon containing no child data, so the privacy claim holds. Add one `rm` line in the next revision, not tonight.
