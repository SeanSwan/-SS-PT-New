# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/7276bca9-e25d-45a1-9a59-d00ece2a94ce/scratchpad/update-approach-brief.md
**Seed:** (none)
**Tokens:** 1260 in / 1261 out | **Cost:** ~$0.0227 | **Wall:** 8.1s | **finish_reason:** stop

---

# Advisor 2 of 3 — Verdict: **Don't update. Build Bot Mode locally. (Approach 5)**

## 1. The pick, and what actually decides it

The deciding fact is not the 1,863 commits — it's the last line of "What the update buys": *Bot Mode is a UI/orchestration layer over capabilities the runtime already has.* You are proposing to take 1,863 commits, 4 one-way config migrations, 45 migration-shaped commits, and a vendor-ban landmine — to acquire a **presentation layer** over two primitives (isolated profiles + scheduled jobs) that already work on v0.20.1.

Every other approach prices the update honestly and the price is bad:

- **Rebase (2) / Merge (3):** 4 of your 8 commits land in files with 54, 24, and 11 upstream touches. That's days of conflict archaeology on a live daily-driver, ending in a migrated home you cannot roll back from.
- **Re-fork + cherry-pick (1):** The "clean" option, but it's the same conflict work plus a parallel soak, and it still ends in a one-way migration of your only state store. It's the best *update* path and still loses to not updating.
- **Abandon 4 commits (4):** Halves the conflict surface but you lose the gateway/alias hardening you presumably wrote because you needed it, and you still eat the migrations.

**Ranked:** 5 ≫ 1 > 4 > 2 > 3.

## 2. The concrete sequence

**Phase 0 — Protect the running install (do regardless of path):**
1. Stop the gateway, chat bridge, and scheduler. Quiesce cron.
2. Snapshot the 562 MB home *while stopped* (avoids the torn-SQLite landmine #3): `tar` the home + the repo, encrypt with `gpg -c` or age (landmine #4), copy off-machine. Verify by decrypting a sample and opening the SQLite DB with `PRAGMA integrity_check`.
3. Restart the runtime on v0.20.1. You now have a real rollback point for the first time.

**Phase 1 — Study, don't take:**
4. `git fetch upstream`; read the Bot Mode plugin's 56 files from upstream without checking them out: `git show upstream/main:<path>` or a sparse worktree at a pinned commit. Extract its actual logic: how it composes profiles + scheduled jobs, its UI affordances, its orchestration loop.
5. Write a one-page spec of what Bot Mode *does*, stripped of upstream plumbing.

**Phase 2 — Build locally:**
6. Implement it as a local plugin/skill against v0.20.1's existing plugin API, on your current feature branch, as new commits 9+. The 8 carried commits stay untouched. No rebase, no migration, no cutover event.
7. Test in place — it *is* your environment, and the change is additive, so a bad plugin is `rm`-able, unlike a bad migration.

**Verify it worked:** the Bot-Mode-equivalent workflow runs end-to-end (create isolated profile → attach scheduled job → drive it from the chat surface) with the gateway under normal daily load for 3 days.

**Rollback trigger & procedure:** any gateway instability, state-DB write errors, or scheduler misses attributable to the new plugin → disable the plugin, restart gateway. Full stop. Because nothing migrated, rollback is complete and lossless — this is the entire point.

## 3. Most likely failure mode

**The plugin API on v0.20.1 can't express part of Bot Mode** — e.g., upstream added a hook or IPC channel in those 1,863 commits that the plugin quietly depends on. **Early detection:** before writing any code, do a dependency audit of the 56 files — grep every import/runtime call they make and check each exists in your tree. This takes an hour and kills the approach cheaply if it's going to die. If a small number of APIs are missing, port *those shims* individually — still vastly cheaper than 1,863 commits.

## 4. The strongest argument against my own pick

You're forking a feature against a dead-end version. Upstream moves ~50 commits/day; v0.20.1 gets *less* viable every day, and every local feature you build widens the eventual reconciliation. My approach converts one painful update into a permanent divergence strategy — and solo operators are bad at sustaining those. There's also a real chance Bot Mode's value *is* the polish and edge-case handling in those 56 files, which you'll re-derive badly. And if the runtime has security fixes in the gap (it certainly does), staying on v0.20.1 with live provider credentials in the home dir is a real exposure I'm waving away. If the owner expects to *ever* rejoin upstream, approach 1 now — while the gap is 1,863 and not 3,000 — is the honest move.

## 5. One-line fallback

If you reject this: **Approach 1** — re-fork at a pinned upstream commit, cherry-pick the 8 with tests after each, soak in parallel, cut over only after an encrypted cold backup, and never run the built-in `update` command.

**Does the moving target change my answer?** It *strengthens* it. Any update path is a two-week part-time project aiming at a target that will be ~700 commits further on arrival; the build-locally path doesn't care what upstream does. But note the corollary: if you will ever update, the gap argument cuts the other way — every week of delay makes approach 1 worse. Decide this week, not this month.
