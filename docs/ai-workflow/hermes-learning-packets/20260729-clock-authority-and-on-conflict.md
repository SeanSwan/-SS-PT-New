---
originating_model: claude-fable-5
date: 2026-07-29
topic: Whose clock is authoritative — and why `on conflict do nothing` does not make an insert safe to re-run
provenance: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
title: two database facts that break production and pass every unit test
tier_basis: Fable-tier session output (verified — this packet authored directly by claude-fable-5)
decision: unknown
status: draft
migrated: 2026-08-16 — required keys back-filled mechanically (title<-H1; tier_basis<-provenance; decision=unknown (CORRECTED 2026-08-16: topic left in place — a subject is not a rule); status=draft (never reviewed against a contract)); originating_model untouched
---

# Learning Packet — two database facts that break production and pass every unit test

**The permanent lesson, two halves:**
1. **Pick one clock and make it the database's.** Any row whose timestamps are compared to each
   other — by a CHECK, a trigger, an ordering guarantee — must have *all* of those timestamps
   written by the same clock. Mixing an application clock with a database default is a latent
   failure that fires on clock skew you do not control.
2. **`ON CONFLICT … DO NOTHING` is not "safe to re-run."** Postgres validates CHECK constraints
   **before** conflict resolution. A row that violates a CHECK raises an error *even when the
   conflicting row already exists*. Idempotency-by-upsert protects against duplicate keys, and
   against nothing else.

## 1. The failure, concretely

```sql
create table owner_kill_switches (
  ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (updated_at >= created_at)
);
```

```ts
// seed-on-read: runs on EVERY owner console load
insert into owner_kill_switches (..., updated_at)
values ($1, ..., $6)               -- $6 = app clock (new Date().toISOString())
on conflict (switch_key) do nothing
```

`created_at` is stamped by the **database**; `updated_at` arrives from the **application**. If the
app host's clock trails the database host's by even a millisecond, `updated_at < created_at` and
the insert violates the CHECK. Result: a 500 on the whole owner console.

And because CHECKs run before conflict handling, `do nothing` never engaged — the endpoint failed
on **every** request, not just the first. The seeding function looked idempotent and was not.

**Fix:** let the database write both timestamps (`values (..., now())`). Then
`updated_at = created_at` by construction, and no external clock can invalidate the row.

## 2. Why tests never see it

The in-memory store has one clock, so the two values can never disagree. Every unit test passes.
The bug requires (a) a real database with its own clock and (b) any skew at all — which is normal
under containers, VMs, and virtualized hosts, especially after sleep/resume. This is the same
family as an SQL bind-placeholder typo or a UTF-8 BOM in a migration: **a defect that only a real
database run can produce.** Budget the container.

## 3. The generalizable rules

- **Clock authority is a schema decision.** Write it down: "all row timestamps come from the DB."
  Then app code never passes a timestamp for a column the schema also defaults or compares.
- **Any constraint that relates two columns is a cross-writer contract.** If two different systems
  write those columns, they must agree on the source of truth — otherwise the constraint is a
  distributed-systems assertion wearing a schema's clothes.
- **Audit every `on conflict do nothing` for a false sense of idempotency.** Ask: *what else can
  make this row invalid?* CHECKs, NOT NULLs, foreign keys, and domain/type violations all fire
  regardless of the conflict clause.
- **Seed-on-read amplifies everything.** A `ensureDefaults()` that runs on every request turns a
  first-boot-only bug into an every-request outage. Prefer seeding in a migration, or make the
  seed genuinely conditional (`where not exists`), so the hot path does not re-attempt writes.

## 4. Diagnostic note: redacted logs are a debugging tax

The failure surfaced as `{"route":"…","status":500}` with no cause — correct security posture,
useless for operations. The error was only recoverable by building a **store-level probe**: import
the real stores, call the same methods against the real database, print what throws. Keep that
technique handy; and where a system redacts by default, ensure there is *some* sanctioned channel
(error class + constraint name, never row values) or every incident costs an investigation.

## 5. Applying this
- Grep for inserts that pass a timestamp into a column the schema defaults — especially alongside
  a `check (… >= …)`.
- Grep for `on conflict` and verify no CHECK/NOT NULL can fire on the incoming row.
- For any "ensure defaults" helper, confirm it is safe on the hot path, or move it to a migration.
- Any auth/DB change: execute it against a real database before calling it merge-safe.
