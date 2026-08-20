---
decision: Re-fork + sequential cherry-pick. The conflict burden was badly overstated — 5 of 8 commits apply automatically; only 3 need hand-resolution.
status: open
supersedes: none
---

# Hermes update — approach verdict

**Date:** 2026-08-20
**Panel:** Kimi K3 ($0.0227) · GLM-5.3 (**no output — see §5**) · vs-claude/Opus 5 (measurement)
**Linear:** SWA-181
**Supersedes the Phase C/D guidance in** `HERMES-BOT-MODE-ADOPTION-HANDOFF-2026-08-19.md`

> **ALL FACTS RE-VERIFIED 2026-08-20. The gap moves ~50 commits/day — re-measure before acting.**

---

## 1. Verdict — re-fork + sequential cherry-pick, and it is much cheaper than assumed

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

- `@hermes/plugin-sdk` — **does not exist** in v0.20.1
- The plugin imports it, plus React
- Of 10 host APIs it calls, **6 are missing locally**: `requestProfile`, `newChat`, `openSession`,
  `openWorkspace`, `activeConnectionId`, `paneVisibility` (present: `request`, `notify`, `state`,
  `agents`)
- `plugin.js` is **398,702 B / 10,464 lines** — not a weekend port

Building locally therefore means: build a plugin SDK that does not exist, add 6 host APIs to the
desktop shell, then re-derive 10,464 lines. That is re-implementing upstream's architecture to avoid
merging upstream's architecture.

**Credit where due:** Kimi named the exact failure mode ("the plugin API on v0.20.1 can't express
part of Bot Mode") and the exact test that would kill it cheaply. The test worked. It killed Kimi's
own recommendation.

---

## 3. The sequence

**Phase 0 — the only irreversible-protection step.** Stop gateway + chat bridge + scheduler. Take
the 562 MB home backup **cold** (a live SQLite copy can be torn). Encrypt it — the home holds live
provider credentials. **Boot the backup once before trusting it** (Kimi's earlier line: a backup you
have not booted is a hypothesis). `pre_update_backup` is now `true`; it was `false` until 2026-08-19.

**Phase 1 — fresh clone at a pinned upstream commit.** Never run bare `hermes update`: it
auto-switches to `main` and auto-stashes, silently leaving the *running* install without the 8
carried commits.

**Phase 2 — sequential cherry-pick.** Expect 5 to land untouched. Hand-resolve the 3 gateway/alias
commits against modern `cli.py` / `methods_tools.py`. **Decide first whether they are still needed**
— they are hardening written against 2026-08 code; upstream has 35 alias-related commits in range
and may have addressed the same class differently. Re-deriving against modern code may beat forcing
an old patch.

**Phase 3 — soak, not cutover.** Scratch `HERMES_HOME` (a *copy*), second bot token from BotFather
(~2 min), run in parallel 3–7 days while production stays untouched.

**Phase 4 — cutover + Rule-12 rescan.** Upstream adds a banned-vendor model to the catalog inside
this range. Re-scan the merged config and catalog after cutover; `moa_policy.banned_providers`
(`grok`, `x-ai`, `xai`) is the guard — do not strip it.

**Rollback = binary AND home, as one procedure.** Config schema is **30 → 34** (4 pending
migrations); 45 migration-shaped and 47 schema-shaped commits in range; `config_migrations.py`
changes. Restoring the old binary against a migrated home leaves you broken. Anything written
post-migration is lost on rollback — accept that, or migrate immediately after a verified backup.

---

## 4. Strongest argument against this verdict

**The gap grows ~50 commits/day.** It moved 1,572 → 1,863 in six hours of this session alone. A
part-time two-week execution arrives against a materially different tree, and the 5/3 split measured
today is a snapshot, not a constant. Re-run the sequential dry-run immediately before Phase 2, not
from this document.

Second: this buys a **UI layer**. If Bot Mode turns out not to change how Sean works, the entire
cost was spent on presentation. The mitigation is cheap — the soak in Phase 3 answers it before
cutover, so the decision point is *after* the evidence, not before.

---

## 5. Panel record

| advisor | cost | verdict | outcome |
|---|---|---|---|
| **Kimi K3** | $0.0227 | Approach 5 — don't update, build locally | **Self-refuted.** Its own proposed dependency audit disqualified it. Ranked Approach 1 as its fallback — which is where this lands. |
| **GLM-5.3** | $0 | **NO OUTPUT** | Ran twice. First attempt died on a broken shell chain (my `grep -c` returned 0 matches → exit 1 → `&&` short-circuit). Re-fired; produced an empty result after ~10 minutes. **Not consulted this round.** |
| **vs-claude** | subscription | Approach 1 | Supplied the measurements that decided it: the 5/3 sequential split, the missing SDK, the 6 missing host APIs, and the file-survival check. |

**Honest note on the panel:** the models did not decide this. Kimi supplied the framing and the
killer test; the *answer* came from running that test and from dry-running the cherry-pick. GLM
contributed nothing this round and the record should say so rather than imply a three-way consensus.
