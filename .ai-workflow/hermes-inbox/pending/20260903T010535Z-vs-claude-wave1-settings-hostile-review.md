# Wave-1 Settings hostile review — 5 found, 6 fixed

**Surface:** User Dashboard → Settings hub (`UserSettingsHub`), the Wave-1 "Saved
without writing" repair. **Delivery:** pushed-branch (`claude/client-dashboard-wave1-review-4kz9oo`).

## What happened
Reviewed the shipped Wave-1 code rather than the (already 7-seat-reviewed) plan doc.
Five defects, all with file:line evidence; all fixed, mutation-proven. Highest-value
finding: the fallback save path had a **weaker truth contract than the primary path** —
`profileService` rejects a 2xx whose body says `success:false`, the hub's direct-axios
branch did not. That is the Wave-1 bug class surviving in the exact branch the Wave-1
P0 routed through, and no test covered it. Also: the save result was announced to no
screen reader at all, on the surface whose entire purpose is not lying about saves.

## Durable lesson
**When you fix a bug by adding a second code path, the new path inherits none of the
old one's hard-won guarantees.** Wave 1 replaced a no-op callback with a real HTTP
call — and gave that call a laxer success check than the service it was standing in
for. The asymmetry is invisible in a diff and invisible in a pass count; only reading
the two paths *side by side and asking which is stricter* surfaces it.

## Mistakes I made
- Ran `npm ci` in the background and the harness reported **exit 0 while npm had
  actually errored** (puppeteer's Chromium download is blocked by the network policy).
  I nearly proceeded on a false success. Caught by checking `node_modules` directly
  instead of trusting the status. Fix that generalises: write the real exit code into
  the log myself (`echo "REAL_EXIT=$?" >> log`) and grep for that, never trust a
  wrapper's status.
- Ran a python heredoc with a `cd` to the repo root while vitest was running from
  `frontend/`, so the patch script wrote nowhere and the suite lost its `@` alias. Two
  separate failures with one cause: I let cwd drift between tools in the same command.
- Used `--reporter=basic`, removed in vitest 4. The reporter-loading crash looked like
  a test failure for one cycle.
- **My own fix for the timer leak introduced a race** (a save within 3s inherited the
  previous timer and cleared the new status early). Round 2 caught it. This is the
  entry that matters: the hostile round earned its keep on my own diff, not the
  original author's.

## Error → fix → repeat ledger
| Error class | Times this session | Written up before? | What stopped it |
|---|---|---|---|
| Trusting a wrapper/pipeline exit status | 2 | Yes — the exit-status gate blocked me once | Writing `REAL_EXIT=$?` into the log file and grepping that |
| cwd drift between chained tools | 2 | No | Absolute paths, or one `cd` at the head of every command |
| A fix introducing an adjacent defect | 1 | Yes (Rule 74's whole premise) | The round-2 hostile pass on my own diff |

## External-model calibration
**None run.** Grok 4.6 and GLM 5.3 were requested but are unreachable from a cloud
session: no `.env`, no `ZAI_API_KEY`/`OPENROUTER_API_KEY` in the container. Reported as
unreachable-from-here, not broken (Rule 80), with the exact commands for a keyed machine.
Note for the routing table: `consult-glm.mjs` / `consult-hy3-design.mjs` default to a
**narrow, SwanStudios-branded remit** when `--remit` is omitted — omitting it silently
reintroduces the lensing Rule 82 bans.
