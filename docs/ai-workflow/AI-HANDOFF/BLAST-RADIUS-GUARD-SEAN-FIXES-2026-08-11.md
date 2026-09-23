# Blast-Radius Guard — status after the approval-gate refactor

**Updated 2026-08-11** after Sean's ruling: *"You should be able to fix it, but
there needs to be a gate where you ask permission, and there should always be a
summary in plain English so a person knows what the issue is — and whether to do
(a) what you recommend or (b) what the reviewer wants."*

**Nothing on this page requires you to hand-edit code.** The four defects listed
in the previous revision are fixed. What remains is one optional round-trip and
one pre-existing data issue.

---

## What changed

The guard's self-protection went from an **absolute refusal** to a
**permission gate**. Previously the agent could not repair the guard at all —
it blocked its own author mid-build, and every fix became your hand-work. Now:

```
agent files a plain-English change request
   -> attempts the edit -> DENIED, with the request shown + an approval id
      -> you run ONE command to approve that exact change
         -> agent retries -> allowed, approval burned
```

You read a summary in plain English and choose A or B. The agent does the typing.

**Your commands:**

```bash
node scripts/blast-radius-approve.mjs --review        # read pending requests
node scripts/blast-radius-approve.mjs <id> --reason "..."   # approve one change
node scripts/blast-radius-approve.mjs --list          # ledger: valid/consumed/expired
```

---

## Fixed in this pass (verified by tests)

| # | Was | Now |
|---|---|---|
| 1 | `sed -i` / `cp` silently overwrote guard files — a one-line neuter | in-place editors and copies are caught (`IN_PLACE_WRITER`) |
| 2 | every benign `node -e` printed a production warning | advisory filtered by `DB_SMELL`; destructive content still always blocked |
| 3 | `NotebookEdit` was matched but its payload never read | reads `new_source` as well as `content` |
| 4 | "single use" was a comment — nothing burned the approval | `consumeApproval()` writes `consumed: true` on the way through |
| 5 | harness deny-rules blocked all maintenance while being removable via ASK-gated settings | replaced by the hook's class-S gate; only `Bash(node scripts/blast-radius-approve*)` stays an absolute deny |

**Test coverage:** 20/20 original + 13/13 approval-gate = **33 passing**, including
approve→consume→re-block, content-drift rejection, expiry rejection, the `sed -i`
and `cp` regressions, and that `requests/` stays writable while `approved/` does not.

---

## Optional — prove the CLI once

The approval **logic** is proven by tests, but the tests mint approvals by
writing the file directly (the way the script does). The **command-line script
itself** has not been run by a human. When convenient:

```bash
# 1. ask me to change something in the guard -> I file a request, you get an id
node scripts/blast-radius-approve.mjs --review
node scripts/blast-radius-approve.mjs <id> --reason "agreed, option A"
# 2. I retry -> passes.  3. I retry again -> blocked (single use).
```

If the script misbehaves, that is a normal bug I can now fix through the gate.

---

## Still open — 8 poisoned foreign keys already in the repo

Calibration across 309 migrations found **8 live `REFERENCES users(...)`** —
genuine instances of the incident class already committed and applied:

- `20250528000003-emergency-uuid-fix.cjs:26,51,94` — creates tables with FKs to
  the dead table
- `20260301000002-fix-messaging-fk-users-table-name.cjs:69,76,83`
- `20260418000003-retarget-daily-workout-forms-user-fks.cjs:249`
- `20260730120000-repoint-user-fks-to-canonical-Users.cjs:225` — **legitimate**
  (a rollback path restoring prior state)

The guard does not rescan historical files, so these are untouched. Worth a
separate slice to determine whether any produced live drift — that requires
reading production, which is your call.

---

## One thing I will not propose changing

`Bash(node scripts/blast-radius-approve*)` in the deny list is the root of
trust. It is the single line that makes an approval mean something — without it
the agent could mint its own. If I ever ask you to relax it, say no.