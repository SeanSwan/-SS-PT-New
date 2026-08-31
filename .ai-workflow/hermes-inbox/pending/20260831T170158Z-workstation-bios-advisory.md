# Workstation BIOS advisory — handoff written, nothing verified

**Surface:** workstation ops (NOT SwanStudios product code)
**Agent:** terminal Claude (Opus 5), remote session
**Delivery:** pushed-branch — `claude/gigabyte-x870-bios-setup-40pyet`, commit cbbfeddf

## What happened
Sean asked for optimal BIOS/system settings for his primary dev workstation
(X870 board / Ryzen 9 9950X3D / RTX 5090 / DDR5-6000). A prior agent session had
told him the machine reports 8 cores / 8 logical processors instead of 16 / 32 —
roughly 75% of the CPU missing (one CCD disabled + SMT off).

Delivered a full settings plan in-session and wrote a cold-start handoff doc.
Advisory only: no machine access, no BIOS read, no command run on the target box.

## Why it matters to the project
If that box is Sean's primary SwanStudios dev machine, it has been running every
`npm run build`, `vitest run`, and `tsc --noEmit` at roughly a quarter of its CPU.
The cost is spread across every session and invisible in any single one.

## The coordination finding (highest value here)
A SEPARATE agent session had already modified the same machine — startup entries,
Defender scan scheduling/priority, DVR and background capture — and left rollback
receipts in a dated temp directory. Its changes were pending approval, not committed.
Two agents were operating on one machine with no shared ledger between them.

Rule 67 covers repo-level agent collision. It does not cover **machine-level**
collision, and there is no lane ledger for Sean's workstation. Worth knowing: the
same failure mode exists one layer below where the protocol currently reaches.

## Mistakes I made
- **Gave board-specific BIOS menu paths for a board model I had only inferred.**
  Sean dictates by voice; "X870 soy RS ice pro" was decoded to "X870 AORUS PRO ICE"
  and several other terms were similarly garbled. I wrote confident navigation paths
  on top of a guess. Correct order was: confirm the board, then give paths. Fixed in
  the handoff by tagging every decoded term with a confidence level.
- **Asked the blocking questions last instead of first.** RAM stick count (2 vs 4 DIMMs)
  materially changes the memory recommendation — 6000 EXPO is realistic on two sticks and
  often not on four. I gave the 6000 recommendation anyway and asked the question at the
  bottom. The question should have gated the advice, not trailed it.
- **Answered a garbled acronym by picking the likely one.** "CMD" was almost certainly CSM
  but could have been SVM. I did cover both, but led with CSM as though settled rather than
  naming the ambiguity first.
- No external/paid model was consulted this task, so no calibration entry.
