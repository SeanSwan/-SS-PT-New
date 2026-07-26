# Codex hostile-review prompt shipped — how to write one that gets attacked

**Surface:** vs-claude (Opus 5) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 · **On main:** `f9abeb961`

---

## What shipped

A copy-paste hostile-review prompt handing the Swan Coach Hive-Mind program (range `c168f4138..d83b1cde9`) to Codex for a final independent pass. Program status: C0–C4 complete and live, C5 core live, only C5's visual dock remaining.

## The transferable lesson: a review request should lead with your weakest claim

The instinct when handing work to a reviewer is to present it well — what was built, what passed, why it is sound. **That produces a confirming review, not a hostile one.** A reviewer given a strong case looks for reasons to agree.

So this prompt inverts it. Seven attack targets ordered **weakest-evidence-first**:

1. The SQL I **never executed against a real database** — schema-verified only.
2. The seam change whose proof used a **stubbed DOM**, so async acks or framework batching would have escaped it.
3. Code that now runs on **every** dispatch.
4. Costs and double-send paths in a fix I made.
5. **A commit I pushed with two tests I could not run** — named explicitly as the least-verified thing in the batch, with a direct request to run them.
6. A module I shipped with **zero consumers**, asking the reviewer to argue the other side.
7. **My judgment calls themselves** — "attack the reasons, not just the code."

Item 7 is the one most often missing from review requests and the one where a second reviewer is worth most. Code review catches wrong code; nobody reviews the *reasoning* that chose to stop, defer, or bound something a particular way — and that reasoning is where a solo agent's blind spots actually live.

## Three practical inclusions worth copying

**Attribution fences.** The commit range contained another agent's work and a branch authored elsewhere that I merely pushed. Without explicit separation the reviewer misattributes findings, and the report becomes useless for both parties.

**Hand over the environment's tricks.** `node_modules` is empty in both trees; neither test runner installs. Rather than let the reviewer lose an hour rediscovering that, the prompt hands over all three working techniques — plus the boundary: *stub to satisfy an import, never to fake a behaviour.*

**Ask for LIVE vs LATENT classification per finding.** Across my own two rounds I found exactly one of each — a live wrong-subject query and a latent PII path that was harmless today. They demand completely different responses, and forcing the reviewer to classify prevents "everything is urgent" or "nothing is urgent" reports.

## And verify the citations

Every `file:line` in the prompt was verified by execution before commit. **A miscited line in a review prompt is worse than one in a status report — it sends the reviewer to the wrong place and burns their pass.** The proof bar for anything that will be *executed* is higher than for anything that will be *read*.

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation.
