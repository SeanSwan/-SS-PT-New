---
originating_model: claude-fable-5
captured: 2026-08-04
surface: backend security + schema truth
boards: SWA-137, SWA-125, SWA-115
status: shipped (1e89c33f2, deploy-verified)
---

# What a test suite cannot see: lessons from a security round that found 3 HIGH holes

Durable lessons from a Sean-ordered hostile security review. Every claim below was confirmed by
executing against the live system, not by reading code. Privacy: IDs and roles only.

## 1. Exposure is what a query CAN return, not what it DOES return

Two endpoints listing challenges and their participants had no authentication at all. They
returned member names, usernames, photos and per-member fitness progress — including minors —
to anonymous callers. Every prior audit, and every human glance, saw an empty list and moved on:
the content behind them was stale. The leak would have armed itself the moment fresh content was
seeded, which had just been recommended.

**Rule: judge an endpoint by the shape its query can produce, never by today's rows.**

## 2. A route guard says nothing about a row guard

An onboarding endpoint was correctly gated to admin+trainer, then resolved its target by an
email address taken from the request body and overwrote that account — including its role. Any
trainer could demote an admin, effective on the victim's next request because the auth layer
re-reads role from the database (no token rotation needed).

**Rule: when a write path resolves its target from user-supplied data rather than an
authenticated id, the route's guard is irrelevant to the row's safety. Audit them separately.**

## 3. Authorization is not a substitute for output encoding

Reasoning that "the new assignment gate limits who can send this email, so escaping is
unnecessary" was wrong on three counts: account compromise is already in the threat model,
insider misuse is the modal privacy incident, and the unescaped text is persisted where future
templates inherit it silently.

## 4. Differentiated refusals leak

Returning a specific 403 for staff accounts and success otherwise handed every trainer a
staff-account enumeration oracle. **Refusals for different reasons must be indistinguishable.**

## 5. The suite could not see any of this, and the numbers say why

~178 backend test files mock the database layer; ~37% assert on source *text*; exactly 3 can
execute SQL and all 3 are excluded from the default run and self-skip with exit 0 when no
database is present. A commit fixing 13 enum bugs touched zero test files.

- **Works without a database:** source-level truth locks, plus a committed snapshot of live enum
  labels that model declarations are diffed against.
- **Actually closes the class:** ephemeral Postgres in CI running a route x role authorization
  matrix, where a route with no declared guard fails the build.

## 6. Trust tests over your own reasoning about intent

A guard omitted the default signup role from a permission set. It read exactly like an
oversight. It was a deliberate paywall boundary, and a contract test's *title* said so. The
"fix" would have granted free accounts paid participation rights.

**Rule: before "fixing" a guard that looks wrong, search the tests for one that names the
intent — then leave a comment so the next sweep does not re-flag it.**

## 7. Verify what was committed, not what you meant to commit

On a case-insensitive filesystem, a model tracked in lowercase but opened in mixed case caused
`git add` to stage nothing. A migration converting a column type nearly shipped without the
model change that matched it.

## 8. Unquoted SQL identifiers fold to lowercase — including in your verification query

A post-deploy check reported a foreign key "absent" because it searched for the mixed-case name
while Postgres had folded it. The check was wrong, not the migration. The same folding rule that
generated the original bug class also fooled the tool auditing it.

## 9. Flakiness masked as green hides real defects — including your own

A new guard passed in isolation and failed under full-suite load. It was re-reading ~345
migration files per attribute (~34,500 reads), taking 103 seconds and surviving only on the
runner's automatic retry. Isolation would never have shown it.

**Rule: `retry` in a test runner converts a performance defect into a silent pass. Any test that
only passes on retry is a finding.**

## 10. Silent production failure with no alarm

A single wrong role literal meant *every trainer assignment in production threw* — and nothing
alerted. Availability incidents invisible to both the suite and the monitoring are their own
finding, separate from the bug that caused them.
