# Four failed attempts to start a process, and every one was my instructions

**Surface:** Render agent operator tooling · **Agent:** vs-claude (Opus 5)
**On main:** `579da7a16` · 20/20 agent tests · secret scan CLEAN

Sean tried to start the render worker four times and failed four times. Not one failure was
his machine. Each was a defect in what I handed him.

## The four failures, and what each one actually was

1. **I gave bash syntax to a PowerShell user.** `SWAN_AGENT_TOKEN=... node script.mjs` has
   no PowerShell equivalent — the shell read the assignment as a command name. I knew he
   was on Windows; I wrote the Unix form anyway and only mentioned PowerShell as an aside.
2. **I gave a path that did not exist on his machine.** His primary repo is checked out on
   a branch predating this work, so the script genuinely was not there. I had that fact in
   context from the session-start git status and did not check it before answering.
3. **The three-line ritual was fragile enough to break on a copy-paste.** He copied the
   `PS C:\...>` prompt text along with the commands; PowerShell read `PS` as `Get-Process`
   and produced a wall of errors that read like a broken product. Then the shell was back
   in his home directory, so the remaining commands missed too.
4. **A worktree path under `C:\tmp\`** — which works, but is scratch space I offered as if
   it were a destination.

**Rule: when the same instruction fails twice, stop improving the instruction and remove
the need for it. I rewrote the steps three times before writing the launcher; the launcher
took less effort than the third rewrite and made failures 1-3 structurally impossible.
Repeated "user error" on a documented procedure is a design defect in the procedure.**

The fix resolves every path from the script's own location, so which directory the operator
is standing in stops mattering — failure 2 and half of 3 removed by construction rather
than by warning.

## The security half, which was not incidental

The original instruction had Sean type `$env:SWAN_AGENT_TOKEN = "<75-char secret>"`.
PowerShell history **persists to disk and outlives the session**, so that instruction wrote
a credential capable of leasing jobs and reporting completions into a file nobody would
think to clear. The launcher reads it with `-AsSecureString` (no echo) and stores it in a
gitignored file that the agent reads directly, so the secret never enters the shell, never
enters this process's environment, and cannot leak into a child process or crash dump.

**Rule: "paste this secret into your terminal" is not a neutral instruction. Shell history
is durable storage. If a procedure requires handling a credential by hand more than once,
the procedure is the vulnerability.**

## Mistakes I made

- **A patch script asserted and exited BEFORE writing, and I did not notice.** The
  `const TOKEN = process.env...` replacement never persisted, so the agent still resolved
  env-only while I believed file loading was live. Caught only because I tested the file
  path explicitly rather than trusting the script's output — the same class of failure as
  the CRLF replace earlier today that printed success having changed nothing. **Third
  silent-replace failure this session**; I have switched to the Edit tool for these instead
  of string surgery, because a tool that errors on a missed match beats a script that
  prints whatever I told it to print.
- **Four instruction failures before I built the obvious thing.** The launcher was the
  right answer at failure one.
- **I offered a `C:\tmp\` worktree as a destination** without flagging, in the same message,
  that it is scratch space that can be cleaned. Said it afterwards; should have led with it.

## Two silent-failure traps closed by construction

- **UTF8 BOM.** A BOM-prefixed env file makes the first key parse as `?SWAN_AGENT_TOKEN`,
  so the token reads as missing and the operator sees "no token found" for a file that
  visibly contains one. The launcher writes UTF8 **without** BOM explicitly.
- **Quotes around a pasted token.** Produces a confusing 401 rather than an obvious error,
  so the resolver strips a surrounding quote pair.

Both are failures that look like a bad credential while being nothing of the kind — the
expensive shape, because the operator's next move is to re-enrol and rotate a token that
was never the problem.

## Verified, not asserted

- No token anywhere -> actionable message naming both options, exit 2 (not a stack trace)
- Token in the file -> `credential loaded from ...\.swan-agent.env`, then a clean
  `BAD_TOKEN` 401 against production. The 401 is the CORRECT answer for a deliberately fake
  token and proves the whole path end to end.
- Quoted token -> same, quotes stripped
- `git check-ignore -v` -> `.gitignore:500` catches the credential file
- Startup logs the credential's SOURCE, never its value

## Open

- The token file currently lives under `C:\tmp\ss-mediasync` — scratch space. A permanent
  worktree is owed once the loop is confirmed working.
- Still nothing enrolled in production, so every surface honestly reports
  `NO_WORKER_ENROLLED` rather than implying progress.
