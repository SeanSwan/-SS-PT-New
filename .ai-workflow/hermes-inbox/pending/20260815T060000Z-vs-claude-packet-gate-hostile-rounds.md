---
surface: tooling / external-model packet gate
agent: vs-claude (Opus 5)
date: 2026-08-15
status: work in progress — hostile loop NOT dry, round 3 pending
---

## What I did / learned

Built a zero-call preflight gate for the one lane that had no mechanical protection: outbound
`consult-*.mjs --document <file.md>` calls, where a hand-authored markdown file reaches a paid model
with nothing between typed-from-memory code and the wire. The compiled lane (`context-gateway`) was
already byte-exact by construction and is deliberately not re-checked — building a second packet
compiler would have been duplication.

Six refusals ship: oversize, provenance (byte re-extraction), no-artifact, phantom-premise, hygiene,
canary-freshness. The gate builds the packet, prints an approval view, and STOPS. Spend approval
stays human.

**The transferable lesson is not the gate. It is this: a green canary suite proves only the cases
you thought of.** At 26 canaries green, the gate was still bypassable by writing a plainly-worded
remit. Two paid reviewers reading the SOURCE found it independently within minutes. Three of my own
hostile passes had not.

## Why it matters to Hermes

- **Send the source, never a description.** Confirmed again. The four-call evidence table already
  showed a prose packet returning 1-of-3 verified findings vs 9-of-9 for a source packet. Both
  rounds here sent real source; every finding was real when checked.
- **A fix is the next round's primary attack surface.** My round-1 fix for the critical bypass
  reintroduced the identical bypass, because the fix depended on a filter that missed bare fences.
  Never treat a fix as the end of a round.
- **Validate the instrument before believing a negative.** A Git Bash probe reported a string absent
  that occurs 413 times; MSYS path conversion had rewritten the leading-slash argument. The code was
  fine — only the probe was broken.
- **Documentation of intent is not evidence of existence.** Premise checks that grep prose will
  bless routes that were designed, written up, and never built.

## State right now

- Slice 1 committed on a working branch. Slice 2 is complete but UNCOMMITTED: a pre-commit registry
  guard blocks it because the new skill is not named in the constitution file, and I will not edit
  that file without Sean's approval. Three options were put to him; awaiting his call.
- 45/45 canaries green. Test suite re-running after one re-anchored assertion.
- Hostile loop is NOT dry: round 2 found a critical, so round 3 is required before any completion
  claim. Nothing has been pushed.

## Mistakes I made

- **My fix for the critical bypass reintroduced the critical bypass.** I filtered uncited fences on
  `b.lang`; a bare fence has falsy `lang`, so it counted as nothing. Round 1 closed "anchor-free
  remit + labelled fake code" and reopened it with one fewer keystroke. Both reviewers found it
  independently. Caught only because I paid for a second round instead of assuming round 1 finished
  the job.
- **I wrote a phantom route literally into a comment explaining the phantom-route bug** — `git grep`
  found it, the phantom resolved, the check went silent, and three tests failed for a reason that
  looked nothing like the cause. I had already caused the same class minutes earlier by committing
  the test suite that named the phantom. Same error, twice, in one session.
- **I shipped a decorative gate and did not notice.** A regex used `\Z`, which is not a JavaScript
  assertion; under `/i` it matched the literal letter `z` and truncated the remit at "authori|zation",
  silently disabling two checks. The gate reported a clean premise check because it had nothing left
  to check. Found only by running the gate against a packet whose refusal I knew in advance.
- **I mangled JS escapes with a Python heredoc three separate times** (`\n` becoming a real newline)
  before switching tools. The first failure should have been enough. Procedural fix, not a
  resolution to be careful: use the file editor for source containing escape sequences.
- **My own packet generator had an off-by-one** — `split('\n')` on a trailing-newline file yields a
  phantom final element, so I cited 258 lines of a 257-line file. The gate caught me. I then built a
  packet builder so the arithmetic is computed by the same normalization the checker verifies.
- **I claimed a line-count compliance check without running it** until late; two files were over the
  cap and needed extraction.
- **I ran a health probe from the stale main tree** (1937 commits behind) and got MODULE_NOT_FOUND,
  which would have read as "the tool doesn't exist" if I had not checked the other tree.

## External-model calibration

Four paid calls, **$0.218 total**, both models reading real source both rounds.

| Model | Round | Cost | Findings | Verified real |
|---|---|---|---|---|
| kimi-k3 | 1 | $0.1047 | 8 | every one I checked (5 checked empirically) |
| tencent/hy3 | 1 | $0.0172 | 5 | every one I checked (3 checked empirically) |
| kimi-k3 | 2 | $0.0834 | 6 | critical + 4 confirmed; 1 accepted as documented limitation |
| tencent/hy3 | 2 | $0.0125 | 4 | critical confirmed; symlink hole real and unique to HY3 |

- **Both models found the round-1 critical and the round-2 critical independently.** Convergence on
  the same defect from two different vendors is a strong real-bug signal.
- **Each found things the other missed.** HY3 alone found the unscanned seed and the symlink hole;
  Kimi alone found the decoy-artifact binding and the canary shape hole. Running both is worth it.
- **HY3 is ~6x cheaper than Kimi here and was not 6x worse.** For source-reading review of small
  code surfaces, HY3 earns its slot.
- **Zero hallucinated findings across four calls.** Every claim I tested was reproducible. That is
  what sending real source buys.

## Sean owes / blockers

- **Linear token is expired** — the server is configured at user scope but returns 401, so it
  registers zero tools. Board sync is impossible until a fresh token is issued and Claude Code is
  fully restarted. This is NOT "Linear is not configured".
- **Decision needed on the skill registry line** so slice 2 can commit (constitution file, his call).
- Round 3 of the hostile loop is unpaid/unrun; the loop is not dry.
