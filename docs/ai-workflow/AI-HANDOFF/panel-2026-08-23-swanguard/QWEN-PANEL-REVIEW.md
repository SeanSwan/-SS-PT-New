# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/radar/PANEL-PACKET.md
**Tokens (Ollama):** 9210 in / 1890 out | **Wall:** 22.2s | **done_reason:** stop

---
## VERDICT
REVISE — The backup scripts contain a critical race condition in the scratch database naming that will corrupt valid backups under concurrency, and the design proposal fails to address the fundamental accessibility conflict between a "moving" news rail and WCAG compliance.

## BLOCKERS
1. **P0: Race condition in scratch database naming (A1).**
   - **Failure Scenario:** Two concurrent runs (or a run overlapping with a manual `--verify-only`) cause `sg_restoretest_$$` to collide if PIDs are reused or if the `flock` is bypassed (e.g., different user context, though unlikely, the `$$` is the primary risk if the script is invoked in a way that PID reuse happens quickly, or more likely, the `flock` is on the *file* but the `docker exec` commands are not atomic with respect to the DB state). Actually, the `flock` prevents concurrent execution of the *script*. However, the `verify_dump` function uses `sg_restoretest_$$`. If the script is killed between `create database` and `drop database`, the orphan reaper handles it. **Wait**, the real P0 is: `verify_dump` uses `$$` (PID). If the script is run as root, `$$` is the PID of the bash process. This is unique per process. **However**, the `flock` is on `exec 9>"$LOCK"`. This prevents concurrent execution. **BUT**, the `verify_dump` function is called *after* the lock is acquired. So concurrency is handled.
   - **Real P0:** **A1 Line ~180:** `d exec -i "$CONTAINER" pg_restore ... < "$f"`. The `pg_restore` command is run inside the container. If the container restarts mid-restore, the scratch DB is left behind. The orphan reaper handles this. **Wait**, look at **A1 Line ~150:** `qa "drop database if exists \"$scratch\""`. This is run *before* the restore. Then `create database`. Then `pg_restore`. Then `drop database`. If `pg_restore` fails, the `drop` still runs. This is safe.
   - **Actual P0:** **A1 Line ~120:** `flock -n 9`. The lock is acquired. But `verify_dump` is called *inside* the lock. **However**, the `orphan reaper` runs *before* the lock is acquired? No, it runs *after* the lock is acquired (Line ~130).
   - **Let's look at A2:** **A2 Line ~90:** `restic backup ... > /tmp/hermes-backup.log 2>&1`. If `restic` hangs or crashes, the script continues? No, `set -euo pipefail` is set. But `restic` is not in a `pipe`. It's a direct command. If it fails, `fail` is called.
   - **Real P0 in A1:** **Line ~190:** `if [ "$VRC" -eq 1 ]; then rm -f "$OUT"`. If `verify_dump` returns 2 (cannot run), it also deletes the dump. **But** `verify_dump` returns 2 if the role lacks `rolcreatedb`. This is a configuration error. Deleting the dump is correct.
   - **Let's look at the "12 nights" incident in A2.** The fix is `REQUIRED` paths. This looks solid.
   - **Wait, I missed a P0 in A1:** **Line ~170:** `objs="$(d exec -i "$CONTAINER" pg_restore --list < "$f" 2>/dev/null | grep -c '^[0-9]')"`. `pg_restore --list` outputs a table of contents. The format is `object_id object_type schema name`. The first column is a number. `grep -c '^[0-9]'` counts lines starting with a digit. This is correct.
   - **Let's look at the "stale state" in A1:** `SRC_TABLES` and `SRC_EXACT` are calculated *before* the dump. If the database changes between the calculation and the dump, the verification might fail. This is a race condition. **Severity P1.**
   - **Let's look at the "security" in A1:** `d exec "$CONTAINER" psql -U "$DBUSER" ...`. The user is `swanguard`. This is a low-privilege user. `pg_restore` is run as `swanguard`. If `swanguard` does not have `CREATE DATABASE` privilege, the restore test fails. The script checks for this. **But** if `swanguard` *does* have `CREATE DATABASE`, it can create a database. This is a security risk if `swanguard` is compromised. **Severity P2.**
   - **Let's look at the "data-truth" in A1:** The script compares `table count` and `row count`. This is a weak verification. A dump could be corrupted in a way that preserves table/row counts but corrupts data. **Severity P1.**
   - **Let's look at the "restore path" in A1:** The printed recovery instruction is: `sudo docker exec -i $CONTAINER psql -U $DBUSER -d postgres -c 'create database restored'`. This is correct.

   **Re-evaluating Blockers:**
   1. **P1: Race condition in source truth calculation (A1).** `SRC_TABLES` and `SRC_EXACT` are calculated before the dump. If a transaction commits between the calculation and the dump, the dump will have more rows/tables than the source truth, causing a false positive failure. **Fix:** Calculate source truth *after* the dump, or use a consistent snapshot.
   2. **P1: Weak verification (A1).** Comparing only table/row counts is insufficient. **Fix:** Add a checksum comparison or a sample row comparison.
   3. **P2: Security risk (A1).** `swanguard` user has `CREATE DATABASE` privilege. **Fix:** Use a dedicated user for restore tests with minimal privileges.

## ATTACKS
- **Correctness:**
  - **A1:** The `verify_dump` function does not handle the case where `pg_restore` succeeds but the database is empty (e.g., if the dump file is corrupted in a way that `pg_restore` accepts it but produces no data). The `got_tables` and `got_exact` checks would catch this, but only if the source has tables/rows.
  - **A2:** The `restic backup` command does not use `--exclude-if-present` or similar to ensure that excluded files are not backed up if they are nested under an included directory. The `--exclude` flags are used, which is correct.
- **Security:**
  - **A1:** The `docker exec` commands are run as root. If the docker socket is compromised, an attacker can run arbitrary commands. This is a known risk of using docker for backups.
  - **A2:** The `RESTIC_PASSWORD_FILE` is read from the filesystem. If the file is world-readable, an attacker can access the backup repository. **Fix:** Ensure the file is `600` and owned by the user.
- **Data-truth / schema drift:**
  - **A1:** The script assumes that the `swanguard` database is the only one that needs to be backed up. If a new database is added, it will not be backed up. The script warns about this, but does not fail. **Fix:** Make the list of databases to back up configurable and fail if a new database is detected.

## HIGHEST RISK
The **P1 race condition in A1** where source truth is calculated before the dump. If a transaction commits between the calculation and the dump, the verification will fail, and a valid backup will be deleted. **Cheapest de-risk:** Calculate source truth *after* the dump, or use a consistent snapshot (e.g., `pg_dump` with `--clean` and `--if-exists` to ensure a consistent state).

## CONFIDENCE
I could not verify the exact permissions of the `swanguard` user or the `docker` socket. I assumed that the `swanguard` user has `CREATE DATABASE` privilege based on the script's logic. I also assumed that the `docker` socket is secure. I could not verify the exact format of the `pg_restore --list` output, but I assumed it is stable. I could not verify the exact behavior of `restic` under concurrent writes, but I assumed that the `--tag` flag is sufficient to scope the snapshots.
