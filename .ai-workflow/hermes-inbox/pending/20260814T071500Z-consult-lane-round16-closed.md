---
surface: vs-claude
utc: 20260814T071500Z
topic: Kimi round 16 closed on the consult lane — and the four defects my own hostile loop found after it
tags: [consult-lane, receipts, mcp-health, path-redaction]
---

## What I did / learned

- Closed Kimi round 16's four remaining findings (S2 bucket routing, L1 file over the 300-line cap,
  L2 eventId seed collision, L3 unsafe `hasCredential` default). S1 was already fixed.
- **Verifying a reported fix instead of trusting it paid for itself immediately.** S1 corrected
  `escapes()` so drive-qualified paths are detected as escaping on every platform — but left
  `shortPath` redacting via node's `basename`, which splits only on the HOST separator. On POSIX
  the "redacted" render of a backslash Windows path was the whole string, username intact.
  Detection improved; the leak survived. **The fix closed the instance the reviewer named and the
  class walked one function over.**
- That class then kept walking. A Rule 20 sibling sweep found `consult.mjs` hand-rolling the same
  `basename` redaction twice — once on raw user input (a real leak) and once correct only *by
  accident*, because an upstream line happened to normalize backslashes first.
- Then my own L2 fix had the same shape: I hashed the *relativized* seed path, but every external
  path relativizes to the constant `<external>`, so two different external seeds still collided.
- Then the underlying predicate had it too: I taught it drive letters (`C:\`) and stopped, leaving
  UNC shares (`\\server\share\<name>\` — leaks the server name as well) and drive-less rooted paths
  (`\Users\<name>\`) recording verbatim on POSIX.

## Why it matters to Hermes

- **When a fix is described by the instance it repaired, assume the class is still alive and go
  looking.** Four times in one session the named instance was fixed and a sibling survived. The
  cheap check is a repo-wide grep for the *mechanism* (here: `basename`, `startsWith`, a redacted
  constant used as an identity), not for the symptom.
- **A test written on the only platform where it cannot fail is not coverage.** Three times I wrote
  an assertion that passed against deliberately broken code, because on Windows `basename` and
  `isAbsolute` already do the right thing for their own reasons. The fix each time was to export
  and assert the *platform-independent primitive* (`finalSegment`, `isWindowsAbsolute`) rather than
  the composed function. This is why 15 prior review rounds — all on Windows — never saw S1.
- **Prefer removing the second policy to adding a smarter one.** S2 was a prefix collision:
  `verdict.startsWith('REACHABLE')` also matched the 304 verdict, silently moving a broken endpoint
  from unhealthy to unverified and flipping exit 1 → 2. The reviewer proposed a better string
  matcher; I made `diagnose()` return the bucket instead, so there is no second parser to drift.

## State right now

- Branch `s0/receipt-v1-2026-08-13`, 28 commits, **NOT pushed**. Tree clean.
- Suites: gateway **140/139/0/1** (was 138/137/0/1) · mcp trio **34/34** · hooks **79/79**.
- Every new assertion mutation-tested: reverting each fix turns exactly its own test red, with the
  break confirmed present in the file *before* reading the result.
- **My own hostile loop is dry** — rounds 6 and 7 found nothing. A confirming *Kimi* round has NOT
  been run; it is paid, so it is Sean's call.
- Linear still 401 (re-verified live this session, not carried forward from the handoff).
- This inbox is at **126 pending memos** — the drain backlog is real and growing.

## Mistakes I made

- **I repeated the exact mistake the handoff warned me about, in my first ten minutes.** Its top
  lesson is "heredoc/str.replace patching fails SILENTLY — use the exact-string editor." I wrote a
  test fixture through a bash heredoc; `\\` collapsed to `\`, JS then dropped the unrecognized `\U`
  escape, and my fixture became `C:UsersSomePerson...` — proving nothing about separators. Caught
  only because the assertion failed loudly by luck. → rule: never author string fixtures through a
  shell heredoc; use the editor and `String.raw`.
- **Then I did the same class again with `str.replace`** to inject a temporary break, and it
  silently no-op'd. I caught it only because I had printed `patched? false` — had I not, I would
  have read "18 pass" as proof the test had teeth when nothing had been broken at all. → rule:
  every mutation check must confirm the mutation is PRESENT in the file before the result is read.
- **I wrote three vacuous tests** that passed against code I had deliberately broken, each time
  because the assertion routed through a platform-dependent function that masks the bug on Windows.
  Caught by mutation testing each one. → rule: assert the platform-independent primitive; a test
  that cannot fail is worse than no test because it reads as coverage.
- **My first POSIX probe lied and I nearly acted on it.** I retyped a regex through two layers of
  shell quoting; it mangled, and the probe reported the drive+backslash case leaking when it was
  already fixed. → rule: a probe must read the value under test FROM THE SOURCE, and fail loudly if
  it cannot — validate the instrument before believing what it says.
- **I claimed L1 was fixed when the file was still 310 lines.** I removed ~45 lines and added ~47,
  then checked the count only because I print it by habit. → rule: a cap finding is closed by the
  measurement, not by the edit that was supposed to satisfy it.
- Two `node --test` invocations reported nonsense (a module-not-found, then 13 failures from
  unrelated suites) because my glob was wrong, not because anything was broken. → rule: when a tool
  reports a surprising negative, suspect the invocation first.

## External-model calibration

- **Kimi K3, round 16** (~$0.25, 1 call): 5 findings, **5 real, 0 hallucinated** — verified each
  against the code before acting. Its S2 analysis correctly predicted the exit-code flip from a
  prefix collision, including which prior round's rationale it silently contradicted. Consistent
  with its 16-round record (55/56 real). **Its blind spot is the same as mine here:** it did not
  catch that its own S1 fix left `basename` platform-dependent one function over, nor the UNC and
  rooted shapes. Reviewer findings are a floor, not a ceiling.
- No paid call was made this session. The four post-Kimi defects came from my own loop at $0.

## Linear tracking

- **N/A — board unreachable.** The `linear-server` token returns 401, so zero tools register.
  Re-verified live this session via `node scripts/check-mcp-health.mjs linear` (exit 1, verdict
  CONFIGURED BUT TOKEN REJECTED). Not fabricating an SWA id. Sean must rotate the token and fully
  restart Claude Code.
