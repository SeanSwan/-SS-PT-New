# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/59-PACKET-H0-ROUND6.md
**Tokens:** 4744 in / 10158 out (reasoning: 9055) | total 14902
**Wall:** 170.1s

---

## VERDICT
ship with fixes

## DID THE NEW CHANGES BREAK ANYTHING
Yes — one real defect and two claim-accuracy defects, all introduced by the post-clearance edits, all fixable in minutes.

**1. "When the shell exits: Close the window" destroys the launcher's only error surface.** This is the exact interaction you asked about, and it's real. `Assistant.command` is `exec ollama run classroom` — every plausible Tuesday failure (Ollama app not running after a reboot, server unreachable, `classroom` model missing) prints a one-line diagnostic and exits nonzero in under a second. With unconditional close set, the window vanishes with the diagnostic inside it. She sees a flash, the message is gone, and the support loop — "text me when it does something weird" — degrades to "it didn't open" with nothing to photograph. The same Settings pane the edit already visits has the correct option: **"Close if the shell exited cleanly."** Normal exit (`/bye`, Ctrl+D) still closes the window, preserving the privacy fence; a failed launch leaves the error on screen. The tradeoff is that abnormal exits leave the window open until closed — she's present when that happens, so it's acceptable. Alternative that keeps the fence absolute: add a pause-on-error line to the launcher script. Either fix is fine; pick one. Shipping as written means the edit that fixed the habit-dependence quietly deleted the failure diagnostics.

**2. §0's central claim outruns its mechanism.** The two settings genuinely kill the *restore* path — including the nastiest variant, an overnight macOS-update reboot with "reopen windows when logging back in." That's real value. But the paragraph's own named scenario — "she closes the laptop without clearing the window — the next morning the lid opens" — is sleep/wake, not restore. No shell exits, no quit occurs; the window never left, so it doesn't need to "come back." Nothing in §0 fences that path except the screen lock and the §7 session-end habit, which the new "a habit is not a control" framing implicitly retires. §7 still mandates the habit, so the protection is intact — but the runbook now claims a fence where only a habit stands. Reword: settings fence restore/reboot; the still-open-through-sleep path is fenced by the screen lock plus the §7 habit, which stays load-bearing and must still be taught tonight.

**3. The tripwire edit contradicts §1's hedge.** §1 honestly says the auto-update toggle may not exist and defines behavior in both branches — good, not stranding. But the tripwires section now asserts "Auto-update is now off (§1), so the surface can't change without someone choosing it" as fact. If the installer found no toggle, that sentence is false and a silent update remains possible, with the update-prompt rule as the only control. Make the tripwire conditional on what was actually found.

**Non-blockers, for the record:** the Desktop & Dock checkbox is machine-wide — every app stops restoring windows after quit/restart. Benign here, arguably desirable on a teacher's laptop, but add one sentence in §9 so "my Mac forgot my documents" doesn't land as breakage. The shell-exit setting is per-profile; default profile is fine for this machine. §5's "close open windows first" caveat is now redundant with the checkbox but harmless — leave it. Nothing else the three edits touched broke: §4's close-and-reopen onboarding still coheres, §7's habit is retained, the command card is unaffected.

## REMAINING BLOCKERS
1. §0: change "Close the window" to "Close if the shell exited cleanly" (or add error-pause to `Assistant.command`) — restores launcher error visibility without weakening the clean-exit fence.
2. §0: reword the claim — settings fence restore/reboot only; sleep/wake with an open session still depends on the screen lock and the §7 habit, which remains mandatory to teach.
3. Tripwires: carry §1's hedge forward — if no toggle was found, auto-update is *not* off and the update-prompt rule is the sole control.

## DISSENT
Even with all three fixes applied, I dissent from the framing that §0 converted the privacy exposure from habit to control. It did so for two of the three paths. The third and most probable one — she walks away mid-session, lid closes, machine sleeps — is fenced by nothing in §0's Terminal edits; it is fenced (partially) by the screen lock, whose lock-delay §0 never specifies. If "require password immediately after sleep" isn't set, the tired-Tuesday story is live with every setting in §0 correctly applied. I'd add that one line to §0; the majority may reasonably decline, since screen lock was presumably reviewed in earlier rounds and the exposure blunting is a §0-adjacent concern rather than a defect in the three edits under review. I register it because this round's edit claimed the fence was now structural, and a fence that covers two of three gates is the kind of thing round 7 discovers the hard way.
