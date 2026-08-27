# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/7276bca9-e25d-45a1-9a59-d00ece2a94ce/scratchpad/update-approach-brief.md
**Tokens:** 1191 in / 13488 out (reasoning: 11101) | total 14679
**Wall:** 230.9s

---

# 1. The pick

**Option 1, modified by Option 4's triage: pin a commit, re-fork in a fresh clone, carry the 4 zero-churn web-chat commits, and *disposition* the 4 gateway/alias commits (drop if upstream obsoleted them, re-derive later if not) — build and soak in parallel against a scrubbed copy of home, then cut over inside one window protected by a full WSL image export.**

The deciding facts:

- The conflict forecast is **bimodal**: 4 commits touch files upstream never modified (near-free to carry), 4 touch files with 54/24/11 upstream commits (expensive, and *semantically* risky even when textually clean). Pay for the free half; treat the expensive half as new feature work against modern code, not as merge debt that blocks the update.
- The two landmines that actually kill you — silent loss of carried commits (the built-in updater) and one-way migrations — are both neutralized by the same two moves: **never touch the live tree, and take an image-level backup**. That rules out #2 (rebase *in place* = Option 1's work performed in the one place you can't afford breakage) and #3 (merge maximizes simultaneous conflict surface and entangles history).
- The 562 MB home plus WSL2 means a **whole-distro export costs minutes**. That's the only rollback that survives one-way migrations, because the home rolls back *with* the binary.

**Ranking:** **1-mod → 4 → 2 → 5 → 3.** (#4 is my pick minus the triage step — it drops possibly-live hardening *unexamined*. #5 is defensible only with a deadline. #3 is last: all conflicts at once, on a live system, forever-entangled history.)

# 2. Attacking the premise: should you update at all?

Steelman for #5: You want Bot Mode because you watched a **demo**. Its substance — isolated profiles + scheduled jobs — is *already installed*. Updating buys 1,863 unaudited commits, 4 one-way migrations against your only copy of operational memory, a vendor-compliance chore, and a permanent fork tax, to obtain a UI over capabilities you own. No CVE forces this. By your own stated criterion — reversibility first — the null move wins.

The rebuttal has two blades:

1. **"Update later" is not reversible, it's compounding.** +50/day, migrations 30→34→3x, the 8 commits rotting further. The null move has a price that grows daily and arrives as a cliff.
2. **The reversibility comparison inverts once the image exists.** With `wsl --export`, the update becomes fully reversible (binary + home + migrations restore together). The freeze is the *irreversible* choice: an unpatched, credential-holding, bridge-connected runtime with unbounded exposure and no insurance. Reversibility-first, done properly, **mandates** the update — the image is the policy.

The attack still earns a concession: run the **30-minute falsification test** first (Phase 0, step 2). If the premise dies, everything downstream dies with it, cheaply.

# 3. The sequence

**Phase 0 — pin and falsify (1 hour, live system untouched)**

1. Resolve the anomaly: 1,572 → 1,863 in six hours is **+291, not ~50/day**. A lump landed — `git log --merges --since` on upstream. If it's one big branch merge, risk is concentrated and readable; if it's Bot Mode itself landing, pin at its merge commit. **Never pin while a large merge is mid-flight**; run upstream's test suite at the pin before investing further.
2. Falsification test: copy Bot Mode's 56 files into a *scratch* install (scratch home, **dummy credentials only** — never load unvetted code near live keys) on v0.20.1. If it loads and works, stop; the update may be unnecessary. Expected: fails on API/schema.
3. `PIN=$(git rev-parse <ref>)` — prefer a tag containing Bot Mode over a raw main SHA. From here, the moving target is frozen and irrelevant.
4. Check the 1,863 commits for security-tagged fixes touching credential/bridge code. If present, this jumps from "want" to "need" and the schedule tightens.

**Phase 1 — build and soak in parallel (3–7 days, old system keeps serving)**

5. Fresh clone to `~/runtime-new`; branch `carry/$DATE` at `$PIN`. **The built-in `update` command is disqualified for the rest of this procedure** (auto-switch to main + auto-stash = silent commit loss). Plain git only. The dirty `package-lock.json` is noise — don't carry it; let the new clone resolve its own.
6. Cherry-pick the 4 web-chat commits. Then **read the 2 upstream commits that touched the web root component** — the only file both sides touched.
7. Triage the 4 hardening commits, in churn order (root → tools → test → CLI entrypoint): for each, search upstream for an equivalent fix. Obsoleted → drop, logged in `PORTING.md`. Surviving → attempt the pick; mechanical conflicts get resolved and tested; **semantic conflicts or >1 hour of effort get deferred to post-cutover** as fresh small commits against `$PIN`. (You have coding agents — one commit per agent, tests required.) Iron rule: **nothing is dropped silently; every drop is a recorded decision with a behavior check.** That's the difference between Option 4 by choice and landmine 1 by accident.
8. Scratch-home soak: copy home, replace credentials with dummies, run the new tree against the copy on alternate ports/sockets. Let it migrate the copy 30→34. Verify: exactly 4 migrations apply; `PRAGMA integrity_check` clean; **row counts on memory/state tables before vs. after** (the dedupe-shaped migration is the one that can silently eat rows); gateway, bridge, cron engine, plugins, the chat feature, and Bot Mode each *exercised*, not merely started. Soak 3–7 days of real usage patterns.
9. Vendor scan: locate the banned vendor in the new model catalog; write the exact disable commands; hold for post-cutover.

**Phase 2 — cutover window (~1 hour)**

10. Gate checklist: soak log clean, all 8 commits dispositioned, T−1h **refresh the home copy and re-run the migration dry-run** (a long soak validates stale data; cutover must not be first contact with near-current data).
11. Quiesce: pause the scheduler, stop bridge, stop gateway; confirm no process holds the SQLite file (landmine 3 — the now-`true` backup setting does *not* protect against a torn live DB).
12. Last old-state backups: encrypted home archive (`tar | age`), `git bundle` of the local branch, and **`wsl --shutdown && wsl --export <Distro> pre-update.tar`** — test-extract one file from each. This is the rollback point.
13. Swap: rename old source dir to `runtime-v0.20.1-$DATE` (never delete), point the launcher at `~/runtime-new`, start against the real home, watch the 4 migrations apply.
14. Verify in order: 4/4 migrations → integrity_check → memory query returns known items → **presence check: `git log --oneline` contains every carried commit's subject** (this is the anti-landmine-1 check) → bridge round-trip → force-fire one cron job → use the chat feature → use Bot Mode end-to-end once → one real provider call → vendor scan clean.
15. **Rollback trigger, exact:** migration count ≠ 4 or a migration errors; integrity_check fails; memory unreadable; services not up within 30 minutes; or you call it. **Procedure:** stop services → `wsl --import` the pre-update image (or restore the home tar and repoint the launcher) → confirm v0.20.1 starts on schema-30 config → resume. Cost: everything written since cutover is lost — so **declare the window**: full rollback for 72h or until the first irreplaceable memory write, whichever comes first; after that, rollback means forward-fix on `$PIN`. Day 3: declare final, archive the image.

**Phase 3 — after:** re-enable cron fully, watch 24h, port the deferred hardening commits, **attempt to upstream the web-chat feature** (upstream never touched those 9 files — if accepted, the carry-tax ends permanently), and adopt a monthly pin-and-replay cadence so the gap never reaches four digits again.

# 4. Most likely failure

**The "zero-churn" commits break semantically.** Zero upstream commits on those 9 files means the *files* are yours — not that their imports, props, or the context provided by the root component are stable. A textually clean cherry-pick that typechecks can still ship a chat surface that renders dead. The conflict forecast actively lulls you here. **Detector:** typecheck as a hard gate, plus a soak that *uses the chat feature daily* (not "processes are up"), plus the cutover-time presence-and-behavior check. Early symptom: UI renders, events don't flow, during soak.

# 5. Strongest argument against my pick

**It converts a one-time problem into a permanent subscription.** Every future update re-pays pin + replay; carried commits accumulate; each cycle carries a small but nonzero probability of the silent-loss failure — so across months, the cumulative chance of a bad cutover approaches certainty, and the only true exit (upstreaming your patches) is outside your control. Merge (#3) or full surrender to upstream (carry nothing; re-derive everything as config/plugins) pays pain once and ends the tax. If you won't commit to the monthly cadence, my pick is a slow-motion version of the accident it's designed to prevent. *(Secondary flaw, mitigated at step 10 but not eliminated: the soak validates a copy, so cutover is always first contact with live data.)*

# Moving target

**Doesn't change the answer — the plan pins and never chases.** The gap at arrival is the pinned gap. Re-pin only for a critical security fix, and then re-run the fast checks (typecheck, migration dry-run on a fresh copy, smoke), never the full soak. The one adjustment the +291 lump forces: identify it *before* choosing the pin.

# Fallback (one line)

If you reject the pick: **Option 4 verbatim** — pin, clone, carry only the 4 zero-churn commits, move the 4 hardening commits into `PORTING.md` as re-derive-later, same image-backup and cutover discipline.
