# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** C:/tmp/radar/PANEL-PACKET.md
**Seed:** (none)
**Tokens:** 9355 in / 24333 out · **Cost:** ~$0.1645 · **Wall:** 329.8s · **finish:** stop

---

## VERDICT
REVISE — both backup jobs can still print success while protecting nothing (the exact failure class that created this workstream), and the printed DB restore instructions do not recover `swanguard`.

## BLOCKERS
1. **P0** — `--keep 0` (or any non-positive `--keep`) deletes the dump that just passed restore-verify, then writes `status:ok` and exits 0. Input: `radar-db-backup --keep 0`. State: a verified file at `$OUT`. Output: retention loop removes it (`KEPT` starts at 0, increments to 1, `1 > 0` → `rm`), recount is 0, `write_status ok` still fires. Same class as “BACKUP OK for 12 nights.” `/srv/radar/bin/radar-db-backup` (`--keep) KEEP="${2:-10}"` with no floor; retention `for f in $(ls -1t ...)` + `write_status ok` + `exit 0`).

```bash
# replacement: parse --keep as a positive integer, then never prune below 1
case "$1" in
  --keep)
    KEEP="${2:-}"
    shift 2
    case "$KEEP" in ''|*[!0-9]*) cannot_run "--keep requires a positive integer" ;; esac
    [ "$KEEP" -ge 1 ] || cannot_run "--keep must be >= 1"
    ;;
esac
# and refuse to report ok with zero files
KEPT="$(find "$DEST" -maxdepth 1 -type f -name 'swanguard-*.dump' | wc -l)"
[ "$KEPT" -ge 1 ] || failed "retention left 0 dumps — refusing to call that a backup"
```

2. **P0** — live DELETE traffic between the pre-dump count and `pg_dump` makes a consistent, restorable dump look bad, so it is deleted. Input: any row deleted in `public` after `SRC_EXACT` is sampled and before `pg_dump` finishes (nightly cleanup, archive purge, orphan reap in-app). `verify_dump` does `[ "$got_exact" -lt "$SRC_EXACT" ]` against a *live* number, not the dump’s snapshot. Output: `VRC=1` → `rm -f "$OUT"` → `DB-BACKUP FAILED` and the only good file is gone. `/srv/radar/bin/radar-db-backup` (`SRC_EXACT="$(q "select coalesce(sum(n),0)…"` then later `if [ "$got_tables" -lt "$SRC_TABLES" ] || [ "$got_exact" -lt "$SRC_EXACT" ]`).

```bash
# replacement: count inside the restored scratch only, against the dump TOC — never against live
# after pg_restore into $scratch:
got_tables=...
got_exact=...
[ "$got_tables" -gt 0 ] && [ "$got_exact" -gt 0 ] || return 1
# plus: TOC relation count must equal restored base-table count
toc_tables="$(d exec -i "$CONTAINER" pg_restore --list < "$f" | awk '/TABLE DATA/{c++} END{print c+0}')"
[ "$got_tables" -ge "$toc_tables" ] || return 1
```

3. **P0** — row-count query failure is coerced to `0`, which makes an empty/failed restore succeed. Input: `query_to_xml`/`xpath` errors (permission, timeout, foreign table, huge relation) → `q` returns non-numeric → `case ... SRC_EXACT=0`. Restore side does the same (`got_exact=0`). `0 -lt 0` is false → `restore test : OK`. Output: a plausible `.dump` kept, status `ok`, restore later is empty. `/srv/radar/bin/radar-db-backup` (`case "$SRC_EXACT" in ''|*[!0-9]*) SRC_EXACT=0 ;; esac` and the identical `got_exact` case).

```bash
case "$SRC_EXACT" in ''|*[!0-9]*) cannot_run "could not count source rows" ;; esac
# same for got_exact inside verify_dump: non-numeric → return 1, never 0
```

4. **P0** — dump is written to its final name before it is proven, so a kill/timeout/disk-full leaves a plausible file that retention will keep. Input: systemd `TimeoutStartSec` fires during `query_to_xml` over 61 tables, or host disk fills after `> "$OUT"` has some bytes, or container restarts mid-`pg_dump`. Output: `swanguard-$STAMP.dump` exists, is non-empty, sorted first by `ls -1t`, next run may prune an *older verified* dump to keep this one. `/srv/radar/bin/radar-db-backup` (`OUT="$DEST/swanguard-$STAMP.dump"` then `pg_dump … > "$OUT"` then `verify_dump`).

```bash
OUT="$DEST/swanguard-$STAMP.dump"
TMP="$OUT.partial"
if ! d exec -i "$CONTAINER" pg_dump -Fc -U "$DBUSER" -d "$DB" > "$TMP" 2>/tmp/radar-db-backup.err; then
  rm -f "$TMP"; failed "pg_dump failed: $(tail -2 /tmp/radar-db-backup.err | tr -d '\n')"
fi
sync "$TMP" || true
verify_dump "$TMP" || { rm -f "$TMP"; failed "unproven dump discarded"; }
mv -f "$TMP" "$OUT"
chmod 640 "$OUT"
```

5. **P0** — printed RESTORE does not recover the live database and is easy to mistype. Input: operator follows the two lines after a real loss. Output: `create database restored` (fails if that name exists); `pg_restore … < <dump-file>` is a placeholder that collides with shell redirection; no `drop/rename swanguard`, no connection drain, no `--no-privileges` (verify used it; the runbook does not), no `create role`, `sudo docker` contradicts the script’s own “not in the docker group / call docker as root” design. The live DB is untouched. `/srv/radar/bin/radar-db-backup` (`RESTORE: sudo docker exec … create database restored` / `pg_restore … < <dump-file>`).

```bash
say "  RECOVERY (same container, replaces live DB — app must be stopped):"
say "    docker exec $CONTAINER psql -U $DBUSER -d postgres -v ON_ERROR_STOP=1 -c \"select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB' and pid <> pg_backend_pid()\""
say "    docker exec $CONTAINER psql -U $DBUSER -d postgres -v ON_ERROR_STOP=1 -c 'drop database if exists ${DB}_old'"
say "    docker exec $CONTAINER psql -U $DBUSER -d postgres -v ON_ERROR_STOP=1 -c 'alter database $DB rename to ${DB}_old'"
say "    docker exec $CONTAINER psql -U $DBUSER -d postgres -v ON_ERROR_STOP=1 -c 'create database $DB owner $DBUSER'"
say "    docker exec -i $CONTAINER pg_restore --no-owner --no-privileges --exit-on-error -U $DBUSER -d $DB < $OUT"
```

6. **P1** — `--verify-only` reports `ok` when it verified nothing. Input: empty `$DEST`, or every `verify_dump` returns `2` (role lacks `CREATEDB`). `rc=2` is not added to `bad`; `n=0,bad=0` also passes. Output: `write_status ok` / exit 0. `/srv/radar/bin/radar-db-backup` (`[ $rc -eq 1 ] && bad=$((bad+1))` then `[ "$bad" -eq 0 ] || failed` then `write_status ok`).

```bash
verify_dump "$f"; rc=$?
n=$((n+1))
[ "$rc" -eq 0 ] || bad=$((bad+1))
done
[ "$n" -gt 0 ] || cannot_run "verify-only: no dumps in $DEST"
[ "$bad" -eq 0 ] || failed "$bad existing dump(s) failed verification"
```

7. **P1** — world-readable Postgres dump. Input: default root umask `022`, dump created via `> "$OUT"`. Output: `swanguard-*.dump` mode `644` under `/srv/radar/backups/db`. The file is the whole product database. `/srv/radar/bin/radar-db-backup` (no `umask`, no `chmod` after write). Fix: `umask 027` at top + `chmod 640 "$OUT"` after `mv`.

8. **P1** — Hermes can `BACKUP OK` a dangling symlink for `brain-vault`. Input: `$H/brain-vault` is a symlink to the real vault (or to a mount). `[ -d ]` / `ls -A` follow the symlink and see files; restic’s default is to store the symlink, not the tree. Output: snapshot exists, status `ok`, restore yields a pointer at a path that is not on the recovery box — silent stale vault, same shape as 2026-08-08..19. `~/hermes2/bin/hermes-backup.sh` (`REQUIRED=( "$H/brain-vault" … )` existence loop, then `restic backup … "${PATHS[@]}"` with no `--follow` and no `-L` reject).

```bash
for p in "${REQUIRED[@]}"; do
  if [ -L "$p" ]; then
    fail "REQUIRED path is a symlink (restic would store the pointer, not the bytes): ${p#$H/} -> $(readlink "$p")"
  fi
  # existing absent/empty/zero-byte checks…
done
# also apply the EMPTY-dir mount check to $RESTIC_REPOSITORY and require $RESTIC_REPOSITORY/config
[ -s "$RESTIC_REPOSITORY/config" ] || fail "restic repo config missing (unmounted Z:?): $RESTIC_REPOSITORY"
```

9. **P1** — Hermes never restore-tests, and snapshot identity is best-effort. Input: `restic backup` exits 0, then `restic snapshots --last --tag hermes-auto --json` is wrong-flag / multi-snapshot / parse-fail (`2>/dev/null | grep -o … || true`). Output: `status=ok` with `"snapshot":"?"`. A second writer (`hermes-private-auto`) already exists in this repo; an unscoped or misparsed id points the morning briefing at the wrong snapshot. `~/hermes2/bin/hermes-backup.sh` (`SNAP="$(restic snapshots --last --tag hermes-auto --json … || true)"`).

```bash
SNAP="$(restic snapshots --latest 1 --tag hermes-auto --json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["short_id"])')"
[ -n "$SNAP" ] || fail "backup wrote something restic will not name"
# cheapest real de-risk: once a week, restic restore $SNAP --target /tmp/hermes-restore-test --include brain-vault && test -n "$(ls -A /tmp/hermes-restore-test/.../brain-vault)"
```

10. **P1** — non-root / lock-open failures leave a stale `ok` status file. Input: timer fires without `User=root`, or `/run/radar-db-backup.lock` cannot be created. Output: exit 2 on stderr, but `write_status` is never called (unlike `cannot_run`). A monitor that reads `/srv/radar/logs/db-backup.json` keeps yesterday’s success. `/srv/radar/bin/radar-db-backup` (`if [ "$(id -u)" -ne 0 ]` / `exec 9>"$LOCK" || { echo …; exit 2; }`).

No other blockers invented for Tracks B–D: those are not shipped code. They are direction, and they are attacked below.

## ATTACKS
- Correctness: A1 is `set -uo pipefail` with **no `-e`**, so every unguarded command can fail and fall through; `pg_restore` exit code is discarded on purpose (`# pg_restore exits non-zero on benign warnings`) which means a half-applied restore is judged only by counts; counts ignore sequences, constraints, extensions, functions, and identity values — a restore that then dies on the first insert looks “verified”; `SRC_TABLES` counts views+base while `SRC_EXACT` counts base only; `query_to_xml` per table is a timeout magnet under systemd; `name=$CONTAINER` is a Docker substring filter (`radar-postgres-1` matches `radar-postgres-10`); `q`/`qa` strip *all* spaces (`tr -d ' \r'`); `--keep` / `--verify-only` happy-path only; A2 `set -e` is real but `restic backup` success is treated as restorable; A2 OPTIONAL empty-mount dirs are included (`[ -e ]` only); A2 learned EMPTY-dir for REQUIRED paths and then did not apply it to `$RESTIC_REPOSITORY`; no flock on Hermes (restic repo lock is not a status-file lock); `TS_ISO` is start-time, so a 40-minute job looks like it finished at 02:30 and overlaps the 03:30 Hermes cron on paper. Track B as specified has no `/api/feed` and no watch surface — a Netflix grid against demo projections will ship a façade. Cursor pagination is required in the brief and does not exist. Default-off + 51/39 dormant rows means the “main page” is an empty state; any design that assumes populated shelves is happy-path-only.

- Security: A1 dumps are world-readable (blocker 7); `/tmp/radar-db-backup.err` and `/tmp/hermes-backup.log` are shared-tmp, world-readable, and live across runs; A2 exports `RESTIC_PASSWORD_FILE` and backs up `.env` / `auth.json` / `mcp-tokens` / `sessions` — restic encryption is the only control, and the password file is correctly *not* inside the snapshot (document that out-of-band or a restore is impossible); A1 `write_status` interpolates `$UNBACKED` / `$SIZE` into JSON with no escape; A2 interpolates `$SKIPPED_STR` the same way; no authz discussion for the new main page — if `/api/feed` is owner-only, say so; if it is not, creator ids + enable flags are an IDOR waiting for a leaked link; Dual-use of docker socket as root is accepted in-house, but the restore runbook telling a human to `sudo docker` widens that to any sudoer; rate-limit/DoS: an upward “live” ticker plus unbounded `/api/feed` without a cursor cap will melt the single owner session on a phone; Track C “more APIs” is a ToS/secret-handling trap (NewsAPI, X, Meta, YouTube Data) — those want keys in the process and usually forbid storing headline corpora.

- Data-truth / schema drift: seed is camelCase (`feedUrl`, `siteUrl`, `sourceClass`, `ownership`, `region`) while a 61-table Postgres API will almost certainly emit snake_case — `NewsroomShell` / `StoryService` / future `/api/feed` will disagree on the first integration day; `ownership` is a free string and `region` is a bare alpha-2, so “Black-owned” vs “black-owned” vs “Black-audience” cannot be filtered without a migration *now*, before the slate grows; `SRC_TABLES` vs 61 tables: `information_schema.tables` where `table_schema='public'` is not “61 migrations applied” and will drift the moment a non-public schema or a view appears; frontend story shape is unspecified (headline/snippet/url/sourceId/publishedAt/creatorId) while the legal posture *requires* snippet+linkout and *forbids* full text — if `/api/feed` ever adds `body`, the client will render it; Track B “what plays inline vs links out” is already decided by constraint 1 (nothing plays inline) — a tile with a play chevron is schema-level lying; PascalCase table drift is not evidenced in this document because no SQL is shown — flag as unverified, do not invent it.

## HIGHEST RISK
A1 can still emit `BACKUP OK` / leave a file named like a backup that will not actually replace `swanguard` (P0s 1–5 as one class). Cheapest de-risk before the next 02:30 timer: (1) write to `*.partial` and `mv` only after verify, (2) floor `--keep` at 1 and fail if retained=0, (3) treat non-numeric counts as `cannot_run`, (4) replace the two-line RESTORE banner with a drain/rename/restore runbook and run that runbook once against last night’s dump into a throwaway name. Do not ship Track B until that drill has been executed and the status file is correct.

## CONFIDENCE
I could not execute either script, mount Z:, talk to `radar-postgres-1`, or read the systemd unit / crontab. I therefore could not confirm: `TimeoutStartSec` / `PrivateTmp` (both change mid-dump and `/tmp` behavior); whether `swanguard` actually has `CREATEDB`; whether `brain-vault` is a symlink or a mount in the live homedir; restic version (`snapshots --last` vs `--latest 1` — I am not certain across versions, and the parse path hides that); whether `/mnt/z` is CIFS (restic-on-SMB corruption is a known class I could not observe); `NewsroomShell.tsx` / `StoryService` field names (only line counts were supplied); any live RSS URL in Track C. Evidence that would settle it: one annotated run of each job with `bash -x`, `stat`+`umask` on a dump file, `restic snapshots --json` raw output, `systemctl cat` of the timer, `readlink -f ~/hermes2/brain-vault`, and a restore drill that ends with the app reading the restored DB. I did not fetch publisher feeds; any seat that pastes “ready-to-seed” JSON with asserted `feedUrl`s without a fetch timestamp is violating hard constraint 1. I would not build: a Netflix-faithful news grid (news decays, catalogs don’t; linkout-only means every play button is a lie), any non-RSS ingest (NewsAPI / X / Meta / scrape), or a permanent forms sidebar at 320px. I would build next, in order: (1) first-run enablement for default-off so the main page is not an empty theatre, (2) `/api/feed` cursor contract + stale-source signal, (3) provenance + “publisher pulled this story” handling. Kill from the current plan: Netflix-as-news, API sprawl, forms-as-always-on-sidebar (drawer, not a column).
