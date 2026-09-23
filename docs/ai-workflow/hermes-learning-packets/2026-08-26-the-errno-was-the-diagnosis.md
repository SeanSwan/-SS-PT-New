---
date: 2026-08-26
originating_model: claude-opus-5
surface: hermes-agent (WSL) — Desktop voice dictation, local faster-whisper STT
decision: A numeric error code is evidence, not noise — decode it before forming any hypothesis; and validate the instrument (does the mic actually capture?) before blaming the subject.
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder, root-cause, own hostile rounds, final decider
    did: decoded 541478725 to AVERROR_EOF in one line; proved the WSLg mic captures real audio (parec, RMS 2070) before touching code; disproved its own first hypothesis with a 19-offset truncation ladder; wrote the two-layer fix and 5 tests; ran a negative control proving the new test fails without the fix
    cost: subscription
skills_touched:
  - id: instrument-check (existing)
    change: reinforced
    failure: a garbled voice report ("errno zero five four one...") reads as unusable noise; treating it as a decodable integer named the whole bug before any file was opened
  - id: rule 73 proof-before-done (existing)
    change: reinforced
    failure: green tests written against your own fix prove nothing until you stash the fix and watch them go red
---

# The errno was the diagnosis

Sean reported a Hermes Desktop voice failure through a microphone that was itself failing, so the
error code arrived as spoken digits: "earn zero five four one four seven eight seven two five."
That string is not noise. `int.from_bytes(b'EOF ', 'little') == 541478725` — FFmpeg's `AVERROR_EOF`
tag. One line of Python turned a garbled dictation into the complete diagnosis: PyAV found **zero
audio frames** in the uploaded recording. Everything after that was confirmation.

## Who did what
`claude-opus-5` did all of it, and its first substantive hypothesis was WRONG. It assumed
"no frames" meant "truncated file", truncated a valid webm to 300 bytes, and got `[Errno 5]` — not
the reported code. The correct answer came from refusing that plausible result and running a
truncation ladder across 19 offsets, which found the narrow ~48-byte window that reproduces
`541478725` exactly. No paid seat was consulted; none would have helped, because the answer was a
constant, not a judgement.

## The lesson worth keeping
**Decode the number first.** A numeric error code is the highest-information token in a bug report
and it is the one humans skip, because it looks like an opaque identifier. `541478725`,
`1094995529`, `-1073741819` are all FourCC/NTSTATUS constants that name a failure class outright.
Decoding costs one line and can collapse an entire investigation.

**Validate the instrument before blaming the subject.** The obvious story was "the WSL microphone
is broken." Before writing code, a 5-second `parec` capture off the WSLg RDP source returned
RMS 2070 / max 15922 — real signal. That single probe killed the wrong investigation. Then
`/mnt/wslg/pulseaudio.log` (whose timestamps are *seconds of uptime*, cross-referenced against
`/proc/uptime`) placed Electron's own mic-open at 17:12 and the probe at 17:27 — proving the app
HAD opened the device successfully at the moment it failed.

## Skills created or changed
No new skill. Two existing disciplines earned their keep and are recorded here as reinforced:
`instrument-check` (the parec probe, and the negative control on my own tests) and rule 73
proof-before-done (the stash-the-fix run). A third pattern is worth naming for reuse: **guard at
the choke point.** Four voice paths — dictation, conversation turn, barge-in capture, session tiles
— converge on exactly two Blob→request glue functions. Guarding those two covers all four and the
next one; guarding the four would have missed it.

## Mistakes I made
- Ran a repo-wide grep across the WRONG repo for a string that lives in another one, and let it
  time out at 120s. The error message contained a `/tmp/...` path — a WSL path — and said where it
  lived. Locate the surface before searching it.
- Accepted my first reproduction attempt's plausible-but-different errno as close enough for about
  one step, before the ladder disproved it. "Same failure family" is not "same failure."
- Wrote a test file containing raw NUL and 0x1A bytes without noticing, because backslash escapes
  collapsed crossing bash→wsl→python quoting layers. pytest refused to parse it. Fixed by removing
  escapes entirely, not by adding more.
- Nearly reported green tests as proof. They were written against the fix and had never been shown
  to fail without it.

## Error → fix → repeat ledger
- **Nested-heredoc escape collapse** — recurred 2× this session (first as `\x00` in a test file,
  then avoided on the next patch by writing the script to a FILE and invoking it by path). Had NOT
  been written up before. The correction that survives is procedural, not resolutional: when a
  patch script crosses bash→wsl→python, write it to a file and run it by path; never nest heredocs,
  and never put backslash escapes in generated source — use `bytes([...])`.
- **Trusting a self-authored test suite** — 1× this session, caught before reporting. Standing
  procedure: `git stash` the fix, re-run, confirm RED, `git stash pop`, confirm the tree is
  byte-identical (`diff -q` against a pre-stash copy). Done here; the tree was verified identical.
- **Searching before locating** — 1× this session. Procedure: read the paths in the error text
  first; they name the machine, repo, and runtime.

## External-model calibration
None consulted, deliberately. Root cause was a decodable constant plus four local probes. Spending
a paid seat to theorise about a value `int.from_bytes(b'EOF ', 'little')` settles for free would be
the wrong routing call — and worth remembering as the shape of that call: **if a fact is
computable, do not buy an opinion about it.**
