---
decision: Arm SWAN_MIGRATE_STRICT on Render during a zero-pending window (verified no-op today), and treat the repo's backup script as unusable on Render — Render's own managed backups are the restore path
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-25
linear: SWA-200
follows: docs/ai-workflow/AI-HANDOFF/FORWARD-PLAN-MIGRATION-GATE-2026-08-25.md
---

# Runbook — arming the migration gate on the deploy path

**Nothing in this runbook has been executed.** No Render setting was changed, no flag
was flipped. Every step below is Sean's to run, in the Render dashboard.

---

## What we are doing, in one paragraph

Every deploy of `main` runs `npm run migrate:production` inside Render's build
command. If a migration fails, `safe-migrate.mjs` currently logs the error, **records
the failed migration as applied anyway, and exits 0** — so the build continues and
the new code deploys onto a half-migrated database. Setting one environment variable
(`SWAN_MIGRATE_STRICT=1`) makes it exit non-zero instead. The build then fails, and
**Render keeps serving the previous release.** That is the whole change.

---

## The fact that makes this safe to do first

Measured read-only against production, 2026-08-25:

```
main's executable migrations (top-level .cjs/.js) : 368
SequelizeMeta rows                                : 372
name-space overlap (positive control)             : 368/368
PENDING on a main deploy                          : 0
```

**Deploying `main` today would migrate nothing.** So turning the flag on today cannot
break a deploy — there is nothing for it to be strict about. You are arming the gate
during a quiet window, *before* the next migration arrives, which is the safest
possible moment to do it.

> This inverts the ordering in the previous plan doc, which said "backup first, then
> STRICT." That was written before the pending count was measured. With zero pending,
> STRICT is free today; the backup question becomes urgent at the *next migration
> merge*, not now.

**Three probes had to be corrected to get that number.** The first measured the stale
`wip` branch (307 files) instead of `main` (368). The second counted subdirectory
files (`social/`, `helpers/`) that `safe-migrate`'s non-recursive `readdirSync` never
reads. Only the third, with a positive control on name-space overlap, is trustworthy.
If you ever re-derive this number, keep the positive control.

---

## Step 1 — Rotate the exposed Render API key (do this first, unrelated to the flag)

Still owed from 2026-08-12. Render dashboard → **Account Settings → API Keys** →
revoke the old key, create a new one. Update wherever it is stored locally.

While you are on the billing page anyway: **look at the payment method.** If the
GitHub Actions block turns out to be a declined card, the same card very likely bills
Render — and Render is what actually serves your clients. Two minutes, potentially
saves the site.

## Step 2 — Find out what your restore path actually is

**Do not rely on the repo's backup script.** I checked it:

- `backend/scripts/backup-db.mjs` writes to `SWAN_DB_BACKUP_DIR`, defaulting to
  **`Z:/SwanStudios-backups/db`** — a Windows drive letter. Meaningless on Render's
  Linux container.
- It has **zero** cloud-upload code (no R2, no S3). Even pointed at a valid Linux
  path, Render's build filesystem is ephemeral — the dump would vanish when the
  container exits.
- `pre-migrate-guard.mjs` (which would call it) is **not wired into the deploy path
  at all** — zero references in `render.yaml`, `backend/package.json`, or
  `render-start.mjs`.

So the guard's backup leg is a **local workstation tool**, not a production control.
That is fine — it just means the real restore path is Render's own.

**In the Render dashboard:** open your `swanstudios-db` Postgres instance and find
the **Backups / Recovery** section. Answer three questions and write the answers down:

1. Are automatic daily backups on?
2. What is the retention window?
3. Is point-in-time recovery available on this plan? (The service is on `starter`.)

If daily backups exist with a usable retention window, **that is your restore path**
and no further backup work is needed before Step 3. If they do not, stop here and
tell me — the plan changes, and that becomes the real first purchase decision rather
than the shadow database.

## Step 3 — Arm the flag (only after Step 2 is answered)

Render dashboard → service **`swanstudios-main`** → **Environment** →
**Add Environment Variable**:

```
Key    SWAN_MIGRATE_STRICT
Value  1
```

Save. Render will offer to redeploy — **let it.** With zero pending migrations this
deploy is the cleanest possible test: it exercises the whole build path with the flag
on and nothing to migrate.

## Step 4 — Verify it took effect

In the deploy log for that build, look at the `Safe Migration Runner` section. You
want to see:

- `Pending: 0` and `No pending migrations. All up to date!`
- The build proceeding to the frontend step and the deploy going live.

That confirms the flag is set and harmless. It does **not** yet prove the flag makes
a failure fail — nothing failed. That proof comes in Step 6.

## Step 5 — How to undo, in ten seconds

Delete the `SWAN_MIGRATE_STRICT` variable and redeploy. Behaviour returns exactly to
today's. There is no migration to unwind, no data change, no code change. This is the
most reversible control in the whole plan — that reversibility is most of why it was
chosen.

## Step 6 — The real test, on your schedule

The flag only matters when a migration actually runs. That happens next when
**`wip/comms-notifications-2026-07-05` merges to main** — it carries **9 new
migrations**:

```
20260630040000-add-message-client-message-id.cjs
20260630050000-add-enterprise-notification-fields.cjs
20260630060000-create-notification-deliveries.cjs
20260630070000-create-communication-audit-logs.cjs
20260630080000-add-message-action-audit-fields.cjs
20260701083000-create-message-saves.cjs
20260723090000-create-trainer-applications.cjs
20260723100000-create-price-change-logs.cjs
20260728100000-create-locations.cjs
```

Most are `create-*` (new tables — low risk against existing data). Two are `add-*`
against existing tables, which is where a populated-table failure would surface.

**Before that merge**, do this once on a quiet evening: confirm from Step 2 that you
have a restore point, then merge. If a migration fails, the build fails, the current
site keeps serving, and you fix forward. That is the gate doing its job.

### The one caveat to know before that merge

`safe-migrate.mjs` has **no transaction handling**, and only **93 of 307** `.cjs`
migrations manage their own. So a multi-statement migration that fails halfway leaves
its earlier statements applied. STRICT correctly refuses to mark it done — meaning the
next deploy retries it from the top against a partially-changed schema.

Practical effect: a failed migration may need a manual cleanup before the retry
succeeds. That is why Step 2's restore point matters, and it is an argument for
merging those 9 when you have an hour, not at 11pm.

---

## What this does NOT cover

- **The boot-time repair sync.** `syncDatabaseSafely()` still creates missing tables,
  adds missing columns, and syncs indexes from model definitions on every boot,
  outside any gate. That is the second schema-mutation path and this flag does not
  touch it. Separate slice.
- **Rehearsal against populated data.** STRICT fails *at* deploy time. Failing
  *before* deploy needs the throwaway-database option (~$7/mo), deferred.
- **Anything on GitHub.** The Actions gate stays mothballed.

## Status of the standing owed items

| Item | State |
|---|---|
| Rotate Render API key | **owed** — Step 1 |
| Render DB backup/retention answers | **owed** — Step 2, blocks Step 3 |
| DMARC record (SWA-13) | owed, ~10 min, not blocking |
| Payment-idempotency indexes | ✅ closed — verified present and unique |
| GitHub Actions billing | dropped from the critical path |
