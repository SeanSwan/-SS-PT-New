# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/radar/PANEL-PACKET.md
**Tokens:** 8831 in / 22047 out (reasoning: 17766) | total 30878
**Wall:** 334.4s

---

## VERDICT
REVISE — the document is unusually honest about its own state, but Track A ships live backup tooling whose core claim ("PROVEN restorable") can silently become vacuous, and which contains a root-owned `/tmp` clobber and multiple paths that destroy good dumps — fix the blockers below before "restore-verified" is allowed to mean anything.

*(Note on evidence: the appendix supplies code without line numbers, so I cite by script + exact quoted line. Where I reason about the repo rather than the pasted code, I mark `[ASSUMPTION]`.)*

## BLOCKERS

1. **P0 — A1 `radar-db-backup`: failed measurement is silently coerced to zero, making verification vacuous.** Evidence: `case "$SRC_EXACT" in ''|*[!0-9]*) SRC_EXACT=0 ;; esac` and the identical coercion for `got_tables` / `got_exact` in `verify_dump`. `q()` runs with `2>/dev/null`, so *any* error in the exact-count query (permission denied on a single public table, lock timeout, XML support hiccup) returns empty string → coerced to `0` — with no log line. Scenario: a future migration runs as a superuser role and creates a public table `swanguard` cannot SELECT. From that night on, `SRC_EXACT=0`, the comparison `[ "$got_exact" -lt "$SRC_EXACT" ]` is `anything < 0` = false, and verification silently degrades from *exact row counts* to *table count only*. Status still says `ok`, exit 0, "restore test : OK". This is precisely the 12-nights-of-green class this script was built to kill. The same coercion cuts the other way: a transient failure counting the *restored* side yields `0 < SRC_TABLES` → healthy dump declared corrupt → deleted (see #3). Fix (3 lines): non-numeric result ⇒ `cannot_run` (source side) / `return 2` (restore side). Never coerce "could not measure" to "measured zero."

2. **P1 — A1: root writes to a fixed `/tmp` filename → symlink clobber as root.** Evidence: `2>/tmp/radar-db-backup.err` (A2 has the same pattern with `/tmp/hermes-backup.log`, lower privilege). Scenario: any local unprivileged account on the box (a `radaragent` service account exists, per the 2750 comment) plants `ln -s /etc/passwd /tmp/radar-db-backup.err`; the 02:30 root run truncates the target on redirect. Fix: `ERRF="$(mktemp /srv/radar/logs/db-backup.XXXXXX)"`, trap-clean it; same in A2.

3. **P1 — A1: environmental failure is classified as corruption and destroys the fresh dump.** Evidence: `qa "create database \"$scratch\"" ... || { ...; return 1; }` and the caller `if [ "$VRC" -eq 1 ]; then rm -f "$OUT"; failed ...` — note even `VRC=2` ("could not run") executes `rm -f "$OUT"`. Scenario: container disk near-full at 02:30 — the compressed dump fits, the scratch restore doesn't — create/restore fails → rc=1 → a *complete, healthy* dump is deleted and the run reports "verification FAILED." A backup system must never destroy its only fresh artifact because *it* couldn't run a test. Fix: on infrastructure errors (create-db failure, restore-process failure with zero restored tables) rename to `*.unverified`, exit 2, never claim ok and never delete.

4. **P1 — A1: source counts are measured *before* the dump, so ordinary delete-churn false-fails.** Evidence: `SRC_EXACT` is captured pre-dump; the verdict is `"$got_exact" -lt "$SRC_EXACT"`. Scenario: SwanGuard continuously ingests feeds `[ASSUMPTION: ingestion runs at 02:30 — plausible for a monitoring product]`; any job that deletes/replaces rows between the count query and `pg_dump` makes restored < source → healthy dump deleted, exit 1, every such night. Under churn this is nightly alarm fatigue plus self-inflicted backup gaps. Fix: measure source counts twice (pre- and post-dump) and pass if `got_exact ≥ min(pre, post)`.

5. **P1 — A2 `hermes-backup.sh`: the REQUIRED gate is pre-flight only; nothing confirms the snapshot actually *contains* the vault.** Evidence: `PATHS=("${REQUIRED[@]}")` → `restic backup ... "${PATHS[@]}"` with no post-check of snapshot contents. Concrete recurrence vector: if `brain-vault` becomes a symlink (or is replaced by a non-empty file), the gate passes — `[ -d ]` follows symlinks, `ls -A` lists the target — but restic does not follow symlinks and stores a link node. Result: `paths=16`, status `ok`, snapshot "contains" brain-vault with zero vault files. The exact 08-08→08-19 incident, now with the gate green. Fix: add `[ ! -L "$p" ]` to preflight, and post-backup assert delivery: `restic ls --json latest "$H/brain-vault"` must return ≥ N entries (N recorded in the status file) or `fail`. Pre-flight checks are not delivery confirmation.

6. **P1 — A2: the restic repo password is in no include list.** Evidence: neither `REQUIRED` nor `OPTIONAL` contains `$H/.hermes/.restic-password`; preflight only checks readability (`[ -r ... ]`). Scenario: host dies; the encrypted repo on Z: survives; the only password copy died with the host → the BRAIN layer is unrecoverable ciphertext forever. This is the single cheapest catastrophic-loss path in the whole document. Fix: add it to `REQUIRED` (non-empty file), and add a second restic key stored off-host (`restic key add`).

7. **P2 — A2: no lock, no timeout, and the status file never goes stale-detected.** Evidence: no `flock` anywhere in A2 (A1 has it; the pattern wasn't copied), and `last-backup.json` is only written at completion. Scenario: Z: NAS stalls mid-run at 03:31 → restic blocks on I/O indefinitely → cron never kills it → status file keeps showing the last `ok` indefinitely → the morning briefing says BACKUP OK while nothing has run for days. Fix: `flock -n`, `timeout 2h restic ...`, and write a `"status":"running"` state with pid at start so staleness is visible.

8. **P2 — A1: `--keep` argument handling hangs or silently disables retention.** Evidence: `--keep) KEEP="${2:-10}"; shift 2 ;;` under `set -uo pipefail` (no `-e`). Scenario A: `radar-db-backup --keep` (trailing flag) → `shift 2` fails with `$#=1`, loop condition still true → silent infinite loop; a systemd oneshot hangs to `TimeoutStartSec`. Scenario B: `--keep abc` → `[ "$KEPT" -gt "abc" ]` errors (exit 2, falsy) → retention never prunes, exit 0. Fix: require and numerically validate `$2` before shifting.

9. **P2 — A1: `--verify-only` on zero dumps exits 0.** Evidence: `[ "$bad" -eq 0 ] || failed ...` with `n=0; bad=0` when `ls` matches nothing. Scenario: `RADAR_DB_BACKUP_DIR` misconfigured → "verified: 0 dump(s), 0 failed", status `ok`, exit 0 — reports success doing nothing, the exact probe the brief demands. Fix: `n=0` ⇒ `cannot_run "no dumps found in $DEST"`.

10. **P2 — A1: the printed RESTORE instruction is not the tested path and fails on retry and under restricted roles.** Evidence: final `say "RESTORE: ..."` lines. (a) No `drop database if exists restored` — the second attempt at 3am fails on 'database already exists'. (b) The test runs `pg_restore --no-owner --no-privileges`; the instruction omits `--no-privileges` — you verified path X and printed path Y. (c) The instruction's step 1 requires CREATEDB — the exact condition `verify_dump` itself detects and reports "CANNOT RUN" — so in the configuration where verification is skipped, the printed human-recovery path also fails. Fix: print `drop database if exists restored; create database restored`, include `--no-privileges`, and if the runtime role check failed, print the superuser variant (`docker exec -u postgres`).

11. **P2 — A1: a second database added to the instance produces a warning forever, exit 0.** Evidence: the `UNBACKED` block ends in `say "  WARNING ..."`, then the run proceeds to `write_status ok` / `exit 0`. Scenario: an `analytics` DB is added tomorrow → 365 nights of WARNING + green exit — the Hermes-incident silence, rebuilt in warning form. A2 already solved this shape (`degraded` state + exit 1 for prune failure); A1 didn't copy it. Fix: `UNBACKED` nonempty ⇒ status `degraded`, exit 1, or auto-cover all non-template DBs.

12. **P2 — A1: dump written non-atomically.** Evidence: `pg_dump ... > "$OUT"` directly. Scenario: host OOM/container restart mid-dump leaves a truncated file *with tonight's correct name* in `DEST`; retention counts it; a human restoring picks newest by mtime. Fix: write `$OUT.part`, `mv` after the `-s` check.

13. **P2 — house-rule violation in the document itself: Constraint 7 says "no absolute paths" in any artifact, and the artifact fed to five LLM seats is full of them.** Evidence: `/srv/radar/bin/radar-db-backup`, `/run/radar-db-backup.lock`, `~/hermes2/...`, container name `radar-postgres-1`, DB/user names. Any leaked transcript is host reconnaissance. No other house-rule violations found (styled-components/Victory/44px/300-line/WCAG are restated consistently; no yoga/meditation or "NASM-certified" language appears anywhere).

## ATTACKS

- **Correctness**
  - `docker ps --filter name=$CONTAINER` is a substring match, so `radar-postgres-10` would satisfy the preflight — harmless only because the follow-up `q 'select 1'` uses exact-name `docker exec`. Worth an exact-match guard (`--filter name=^/...` or compare full output).
  - `d ps ... || cannot_run "cannot reach the docker API (sudo -n docker failed)"` — the message references a `sudo -n` path the code no longer takes (the comment says it was removed). Message drift in a monitoring tool is a lie waiting to be read.
  - `TS_ISO` is captured at script start, so a 40-minute run reports a completion `ts` that predates the dump. A forensic reader reconstructing the 12-night-class incident from status files will be misled by ~minutes. Capture at write time.
  - Retention uses `ls -1t` (mtime); a backward NTP step can make tonight's dump sort oldest and be pruned first. Low likelihood, but retention-by-mtime + clock skew is on the brief's own probe list — sort by parsed filename stamp instead.
  - A2's `SNAP` extraction (`restic snapshots --last --json | tail -c 4000 | grep -o ...`) is fragile: `--last` groups by host/path/tag-set, so an OPTIONAL-path change can yield multiple entries and `tail -1` picks by byte position, not recency. Ask restic for the snapshot ID directly (`restic backup --json` emits it) instead of re-deriving it.
  - A2's `restic stats --mode raw-data` is repo-wide, including the second writer (`hermes-private-auto`) — the field named `repo_size` is honest, but anyone charting it as "brain size" is charting the wrong thing.
  - A1 `STAMP` collision (backward clock step to the same second) would overwrite a dump via `>` truncation; the flock makes it near-impossible. Noted for completeness.
  - A2 `--keep`-style numeric validation is absent too, but its retention args are literals — safe as written, fragile to the first edit.
  - Both jobs back up to storage on the same physical site as the source (A1: `/srv/radar/backups` on the host itself; A2: `/mnt/z`). Fire/theft/crypto-locker on one box defeats both. A1's dumps should ride the existing restic repo (`restic backup $DEST`) — one line, closes the blast radius.

- **Security**
  - The `/tmp` symlink clobbers are the real items (Blockers 2; A2 lower-severity twin).
  - A1 truncates status messages with `tr -d '"'` — adequate JSON sanitization for messages, and `UNBACKED` datnames can't realistically carry quotes; injection risk is negligible. OK as-is.
  - A2 correctly ships `.env`/`auth.json` only inside an encrypted restic repo — but the whole posture then rests on the password file, which is Blocker 6.
  - Privilege posture is otherwise sound: no docker-group membership, root-only, no credentials handled. I found no injection or SSRF surface in either script.
  - Document-distribution hygiene is the remaining security item (Blocker 13).

- **Data-truth / schema drift**
  - **Tested path ≠ documented path** (Blocker 10) is schema drift in ops clothing. Both should be generated from one `RESTORE_FLAGS=(--no-owner --no-privileges)` array used by `verify_dump` and the printed instructions, so they cannot diverge.
  - **Two status vocabularies for presumably one briefing reader**: A1 emits `{unknown|error|ok}`, A2 emits `{error|ok|degraded}`. The first consumer that switches on `.status` across both files will mishandle one of them. Define one enum (`ok|degraded|error|unknown`) in both.
  - **Frontend drift risk is the biggest Track B trap in the document**: the feed surface reads `StoryService` against "seeded/demo projections" while `/api/feed` doesn't exist. Track B must not be built against `demoData.ts` shapes — the doc should mandate that the `/api/feed` response contract (Track B §6) is pinned as generated TS types + a runtime validator (zod) *before* any tile/row component is written, and that the contract states its casing explicitly (Sequelize camelCase vs pg snake_case — the doc never says which ORM SwanGuard uses `[ASSUMPTION]`, which is exactly how PascalCase-vs-snake drift starts).
  - **`ownership` free string + bare 2-letter `region`**: Track C's taxonomy will need a migration *once* no matter what; the no-migration requirement is achievable only if values live in data (lookup tables seeded from the JSON) rather than in DDL/enums. The seed's `sourceClass`/`ownership` free strings should be validated against the lookup tables at seed-load time, so a typo'd seed value fails loudly at load, not silently at filter time.

## HIGHEST RISK
**Blocker 1 — the silent `SRC_EXACT=0` coercion in A1.** It converts "I could not measure" into "nothing to verify against" with no trace in any log, in the one system whose entire reason to exist is that silent-degradation class. Cheapest de-risk (do tonight, ~10 minutes):

```bash
# source side — replace the coercion:
case "$SRC_EXACT" in ''|*[!0-9]*) cannot_run "exact row count failed on source (perm/lock/xml?)" ;; esac
# restore side, in verify_dump — replace both coercions:
case "$got_tables" in ''|*[!0-9]*) say "  restore test : CANNOT RUN — could not count restored tables"; return 2 ;; esac
case "$got_exact"  in ''|*[!0-9]*) say "  restore test : CANNOT RUN — could not count restored rows";  return 2 ;; esac
```

…and run the count query by hand once as `swanguard` (`docker exec radar-postgres-1 psql -U swanguard -d swanguard -tAc '<the query_to_xml query>'`) to settle whether the precondition (a relation the role can't read) already exists today. If it errors, you are *currently* shipping vacuous verification.

## CONFIDENCE
What I could not verify from the document, and what would settle it:

- **Whether every public table is readable/countable by the `swanguard role`** — this decides whether Blocker 1 is armed *today* or merely latent. Evidence: the hand-run count query above, plus `\dp` on public tables. I inferred the failure mode from the code (`2>/dev/null` + empty-string coercion), not from observation.
- **Whether the live DB experiences deletes around 02:30** — decides the real-world rate of Blocker 4's false-fails. Evidence: one week of the script's own journal output + `pg_stat_user_tables` delete counters.
- **Whether `brain-vault` is a real directory or a symlink/mount** — decides Blocker 5's cheapest vector. Evidence: `ls -la ~/hermes2 | grep brain-vault`. The doc doesn't say `[ASSUMPTION: real dir]`.
- **Whether the restic password exists in any second location** — decides Blocker 6's severity between "process gap" and "already fatal." Evidence: asking the owner; `restic key list`.
- **systemd unit details for A1** (`TimeoutStartSec`, `OnFailure`, whether exit 2 pages anyone) and **what actually reads the two status files** — without an `OnFailure`/staleness consumer, *every* finding here degrades to "journal lines nobody reads," which is the Hermes incident's true root cause. Evidence: the unit files and the briefing reader's code.
- **The local threat model on the radar host** (are there non-root login accounts beyond service users?) — calibrates Blocker 2 from "real" to "defense-in-depth."
- **All repo-state claims** (29/29 migrations, 61 tables, 39 sources, line counts, absence of `/api/feed` and any watch surface) are taken on the document's "measured today" assertion; I cannot see the repo.
- **Bash/docker/restic semantics were reasoned, not executed** — e.g., the `--keep` infinite loop follows from `shift 2` failing with `$#=1` under a no-`-e` shell; a 30-second harness (`bash -c 'set -uo pipefail; set -- --keep; ...'`) would confirm or kill it. I'd want every blocker in this list reproduced in a scratch VM before any of them is called "proven."
- **Process oddity, not a finding**: my panel is described as four seats; the document header lists five. Either a seat was added or dropped — irrelevant to the engineering, but I note it rather than silently absorb it.
