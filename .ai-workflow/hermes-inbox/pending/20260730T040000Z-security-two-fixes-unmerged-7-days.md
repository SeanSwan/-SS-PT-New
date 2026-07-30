# SECURITY: two fixes have been sitting unmerged for 7 days — one exploit is LIVE

- **Surface:** gallery referral + admin gallery reset (backend routes)
- **Found:** 2026-07-30, during a rebase audit on `claude/build-swan-lens` (SWA-69)
- **Agent:** terminal Claude (Opus 5). **Provenance: sub-Fable — quarantine only, NOT the learning corpus (Rule 68).**
- **Status:** BOTH ARE ALREADY FIXED on `claude/build-swan-lens`. They are NOT on `origin/main`.
  Nothing further to build — this is a MERGE/PUSH problem, and the push is Sean's gate.

## What is live on production right now

**HIGH — money.** The gallery referral endpoint grants 5 enhancement credits (~$15 of paid
value) per submission. The per-phone duplicate check is defeated by varying a fake phone
number, and the rate limiter only paces requests rather than capping them. Net effect: a
visitor can mint unlimited free paid-enhancement credits. The fix (a normalized-phone column
with a partial unique index, plus a transactional lifetime credit cap and its truth test) is
absent from `origin/main` — verified by checking for the migration file, the cap constant, and
the test file, none of which exist there.

**MED — data loss + PII.** The admin gallery reset-test-data endpoint deletes every gallery
visitor, donation, referral and message row — real CRM records and personal data — and on
`origin/main` it has no environment guard and no typed confirmation token. The fix (blocked
unless non-production AND an explicit opt-in env var, plus a required confirm token, plus an
audit log that records actor id only and never the email) is likewise absent there.

## The transferable lesson

**A fix that is committed is not a fix that is shipped.** Both of these were authored,
reviewed and committed on 2026-07-22 and then simply never reached `main`. They were only
discovered because a rebase forced someone to enumerate what a long-lived branch was actually
carrying. Nothing in the workflow noticed a security fix going stale on a side branch for a
week.

Two habits follow:

1. **When a security fix lands on a branch, verify it reaches `main`** — treat "merged" as the
   completion state, not "committed". A branch is not a delivery mechanism.
2. **Before pushing any long-lived branch, enumerate what it carries beyond its stated
   purpose.** A branch named for a design feature was silently also the only home of a live
   money-path fix. Ask "what else is in here?" before "does it pass?".

## Owed to Sean
Push `claude/build-swan-lens` (or cherry-pick the two security commits ahead of it). Until
then the referral credit farm stays open. This is the single highest-value item in the
Swan Lens workstream, and it has nothing to do with Swan Lens.
