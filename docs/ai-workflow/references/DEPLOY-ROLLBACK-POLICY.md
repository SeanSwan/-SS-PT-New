# Deploy & Rollback Policy
**Status:** active · **Owner:** Sean · **Created:** 2026-07-29 (SWA-75)
**Why:** Kimi K3 flagged this as missing — "what's the move when a migration breaks prod at 7pm? Render rollback plus a rule of no irreversible migrations without a tested down path is a policy, not code — write it down before you need it."

This is deliberately short. A rollback plan nobody can execute under pressure is not a plan.

---

## 1. The one number that matters

Before any push to `main`, record the current remote head:

```bash
git rev-parse origin/main     # ← this is LKG (last known good)
```

Everything below reduces to: *get back to LKG, fast.*

---

## 2. Migration rule (the part that actually bites)

**No irreversible migration ships without a tested down path.**

A migration is irreversible if it drops a column/table, narrows a type, or rewrites data without keeping the source. For those:

1. Split it. Ship the additive half first (add the new column, backfill, dual-write). Drop the old one in a *later* deploy, after the new path has run in production for at least a day.
2. Never combine "add" and "drop" in one deploy. That is the shape that makes 7pm unrecoverable — the code rollback succeeds and the data is already gone.
3. Test the `down` locally against a restored dump (see `backend/scripts/backup-restore-drill.mjs`) before shipping the `up`.

If a migration cannot be made reversible, it is an owner-executed operation with a fresh backup taken immediately before — not part of a normal deploy.

---

## 3. Rollback levels — cheapest first

**Level 1 — one slice misbehaves.**
```bash
git revert --no-edit <sha>
git push origin main
```
Every slice is committed separately precisely so this works. Prefer this always.

**Level 2 — a subsystem misbehaves and you can't isolate the commit.**
```bash
git revert --no-edit <sha-a> <sha-b>
git push origin main
```

**Level 3 — the backend will not boot.**
```bash
git reset --hard <LKG>
git push --force-with-lease origin main
```
`--force-with-lease`, never `--force`. Then tell the other agents — a force-push to `main` affects every worktree in the repo.

**Level 4 — Render dashboard rollback.** Use when git is healthy but the deployed artifact is not (bad build, bad env var). Render keeps prior deploys; redeploy the last green one. This is faster than any git operation and does not touch history.

**Data problems are not rollback problems.** Reverting code does not un-delete rows. That is what the restore drill is for.

---

## 4. After any rollback, in order

1. `curl -s https://ss-pt-new.onrender.com/health` → expect `{"status":"healthy"}`
2. `curl -o /dev/null -w "%{http_code}" https://sswanstudios.com` → expect `200`
3. One authenticated smoke: log in as a client → dashboard renders → send one message.
4. Check the error snapshot (`services/monitoring/errorReporter.mjs` → `getErrorSnapshot()`) — `serverErrorsInWindow` should be falling, not rising.
5. Write down what broke, in the Linear issue, before fixing forward.

---

## 5. What NOT to do at 7pm

- Do not fix forward on a hunch. Roll back first, diagnose second — the client is waiting either way, and a failed fix costs another deploy cycle.
- Do not `--force` (without lease). You will silently discard another agent's push.
- Do not run a migration to "undo" a migration. Restore from a dump instead.
- Do not skip step 5. The second occurrence of an undiagnosed incident is the expensive one.

---

## 6. Known pre-existing conditions (so they aren't mistaken for the incident)

- `tests/unit` + `tests/api` carry a **pre-existing failing baseline** — verify any suspected regression against a pristine `origin/main` worktree before believing it. The count has grown across days from parallel agents' in-flight work.
- Repo-wide `tsc --noEmit` OOMs at 8GB. Not a signal.
- Frontend chunk hashes differ between local and Render builds (different env), so hash comparison does **not** prove which commit is deployed. Use a behavioural check instead.

---

## 7. Still owed

An **external uptime probe** (e.g. UptimeRobot hitting `/health` every 5 minutes). Internal alerting cannot detect a dead process, a failed deploy, or a Render outage — the exact cases where rollback matters most. ~20 minutes of Sean's time; nothing in this repo can substitute for it.
