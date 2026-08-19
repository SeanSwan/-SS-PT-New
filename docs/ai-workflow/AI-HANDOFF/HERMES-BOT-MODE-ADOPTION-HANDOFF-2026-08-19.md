---
decision: Adopt Hermes Bot Mode via a restore-first, measure-before-split sequence; do NOT start with the 1,572-commit update
status: open
supersedes: none
---

# Hermes Bot Mode Adoption — Handoff

**Author:** vs-claude / Opus 5 (`vs-claude--SS-PT--49b64735`)
**Date:** 2026-08-19
**Scope:** Audit of Sean's live Hermes Agent install + adoption plan for Bot Mode
**Status:** Audit COMPLETE. **Phase A EXECUTED 2026-08-19 — see §0.** Phases B–F not started.
**Linear:** [SWA-181](https://linear.app/swanstudios/issue/SWA-181) (High) — related: SWA-160
(Hermes update), SWA-176 (durable learning corpus), SWA-36 (briefing metrics)
**Reviewed by:** GLM-5.3 and Kimi K3 (calibration record in §7)

> **ALL FACTS ARE AS-OF 2026-08-19 ~05:30Z. RE-VERIFY BEFORE ACTING.**
> This tree is live and moving — another agent added 3 commits and 4 memos during the audit
> session alone. Every finding below ships with its verification command. Run it first.

---

## 0. EXECUTED — Phase A, 2026-08-19 (read this before §1 and §4)

Phase A ran. **Three of its five items turned out to be wrong as written** and were corrected
rather than executed. Do not re-run them from §4 — read this section first.

| # | Item | Outcome |
|---|---|---|
| 1 | Commit 23 learning packets | ✅ **DONE** — commit `3732b8fbd`, 23 files / 3,145 insertions. 0 untracked, 67 tracked. Secret scan CLEAN. Not pushed. |
| 2 | Fix cron provider binding | ✅ **DONE + PROVEN** — see proof below. |
| 3 | Raise `context_file_max_chars` | ❌ **DO NOT** — prescription was wrong. See §3d (rewritten). Sean's call. |
| 4 | Drain the memos | ❌ **DO NOT drain manually** — would destroy them. See §3h (rewritten). Already self-healing. |
| 5 | Scrub the `x_search` Grok entry | ⚠️ **No change needed** — and the scrub would not have helped. See §3i (rewritten). |

**Proof for #2** (Rule 73 — current-session, reproducible):
- `hermes cron edit be0178803f69 --provider local-ollama --model hermes-fast:latest`
- `jobs.json` now: `provider = local-ollama` (was `custom`), `last_status = ok`, `last_error = None`,
  `last_delivery_error = None`
- `executions.db`: completed **2 → 3**; fresh row `5f2f9d82…` `status=completed`, `error=None`,
  14:37:09 → 14:37:56 local
- `usage_audit.jsonl`: `model=hermes-fast:latest`, **58,251 prompt / 1,379 completion tokens**
  (the two prior failed runs logged `null` tokens — they died before generating)
- **Ran LOCAL, not cloud:** newest `cloud-ledger.csv` row is 2026-08-06, well before this run
- Output artifact `2026-08-19_14-37-54.md`, 22,384 B / 381 lines, containing a real 4-section
  briefing — **not** the `[SILENT]` suppression response
- **Independent corroboration:** the `pre_llm_call` drain hook moved the 3 oldest memos into
  `consumed/2026-08/` at 14:37 (ctime-verified). That only happens on a *successful* LLM call.
- **Durable for scheduled runs:** `_compute_provider_model_snapshots` computes a snapshot only when
  provider is `None`; an explicit provider is used as-is. `load_jobs()` re-reads `jobs.json` every
  tick, so the running gateway daemon (PID 37135) holds no stale copy.

**Still unproven:** the 06:47 *scheduled* run has not yet fired. Confirm tomorrow with
`wsl.exe -e bash -lc "hermes cron runs be0178803f69"` — expect a 4th `completed` row.

---

## 1. START HERE — the next slice

> **✅ DONE 2026-08-19 — commit `3732b8fbd`. This section is kept for the record; the next
> slice is now Phase B (see §4), which needs Sean's go.**

**Do this first: commit the 23 untracked Hermes learning packets.**

```
git ls-files --others --exclude-standard docs/ai-workflow/hermes-learning-packets/
```

23 files dated 2026-08-15 → 2026-08-19 exist **only on this laptop's disk**. They are the
Rule-68 durable corpus — the record of how this project has been coding for the past month.
They are not in git, not on `main`, not on any other machine. Sean explicitly flagged these as
"super important" and asked that they not be lost.

This is the highest-value, lowest-risk action available. Do it before anything else touches
this tree. Stage explicit paths only (Rule 67 R6 — another agent may hold locks).

**Sean had not yet approved the commit when this was written.** Confirm before committing.

---

## 2. Context — what this is

Sean watched a video about Hermes Agent's new **Bot Mode** and asked three things: audit what
his Hermes has vs. the presenter's, say what adopting Bot Mode would gain him, and plan the
adoption. He also asked why he isn't "using Hermes to its fullest."

**The answer to that last question turned out to be concrete and fixable** — see §3a.

### Framing correction (do not re-derive this wrong)

There is **no separate "Hermes desktop" product to integrate.** `hermes desktop` is a launcher
inside the install Sean already has, opening an Electron UI against the *same* `~/hermes2/.hermes/`
home — same config, skills, memory, cron, gateway, Telegram. "Syncing them" is not a build.

Bot Mode is a **UI over profiles + cron** — no new engine capability. A Bot *is* a Hermes profile
(`profiles/<name>/`, fully isolated: own `.env`, config, SOUL.md, cron, skills, sessions, memories).
Bot Mode is built into the desktop app and **on by default** in current upstream.

The real transferable idea from the video is **context-splitting**, not the UI.

---

## 3. VERIFIED findings

### 3a. The Morning Ops Briefing had been dead for 25 days [P0] — ✅ FIXED + PROVEN, see §0

```
completed:  2   (last success 2026-08-05)
failed:    32   (2026-07-25 through 2026-08-19, including this morning)
error:     RuntimeError: HTTP 400: hermes-fast:latest is not a valid model ID
job_id:    be0178803f69
```

**Root cause (traced end-to-end):** the job requests model `hermes-fast:latest`, which **does
exist** on the local Ollama (verified live via `/api/tags`). But the job is bound to
`provider: custom` with `base_url: None`, so it routes to the *default* provider (OpenRouter),
which correctly rejects an Ollama model name.

**It is a one-field routing bug, not a missing model.** Bind the job to the `local-ollama`
provider (declared in `config.yaml` under `providers.local-ollama`, base_url
`http://172.26.128.1:11434/v1`) or set the job's `base_url`.

**Executable fix — `hermes cron edit` accepts `--provider` and `--model` [VERIFIED via `--help`]:**

```
wsl.exe -e bash -lc "hermes cron edit be0178803f69 --provider local-ollama --model hermes-fast:latest"
```

**The command shape is verified; the command has NOT been run.** Do not report the outage
resolved on the strength of a clean exit. Verify with a forced run and a fresh execution row:

```
wsl.exe -e bash -lc "hermes cron run be0178803f69 && hermes cron runs be0178803f69"
```

Expect `status=completed` and a Telegram delivery. If it still 400s, the provider name did not
resolve — inspect `providers.local-ollama` in `config.yaml` and confirm the job's `base_url`
is no longer null.

This is a large part of the answer to "why am I not using Hermes to its fullest": the single
automation has been failing silently every morning for three and a half weeks.

### 3b. 23 of 67 learning packets were untracked [P0] — ✅ RESOLVED `3732b8fbd`, see §0

### 3c. Sean has TWO agents, misconfigured in opposite directions

| | default profile | `hermes-private` |
|---|---|---|
| Skills | 128 enabled, 0 disabled | **0** (`.no-bundled-skills`) |
| Tools | 20 (47.7 KB schemas) | **0 tools, 2 B** |
| Model | deepseek-v4-flash (paid) | qwen2.5:7b (local) |
| System prompt | 30.8 KB (skills index 13.1 KB) | 32.4 KB |
| **Per-turn overhead** | **79,597 B = 77.7 KB, roughly 20k tokens** | 32.4 KB, of which **28.1 KB is context** |

It is **not** "one monolith." It is one over-equipped generalist and one agent that
**cannot act at all** (zero tools).

### 3d. `hermes-private` truncates the constitution — but only when cwd is this repo [CORRECTED]

```
Context file AGENTS.md TRUNCATED: 167053 chars exceeds limit of 31457
```

**CORRECTED 2026-08-19 — the original reading of this was wrong in two ways.**

**(1) It is conditional, not standing.** The truncation fires only when the agent's *cwd is this
repo*. Measured both ways:

| cwd | `hermes -p hermes-private prompt-size` |
|---|---|
| `~` (home) | **3,538 B total, 0 B context** — no truncation, no warning |
| the SS-PT repo | 32,393 B total, 28,823 B context, warning fires twice |

So §3c's "32.4 KB / 28.1 KB context" figure for `hermes-private` is a **measurement artifact of
running `prompt-size` from the repo**, not that agent's normal cost. From home it is 3.5 KB.

**(2) The 31,457 limit is not a fixed default — it is derived from the model's own window.**
`agent/prompt_builder.py:1412` — `_dynamic_context_file_max_chars` = `context_length × 4 × 0.06`,
i.e. Hermes deliberately spends 6% of the window on context files.
`131072 × 4 × 0.06 = 31457` **exactly**, so the model reports a 128k window and the cap is
working as designed.

**Therefore: do NOT "just raise the limit."** Raising it to fit the 214 KB constitution would spend
~53k tokens — **~40% of the window, every turn** — on a local 7B (`qwen2.5:7b`), which would degrade
and slow it badly.

**The sharp finding:** truncation inserts a marker telling the agent to recover the rest with
`read_file` (`prompt_builder.py:2110`). But `hermes-private` has **zero tools** (§3c) — it is told
to run a tool it cannot run. When it *is* invoked from the repo it gets a knowingly-incomplete
constitution with no recovery path.

**Options for Sean** (recommend **A**): **(A)** leave as-is — from home there is no truncation, and
this agent looks like a deliberately-minimal private assistant that has no business loading a
coding constitution; **(B)** point it at a purpose-built compact context file (allowed — that is a
new file, not a trim of the constitution, so §6 is not violated); **(C)** pin
`context_file_max_chars` in `profiles/hermes-private/config.yaml` (config **is** per-profile —
verified, its own 844 B file) to a deliberate mid value. **Not done — needs Sean's intent.**

### 3e. Hermes install: 1,572 commits behind, 8 carried commits

- Installed **v0.20.1 (2026.8.13)**; upstream **v0.20.4** (released 2026-08-18, commit `7e05e9080`)
- On branch `swan/alias-security-hardening-20260816`, **not main**
- Worktree dirty (`package-lock.json`)
- **`git cherry -v origin/main HEAD` → all 8 marked `+`** — none are patch-equivalent upstream.
  Nothing is droppable; all 8 must port.
- **Upstream commits touching `web/src/chat/` = 0.** The SWA-160 web-chat work is net-new and
  NOT superseded by Bot Mode (which lives in `apps/desktop/`, a different tree).
- **Conflict forecast is bounded** — upstream churn on the 13 changed files:
  `cli.py` 50 · `tests/test_tui_gateway_server.py` 24 · `tui_gateway/methods_tools.py` 11 ·
  `web/src/App.tsx` 2 · **the nine `web/src/chat/*` files: 0**

### 3f. Two live landmines in the update path [P1]

- `updates.pre_update_backup: false` — **pre-update backup is OFF.** A bare update backs up nothing.
- `hermes update` **auto-switches to main and auto-stashes** (`non_interactive_local_changes: stash`).
  On Sean's branch that silently leaves the *running install* without his alias-security fixes and
  SWA-160 work. The commits survive on the branch; the running system quietly loses them.

**NEVER run bare `hermes update`.**

### 3g. Orchestration he already owns, at zero utilization

`hermes kanban` is a durable SQLite board shared across profiles — `swarm` (parallel workers →
verifier → synthesizer), atomic claims, dependency graph, review gates, daemon dispatch.
**Current tasks: 0.** This is strictly more capable than the chat-relay agent-to-agent messaging
the video praises.

### 3h. Inbox backlog — ~304 pending memos, NOT a dead loop, and NOT to be drained by hand [CORRECTED]

**CORRECTED 2026-08-19 — do NOT drain these manually. It would destroy them.**

The drain is **automatic**: `.ai-workflow/hermes-inbox/inbox-drain-hook.py` is a Hermes
`pre_llm_call` hook. On every LLM call it injects the oldest pending memos (`PER_FILE_CAP` 8,000
chars each, `TOTAL_CAP` 30,000 chars per call) and `shutil.move`s **only the ones it injected** into
`consumed/<YYYY-MM>/`; the rest are left in `pending/` for the next call.

**So a manual "drain to consumed/" would move memos Hermes has never seen out of the injection
path.** The files would survive on disk (Rule 34 honored) but the learning loop for those 300+
memos would be silently and permanently broken. The backlog is not a broken drain — it is the
*absence of LLM calls*, which is the dead cron in §3a.

**Already self-healing as of 2026-08-19.** Fixing §3a restarted it: the 14:37 run injected and
archived the 3 oldest memos (ctime-verified in `consumed/2026-08/`).

**New capacity finding [P2]:** at ~3–4 memos per call and one automated call per day, ~304 pending
needs roughly **85 days** to clear on cron alone. Interactive sessions drain too, so the real figure
is lower — but the backlog will not clear on its own at the current cadence. That is a genuine
argument for the §4 Phase F ops-stats work (surface undrained count in the briefing), and for
raising `TOTAL_CAP` or adding a catch-up drain. **Do not "fix" it by bulk-moving files.**

### 3i. Dormant Rule-12 entry — verified inert; the real risk arrives with the update [CORRECTED]

**CORRECTED 2026-08-19 — verified inert by three independent controls, and the prescribed
"scrub" would NOT have improved it.**

`x_search.model: grok-4.20-reasoning` sits in config. Removing that value does **not** help:
`tools/x_search_tool.py:79` falls back to `DEFAULT_X_SEARCH_MODEL`, and
`hermes_cli/config_defaults.py:3070` sets that default to **`grok-4.5`** — still Grok. The whole
`x_search` tool is xAI's built-in Responses tool; there is no non-Grok way to run it.

The real controls, all verified:
1. `toolsets: [hermes-cli]` — the `x_search` toolset is **not enabled** (`config.yaml:26`)
2. **No xAI credentials** — 0 of 35 env-var names in `.hermes/.env` are xAI/Grok-shaped
3. **No SuperGrok OAuth** — `auth.json` carries only `openrouter` and `gemini`; no xai/grok key
4. Defense in depth: `moa_policy.banned_providers: [grok, x-ai]` — **leave these; they are the
   guard, not the violation.** Two of the three "Grok hits" in config are this defense.

The tool registers only when credentials exist **AND** the toolset is enabled. Both fail. **No
change made — none is warranted.** The live Rule-12 risk is the post-update one below, not this.

**Post-update watch item [VERIFIED]:** upstream commit `ceabb030f feat(image-gen): add Grok
Imagine Image 2.0 to the FAL image catalog` is inside the 1,572-commit range. Updating will
therefore ship additional Grok entries into the model catalog. Rule 12 is a hard permanent no —
after Phase C, re-scan the merged config and catalog for Grok/x-ai entries and disable them.

---

## 4. Recommended sequence

### Phase A — Restore what's broken (today, no git risk, reversible)

> **✅ PHASE A IS DONE — see §0. Items 3–5 were corrected, not executed. Do not re-run them.**

1. ~~Commit the 23 learning packets~~ — ✅ done, `3732b8fbd`
2. ~~Fix the cron provider binding~~ — ✅ done + proven; confirm the 06:47 scheduled run tomorrow
3. ~~Raise `context_file_max_chars`~~ — ❌ **wrong prescription**; see rewritten §3d. Sean's call
4. ~~Drain the memos~~ — ❌ **never manually**; see rewritten §3h. Restored automatically by #2
5. ~~Scrub the `x_search` Grok entry~~ — ⚠️ verified inert; the scrub falls back to `grok-4.5`. See §3i

**The real next slice is Phase B**, which needs Sean's go (it stops the gateway and touches git).

### Phase B — Freeze and characterize (before touching git)

Stop the gateway and disable cron **first** — `hermes backup` under load can capture torn SQLite.
Examine the dirty `package-lock.json` rather than blind-stashing. Tag + rescue branch +
`git format-patch` **off-repo**. Encrypt the backup — it contains live provider keys.
Capture **characterization baselines**: golden `prompt-size`, `skills list`, `cron list`, a gateway
round-trip, one manual briefing trigger. Without pre-captured baselines you cannot distinguish
regression from drift. Flip `updates.pre_update_backup` to true.

### Phase C — Staging, never production

Fresh clone pinned to the **v0.20.4 release commit `7e05e9080`** (tags are date-form like
`v2026.8.13`; v0.20.4 is not tagged locally — `git fetch --tags` first). Cherry-pick all 8
one at a time, testing after each. Clean dependency install. **Copy** the home to a scratch
`HERMES_HOME`. Get a **second Telegram token from BotFather** (about 2 minutes) and soak 3–7 days
in parallel while production runs untouched.

**Git strategy: re-fork + cherry-pick. NOT rebase, NOT merge.** A merge at this divergence
produces one unreviewable "evil merge" and leaves the install *permanently* divergent,
compounding at every future update.

### Phase D — Rollback = binary AND home, as one procedure

**[VERIFIED]** The 1,572 commits DO contain home-schema migrations. Evidence:
`hermes_cli/config_migrations.py` is modified in the range; `tests/state/test_dedupe_migration_contention.py`
is added; and commit `e99743500 fix(state): v25 prompt dedupe degrades gracefully on a contended DB`
implies a **versioned state-DB schema already at v25**. 43 migration-shaped and 42 schema-shaped
commits in the range.

Restoring the old binary against a migrated home therefore leaves you broken. Any memory written
post-migration is lost on rollback — state and accept that, or migrate right after a backup.

> Originally relayed from GLM as "likely." Verified during dry-loop round 3 rather than shipped
> as an unverified claim — 3 of GLM's 5 other checkable claims did not survive verification (§7).

### Phase E — Prune BEFORE you split

The split may be unnecessary. If pruning 128 skills down to roughly 40 gets the daily driver to an
acceptable floor, a multi-bot split only pays if lanes need *different* 40s. **Prototype ONE bot**
(briefing, pinned to the local 5090), measure `prompt-size`, and let the number decide the roster.

Use **"Create empty"** plus per-skill ticking — that is the real lever on the skills-index tax.
Budget per bot (target ≤ ~8–10k tokens overhead), not a bot count. Start at 2–3 bots.
Decide **Telegram ownership before splitting** or the daily bridge degrades. Cron migrates
natively as Routines namespaced `[bot:<name>]`. New profiles start with **empty memory** — seed
a distillate; the 65 learning packets are locked to the old profile.

### Phase F — Orchestration + observability

**First swarm task = the memo backlog triage** — self-referential, read-mostly, low-risk, and its
output improves every bot. Then put ops stats *in* the briefing: undrained memo count, failed cron
runs, gateway errors. Both the 293-memo backlog and the 32 silent failures were **monitoring**
failures. Set a **monthly update cadence** so this never compounds to 1,572 again.

---

## 5. Hostile review plan (Sean's standing instruction)

When the work is done, run a hostile review and **fix every error found, looping until a full
pass finds nothing new** (Rule 73 dry-loop, Rule 61).

- Free first: triangle fusion (Claude + Codex + Gemini) per the fusion-router default
- Paid panel: **GLM-5.3** (`scripts/consult-glm.mjs`, subscription-billed, no spend gate) and
  **Kimi K3** (`scripts/consult-kimi.mjs --confirm-spend`, roughly $0.04–0.92, $3 cap)
- Qwen 3.8 is a free hostile seat — fire `consult-qwen.mjs` in every panel, never as lead
- **Ask Sean before any paid call** (Rule 16); Kimi is ONE review per topic — a second needs a fresh yes
- Treat every external finding as a **hypothesis** and verify locally before acting (Rule 30).
  In this session, 3 of GLM's 5 checkable claims were disproven by direct measurement — see §7

---

## 6. DO NOT TOUCH — guardrails

- **`CLAUDE.md` / `AGENTS.md` — do not trim, do not edit on this branch.**
  This branch is **2,105 behind / 235 ahead** of origin/main. Here: AGENTS.md 169,159 B /
  CLAUDE.md 164,294 B. On origin/main: **214,444 B / 214,210 B**. The copies here are roughly
  45 KB *stale*. Also, the truncation in §3d is a Hermes limit — on main these are 214 KB, about
  7x the 31,457 limit. Trimming to fit would gut the constitution to fix a config value.
  **Fix Hermes, not the constitution.** If they ever must change, they move as a PAIR, and
  divergence is investigated — never regenerated (it can be bidirectional).
- **Never `git add -A`** — another agent may hold locks (Rule 67 R6). Stage explicit paths.
- **Do not clean the tree** until the 23 learning packets are committed.
- **Never run bare `hermes update`** (§3f).
- **Do not touch the Pi.** Hermes runs on the desktop; the Pi is retired and SSD-power BLOCKED.
- Do not push without Sean's say-so. Batch-push cadence applies (Rule 70).

---

## 7. Model calibration record

Both reviews were run against a sanitized brief. Claims were **verified, not relayed.**

| Claim | Source | Verdict |
|---|---|---|
| "Your 4 alias fixes plausibly exist upstream — drop them" | GLM | **Disproven** — `git cherry -v` shows all 8 as `+` |
| "Upstream's Bot Mode may supersede your web-chat slices" | GLM | **Disproven** — 0 upstream commits touch `web/src/chat/` |
| "Tool schemas may be engine-level, so per-bot floor is 60–67k not 20k" | GLM | **Disproven** — `hermes-private` shows 0 tools / 2 B; tools ARE profile-scoped |
| "Brief says 8 commits but enumerates 7 — find the eighth" | GLM | **Correct** — caught a real error; the 8th is `ca602561c` |
| "Re-fork from tag v0.20.4" | GLM | **Nearly right** — tag not present locally; pin commit `7e05e9080` |
| `git merge-tree --write-tree` for dry-run | Kimi | **Fails here** — needs git >= 2.38; install has 2.34.1 |
| "287 memos means nothing ever consumes them" | Kimi | **Wrong** — `consumed/` archives exist |

### Self-calibration — this handoff's own error rate (added 2026-08-19)

The highest-signal row in this table is **my own**. Of the five Phase A items I prescribed,
**three were wrong**, and they were only caught because Phase A was executed by investigating each
item before applying it rather than following the plan:

| Prescription | Verdict on execution |
|---|---|
| "Raise `context_file_max_chars`" | **Wrong** — the limit is a derived 6%-of-window budget; raising it would spend ~40% of a 7B's window every turn |
| "Drain the 293 memos to `consumed/`" | **Wrong, and harmful** — the drain is an automatic `pre_llm_call` hook; a manual move would pull 300+ memos out of the injection path unread |
| "Scrub the dormant `x_search` Grok entry" | **Wrong** — unsetting the value falls back to `grok-4.5`; the actual controls (no creds, toolset off) already hold |
| "Commit the 23 packets" | Correct |
| "Fix the cron provider binding" | Correct — and the root-cause diagnosis held up exactly |

**The lesson, which generalizes past this doc:** an audit that *reads* a system produces
plausible-but-wrong remediations at a meaningful rate. Every one of the three errors above came
from reading configuration and inferring intent, and every one died on contact with a measurement
(`prompt-size` from two cwds; the hook's own `shutil.move` loop; `config_defaults.py:3070`).
A prescription is a hypothesis until it is executed. **Treat §4 Phases B–F as carrying the same
error rate — roughly one in three — and measure before applying each step.**

**Neither model found the dead briefing, the two-profile reality, or the AGENTS.md truncation** —
none were in the brief. Direct measurement outperformed both reviews.

**Cost / value:** GLM $0 (subscription), 317s, 12.7k out / 8.8k reasoning — substantially deeper.
Kimi $0.043, 30s. Kimi's remit leaked (it opened believing it was doing a Crystalline Swan
frontend review) and self-corrected.

**Adopted from GLM:** re-fork over merge; staging with a second BotFather token; rollback as
binary + home; backup-under-load risks torn SQLite; characterization baselines; prune before
split; memo triage as the first swarm task; monthly update cadence.

**Adopted from Kimi:** merge-not-rebase reasoning (later superseded by GLM's re-fork); "a backup
you haven't booted is a hypothesis"; credential scoping matrix; derive the roster from the memo
corpus; start with 2 bots; anti-monolith and anti-fragmentation guardrails.

---

## 8. Open questions for Sean

> Q1 and Q2 are **answered and executed** — see §0. Q3 is **superseded** by the corrected §3d.
> **The live questions are Q4, Q5, Q6 and Q7.**

1. ~~Approve committing the 23 learning packets?~~ — ✅ done, `3732b8fbd` (not pushed)
2. ~~Fix the cron binding now, or batch it?~~ — ✅ done + proven
3. ~~Leave the constitution alone and raise the Hermes limit instead?~~ — **superseded.** The
   premise was wrong: the limit is a deliberate 6%-of-window budget, not a misconfiguration.
4. **`hermes-private` — pick A, B, or C** (§3d). Recommend **A: leave it.** From home it loads
   0 B of context; the truncation only appears when it is run from this repo, and a zero-tool
   private assistant arguably should not carry a coding constitution at all.
5. **Push the packet commit `3732b8fbd`?** The 23 packets are committed locally on
   `wip/comms-notifications-2026-07-05`, which is **2,125 behind origin/main**. They are safe from
   disk loss now, but they are **not on `main`**. Getting them there is additive-only (23 new files,
   no possible conflict) and wants either a push of this branch or a cherry-pick onto a
   branch cut from `origin/main`. **Needs your say-so** (§6, Rule 70).
6. **Memo drain capacity** (§3h) — ~85 days to clear on cron alone. Raise `TOTAL_CAP`, add a
   catch-up pass, or accept the slow drain?
7. Codex has been idle since 2026-08-14 awaiting Sean's **Kimi spend authorization** (about $0.99
   worst case, $1.25 cap) on the dashboard hostile-repair work — unrelated to this, but blocking him.

---

## 9. Evidence index — re-verify before trusting any of this

Hermes version and drift:
```
wsl.exe -e bash -lc "hermes version"
wsl.exe -e bash -lc "cd ~/hermes2/hermes-agent && git cherry -v origin/main HEAD"
```

Context tax (per profile):
```
wsl.exe -e bash -lc "hermes prompt-size"
wsl.exe -e bash -lc "hermes -p hermes-private prompt-size"
```

Cron health — write a small python file and run it via WSL (inline quoting is fragile):
```
# /c/tmp/cron-count.py
import sqlite3
c = sqlite3.connect("/home/bigotsmasher/hermes2/.hermes/cron/executions.db")
print(c.execute("SELECT status, COUNT(*) FROM executions GROUP BY status").fetchall())
```
```
wsl.exe -e bash -lc "python3 /mnt/c/tmp/cron-count.py"
```

Ollama actually has the model:
```
wsl.exe -e bash -lc "curl -s http://172.26.128.1:11434/api/tags"
```

Repo risk:
```
git ls-files --others --exclude-standard docs/ai-workflow/hermes-learning-packets/
git rev-list --count HEAD..origin/main
```
