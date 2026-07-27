# Hostile round 2 — the intent log could carry client names

**Surface:** vs-claude (Opus 5) · **Date:** 2026-07-25 UTC
**Linear:** SWA-65 · **On main:** `e238a8cc5`

---

## What the round did differently

Round 1 found my sibling sweep failed by under-scope. Round 2 **applied that lesson as its method**: sweep by SYMBOL across the whole backend for wrong-subject binds (found none remaining — the four hits were correct-by-design), then attack a surface **never examined at all** rather than re-reading what was already checked.

That second move is what found the real thing. **Re-reading verified code is not a hostile round; picking an unexamined surface is.**

## The finding: a loaded gun, not a live leak

`recordCoachIntent` stored the event payload **verbatim**. Payloads carry free text — `notes`, `painNote`, `description` — and free text is exactly where a client's **name** ends up. A trainer dictating *"Sarah's knee felt tight on the descent"* produces a note, not a structured field.

Nothing currently renders payloads into a prompt, so this was **not** a live leak. But `projectCoachMemory` exposes `believed` as full `IntentEvent[]` **including payloads**, and `summarizeCoachMemory` sits directly beside it with a docblock saying *"for a prompt or a dock."*

**The hazard shape worth carrying: a safe function documented as prompt-bound, sitting next to an unsafe field, with nothing marking the difference.** The next person wanting richer prompt memory reaches for the obvious field and leaks. It is the dormant-artifact class inverted — currently harmless, unlabeled, and load-bearing later.

## The fix principle: structural, not a warning

Free text is stripped **at record time**, so the log physically cannot carry PII regardless of who reads it later.

**A comment would not have survived contact with a deadline. A redaction does.** When the safe behavior can be made structural at comparable cost, choose structural — documentation degrades, code does not.

Two details that mattered:
- **Redact visibly, don't delete.** Keys become `[redacted:free-text]` so a reader can tell *"there was a note"* from *"there was no note"*. Silent deletion destroys the same information the absence-vs-emptiness rule exists to protect.
- **Keep the structure.** `exerciseName`, `sets`, `reps`, `weight`, `region`, `painLevel` are retained — that is training data, not identity, and it is what makes the log worth keeping. A redaction that strips everything is just deletion with extra steps.

## The property that had to hold, and was proven

**Redaction is LOG-ONLY.** Effectors still receive the full note. Proven on the real seam against a stubbed DOM: the listener sees `"Sarah's shoulder"` while the log stores `[redacted:free-text]`, and the dispatch return value is unchanged.

**A privacy fix that altered what the workout logger received would be a far worse bug than the one it fixed.** Whenever you filter data in a shared path, prove the *consumers* are untouched — not just that the filter works.

**Provenance:** Opus 5 — Fable-tier per Sean's 2026-07-25 designation.
