# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/57-PACKET-H0-ROUND5.md
**Seed:** (none)
**Tokens:** 7590 in / 10400 out | **Cost:** ~$0.0065 | **Wall:** 156.5s | **finish_reason:** stop

---

## VERDICT
ship tonight

## WHAT FOUR PASSES MISSED
nothing I can find — but I specifically re-checked the following seams and repeatedly-edited text that prior passes may have treated as settled: (1) the `sed` boundary after multiple revisions — confirmed it still keys on the first line beginning "You are" and excludes the install notes, so the SYSTEM block cannot ship empty if `nano` is used; (2) the privacy wording in §5 versus the command card and the revision‑1 correction — consistent; (3) the nightly scrollback‑clear instruction (`Cmd+K` then `Cmd+W`) appears identically in §7, §5 deletion precondition, and the command card, closing the gap Round 4 found; (4) the data‑protection fallback ("first names only") interacts safely with the assistant's `[which child?]` placeholder rule — no contradiction; (5) the incomplete second card in the command‑card markup as excerpted — flagged as a seam, but assumed to be a truncation of the review extract rather than the real file; (6) the tripwire copy‑change clause and its trigger conditions. None of these reveal a defect.

## REMAINING BLOCKERS
none

## THE ONE THING MOST LIKELY TO GO WRONG
She (or the installer) follows every step tonight, but six weeks in, on a tired Tuesday, she closes the laptop without pressing `Cmd+K` then `Cmd+W`, or the Terminal restores a closed window from saved state. Next morning the lid opens in the classroom and yesterday's dump — with children's first names and family notes — is sitting on screen when a parent or aide walks past. That is the shadow record the whole package exists to prevent, and it is the failure mode most aligned with an exhausted user's habits. It looks like: laptop opened to show a photo, Terminal window pops forward with "one of them had a really hard time at cleanup… [which child?]" and a mum's name visible. The mitigation is in the runbook, but it depends on a nightly habit surviving real life.

## DISSENT
I dissent from the quiet assumption that the privacy guarantee is self‑sustaining. The package correctly bans `OLLAMA_HOST` and sign‑in today, but the tripwire explicitly admits Ollama updates are adding cloud surfaces and relies on a human re‑running the Wi‑Fi‑off test after every update. That is precisely the step an exhausted teacher (or her partner) will skip. A durable control — e.g., a launchd blocker on outbound connections from ollama, or a documented "never update without me" gate — is missing. The copy change in the tripwire is a paper promise, not a technical fence. Until that is enforced, "nothing leaves this machine" is a statement about the present build, not a property of the system.
