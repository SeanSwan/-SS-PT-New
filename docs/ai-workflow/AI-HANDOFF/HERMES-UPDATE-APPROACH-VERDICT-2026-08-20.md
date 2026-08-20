---
decision: Re-fork + cherry-pick WITH TRIAGE, protected by a `wsl --export` whole-distro image. Pin and never chase — upstream moves ~200 commits/day, not 50.
status: open
supersedes: none
---

# Hermes update — approach verdict

> **REVISED after GLM-5.3's answer arrived late.** An earlier version of this file recorded GLM as
> "no output" and was committed that way in `9032c4659`. That was wrong: GLM produced the strongest
> answer of the three, corrected an error in my own brief, and contributed the rollback mechanism
> that makes this whole plan safe. The record is fixed below.

**Date:** 2026-08-20
**Panel:** GLM-5.3 ($0, **best answer — arrived late, see §5**) · Kimi K3 ($0.0227) · vs-claude/Opus 5 (measurement)
**Linear:** SWA-181
**Supersedes the Phase C/D guidance in** `HERMES-BOT-MODE-ADOPTION-HANDOFF-2026-08-19.md`

> **ALL FACTS RE-VERIFIED 2026-08-20. The gap moves ~170–280 commits/day (measured, §4) — re-measure before acting.**

---

## 1. Verdict — re-fork + cherry-pick **with triage**, protected by a WSL image

**GLM's formulation, adopted:** pin an upstream commit, re-fork in a fresh clone, carry the 4
zero-churn web-chat commits, and **disposition** the 4 gateway/alias commits — drop them if upstream
obsoleted the same class, otherwise re-derive them later as fresh work against modern code. Build
and soak in parallel against a *copy* of home. Cut over inside one window protected by a full
`wsl --export` image.

**The move I missed entirely, and the one that decides the risk:** WSL2 means a **whole-distro
export takes minutes**, and it is the only rollback that survives one-way migrations — because the
home rolls back *with* the binary, atomically. A tar of the home does not give you that.

GLM's reversibility inversion is worth quoting, because it flips the default: *"The freeze is the
irreversible choice."* With an image, the update is fully reversible. Staying frozen is an
unpatched, credential-holding, bridge-connected runtime with unbounded exposure and no insurance.
Reversibility-first, done properly, **mandates** the update.

**Ranking (GLM's, which I accept):** 1-with-triage → 4 → 2 → 5 → 3.

## 1b. The cherry-pick is much cheaper than the handoff claimed

The earlier handoff framed this as "days of conflict archaeology on a live daily-driver." **That was
wrong.** Measured, not estimated:

| | |
|---|---|
| carried commits | 8 |
| **apply cleanly in sequence** | **5** |
| conflict | **3** |

The 3 conflicts are all the gateway/alias hardening, landing in the two heavily-churned files
(`cli.py`, 54 upstream commits; `tui_gateway/methods_tools.py`, 11). **All four web-chat commits
(SWA-160) apply cleanly**, plus the `display.compact` CLI fix.

> ### ⚠️ GLM's caveat on this measurement — read before trusting the 5/3
>
> **My 5/3 result is TEXTUAL, not semantic.** Zero upstream churn on the nine web-chat files means
> those *files* are yours — **not** that their imports, props, or the context supplied by the root
> component are stable. A cherry-pick that applies cleanly and even typechecks can still ship a chat
> surface that renders but whose events do not flow.
>
> GLM names this the **most likely failure of the whole plan**, and notes the conflict forecast
> *actively lulls you* here: the reassuring number is measuring the wrong thing. Detector: typecheck
> as a hard gate, plus a soak that **uses the chat feature daily** rather than confirming processes
> are up. Early symptom is UI renders, events dead.

### Instrument note — the first measurement lied

Applying each commit *independently* against pristine upstream gave **2 clean / 6 conflict**. That
is not how a cherry-pick runs. Applied **sequentially**, it is **5 clean / 3 conflict** — the
web-chat slices build on each other, so the independent test manufactured four false conflicts.
Always dry-run in the order you intend to execute.

### Target files all survive upstream

| file | upstream | local | drift |
|---|---|---|---|
| `cli.py` | 970,353 B | 881,051 B | +10% |
| `tui_gateway/methods_tools.py` | 100,012 B | 80,384 B | +24% |
| `tests/test_tui_gateway_server.py` | 730,726 B | 676,546 B | +8% |
| `web/src/App.tsx` | 44,130 B | 43,895 B | +0.5% |

Incremental growth, not rewrites. The patches have real targets.

---

## 2. Why "don't update, build it locally" is dead

Kimi's pick was **Approach 5** — skip the update, build Bot Mode locally, on the reasoning that it
is "a presentation layer over primitives you already have." The reasoning is sound. The approach is
**disqualified by the cheap dependency audit Kimi itself proposed**:

> **CORRECTED THREE TIMES on 2026-08-20.** Every correction moved the same direction — *toward*
> the conclusion I had already reached. That is the finding, and it is recorded below the table.

**The falsification test, run properly.** v0.20.1's exported `host` (`apps/desktop/src/sdk/index.ts`
line 59, 325 lines total) has **11 members**: `logs`, `navigate`, `newChat`, `notify`,
`notifyError`, `onEvent`, `openSession`, `request`, `restartGateway`, `state`, `status`. It is
exported from exactly one place, so nothing else extends it.

Bot Mode's `plugin.js` calls 11 host members:

| host API | call sites | v0.20.1 |
|---|---|---|
| `request` | 33 | present |
| `notify` | 29 | present |
| `state` | 16 | present |
| `notifyError` | 15 | present |
| `requestProfile` | 14 | **missing** |
| `newChat` | 12 | present |
| `openSession` | 11 | present |
| `openWorkspace` | 5 | **missing** |
| `agents` | 5 | **missing** |
| `activeConnectionId` | 3 | **missing** |
| `paneVisibility` | 3 | **missing** |

**5 of 11 missing, covering 30 of ~146 call sites — about 21%.**

### The three wrong versions, and what they have in common

| # | I claimed | Truth | Cause |
|---|---|---|---|
| 1 | "`@hermes/plugin-sdk` does not exist" | It is a path alias in `tsconfig.json:20` and `vite.config.ts:147` | Grepped for a package, never checked for an alias |
| 2 | "v0.20.1 has no runtime plugin system" | `hello-runtime/plugin.runtime.js` exists and uses `ctx.register` / `host.state` | Judged from a directory listing |
| 3 | "7 of 11 missing, ~51% of call sites" | **5 of 11, ~21%** | My pattern `^  api[:(]` cannot match shorthand properties — `notify,` and `notifyError,` are members declared without a colon |

Each error **overstated the barrier** to building locally — i.e. each one made the update look more
necessary. Three errors, one direction, is not random; it is motivated reasoning finding the
evidence it wants. The correction that matters is procedural: **to prove a capability absent, find
the file that DEFINES the surface and enumerate it. A grep hit-count proves nothing about an aliased
import, a shorthand property, or a typed interface.**

### Does the verdict change? No — but its basis does.

Building locally means: add **5** host methods to a 325-line SDK, then port a **10,464-line** plugin.
The SDK work is small. The port is not, and `requestProfile` / `openWorkspace` / `agents` /
`paneVisibility` are not thin wrappers — they imply profile management, workspace routing, an agent
roster and pane state that the plugin drives. **The verdict rests on the port and those subsystems,
never on a missing SDK.** Anyone re-opening this decision should attack the port estimate, because
that is now the only load-bearing number.

---|---|---|
| `request` | 33 | present |
| `notify` | 29 | **missing** |
| `state` | 16 | present |
| `notifyError` | 15 | **missing** |
| `requestProfile` | 14 | **missing** |
| `newChat` | 12 | present |
| `openSession` | 11 | present |
| `openWorkspace` | 5 | **missing** |
| `agents` | 5 | **missing** |
| `activeConnectionId` | 3 | **missing** |
| `paneVisibility` | 3 | **missing** |

**7 of 11 missing, covering 74 of ~146 host call sites — roughly half the plugin's interaction with
the app.** So Bot Mode would *load* on v0.20.1 and then fail or no-op across half its surface.

**The falsification test does not save us: the update is genuinely required.** But the honest cost of
"build it locally" is lower than I first said — it is *add 7 host methods to a 325-line SDK*, not
*build an SDK from nothing*. The blocker is not the SDK; it is the **10,464-line plugin** plus the
subsystems those 7 methods imply (`agents`, `requestProfile`, `openWorkspace`, `paneVisibility` are
not thin wrappers). The port still dominates, so the verdict stands — but it stands on the port, not
on a missing SDK.

**Credit where due:** Kimi named the exact failure mode ("the plugin API on v0.20.1 can't express
part of Bot Mode") and the exact test that would kill it cheaply. The test worked. It killed Kimi's
own recommendation.

---

## 3. The sequence (GLM's, adopted)

**Phase 0 — pin and falsify (~1 hour, live system untouched)**

1. **Run the 30-minute falsification test first.** Copy Bot Mode's 56 files into a *scratch* install
   on v0.20.1 — **scratch home, dummy credentials only, never unvetted code near live keys.** If it
   loads and works, stop: the update is unnecessary. Expected outcome is failure on the missing SDK
   and the 6 missing host APIs (§2) — but it costs 30 minutes to kill the whole plan cheaply, and
   that is the right order of operations.
2. **Pin.** `PIN=$(git rev-parse <ref>)` — prefer a tag containing Bot Mode over a raw `main` SHA.
   Run upstream's own test suite at the pin before investing further. From here the moving target is
   frozen and irrelevant.
3. **Check the range for security-tagged fixes** touching credential or bridge code. If any exist,
   this moves from "want" to "need" and the schedule tightens.

**Phase 1 — build and soak in parallel (3–7 days; the old system keeps serving)**

4. Fresh clone to a new directory; branch `carry/$DATE` at `$PIN`. **The built-in `update` command
   is disqualified for this entire procedure** — it auto-switches to `main` and auto-stashes, which
   silently strips the carried commits from the *running* install. Plain git only. Leave the dirty
   `package-lock.json` behind; let the new clone resolve its own.
5. Cherry-pick the 4 web-chat commits, then **read the 2 upstream commits that touched
   `web/src/App.tsx`** — the only file both sides touched.
6. **Triage the 4 hardening commits** in churn order. For each, search upstream for an equivalent
   fix. Obsoleted → drop. Surviving → attempt the pick; mechanical conflicts get resolved and
   tested; semantic conflicts, or anything over an hour, get **deferred to post-cutover** as fresh
   small commits against `$PIN`. **Iron rule: nothing is dropped silently. Every drop is a recorded
   decision with a behaviour check, in a `PORTING.md`.** That is the difference between triage by
   choice and the silent-loss landmine by accident.
7. **Soak against a copy of home** with dummy credentials, on alternate ports/sockets. Let it migrate
   the copy 30→34. Verify: **exactly 4** migrations apply; `PRAGMA integrity_check` clean; and
   **row counts on memory/state tables before vs after** — the dedupe-shaped migration is the one
   that can silently eat rows. Exercise gateway, bridge, cron, plugins, the chat feature and Bot Mode
   — *exercised*, not merely started.
8. **Vendor scan:** locate the banned vendor in the new model catalog, write the exact disable
   commands now, hold them for post-cutover. `moa_policy.banned_providers` (`grok`, `x-ai`, `xai`)
   is the guard — do not strip it.

**Phase 2 — cutover window (~1 hour)**

9. **Gate:** soak log clean, all 8 commits dispositioned, and at T−1h **refresh the home copy and
   re-run the migration dry-run.** A long soak validates stale data; cutover must not be first
   contact with near-current data.
10. **Quiesce:** pause scheduler, stop bridge, stop gateway, confirm no process holds the SQLite
    file. The now-`true` `pre_update_backup` setting does **not** protect against a torn live DB.
11. **Three backups, each test-restored:** encrypted home archive; `git bundle` of the local branch;
    and **`wsl --shutdown && wsl --export <Distro> pre-update.tar`**. The image is the real rollback
    point — it is the only one that restores binary *and* home *and* migrations atomically.
12. **Swap:** rename the old source dir (never delete), repoint the launcher, start against the real
    home, watch the 4 migrations apply.
13. **Verify in order:** 4/4 migrations → `integrity_check` → a memory query returns known items →
    **presence check: `git log --oneline` contains every carried commit's subject** (this is the
    anti-silent-loss check) → bridge round-trip → force-fire one cron job → use the chat feature →
    use Bot Mode end-to-end once → one real provider call → vendor scan clean.
14. **Rollback trigger, exact:** migration count ≠ 4, or a migration errors; `integrity_check`
    fails; memory unreadable; services not up within 30 minutes; or you call it.
    **Procedure:** stop services → `wsl --import` the pre-update image → confirm v0.20.1 starts on
    schema-30 config → resume.
15. **Declare the rollback window:** full rollback available for **72h or until the first
    irreplaceable memory write**, whichever comes first. After that, rollback means forward-fix on
    `$PIN`. On day 3, declare final and archive the image.

**Phase 3 — after:** re-enable cron, watch 24h, port the deferred hardening commits, and
**attempt to upstream the web-chat feature** — upstream never touched those 9 files, so if it is
accepted the carry tax ends permanently. Adopt a monthly pin-and-replay cadence so the gap never
reaches four digits again.

---

## 4. Strongest argument against this verdict

**My brief told the panel the gap grows "~50 commits/day". That was wrong by 4x.** Measured
directly on upstream:

| day | commits |
|---|---|
| 2026-08-14 | 278 |
| 2026-08-15 | 212 |
| 2026-08-16 | 185 |
| 2026-08-17 | 221 |
| 2026-08-18 | 171 |
| 2026-08-19 | 196 |

**~170–280 commits/day.** GLM flagged the discrepancy (+291 in six hours ≠ 50/day) and hypothesised
a single large branch merge landing. **Both of us were wrong** — it is not a lump, it is a steady
very high rate. 33 merges in two days is normal traffic for this project, not an anomaly.

This makes GLM's "**pin and never chase**" the load-bearing instruction. Chasing is not merely
inefficient here; at 200/day it is impossible. The gap at arrival is the *pinned* gap. It also makes
the decision genuinely time-sensitive: every week of delay is ~1,400 more commits.

Second: this buys a **UI layer**. If Bot Mode turns out not to change how Sean works, the entire
cost was spent on presentation. The mitigation is cheap — the soak in Phase 3 answers it before
cutover, so the decision point is *after* the evidence, not before.

---

## 5. Panel record

| advisor | cost | verdict | outcome |
|---|---|---|---|
| **GLM-5.3** | $0 (subscription) | Approach 1 **+ Option-4 triage**, protected by a WSL image | **Best answer of the three, and it arrived after I had already committed a verdict recording it as "no output."** Contributed the `wsl --export` rollback (the only one that survives one-way migrations), the reversibility inversion, the 30-minute falsification test, the triage-with-`PORTING.md` discipline, the row-count check on the dedupe migration, the declared rollback window, and the semantic-vs-textual attack on my own headline measurement. |
| **Kimi K3** | $0.0227 | Approach 5 — don't update, build locally | **Self-refuted.** Its own proposed dependency audit disqualified it (§2). Its fallback was Approach 1 — where this lands. Its framing ("Bot Mode is a presentation layer over primitives you already own") is what forced the falsification test into Phase 0. |
| **vs-claude** | subscription | Approach 1 | Supplied the measurements: the 5/3 sequential split, the missing SDK, the 6 missing host APIs, file survival, and the ~200/day rate. Also supplied two errors — see below. |

### My errors this round

1. **I briefed the panel that upstream moves "~50 commits/day". It is ~170–280.** Wrong by 4x, and
   it is the single number that most shapes the strategy. GLM caught the inconsistency from my own
   figures (+291 in six hours) without access to the repo.
2. **I recorded GLM as "no output" and committed that** (`9032c4659`) after it produced nothing for
   ~10 minutes. It was still running. A slow advisor is not an absent one, and I wrote the panel
   record as though a two-model panel were the whole story.
3. **My headline 5/3 measurement is textual only.** GLM identified that as the plan's most likely
   failure mode, and it is my number being over-read.

### What this says about routing

GLM has now been the strongest seat in four consecutive panels, at $0. It is slow — 5–10 minutes,
sometimes with no streaming output for most of that — and **that slowness has now twice caused me to
mis-handle it**: once by a broken shell chain that swallowed the run, once by writing it off as
empty. Route hard architectural questions to GLM first and **wait for it**, rather than synthesising
around it.
