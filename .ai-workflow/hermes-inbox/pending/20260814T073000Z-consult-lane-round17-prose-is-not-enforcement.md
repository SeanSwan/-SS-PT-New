---
surface: vs-claude
utc: 20260814T073000Z
topic: Kimi round 17 — my safeguard was a comment, and I rebuilt the bug we'd just killed one layer up
tags: [consult-lane, mcp-health, test-discovery, review-calibration]
---

## What I did / learned

- Ran the approved Kimi round 17 confirming pass. Verdict **STRONG / clean-from-lane**: it found no
  defect in any of the seven fixes from the prior turn, and explicitly declined to invent
  design-system findings against a Node tooling diff.
- **Its best catch was that my own mitigation was prose.** Splitting one test file into three left
  the siblings undiscoverable, so I had written a header comment naming them. A comment is not a
  mechanism: run the parent alone, get green, and the path-redaction suite — the security control
  the entire round existed to protect — silently does not run. I had reconstructed the precondition
  of the original bug one layer up, inside the fix for it.
- **Then I did the same thing inside the replacement.** The runner's first self-check compared a
  hand-written array to a constant, which passes happily if someone deletes an import and leaves the
  array. Self-caught. It now parses its own import statements and diffs them against the directory
  listing; deleting an import turns it red and names the file, and the total drops 36 → 32.
- Kimi's second finding predicted its own proof: it called a file sitting at 299 lines "a smell, not
  a success — one clarifying comment from a violation." My next edit took it to 302.
- Its third finding was **real but narrower than reported**. It flagged a second path-redaction
  implementation as another instance of the platform-relative bug class. It IS a duplicate, but a
  probe showed it does not carry the flaw — it decides separators with a regex class, not with a
  platform primitive. Pinned against acquiring one; my own over-broad comment narrowed.

## Why it matters to Hermes

- **A control whose enforcement is a comment has no enforcement.** This is the sharpest form of the
  untrue-doc-claim class. When a fix's mitigation is "we wrote it down," the fix is not finished.
  Ask: what executes this? If the answer is "a human reading a header," it is decoration.
- **Verify a reviewer's finding before acting on it, in both directions.** Two of three landed as
  stated; the third overstated the danger. Acting on it verbatim would have forced a merge of two
  functions that answer different questions — a worse design justified by a real-sounding report.
  Findings are a floor and a hypothesis at the same time.
- **A cheap external round can be worth far more than its price when it attacks the thing you are
  least able to see** — here, the quality of my own safeguard. Eight cents.

## State right now

- Branch `s0/receipt-v1-2026-08-13`, **29 commits, NOT pushed**. Tree clean.
- Family suite **36/36** through the new runner (18+8+5+4 parts + 1 tripwire — conservation holds,
  no test lost in the split) · gateway **140/139/0/1** · hooks **79/79** · all files ≤300.
- **Round 17 does not count as a clean round** — it found real defects. The push gate wants two
  consecutive clean Kimi rounds, so round 18 is outstanding and needs Sean's fresh yes.
- **Spend, from the receipt ledger:** exactly one `ok` receipt today, `$0.081171`. Everything else
  is `refused`/`error` with no cost. This is the first time the S0 receipt store answered a real
  operational question instead of being tested — and the run also exercised the paid SUCCESS path
  (`saved ->`, `receipt ->`) that the handoff had listed as UNPROVEN.
- Linear still 401. Kimi's CLI enhancement suggestions (`--json`, summary header, ANSI) are
  Sean-gated and unfiled because the board is unreachable.

## Mistakes I made

- **I shipped a comment as a safeguard.** Caught by Kimi, not by me — and I had even written the
  words "nothing globs these" in my own closeout, describing the hole while calling it mitigated.
  → rule: if nothing executes it, it is not a control.
- **I then repeated that exact shape inside the fix**, with a tripwire that could not detect the
  thing it existed to detect. Self-caught by mutation-testing it. → rule: mutation-test the
  safeguard, not just the code it guards.
- **Fourth shell-escaping corruption of the session.** An inline probe died on
  `Invalid hexadecimal escape sequence` because I put path fixtures through bash again — the exact
  class I had written up twice already today, including in a durable packet. → rule: probes and
  fixtures go in a FILE with `String.raw`, never inline through a shell.
- **My dead-import detector reported nine false positives**, flagging `test` and `diagnose` as
  unused in passing suites. I nearly recorded a finding from it. → rule: when a probe reports
  something impossible, the probe is broken — check it before believing it. Fifth instrument
  failure this session.
- **I set a 2-minute timeout on a call whose prior round took 318 seconds**, killed it, and may have
  paid for a generation I never received. The local ledger shows no receipt for it, so the charge is
  unobservable from here. → rule: size the timeout from the last measured wall time, and disclose
  unobservable spend rather than assuming it did not happen.
- **I estimated ~$0.30 and it cost $0.08.** Not a defect, but my cost intuition for this reviewer
  was 3.7× high, which is worth correcting before it shapes a spend decision.

## External-model calibration

- **Kimi K3, round 17** — $0.0812, 36.6s, effort high, one call. Three findings: **two real as
  stated, one real but overstated, zero hallucinated.** Correctly refused to manufacture UI findings
  against tooling. Its distinctive value remains catching claims a codebase makes about itself that
  the code does not support — it found the gap between "I mitigated the discovery problem" and what
  the mitigation actually did.
- **The overstatement is the calibration note:** it asserted a defect class was present in a second
  module by pattern-matching the shape, without evidence that module carried the flaw. Verification
  disproved it. Its 16-round record was 55/56 findings real; this adds one "real but narrower."
  Continue trusting findings enough to act — and continue probing before restructuring.
- Cumulative: 17 rounds, ~$3.24.

## Linear tracking

- **N/A — board unreachable** (token 401, re-verified this session). Not fabricating an SWA id.
  Queued for filing once rotated: Kimi's `--json` output mode, exit-code summary header, and
  NO_COLOR-respecting ANSI on the verdict line — all enhancements, all Sean-gated, none blocking.
