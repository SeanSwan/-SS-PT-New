---
decision: Hermes briefing repaired and learning corpus unified; Rule 12 Grok ban repealed; the spare PC becomes a news/intelligence RADAR feeding SwanGuard + Hermes. Next agent starts with grill-me on SwanGuard, then brings SwanGuard up to speed, then wires the radar in.
status: open
supersedes: none
---

# Session handoff — Hermes repair → radar station → SwanGuard

**Date:** 2026-08-20 · **Author:** vs-claude / Opus 5
**Branch:** `wip/comms-notifications-2026-07-05` (main tree) + two branches cut from `origin/main`
**Linear:** SWA-181, SWA-183, SWA-184, SWA-70, SWA-13

> **RE-VERIFY BEFORE ACTING.** Every fact here was measured, but this tree moves fast — upstream
> Hermes gains **~170–280 commits/day**, `origin/main` gained 5 commits mid-session, and another
> agent committed to this repo while I worked. Commands to re-check everything are in §7.

---

## 1. START HERE — what the next agent does, in order

**Sean's instruction, verbatim in intent:** *"I want to start off with a grill-me. And then after
that, get SwanGuard up to speed so we can connect it to all of this Hermes stuff."*

1. **Run `grill-me` on SwanGuard.** Do **not** skip to building. The last grill (§5) produced two
   reframes that changed the entire architecture, and both came from Sean volunteering information
   no question had asked for. Read `docs/ai-workflow/brainstorms/marketing-station-spare-pc-2026-08-20.md`
   **first** — it is complete, and re-asking what it already answers wastes the session.
2. **Get SwanGuard up to speed.** Its newsroom is built but **not merged and not deployed** (§4).
   That is the blocker between "the radar has a consumer" and "the radar has nowhere to send data."
3. **Wire the radar to it** — emit SwanGuard's own `StoryNode` type; both SwanGuard and the Hermes
   briefing consume it (§4).

---

## 2. What shipped this session (all local unless noted)

### 2a. Sean's morning briefing was dead for 25 days. It works now.

Job `be0178803f69`: **32 consecutive failures, 2026-07-25 → 2026-08-19.** Two independent bugs:

| bug | root cause | fix |
|---|---|---|
| `HTTP 400: hermes-fast:latest is not a valid model ID` | Job bound to `provider: custom` with a null `base_url`, so an **Ollama model name was routed to OpenRouter**, which correctly rejected it. One field. | `hermes cron edit be0178803f69 --provider local-ollama --model hermes-fast:latest` |
| Every run stamped *"The data-collection script failed"* | `morning-ops-facts.sh` ended with `[ "$AGE" -gt 30 ] && echo "WARNING..."`. With a **healthy** backup the test is false → `&&` returns 1 → that was the script's last command. **It signalled failure precisely when the backup was fine.** | Converted to an `if` block. All three branches exit 0. |

Then the fact payload was cut: it dumped **every** pending memo filename — 17,889 of 20,432 chars
(87.5%), growing with a backlog that never shrinks. Now a count + 8 oldest + 8 newest + an explicit
count of the omitted middle. **19,670 → 3,551 bytes.** A self-check block was added that reports the
last 7 fires and raises an **EMPTY RESPONSE** alarm on `completion == 0` — the silent-truncation
signature.

**Backups:** `/tmp/morning-ops-facts.sh.bak{,2,3}-20260819`. Also flipped
`updates.pre_update_backup` false → **true** (it had been off).

### 2b. The learning corpus had silently forked. PR #53 fixes it.

**124 distinct packets across 143 refs.** `main` had 48, the wip branch 69, and **exactly one real
packet existed on both.** Nine lessons lived on *neither* — stranded on five feature branches.

The harm was a **read-path failure**: `hermes-learning-surface.mjs --grep` searched only the checked-out
branch, so agents got confident "no durable lesson matches" for lessons that existed one branch over.
**It happened to me during this session.**

- **Read fix (the real one):** `loadCorpus()` is now branch-blind — worktree first, then every ref via
  one `git log --all` pass. Fails soft. **Session banner went 66 → 128 lessons** — and read **137** an hour later, because other agents kept writing. Treat the number as a moving target; the point is that it is no longer branch-bound.
- **PR #53** (`chore/unify-learning-corpus`): 124 packets onto main's lineage, purely additive
  (0 deletions), plus the lookup script — which **did not exist on `main` at all.**

**Also found:** `main` had only 1 of 4 corpus scripts, and that one stale. Agents on main had no
lookup tool whatsoever.

### 2c. Rule 12 (Grok ban) repealed — Sean's call, 2026-08-20

Branch `chore/rule12-grok-repeal`, commit `525041709`, cut from `origin/main`.

Sean: *"I'm only holding myself back by not utilizing the most utilized platforms in this research."*
A news radar that refuses to read X is crippled by its own rule.

**Read the new rule text — it carries three warnings the repeal does NOT lift:**
1. Hermes config `moa_policy.banned_providers: [grok, x-ai, xai]` still refuses routing
2. `x_search.model` is a Grok model **and** `x_search` is absent from `toolsets:`
3. No xAI credential exists (0 of 35 env names, no SuperGrok OAuth)

All three are deliberate and must be lifted **by hand** when X reading is wired up. Rule 8 (zero PII
to LLMs) is unchanged and governs xAI exactly as it governs every other third party.

**Why it was done on a branch from main:** the wip copies of `CLAUDE.md`/`AGENTS.md` are ~50 KB
stale and carry **99 rules against main's 109**. Amending there would have written into a
constitution missing ten rules.

**The constitution guard blocked the first attempt** — an in-place rewrite is indistinguishable from
a deletion. Correct declaration: `SWAN_RULE_RENAME="12=12"`. Guard then reported 100% content
continuity and mirror parity IN SYNC.

---

## 3. The Hermes update — approach decided, not executed

Full doc: `HERMES-UPDATE-APPROACH-VERDICT-2026-08-20.md`. **Verdict: re-fork + cherry-pick WITH
TRIAGE, protected by a `wsl --export` image. Pin and never chase.**

**The mechanism that decides the risk (GLM's, and I had missed it):** WSL2 makes a whole-distro
export cost minutes, and it is **the only rollback that survives one-way migrations** — home and
binary restore together, atomically. A tar of the home does not.

GLM's framing, which flips the default: *"the freeze is the irreversible choice."* With an image the
update is fully reversible; staying frozen is an unpatched, credential-holding, bridge-connected
runtime with no insurance.

**The conflict burden was overstated ~5×.** Measured by sequential dry-run: **5 of 8 carried commits
apply cleanly**, 3 conflict (all gateway/alias, in `cli.py` and `tui_gateway/methods_tools.py`).
⚠️ **That number is TEXTUAL, not semantic** — zero upstream churn on the 9 web files means the files
are Sean's, not that their imports/props/context are stable. GLM calls this the plan's most likely
failure.

**Phase 0 is a 30-minute kill test**, and I ran it: v0.20.1's `host` exposes 11 members; Bot Mode
calls 11, of which **5 are missing** (`requestProfile`, `openWorkspace`, `agents`,
`activeConnectionId`, `paneVisibility`) = 30 of 146 call sites, ~21%. **The update is required.**

**State:** install v0.20.1, **1,863 commits behind** (was 1,572 six hours earlier), 8 carried commits
all unique, config schema **30 → 34**, home 562 MB. **Never run bare `hermes update`** — it
auto-switches to main and auto-stashes, silently stripping the carried commits from the running
install.

---

## 4. SwanGuard — the compatibility finding, and the blocker

**Sean:** *"This should feed into my SwanGuard and my Hermes."*

**It is compatible by design, not by luck.** From the shipped-slice memo
(`20260728T002152Z-swanguard-slice1-newsroom-shipped-to-branch.md`, Fable-5):

| SwanGuard already has | Why it matters |
|---|---|
| A newsroom — Slice 1, 14 files under `apps/web/src/newsroom/` | The consumer surface exists |
| Canonical **`StoryNode`** type with provenance/claims/temporal fields | **This is the ingest contract.** The radar emits `StoryNode`, not a bespoke format |
| **`storyService`** boundary — *"UI never touches storage; future MCP layer = thin adapter"* | The integration path was designed in |
| **"Creator RSS"** listed as a remaining pillar, gated on backend/APIs | **The radar IS that pillar's missing backend** — not new scope |
| Doctrine: *"Evidence-not-oracle… No verdict — you conclude"* | Matches Sean's framing word for word |

**Architecture: one producer, one canonical type, two consumers.**

```
station (radar)              StoryNode           consumers
collect → dedupe → rank ──────────────►  SwanGuard newsroom (browse, evidence, save)
                        └─────────────►  Hermes briefing   (capped top-N, 06:47)
```

### 🔴 The blocker

SwanGuard's newsroom is on branch `refactor/shell-rebuild-20260721` (commits `17e4ac6` docs,
`12390d3` code) — **pushed, NOT merged to main, NOT deployed.** Its Render service was never
confirmed watching that branch. Its backend merge was under separate review.

**This does not block the radar**: emit `StoryNode` from day one, Hermes consumes immediately,
SwanGuard connects free when it ships. Building to the existing type is what makes that connection
free instead of a rewrite.

**Build trap, recorded:** a plain `vite build` with no env resolves to **BACKEND mode and renders the
OLD app**, not the newsroom. Demo mode needs `VITE_SWANGUARD_API_MODE=demo` +
`VITE_SWANGUARD_ALLOW_STAGING_DEMO=true`. Do not "verify the newsroom" against a build that never
contained it.

---

## 5. The station — 8 decisions, already captured

**Read `docs/ai-workflow/brainstorms/marketing-station-spare-pc-2026-08-20.md` in full.** Summary:

**Hardware:** Ryzen 3600, ~32 GB DDR4, SSD, **no meaningful GPU.**

**Three machines, three roles: Pi 4 watches · 3600 works · 5090 thinks.**
- The **Pi 4 becomes the watchdog** — stateless HTTP checks, ~3 W, **no SSD needed** so it does not
  repeat the block that retired it. It is the layer whose absence let the briefing die for 25 days.
- The **3600 gets hands, never a brain.** No inference on a GPU-less box.
- **Hermes stays on the 5090** — moving it strands it from its local Qwen.

**It is a RADAR first, marketing second.** Sean wants top news first across: health, personal
training, gaming, photography, US + world politics, local events, concerts, art and cultural events,
flower shows, gardens, nature parks, kids' events, and casino line-ups (Morongo, Palm Springs).
Ranked, **capped daily**, full set browsable.

**Other decisions:** authority = **T2 ceiling + one carve-out** (instant inbound-lead ack, fixed
template) · **draft-only first**, so Phase 1 carries **zero platform credentials** · dedicated
station identities with delegated brand roles when tokens are earned (Sean's premise that it needs
his personal logins is **false** — YouTube/Facebook/Instagram/TikTok all have first-class
delegation) · access via **Tailscale + RDP/VNC**.

**Six Phase-2 advisories await Sean's verdicts** — approval belongs in the briefing not RDP
(6 clicks → 2); use Hermes's **idle kanban board** rather than a second orchestrator; every collector
needs a named output artifact; kill switch + a **daily ceiling** on the ack template are unnamed;
the Pi must **push** a heartbeat outward or its own death is silent.

---

## 6. Open for Sean

| # | Item | Where |
|---|---|---|
| 1 | **Merge PR #53** (corpus unification) | GitHub |
| 2 | **Merge `chore/rule12-grok-repeal`** (`525041709`) | GitHub |
| 3 | **DMARC record** — ~10 min in Namecheap, gates all email/nurture work | SWA-13 |
| 4 | **Hermes update Phase 1** — needs his go; Phase 2 stops the gateway | SWA-181 |
| 5 | **Get SwanGuard deployed** — newsroom is built but unmerged/undeployed | SWA-70 |
| 6 | Six Phase-2 station advisories — accept/modify/reject each | brainstorm doc |
| 7 | Which X-reading route (Grok now permitted, non-Grok routes also fine) | — |

**Unpushed on the wip branch:** several commits from this session. Two branches are pushed and
awaiting merge: `chore/unify-learning-corpus` (PR #53) and `chore/rule12-grok-repeal`.

---

## 7. Re-verification commands

```bash
# Hermes state
wsl.exe -e bash -lc "hermes version"
wsl.exe -e bash -lc "cd ~/hermes2/hermes-agent && git cherry -v origin/main HEAD"
wsl.exe -e bash -lc "hermes cron runs be0178803f69"

# corpus (MSYS_NO_PATHCONV is REQUIRED — Git Bash mangles <rev>:<path> and reports false absences)
MSYS_NO_PATHCONV=1 git ls-tree -r --name-only origin/main docs/ai-workflow/hermes-learning-packets/ | wc -l
node scripts/hermes-learning-surface.mjs --grep "<topic>"

# constitution
MSYS_NO_PATHCONV=1 git show origin/main:CLAUDE.md | grep -c "^12\. "
```

---

## 8. ⚠️ Read this before trusting any measurement you take

**I produced nine instrument artifacts in this session.** Every one initially looked like a finding.
This is the single most transferable thing in this handoff.

| # | The false reading | The truth |
|---|---|---|
| 1 | `mtime` said 379 memos archived during the outage | `shutil.move` **preserves mtime**. `ctime` said 662 — which falsified my causal claim entirely |
| 2 | "Briefing at **134%** of its context ceiling" | `prompt_tokens` **aggregates across a fire's agent turns.** GLM caught it: the readings sat at 1×/2×/3× of a ~20,645 base. One request is ~31–38%. **I filed an Urgent Linear issue on this before checking.** |
| 3 | "`git diff origin/main..HEAD` shows 1,351 deletions!" | `origin/main` had advanced 5 commits under me. I had deleted nothing |
| 4 | `cmp` said the validator differed | Line-endings through a pipe. The committed blobs were identical (`d5aa27809`) |
| 5 | "`@hermes/plugin-sdk` does not exist" | It is a **path alias** in `tsconfig.json:20` + `vite.config.ts:147` |
| 6 | "v0.20.1 has no runtime plugin system" | `hello-runtime/plugin.runtime.js` exists and uses it |
| 7 | "7 of 11 host APIs missing (~51%)" | **5 of 11 (~21%).** My pattern `^  api[:(]` cannot match shorthand properties — `notify,` and `notifyError,` are members declared without a colon |
| 8 | A `grep -c` returning 0 **silently killed a GLM consult** | 0 matches exits 1, which short-circuited the `&&` chain. Happened twice |
| 9 | "The semantic caveat is missing from the doc" | Case-sensitive grep; it was there in caps |

**Errors 5, 6 and 7 all leaned the same direction** — each overstated the barrier to the conclusion I
had already reached. Three errors in one direction is not noise; it is motivated reasoning gathering
the evidence it wants.

**The two procedural fixes that actually work** (everything else I wrote on this was a restatement of
"be careful", which failed repeatedly within hours of writing it):

1. **When a number is surprising, run a control before believing it** — a term that must exist, a
   baseline that must match, a path known to be present. Control greps returning 4,302 and 1,841
   files are what proved a `0` was meaningful.
2. **To prove a capability absent, find the file that DEFINES the surface and enumerate it.** A grep
   hit-count proves nothing about an aliased import, a shorthand property, or a typed interface.

**Also: I declared a slow advisor absent and committed that verdict.** GLM produced no output for
~10 minutes; I wrote it up as a two-model panel; it then delivered the best answer of the three.
**Route hard architectural questions to GLM first and wait for it.**

---

## 9. Model calibration from this session

| model | cost | verdict |
|---|---|---|
| **GLM-5.3** | $0 (subscription), 5–10 min, often silent for most of it | **Strongest seat, four panels running.** Gave the `wsl --export` rollback, the reversibility inversion, the falsification test, the token-broker rule, the read-path framing that fixed the corpus, and the arithmetic that caught my 134% error. **Slow — wait for it.** |
| **Kimi K3** | ~$0.16 total across 4 calls | Best at naming failure *classes* — "manufacturing precision", "availability sampling", "anchoring on the last histogram". Twice handed over the exact test that disproved its own recommendation, which is high-value advisor behaviour. **Timed out at 7 min once** (exit 143). |
| **Qwen 3.8** | $0, local | One genuinely load-bearing question (*what cwd does the scheduler run in?*) that drove a measurement. Earns its free seat; never as lead. |

**Neither paid model had repo access.** Both were constrained by my brief — and one of my briefs
carried a 4× error (I told them upstream moves ~50 commits/day; it is ~170–280). A good advisor
notices when your premise contradicts itself, which is exactly what GLM did.
