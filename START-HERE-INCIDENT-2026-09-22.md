# Shared Git incident: current operating guidance

Updated 2026-09-24 after the data-safety sweep hostile review. This guide replaces
the operational advice in the untracked 2026-09-22 draft. That draft is preserved
unchanged in the data-safety packet's evidence/preserved-before-review-20260924.
The historical incident remains in docs/ai-workflow/INCIDENT-2026-09-22-object-store-refs-loss.md.

## Current facts and limits

- The reported loss concerned 23 commit objects. Seven surviving files were
  originally hash-checked; that does not prove every lost commit was reconstructed.
- The later rescue landed 1,844 files. At this pass's initial live check GitHub's
  creator-brains-engine-r2-20260915 was b7f043630 and local source was 05fc32b99.
  These are dated observations, never reset targets. Query current refs before work.
- Untracked files, modified files, and other agents' deletions still require their
  own preservation and ownership review. A commit or push does not include them.
- The private escaper finding is historical: 24c30254a fixed
  backend/services/emailTemplates.mjs. Verify the current caller before restating it.
- Pack modification time alone does not establish that a repack caused the loss:
  ordinary object reuse can freshen pack timestamps. The original race attribution
  remains a hypothesis, not a proved root cause.

## Preserve before operating

Do not run clean, stash, destructive reset/checkout, object pruning, repack or
garbage collection in the shared source checkout. Do not create or prune shared
worktrees while peers are active. Do not remove or rename another writer's locks.
An empty or old lock does not prove its owner is dead. Preserve lock evidence and
coordinate with its owner; a quiet polling window cannot exclude an idle writer.

Use native Windows Git for this Windows checkout. WSL/Linux cleanup against
Windows worktree registrations can misinterpret their paths. Cross-OS pruning is
not a recovery method. No automated maintenance or lock deletion is authorized
by this guide.

## Correct isolation boundary

GIT_INDEX_FILE isolates an index file only. It does **not** isolate the object
store, refs, reflogs, maintenance, or the checked-out branch.

A scratch-index commit that advances a checked-out branch leaves the other index
behind. A later ordinary commit can then delete new files or revert earlier work.
Never publish such a commit by advancing another active checkout's branch ref.

For parallel repair work, make an independent clone with native Git using
`git clone --no-local --no-checkout <source> <new-empty-destination>` and create a
dedicated branch there. Verify it has its own .git/objects, no alternates, and a
clean populated index. This copies committed history only; separately preserve
and explicitly transfer any authorized uncommitted files by hash.

Before committing, inspect `git diff --cached --name-status` and run
`node scripts/hooks/index-drift-guard.mjs`. The guard is read-only and blocks
suspicious disk=HEAD/index-divergent paths and check failures. This is a
conservative heuristic: it cannot establish user intent or guarantee race freedom.
Mode-only changes, actual file deletions and real staged edits are handled separately.

If suspicion is reported, stop that commit and review the exact paths with their
owner. Never bulk-restore or replace the shared index from a historical backup.
Any resynchronization must preserve intentional staged changes and verify that
HEAD, the selected index and the source files have not moved since review.

## Publication and recovery evidence

Pin and scan the exact candidate tree/history. Push explicit reviewed refs, never
force or main/master as a side effect of a backup task. Verify remote hashes after
publication. An independent clone on the same disk proves content readability,
not off-machine durability. A Z: file's location alone proves neither offsite nor
off-machine protection.

Repository bundles and database dumps need restore evidence. Database validation
must check pg_restore status before row counts/digests; successful counts do not
excuse failed constraints or indexes. Do not run a restore against production.

The dated review and full receipt belong to the existing data-safety sweep packet
and the required HostileReviews archive. Main reconciliation, production schema
verification and deployment remain separate reviewed operations.
