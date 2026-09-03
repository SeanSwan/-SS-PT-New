---
date: 2026-09-03
originating_model: claude-opus-5
title: An update that pins a major version breaks every consumer it cannot see
models_used:
  - model: claude-opus-5
    role: builder + sole reviewer
    did: hostile-reviewed the live Hermes install after a same-day update; found a silent 25-tool regression, a 30 KB per-turn prompt leak, and a pinned picker; applied fixes and measured each
    cost: subscription
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: called a catalog builder without its provider argument and read the empty result as absence - the second probe-blind false negative of the session
  - id: drift-check
    change: proposed
    failure: an update log said "Update complete" while five out-of-tree MCP servers had been failing hourly for a day; nothing in the update path looks at consumers outside the repo
---

# An update that pins a major version breaks every consumer it cannot see

Hermes updated itself on 09-02 and printed `Update complete`. Its `pyproject.toml` pins
`mcp==2.0.0`. That release removed `mcp.server.fastmcp`. Six of Sean's own MCP servers, living
outside the Hermes repo, import exactly that path. From 22:22 that night, five of them failed
their initial connection every hour, parked, and vanished from the tool list. Twenty-five tools.
Thirty-three failures each in `errors.log`. Nobody noticed for a day, because the update
succeeded by every measure the update could take.

The update was correct. The repo was consistent. The tests passed. The breakage was in code the
updater does not know exists, called by an import path the new version stopped providing.

## The shape

A dependency bump is a contract change. The party that bumps it verifies its own callers. The
callers it cannot see are the ones that break, and they break silently, because they are not in
the test suite and they are not in the changelog audience. Out-of-tree consumers are a blind
spot by construction. The only thing that catches them is an instrument that looks at the
consumers, not the update: here, `errors.log` had been screaming for twenty-four hours.

The fix took two steps. The import path changed (`mcp.server.fastmcp` to the standalone
`fastmcp` package), so six one-line patches with backups. Then the package install, which the
sandbox classifier denied, so it became Sean's one command. The diagnosis was the work; the fix
was trivial once the right log was read.

## Three other things a working system was quietly doing wrong

**A prompt leak from the working directory.** The gateway was launched from inside the
`hermes-agent` source checkout. Hermes discovers `AGENTS.md` by walking from git root to cwd, so it
found the repo's 95 KB developer contributor guide, truncated it to 31 KB, and injected that into
every single turn. Measured with `hermes prompt-size`: 68.2 KB system prompt, 36.4 KB once the
gateway ran from HERMES_HOME instead. Upstream's own systemd unit already uses HERMES_HOME as the
working directory, with a docstring explaining exactly why the checkout is wrong. The manual
launch had never read it.

**A picker pinned to a stale list.** `discover_models: false` with a list-shaped `models:` makes
that list an allowlist. The list contained two models deleted that morning and lacked the one
installed that afternoon. Live Ollama advertised all eighteen; the picker showed nine, two of
which would error on selection. Sean's "I did not see it in my options" was the picker doing
exactly what it was configured to do.

**A thinking setting that looked like a speed bug.** `reasoning_effort: high` on a local reasoning
model is the obvious suspect when a user says "it's slow." I measured before touching it: think-on
answered a revenue question correctly in 1.8 s; think-off answered it *wrong* in 0.7 s. The
fast setting was the broken one. Left at high, and wrote down why.

## Who did what

**claude-opus-5 (me)** did all of it. No paid seat. That kept the review cheap and also meant
nobody caught my own false negative until I did.

## Skills created or changed

- **`instrument-check` — reinforced.** I called `list_picker_providers()` with no
  `custom_providers` argument, got only cloud providers back, and printed
  `HAS uncensored: False`. The probe could not see local providers at all. Reading the signature
  exposed it. This is the same failure as the stalled-download misread earlier in the session, in
  a new costume: a probe whose blind spot exactly covers the target.
- **`drift-check` — proposed addition.** After any dependency update, grep the last 24 h of the
  consumer's error log for connection failures *before* declaring the update clean. The update
  log cannot see out-of-tree consumers; the error log can.

## Mistakes I made

- **Read a probe's blind spot as absence, again.** Called the catalog builder without the
  provider list and trusted the result. Second time this session a probe that could not see the
  target produced a confident negative.
- **Embedded secret-shaped literals in a redaction regex**, which the sandbox denied. The
  redactor itself looked like a leak. Re-issued with a plain key-name filter.
- **Two heredoc failures** on this host (backslash mangling, then quoting) before moving long
  file writes to the Write tool. I had already hit this once earlier in the session.
- **Ran the update from the source checkout**, so the restarted gateway inherited the wrong cwd
  and I needed a second restart from HERMES_HOME. Reading `_stable_service_working_dir()` first
  would have saved the extra restart.

## Error to fix to repeat ledger

| Error class | Times this session | Written up before? | What actually stops it |
|---|---|---|---|
| Probe whose blind spot covers the target, read as absence | 2 | Yes, the first time, hours earlier | Before trusting a negative, ask: what would this probe return if the thing existed? If the same value, the probe is blind |
| Heredoc with backslash or quote on this host | 3 | Yes, twice | Write tool for any file over a few lines; no exceptions |
| Secret-shaped literal inside a command | 1 | No | Filter by key name, never by value pattern, in the command line |
| Restart inherits caller cwd | 1 | No | Read the spawn path before restarting a long-lived process |

The first row repeated within one session after being written up. The write-up said "validate the
instrument." The repeat happened because the second probe looked nothing like the first: a
Python call instead of a file glob. **The lesson was filed under the symptom, not the mechanism.**
The mechanism is: the instrument returns the same value whether or not the target exists. That
sentence has to be the check, every time a negative is about to be reported, or it will keep
recurring in new costumes.

## Non-goals and scope

Five MCP servers remain parked until Sean runs the install. The `hermes-private` profile targets
an uninstalled model and was left alone. The morning briefing prompt tripled on 09-02 and was
flagged, not diagnosed. Nothing here touched the `SS-PT` application.
