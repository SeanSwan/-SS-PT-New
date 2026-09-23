# Consult reply — Ox Alpha (stealth/ox-alpha) — 2026-08-23T21:58:08.314Z

> tokens: prompt=10205 completion=1005 | finish_reason: stop | max_tokens: 60000

# Round 22 — adversarial read

**NOT CLEAN.** One exploitable reading, and it's load-bearing.

## 1. The sentence that lets you skip the gate

> **"Merge #68, then push 3.1 immediately | exactly one | Acceptable, bounded, equals today's status quo for one deploy"**

This is the finding. Section 3.0's flowchart makes Sean's approval a hard gate (`S1 → WAIT`), but the *table two paragraphs above it* pre-labels the unapproved path **"Acceptable, bounded."** A tired agent who wants to ship reads the table, not the flowchart. Under this reading they never skip a rule — they select the option the document itself scored as acceptable, merge #68 without asking, wire 3.1 in a second push, and eat one unguarded production deploy while believing they complied. The document contains its own permission slip for the thing the flowchart forbids.

The fix is small: the table row must say *"fallback only if Sean explicitly rejects putting 3.1 on the PR"* — or the verdict cell must stop saying "Acceptable" and start saying "requires Sean's sign-off, same as the recommended path."

## 2. Hedge → loophole

> **"prefer a targeted forward-fix wherever the damage is bounded and reversible"**

"Bounded and reversible" is self-assessed by the same 2am agent proposing the fix. Step 6 partially closes it ("the recommended path is not an exemption"), but the word "bounded" invites the agent to be the judge of their own blast radius. Tighten to: *"bounded means no client rows dropped, truncated or overwritten — anything else is step 6 regardless of how reversible you believe it is."*

Also: **"Keep a nightly as a drift detector if you like"** — "if you like" converts a safety net into a suggestion. Fine as written, but it's the kind of phrase that gets quoted later as "the doc said it was optional."

## 3. Technically compliant, still bad

Ship everything in **warn mode, forever**. Every instruction is followed: guard wired atomically, B0 landed, A1 landed, attestations emitted. But `enforce` stays off indefinitely (B3 needs B1 + settled Track A), section 6 admits **the attestation has no consumer**, and nothing in the document sets a deadline for either. Result: rails that are permanently "present, not live," a log line nobody reads, and a pipeline functionally identical to today's — with every box ticked. The document needs a forcing function: *"if enforce is not flipped within N days of B1 passing, escalate to Sean why not."*

## 4. Weakest gate

**S1 (Sean approves 3.1-on-the-PR)** — precisely because finding #1 exists. It's the only gate whose circumvention route is printed inside the document itself, scored favorably. Every other gate (3.4, 3.5, B3) requires the agent to invent a justification; this one hands them one.

---

**Bottom line:** delete or re-scope the word "Acceptable" in the 3.0 table. Everything else holds.
