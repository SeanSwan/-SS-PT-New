# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/00-PACKET.md
**Seed:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/19-PANEL-SEED.md
**Tokens:** 16672 in / 3211 out · **Cost:** ~$0.3273 · **Wall:** 53.4s

---

# FINAL RULING

## (1) Platform
**Expo iOS wins.** The owner ships TypeScript fast, llama.rn + GBNF covers inference, and the same TestFlight build runs on her Apple Silicon Mac. Build Expo prebuild/dev-client, iOS only, zero days on macOS.

**Flip trigger (exact):** If, by end of day 5 of the H1 build, llama.rn is not producing grammar-valid JSON from a real dump on **her actual iPhone**, AND her phone is an iPhone 15 Pro or later on iOS 26, flip to SwiftUI + Foundation Models `@Generable`. If the inference path stalls but her phone can't run Foundation Models, do not flip — ship Expo with the rules-based sorter only and add the model later. No other condition flips it.

## (2) C1 wording
Reviewer 1 is correct; C1 as written manufactures data-loss risk to avoid a legal risk that doesn't attach. **Replace C1 with:**

> **C1 (revised):** Child data never touches infrastructure the developer controls or selects. It may reside only on T's own devices and T's own Apple iCloud account with Advanced Data Protection enabled, where Apple acts as her processor under her existing agreement. All inference on child data is on-device. The developer never runs a server, holds a key, or can read a byte.

The load-bearing constraint is "no developer-controlled infrastructure," not "never leaves the device."

## (3) Timing anchor
**The anchor is the nap window, 12:30–14:00.** Family notes are due before the ~14:45 pickup, so an after-school dump delivers value after the deadline — permanently. What it changes: (a) the daily dump moves to the start of nap; (b) the family-note drafter moves **into H1, days 9–10 — it is the daily payoff, not an H2 bolt-on**; (c) the full loop (dump → sorted cards → drafted notes) must complete in under 5 minutes end-to-end on her phone, which is a hard latency budget on the model choice; (d) "end-of-day reset" is demoted to an optional evening sweep of leftovers. Success is measured at 12:30, not at 15:00.

## (4) Build vs. clone
**Both, sequenced, with a gate.** Clone the Ollama setup onto her Mac this weekend regardless (generic content only) and ship the paper triage sheet + Notes/Shortcut capture — that is H0 and it is final. **The H1 app build starts only if she passes this gate: she performs the dump ritual (paper or Notes) unprompted on ≥4 of the first 5 school days.** If she fails the gate, do not build the app; clone-plus-paper *is* the product, and the correct next move is an interview, not code.

## (5) Kill criterion
**Stop building the moment this fact is observed: at the end of her second week using the app, she has drafted her daily family notes from the app's output on fewer than 3 of 5 school days.** That single number captures capture, sorting, trust, and timing simultaneously. No other metric matters; no rescue feature is permitted before an interview.

---

## What the entire panel — and the packet author — still has wrong

Everyone solved "the developer must not become an operator" and declared privacy done. Nobody noticed that the fix creates a **shadow education record in an employee's personal Apple ID**. Developmental observations on a dozen 2-year-olds, accumulating for a year in T's private iCloud, are invisible to the school, unreachable by a FERPA parental-access request, and walk out the door when she changes jobs — the exact governance failure §3 worried about, relocated rather than removed. The fix is structural: the app is a *scratchpad, not an archive*. Anything a child's record needs must flow into the mandated parent app or SIS same-day (the copy-to-clipboard bridge is a compliance feature, not a convenience), and child-linked items should auto-purge on a rolling ~30-day window by default. The panel designed for data to persist; the correct design is for it to expire.
