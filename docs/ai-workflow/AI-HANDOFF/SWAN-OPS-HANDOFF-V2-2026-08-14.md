> # ⚠ SUPERSEDED — read `SWAN-OPS-HANDOFF-V3-2026-08-15.md` instead
>
> This v2 doc is kept as history. Since it was written, the whole Meta workstream was
> completed and then hostile-reviewed by GLM-5.3 and Kimi-K3, which found a **critical
> prompt-injection exposure created by the very method v2 recommends**, plus a
> sample-limited longevity claim and several unbound nulls. **§5 item 1 of v2 ("retry Meta
> alone") is done.** Its open-work list and its security model are both out of date.
> Do not plan from this file.

# Swan Ops console — handoff v2

**Date:** 2026-08-14 (evening) · **Author:** vs-claude (Opus 5)
**Status:** job 1 shipped, Pass C **working**, one report produced with real ad data
**Supersedes:** `SWAN-OPS-HANDOFF-2026-08-14.md` — read THIS one. The v1 doc's §4
"PROVEN" list contains a claim that has since been disproven (see §6 below). Do not
build on v1 without reading §6 first.

**Tool location:** `C:\Users\BigotSmasher\Desktop\quick-pt\swan-ops\`
— **outside the SwanStudios repo, deliberately.** That checkout sits ~1,900 commits
behind `origin/main`, so anything committed there never reaches production.

---

## 1. What this is, in one paragraph

Sean wanted a CMD button that points Codex at business work — the site, social, email,
marketing. It turned out the capability was already installed: `~/.codex/config.toml`
already had `computer-use`, `browser` and `chrome` plugins enabled, Playwright MCP, and
plugins for stripe/github/render/linear/cloudflare/twilio. `codex exec` is the headless
primitive. **Nothing needed installing. What was missing was a front door** — one entry
point plus prewritten, guardrailed job prompts. That front door is `swan-ops/`.

## 2. Decisions Sean already made — do not re-litigate

| Decision | Value |
|---|---|
| Autonomy | **Draft & stage only.** Nothing posts, sends, buys, submits a form, or logs in. Publishing stays a manual act. |
| First job | **Market & competitor recon** only. Site work, social pipeline, email campaigns explicitly deferred. |
| Review panel | **Kimi K3 + HY3 only.** The Opus 5 seat was cut as redundant — the builder was already Opus 5. |
| Location | Outside the repo, because the local checkout is ~1,900 commits stale. |
| Guard | The 20-hour re-run guard is **intentional**. Use the interactive path or wait; do not remove it. |

## 3. File map — everything a builder needs

```
swan-ops/
  Swan-Ops.cmd            13 lines   double-click entry
  Swan-Ops.ps1           286 lines   orchestration ONLY (repo cap is 300)
  README.md              ~175 lines  usage + enforced-constraints table + known gaps
  lib/Console.ps1        126 lines   palette, prompts, input hardening, link checker
  lib/BrowserPolicy.ps1  128 lines   ★ ALL browser decisions + the measurements behind them
  jobs/market-recon.md   195 lines   the job-1 prompt (passes A–E)
  sandbox/                           the agent's ENTIRE writable universe
  reports/  logs/  .work/
```

**Read `lib/BrowserPolicy.ps1` before touching anything browser-related.** Its header
comment is the load-bearing document for §6 — every claim there was measured, and it
records what was measured *false* as well as true.

### Architecture / control flow

```
Swan-Ops.cmd
  └─ Swan-Ops.ps1
       ├─ Test-Preflight            codex on PATH? version drift vs 0.146.1?
       ├─ Show-Menu / -Market arg   interactive or non-interactive
       ├─ Test-UnattendedGuards     -Yes only: 20h interval + 2/day cap
       └─ Invoke-ReconJob
            ├─ Protect-UserInput          strips ANSI + {{ }} so input can't reach tokens
            ├─ token substitution         SINGLE regex pass, not sequential .Replace()
            ├─ Get-CodexArgs              ← lib/BrowserPolicy.ps1
            ├─ Write-BrowserDisclosure    ← lib/BrowserPolicy.ps1 (honest copy)
            ├─ & codex @codexArgs *> log  SPLAT. see §7 trap 1
            ├─ Move-Item sandbox/reports/X → reports/X
            └─ Test-ReportLinks           HEAD-checks URLs; flags VERIFIED-without-URL
```

The agent's writable root is `sandbox/`, NOT the tool root. `jobs/` and `Swan-Ops.ps1`
resolve as `..\` from the agent — it cannot edit its own instructions. **Verified under a
real run:** all launcher/job mtimes predate the run that just executed.

## 4. Current state — what works right now

Run it:
```
cd C:\Users\BigotSmasher\Desktop\quick-pt\swan-ops
.\Swan-Ops.ps1 -Market "<market>"          # prompts y/N
.\Swan-Ops.ps1 -Market "<market>" -Yes     # refuses if a run finished <20h ago
```
Or double-click `Swan-Ops.cmd`.

**Two reports exist. They disagree, and the newer one is better sourced:**

| Report | Size | Pass C | Pricing conclusion |
|---|---|---|---|
| `2026-08-14-004800-…md` | 44 KB | **lost entirely** — read the ad libraries as plain text; they are JS apps | SwanStudios priced *below* the premium band ($250–375/session seen) |
| `2026-08-14-153233-…md` | 32 KB | **worked** — real browser, real ad data | Local golf-fitness mostly *below* $175; affluent comparators $190–250. SwanStudios sits **above** golf specialists, **inside** the premium band |

**Flag for Sean:** the newer conclusion contradicts the headline the v1 handoff quoted.
Treat the newer one as better evidenced, but it deserves a human eye before it drives
pricing.

Newest run: 1518s · 83 VERIFIED / 42 UNKNOWN / 40 INFERRED · 34 URLs (1 unreachable) ·
`NASM-certified` 0 · yoga/meditation 0 · no emails, phones, or named reviewers.

Its strategic finding, worth carrying forward: *no reviewed competitor leads with all
three of — expert eyes on every rep, golf-specific baseline/retest proof, and a visible
longitudinal training record.* They appear separately; never together.

## 5. What is OPEN — the actual work left

1. **Meta Ad Library returned HTTP 403 during the run** and is honestly marked
   `[UNKNOWN]`. The identical deep-link returned ~32,000 results *with* `Started running
   on` dates ~40 minutes earlier in a probe from this same machine — so `[LIKELY]`
   rate-limiting, and retryable. **This is the highest-value missing data**: an ad running
   for months or years is a proven ad. Retry Meta alone as a standalone probe; do not
   burn a full recon on it.
2. **33 VERIFIED tags carry no URL on their own line.** The report uses `[VERIFIED; C2]`
   citation refs that resolve in Sources — defensible, but it defeats `Test-ReportLinks`.
   Either teach the checker to resolve refs, or require the URL inline.
3. **Verbatim-quote enforcement.** The prompt demands a ≤25-word quote beside each
   VERIFIED URL; nothing checks the quote matches the page. The link checker only proves
   the URL resolves.
4. **Job 2.** Sean's original ask named site work, social, email. Social publishing
   already exists in the app (`nativeSocialPublishingService`, `SocialPublishingJob`,
   retry, compliance) — **Bluesky is the only natively-available channel**;
   YouTube/Facebook/Instagram need OAuth, TikTok needs Content Posting API approval,
   Nextdoor needs partner status. Email is blocked on DMARC.
5. **`sandbox/.playwright-mcp/` accumulates** a page `.yml` + console log per navigation
   (166 KB after one run). Unpruned.
6. **No hard timeout.** `Start-Job`+`Wait-Job` was built and measured: `Stop-Job` blocks
   until the child exits, so a 3s timeout on a 20s task took 26s. It bounds nothing.
   Truly bounding it means killing the codex process, and **this machine runs other Codex
   sessions** a broad kill would destroy. Removed rather than ship a false guarantee.

## 6. ★ The browser model — read this before changing any browser config

This is the part v1 got wrong. Four stacked findings, all measured 2026-08-14:

1. **MCP tools are DEFERRED** (`ToolSearchAlwaysDeferMcpTools`). Browser tools are absent
   from the agent's initial tool list until it runs **tool discovery**. Before this was
   understood the agent truthfully reported *"browser_navigate is not among my available
   tools"* and Pass C silently produced nothing. The job prompt must tell it to discover
   first — `jobs/market-recon.md` Pass C Step 1 does.
2. **The bundled `browser`/`chrome` plugins hijack the job.** Their skill mandates the
   in-app browser via `node_repl` and explicitly forbids falling back to standalone
   Playwright. Headless `codex exec` has no in-app browser → `agent.browsers.getForUrl()`
   → *"No browser is available"* → Playwright never touched. They are now disabled
   per-invocation, along with `computer-use` (ungoverned desktop control a read-only
   recon has no use for).
3. **Per-tool `approval_mode` is NON-FUNCTIONAL** on codex 0.146.1 — measured in *both*
   `-c` override form and config-file form (via an isolated `CODEX_HOME`).
   `browser_navigate` stayed denied with `approval_mode="auto"` set either way. Only the
   server-level `default_tools_approval_mode` takes effect, and it is **all-or-nothing**.
4. **Therefore outward actions are possible, not impossible.** With browsing on,
   `browser_click` completes and moves the browser to a new site. And the first working
   run used **`browser_evaluate` 9 times** — arbitrary in-page JavaScript, which is
   *sharper* than clicking, because JS can click and submit without ever calling the
   click tool. It is core to Playwright MCP; `--caps` only ADDS capabilities, so it
   cannot be removed.

**v1's claim `browser_click is DENIED → probe returned BLOCKED` was an instrument
artifact.** The probe got BLOCKED because browser tools were unreachable entirely, not
because a deny worked. Same observable, different cause.

**What actually bounds a run**, in descending order of real strength:

| Control | Strength | Why |
|---|---|---|
| `--isolated` | **strongest** | in-memory profile, no cookies, no session → cannot post, comment, DM, or buy *as anyone* |
| `--allowed-origins` | accident guard | measured: non-listed origin → `net::ERR_BLOCKED_BY_CLIENT`. **Playwright's own docs: "does not serve as a security boundary and does not affect redirects."** Never call it enforcement. |
| `--block-service-workers` | minor | |
| job-prompt read-only rules | weakest | prompt-level |

Residual risk: **anonymous form submission on an allowed domain.** Observed in the one
real run: 14 navigates, 4 snapshots, 9 evaluates, **zero** click/type/fill/press/select/
upload.

If you widen `$script:AdLibraryOrigins`, you widen where a stray click or a stray
`evaluate` can land. Keep it minimal.

## 7. Process traps that cost real time — read or repeat them

**Trap 1 — arg passing.** Use the `@codexArgs` **splat**. `Start-Process -ArgumentList`
was measured turning 13 args into 17 with quotes stripped. TOML values need the
backslash form `'key=[\"a\",\"b\"]'` — and this is **only** true through a splat from
inside a `.ps1`. Testing it from bash, or from `powershell -Command`, adds a parsing
layer the launcher does not have and gives the *opposite* answer. I nearly filed a
correct fact as wrong, twice, this way.

**Trap 2 — native stderr kills the pipeline.** codex logs a `models_cache` ERROR to
stderr on most calls. Under `$ErrorActionPreference = 'Stop'`, PowerShell promotes that
to a *terminating* error and aborts before codex works. Signature: **exit 1 in 0 seconds
with a ~150-byte log.** Fixed by scoping `'Continue'` around the codex call. This bit
twice — once in a probe, and again in the first real run, because the probe fix was not
carried back to the launcher.

**Trap 3 — logs are UTF-16LE.** PowerShell `*>` writes UTF-16. ASCII `grep` returns
nothing and the silence looks identical to "no activity". Always
`iconv -f UTF-16LE -t UTF-8` first.

**Trap 4 — output capture.** `*>` captures stdout **and** stderr. The old
`2>&1 | Tee-Object` silently dropped stderr (100 lines in, 58 out) — that is why an
early failing run produced a 26-byte log.

**Trap 5 — the agent's self-report is not evidence.** A probe agent confidently returned
`VERDICT: DEEP-LINK BLOCKED` when its own evidence said *"No browser is available"* — a
different root cause with a different fix. Another said `CLICK=ALLOWED` when the
server-level log said `browser_click (failed)`. **Always grep the log for
`mcp: playwright/<tool> (completed|failed)`** — that is server truth.

**Trap 6 — validate the instrument before believing a negative.** This is the loudest
lesson of the whole project; it has now recurred across two sessions. Before reporting
that anything is absent, stopped, or broken: *name the signal that would change if it
were present, and confirm your tool can observe that signal.* Concrete failures:
`&&` short-circuit read as "not in git history"; Git Bash path conversion mangling
`cmd /c` (needs `MSYS_NO_PATHCONV=1`); a partial log read reported as "the run failed"
while it was still writing; `pgrep`/`tasklist` on a Windows process giving a false
"exited"; a monitor firing on *file existence* when the file was 0 bytes; asking an
agent for tools *"beginning with `browser_`"* when codex namespaces them as
`playwright/browser_navigate`, so the honest answer was NONE for entirely the wrong
reason.

**Trap 7 — the round that applies a fix is the next round's primary attack surface.**
Three of the worst defects across this project were *introduced by fixes*: a logging fix
that corrupted every argument, a timeout that timed nothing out, and a probe-only stderr
fix that left the identical bug in production.

**Trap 8 — self-review and paid review find different classes.** Four rounds of
self-review found mechanical defects (encoding, capture, arg fidelity). Kimi and HY3 went
straight to architecture — what the boundary actually governs. Neither would have come
from attacking my own work harder, because both followed from an assumption I could not
see.

## 8. Environment defects — expect these, they are not your bugs

- `models_cache.json` re-corrupts after nearly every call (`missing field
  base_instructions`); self-heals on load, immediately re-breaks. See trap 2.
- `.codex/skills/prompt-depth-router/` is missing its `scripts/` folder, so
  `route-prompt.mjs` errors every session.
- **Linear capture is currently impossible.** OAuth grant is dead
  (`invalid_grant: Grant not found`) and `LINEAR_API_KEY` is absent — re-verified this
  session. Say so; never fabricate an issue ID.
- The Playwright profile is **shared and unisolated by default**
  (`.mcp.json` runs `npx -y @playwright/mcp@latest` with no `--isolated`), so two agents
  collide on one profile: *"Browser is already in use … use --isolated"*. This blocked
  Claude's own browser for an entire session while another agent held it. **Proposed, not
  applied** (the other agent was live): give each agent its own `--user-data-dir`
  (removes the collision, keeps saved logins) — `--isolated` also works but discards
  them. Separately, `scripts/lane.mjs` models **files only** and has no concept of a
  shared non-file resource, so it structurally cannot see this class of collision.

## 9. Rules that bound this work

- **Proof-before-done (73/74):** no "done/fixed/working" without current-session
  reproducible evidence *in the same message*. End closeouts with a `PROOF:` line.
- **Dry-loop:** hostile rounds until **two consecutive** rounds find nothing, each from a
  NEW vantage. End with `DRY-LOOP: CLEAN×2 (rounds: N)`. Never fabricate the marker.
- **Hermes memo** at substantial task close → `.ai-workflow/hermes-inbox/pending/`, must
  contain the literal heading `## Mistakes I made`.
- **Dual-tier summary**, plain-English section FIRST (no file paths or jargon in it).
- **Linear:** name an `SWA-<n>` or state `LINEAR: N/A — <reason>`. Never invent an ID.
- **Privacy:** no PII, no secrets, no precise home-location data in any committed artifact
  or paid-model packet. Businesses and public brand accounts are fair game; private
  individuals are not.
- **Credentials phrasing:** "26+ years of experience", "NASM-protocol". **Never
  "NASM-certified."** Use "stretching"/"flexibility", never "yoga"/"meditation".
- **Paid model calls:** zero-call preflight first, then explicit approval for that exact
  preflight. Never auto-retry a paid call.
- **Git:** branch `wip/comms-notifications-2026-07-05` is ~1,900 commits behind
  `origin/main` and Sean said **leave it alone**. Never `git add -A` — stage explicit
  paths only. Uncommitted handoff artifacts live here that a blanket add would sweep.
- **Rule 67 lanes:** claim before editing (`node scripts/lane.mjs claim`), release after.
  Another agent works this tree concurrently.

## 10. Session artifacts

- This doc (supersedes `SWAN-OPS-HANDOFF-2026-08-14.md`)
- Review packet: `SWAN-OPS-CONSOLE-REVIEW-PACKET-2026-08-14.md`
- Kimi K3 review: `KIMI-K3-SWAN-OPS-REVIEW-2026-08-14.md` ($0.2056)
- HY3 review: `HY3-SWAN-OPS-REVIEW-2026-08-14.md` ($0.0050)
- Hermes memos: `.ai-workflow/hermes-inbox/pending/20260814T*` — the
  `…-swan-ops-passc-browser-surface.md` one carries the full mistake ledger
- Learning packet: `docs/ai-workflow/hermes-learning-packets/20260814-a-green-pipeline-is-not-an-intact-payload.md`

All untracked/uncommitted on the stale branch. Stage explicit paths only.

## 11. Recommended first move for the next agent

Retry Meta Ad Library **alone**, as a standalone read-only probe — not a full recon. It
is the one field that proves an ad pays for itself, the deep-link is known to work, and
a single cheap probe settles whether the 403 was rate-limiting. The pattern to copy is
in this session's scratchpad probe scripts, or just reuse `Get-CodexArgs` with a
three-line prompt. If it renders, feed the run-duration data into the existing report
rather than regenerating it.
