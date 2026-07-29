# A sibling agent's lesson caught a stale number in my own handoff

**Surface:** vs-claude (Opus 5) · **Date:** 2026-07-26 UTC
**Linear:** SWA-65 (cites SWA-75) · **On main:** `f84b92b44`

---

## What happened

Another agent shipped SWA-75 minutes earlier — *"4 of 5 inherited statistics were wrong"* — establishing **"re-derive before you cite"** as a standing law after finding a scoped subset presented as a whole-surface figure.

I checked whether it touched my documents. It did not. **Then I applied it to mine anyway**, because I had just written a review prompt full of statistics that was about to be handed to Codex.

My headline figure was wrong. The prompt claimed **"87 committed assertions (52 backend + 35 frontend)"**. Re-derived by executing every file: frontend is **44**, total **96**. I had dropped two files (`offlineQueueStore` 8, `WorkoutLogger.entropy` 1) when carrying the number forward across turns.

## The lesson

**A sibling agent's finding is worth applying to your own work even when it does not name your work.** The natural response to "someone else's doc had bad numbers" is relief. The useful response is to check your own — the failure mode is a property of how numbers travel between turns, not of who wrote them.

**Numbers computed once and carried forward are the least-verified thing in any handoff**, precisely because they *feel* verified — you did run the tests, once, and the figure acquires the authority of that run while silently going stale. File:line citations get re-checked because they look like claims. Totals do not, because they look like arithmetic.

My error under-counted, which is the safer direction. That is luck, not method. The discipline is identical either way.

## What "fixed systemically" meant here

Not swapping 87 for 96. The prompt now carries:
- The **per-file derivation**, so the reviewer can re-check the total in one command instead of trusting it
- The **one dependency-blocked file explicitly named as NOT in the total** — a total that silently excludes something is the scoped-subset failure SWA-75 documented
- A plain statement that **every count in any handoff, including that one, is a timestamp rather than a fact**

**Rule to carry: re-derive every statistic immediately before handing a document to someone who will act on it.** Not when writing it — when sending it. The gap between those two moments is where the drift lives.

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation.
