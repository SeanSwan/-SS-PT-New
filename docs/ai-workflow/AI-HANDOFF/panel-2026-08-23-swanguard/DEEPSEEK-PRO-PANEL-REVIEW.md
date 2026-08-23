# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** C:/tmp/radar/PANEL-PACKET.md
**Seed:** (none)
**Tokens:** 9397 in / 9299 out · **Cost:** ~$0.0087 · **Wall:** 225.8s · **finish:** stop

---

## VERDICT
REVISE — The backup scripts contain critical bugs (broken snapshot ID extraction, unverified dumps surviving kills) and the main page design lacks sufficient detail to validate against house constraints, while the source expansion and utilization audit sections are merely prompts, not proposals.

## BLOCKERS
1. **P0** – `hermes-backup.sh` snapshot ID extraction always fails because `restic snapshots --last` requires a numeric argument; the command errors, `SNAP` becomes `"?"`, and the operator loses the ability to identify the correct snapshot for restore.  
   *Evidence:* The line `SNAP="$(restic snapshots --last --tag hermes-auto --json ...)"` in the script’s post-backup block.  
   *Scenario:* Backup succeeds, status reports `snapshot="?"`, prune still runs, but a restore attempt cannot target the right snapshot without manual inspection.

2. **P1** – `radar-db-backup` leaves an unverified dump file if the process is killed between `pg_dump` and `verify_dump`. The script’s own guarantee (“A file surviving … is one that something actually restored”) is violated, producing a plausible-looking backup that may be corrupt.  
   *Evidence:* The dump is written to `$OUT` before verification; no cleanup of unverified dumps from prior runs exists. The design comment explicitly states the invariant.  
   *Scenario:* Systemd kills the script after dump but before restore test; the `.dump` file remains, later pruned only by retention, and could be used for a restore that silently fails.

3. **P1** – The upward news rail in Track B acknowledges it is an “accessibility trap” but provides **no concrete solution** for screen-reader coherence or keyboard focus management. This violates WCAG and the house rule requiring accessibility.  
   *Evidence:* Track B, item 3: “A ticker that steals focus or traps a keyboard user is a defect, not a feature.” No implementation approach is given.  
   *Scenario:* A screen-reader user encounters a continuously moving live region that either floods the buffer or is completely invisible; keyboard users cannot pause or navigate the rail without losing their place.

4. **P2** – `radar-db-backup` retention uses `ls -1t` (modification time) to decide which dumps to keep. If an old dump’s timestamp is touched (e.g., by a filesystem operation), it can displace a newer dump, causing the wrong file to be deleted.  
   *Evidence:* The retention loop: `for f in $(ls -1t "$DEST"/swanguard-*.dump)`. The filename contains a sortable UTC stamp (`$STAMP`), but the script does not use it.  
   *Scenario:* An admin runs `touch` on an old dump; the next backup prunes the most recent verified dump instead of the old one.

## ATTACKS
- **Correctness**  
  - `hermes-backup.sh` uses `restic snapshots --last` without a number → command fails, snapshot ID lost.  
  - `radar-db-backup` does not delete unverified dumps from interrupted runs, breaking the “verified survival” invariant.  
  - `radar-db-backup` restore instruction printed at the end omits `DROP DATABASE IF EXISTS restored;` and assumes the dump file is accessible on the host without guidance.  
  - `hermes-backup.sh` has no lock file; concurrent runs could conflict on the restic repository (restic has its own locking, but two prune operations might race).  
  - Neither backup script verifies the backup after creation (DB script does restore test, but hermes does not even run `restic check`).  
  - Main page design: no data contract for `/api/feed`; risk of frontend/backend shape mismatch.

- **Security**  
  - `radar-db-backup` writes an unencrypted database dump to disk; if the backup directory is compromised, all data is exposed.  
  - `hermes-backup.sh` checks that the password file is readable but does not enforce restrictive permissions (e.g., `600`); a world-readable password file would leak the restic key.  
  - The news rail design does not address XSS risks from feed content (stories rendered without sanitization could inject scripts).  
  - Forms-in-sidebar pattern: no mention of authz checks; management forms might be exposed to unprivileged users if not gated.

- **Data-truth / schema drift**  
  - `hermes-backup.sh` REQUIRED paths are hardcoded; adding a new critical directory (e.g., a new vault) would silently omit it from backups, exactly the class of bug the script was hardened to prevent.  
  - The `ownership` and `region` fields in the seed are free-form strings; the document asks for a taxonomy upgrade but provides no schema, risking inconsistent filtering and future migrations.  
  - The `/api/feed` response shape is undefined; frontend components will be built against an assumed shape, leading to drift when the endpoint is implemented.

## HIGHEST RISK
The `hermes-backup.sh` snapshot ID extraction bug (P0) combined with the absence of any restore verification means the operator cannot confidently identify which snapshot to restore, and has no integrity guarantee. A disaster recovery would be a guessing game.  
**Cheapest de-risk:** Change `--last` to `--last 1` in the snapshot command, add `restic check --read-data` (or at least `restic check`) to the script on a weekly schedule, and introduce a lock file to prevent concurrent runs.

## CONFIDENCE
I could not verify from the document alone:  
- Whether the main page layout can meet 44px touch targets, WCAG 4.5:1 contrast, and ≤300-line file limits without concrete component specs.  
- Whether any proposed news sources in Track C actually publish public RSS feeds (none were provided).  
- Whether the backup restore instructions work in the real environment (docker permissions, file paths, restic repository mount).  
**Settling evidence:** A working prototype of the main page with an accessibility audit; a list of verified feed URLs with terms-of-service review; a test restore of both backup scripts in a staging environment identical to production.
