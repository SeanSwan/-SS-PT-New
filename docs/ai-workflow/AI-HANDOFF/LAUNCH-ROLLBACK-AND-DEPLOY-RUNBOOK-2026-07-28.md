---
decision: Adopt a written rollback + deploy-verification runbook for the launch-audit batch, executable by someone who did not build it.
status: open
supersedes: none
---

# Launch Deploy + Rollback Runbook
**Date:** 2026-07-28 · **Branch:** `claude/launch-audit-20260727` · **Linear:** SWA-75
**Why:** Fable ruling item 8 — one push carries many slices, and real client sessions start the next morning. If it breaks at 9am the revert must be mechanical, not investigative.

---

## 1. What is in this batch

| Commit | Change | Runtime risk |
|---|---|---|
| `487998b32` | Deleted 6 unmounted route modules (1,321 lines) | **Boot** — a missed reference would be `ERR_MODULE_NOT_FOUND` |
| `de82c7ba1` | Deleted 44 unreferenced backend-root scripts (6,956 lines) | Low — none referenced by code or `package.json` |
| `6a3cf692b` | Onboarding entry card + draft autosave | Frontend only |
| `fe68da384` | **Block enforcement** on REST + socket send | **Behavioural** — adds a 403 path to messaging |
| `75d32c2db` | Lateral-access probe (tests) + trainer-permission semantic | **Behavioural** — permission default changed fail-closed → permissive-until-configured |
| `ed1d224a0` | **Message throttle** on REST + socket | **Behavioural** — adds a 429 path to messaging |
| `7b5af7091` | Hermes memo | None |
| this | Backup/restore drill + runbook | None (tooling) |

**The three that can change live behaviour are all messaging/permissions.** They are the first place to look if anything is wrong post-deploy.

---

## 2. Before pushing

```bash
# 1. last-known-good — RECORD THIS, it is the revert target
git rev-parse origin/main            # -> LKG_SHA

# 2. rebase onto current main (it moves — other agents ship constantly)
git fetch origin main
git rebase origin/main

# 3. re-verify the REBASED tree, not the pre-rebase one
cd backend  && node node_modules/vitest/vitest.mjs run tests/unit/ tests/api/
cd ../frontend && npm run build

# 4. Rule 42 — both commands, every time
git ls-files --others --exclude-standard backend/    # must be empty
git diff --name-only HEAD backend/                   # must be empty
```

Do not push if step 3 shows a NEW failure. The known-pre-existing baseline is listed in §5.

---

## 3. Deploy verification (run immediately after Render finishes)

```bash
# a. backend is alive
curl -s https://ss-pt-new.onrender.com/health
# expect {"status":"healthy",...}

# b. frontend serves
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://sswanstudios.com
# expect 200, sub-second

# c. the release actually shipped — find the new chunk hash locally, then
#    confirm the deployed graph references it
ls frontend/dist/v3/ | head
curl -s https://sswanstudios.com | grep -o 'v3/[A-Za-z0-9.\-]*\.js' | head
```

**Authenticated smoke (do this before letting a client in):**
1. Log in as a client.
2. Land on `/dashboard/client/overview` → the onboarding card renders if onboarding is incomplete.
3. Open `/dashboard/client/onboarding`, fill part of section 1, close the tab, reopen → answers restored.
4. Send one message. It arrives.
5. Block a test account, then try to message from it → refused.

If step 4 fails, suspect `ed1d224a0` (throttle). If step 5 misbehaves, suspect `fe68da384` (block guard).

---

## 4. Rollback — three levels, cheapest first

**Level 1 — a single slice misbehaves (preferred).**
```bash
git revert --no-edit <commit>     # e.g. ed1d224a0 for the throttle
git push origin main
```
Each slice was committed separately for exactly this reason. Reverting the throttle or the block guard does not touch the deletions or the onboarding work.

**Level 2 — messaging is broken and you cannot tell which slice.**
```bash
git revert --no-edit ed1d224a0 fe68da384
git push origin main
```
Restores messaging to pre-audit behaviour (no throttle, no block enforcement) while keeping the cleanup and onboarding.

**Level 3 — the backend will not boot (worst case, points at the deletions).**
```bash
git reset --hard <LKG_SHA>        # the sha recorded in §2 step 1
git push --force-with-lease origin main
```
Use `--force-with-lease`, never `--force`. Then tell Sean, because a force-push to main affects every agent's tree.

**No environment variable needs flipping for any level.** Nothing in this batch is behind a feature flag — deliberate: a flag nobody knows how to flip is not a rollback plan.

---

## 5. Known-pre-existing failures — NOT caused by this batch

Verified identical on a pristine `origin/main` worktree during the audit:
- `backend tests/unit`: `commandRegistryCoverage`, `evalHarness`, `logRedactionShared`, `loggerRedaction` — 4 files / 7 tests
- `frontend`: `DashboardBackgroundStudio.mount.contract.test.ts` — 1 test
- Repo-wide `tsc --noEmit` OOMs at 8GB on this repo.

Do not treat these as deploy blockers or spend time bisecting them.

---

## 6. Data safety

Take a dump **before** the deploy, and prove it restores:

```bash
node backend/scripts/backup-restore-drill.mjs dump
node backend/scripts/backup-restore-drill.mjs drill \
     --target "postgres://.../swan_restore_drill" --confirm
```

The script is read-only against production and refuses any restore target that is not clearly a scratch database, that equals the source, or that lacks `--confirm`. Connection strings are never printed.

No migration ships in this batch, so there is no schema rollback to perform.

---

## 7. Still owned by Sean, not by this runbook

1. **Rotate Stripe keys** — scripts that read and rewrote live key material existed in the repo; deleting them did not change exposure.
2. **Live money proof** — $1 charge → webhook received → refund → failed-card path, against rotated keys on the deployed build, before any client is charged.
3. **Observability** — there is still no error tracking or 5xx alerting. Until there is, "verified" means the manual checks in §3 and nothing more.
