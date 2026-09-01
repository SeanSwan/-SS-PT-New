---
name: a-mock-that-shares-your-assumption-cannot-falsify-it
date: 2026-09-01
originating_model: claude-fable-5
surface: tools/swanfetch (standalone), SWA-227
models_used:
  - model: claude-fable-5
    role: builder + hostile reviewer + final decider
    did: built the fail-closed privacy layer; found and fixed 5 real defects; caught two of its own false-success loops
    cost: subscription (flat)
  - model: glm-5.3
    role: intended external hostile reviewer
    did: NEVER RAN — Z.ai single-call lock held by other agents in the shared tree
    cost: $0 (no call completed)
  - model: glm-5.3-flash
    role: intended external hostile reviewer
    did: NEVER RAN — same lock contention
    cost: $0 (no call completed)
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: a mocked test suite stayed 100% green over a privacy guarantee that silently did nothing
  - id: Rule 73 (proof-before-done)
    change: reinforced
    failure: two retry loops reported "completed exit 0" having produced no artifact at all
---

# A mock that shares your assumption cannot falsify it

Building a fail-closed privacy layer for a personal downloader produced two lessons
that generalise well past this tool.

## Who did what

**claude-fable-5** did all of it: designed the fail-closed policy, implemented it,
then hostile-reviewed its own work and found five real defects — including one it had
shipped minutes earlier with a green suite behind it. The model that was WRONG here is
the same one that was right; the correction came from a *procedure* (negative control),
not from being smarter on the second pass.

**glm-5.3 and glm-5.3-flash contributed nothing** — not because they failed, but
because the Z.ai seat serialises behind a single call lock and other agents in this
shared working tree held it continuously (lock-holder pids cycled 16372 → 53512 →
41504 over ~40 minutes). Every attempt returned BLOCKED. Rule 67 R5 says retry, never
seize, so the external review simply did not happen. **Recording a zero honestly is
what makes the routing table trustworthy later** — a packet that quietly omitted this
would imply the seats were consulted.

## The core lesson: a green suite proved nothing

The tool scrubs identifying metadata (crucially, the **source URL**) out of downloaded
files. Implementation called `tempfile.mkstemp()`, used the returned path, and never
closed the returned file descriptor. On Windows that live handle prevents
`os.replace()` from moving the scrubbed temp file over the original — so the scrub
**silently no-opped**, left an orphaned temp file in the user's download folder, and
the function's failure return value was ignored by the caller.

Every mocked test passed. They passed because *I wrote the mocks from the same mental
model that produced the bug* — they asserted the scrub function was called, not that
the file came back clean. A mock built on your assumption can only ever confirm it.

What caught it: running the real binary and reading the artifact back with `ffprobe`,
with an explicit **negative control** — first assert the pre-scrub file genuinely
carries the identifying tags. Without that assertion a clean result is indistinguishable
from a file that never had tags, and the test proves nothing while looking rigorous.

The fix that generalises: **for any guarantee a user will rely on, the test must read
the artifact back with an independent tool, and must first prove the pre-state contains
what you claim to remove.**

## Silent failure is worse than absence

The second half of the same bug: the caller discarded the scrub's boolean result. A
user would have been told the download succeeded and reasonably concluded their file
was clean. For a *safety* feature, degrading quietly is worse than not shipping it —
absence is at least visible. The result now carries `metadata_scrubbed: bool | None`
and the CLI warns loudly when a requested scrub failed.

## Mistakes I made

- Leaked an `mkstemp` file descriptor; on Windows this broke both `os.replace()` and
  `unlink()`, making the scrub a silent no-op that also littered the output folder.
- Ignored the scrub function's failure return, turning a privacy guarantee into a lie.
- Wrote a retry loop whose trailing `sleep` made the shell exit 0 after every attempt
  was BLOCKED — the harness dutifully reported "completed (exit code 0)" with no
  output file. Then **wrote the identical bug a second time** in the next loop.
- Read `$?` after piping to `tail`, capturing tail's exit status rather than the
  command's; nearly reported a correct fail-closed refusal as a success.
- Chose the test fixture username `user`, which collided with the literal redaction
  placeholder `<user:pass>`, producing a scary-looking failure that was not a leak.
- Left the shell cwd inside a directory I then tried to delete, and briefly blamed my
  own code's handle management for the resulting "Device or resource busy".

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Retry loop reports false success | **2** | Yes — after the 1st | Procedural rule: `test -f "$out"` and exit non-zero. **Assert on the artifact, never on the loop's exit status.** |
| Green mocked tests over a broken guarantee | 1 | No | Real binary + negative control reading the artifact back |
| Exit code captured through a pipe | 1 | No | Run the command unpiped when the code matters |

The repeat is the entry worth keeping. I diagnosed the false-success loop, explained it,
and then reproduced it — because I fixed *that instance* rather than adopting a rule.
A correction that survives is procedural ("assert the artifact exists"), never
resolutional ("be more careful with exit codes").

## Transferable rules

1. A mock written by the author of the bug cannot detect the bug. Verify guarantees
   against the real artifact with an independent reader.
2. Every absence claim needs a negative control, or it is vacuous.
3. A shell loop's exit status describes its last command, not its purpose. Assert the
   artifact.
4. `tempfile.mkstemp()` returns `(fd, path)` — close the fd, or Windows file operations
   on that path fail in ways that look like unrelated permission errors.
5. Safety features must fail loudly. Silent degradation of a protection the user trusts
   is worse than never shipping it.
6. When a shared-seat lock blocks an external review, record the zero explicitly.
   Silence reads as consultation.
