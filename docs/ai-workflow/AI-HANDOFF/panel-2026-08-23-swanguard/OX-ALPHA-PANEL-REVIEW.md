# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** C:/tmp/radar/PANEL-PACKET.md
**Seed:** (none)
**Tokens:** 8947 in / 11205 out · **Cost:** ~$0.0000 · **Wall:** 371.7s · **finish:** stop

---

## VERDICT

REVISE — the backup scripts contain two independent "green while lying" defects (including one that recurs the exact Hermes brain-vault failure class this workstream was built to kill), and several Track A claims in the prose contradict the code they describe.

## BLOCKERS

1. **P0 — `--verify-only` reports OK when it verifies nothing.**
   Failure scenario: (a) backup directory is emptied (disk wipe, ransomware, wrong `RADAR_DB_BACKUP_DIR`); nightly `--verify-only` run loops over zero files, `n=0 bad=0`, prints `verified : 0 dump(s), 0 failed`, writes `{"status":"ok"}`, exits 0. (b) The `swanguard` role loses `rolcreatedb`; every `verify_dump` returns 2, and the loop only counts `rc -eq 1` as bad — all dumps "pass," status `ok`, exit 0. Either way the monitor shows green across a window in which nothing is verifiable — the precise "BACKUP OK for 12 nights" failure mode this script exists to prevent.
   Evidence (A1, verify-only block): `n=$((n+1)); [ $rc -eq 1 ] && bad=$((bad+1))` followed by `[ "$bad" -eq 0 ] || failed ...` / `write_status ok ...`.
   Fix: treat `rc=2` as bad, and require `n > 0`:
   ```bash
   n=$((n+1))
   case $rc in 1|2) bad=$((bad+1)) ;; esac
   ...
   [ "$n" -gt 0 ] || failed "no dumps found in $DEST — nothing to verify"
   ```

2. **P1 — Source inventory uses `information_schema`, which shares the dumping role's privilege blindness; omitted tables are undetectable by construction.**
   `information_schema.tables` only exposes tables the connecting role owns or holds privileges on. `pg_dump` as a non-superuser likewise skips what it cannot read (behavior varies by version — see CONFIDENCE). Both sides of the comparison therefore use the same blind eyes: a table owned by a second role with no grants to `swanguard` vanishes from `SRC_TABLES`, from `SRC_EXACT`, and from the dump, and every check passes. This is structurally identical to the Hermes incident — "no include list to drift" is asserted in the comment (`Everything inside the swanguard database is dumped automatically — no include list to drift`) but the effective include list is "what `swanguard` can see," which can drift silently.
   Evidence (A1): `SRC_TABLES="$(q "select count(*) from information_schema.tables where table_schema='public'")"` and the mirrored `got_tables` query inside `verify_dump`.
   Fix — inventory from `pg_class` (visible to any role) and diff **name sets**, not counts:
   ```bash
   SRC_LIST="$(q "select string_agg(nspname||'.'||relname, ',' order by 1)
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r'")"
   GOT_LIST="$(d exec "$CONTAINER" psql -U "$DBUSER" -d "$scratch" -tAc \
     "select string_agg(nspname||'.'||relname, ',' order by 1)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'" | tr -d ' \r')"
   [ "$GOT_LIST" = "$SRC_LIST" ] || { say "  restore test : FAILED — table set mismatch"; return 1; }
   ```
   Additionally diff `pg_restore --list` output against `SRC_LIST` before restoring — that catches omissions without paying for a full restore.

3. **P1 — Hard dependency on `rolcreatedb` with no bootstrap: one REVOKE away from permanently producing zero backups.**
   Scenario: someone follows least-privilege guidance and revokes CREATEDB from `swanguard`. Every nightly run now dumps, then deletes the dump (`rm -f "$OUT"` under `VRC -eq 2`), exits 2, forever. Status correctly says `unknown` — but the system's steady state is "no backup exists," and nothing in the script grants the role or tells the operator the one-line fix beyond the message. A backup tool whose normal operating mode can be silently reduced to zero output by a routine hardening change needs a self-check at install time, not per-run discovery.
   Evidence (A1): the rolcreatedb/rolsuper gate in `verify_dump` and `cannot_run "restore test could not run; dump discarded rather than kept unproven"`.
   Fix: at preflight, if the role lacks createdb/rolsuper, attempt `ALTER ROLE swanguard CREATEDB` as the container's superuser (`d exec ... psql -U postgres -c "alter role swanguard createdb"`) once, idempotently, and log it — rather than discarding every dump forever.

4. **P1 — No off-host copy for the radar DB. Restore-verified dumps in `/srv/radar/backups/db` share fate with the host.**
   Scenario: host disk dies, or ransomware encrypts `/srv` (the script runs as root; anything that compromises the box destroys both live data and every generation, since retention keeps them on the same filesystem). Ten perfect, restore-proven dumps are worth exactly zero. The Hermes script at least targets a separate mount (`/mnt/z`); radar has nothing. The script's own header claims "PROVEN restorable" — proven locally is half the guarantee.
   Fix (cheap): after verification, `gpg`/`age`-encrypt and push the newest dump to object storage or a second machine, and make the nightly status include the offsite copy's existence. Until that lands, the "closes the last uncovered database in the house" claim in the header is false.

5. **P1 (A2) — Live SQLite databases are backed up hot with no consistency mechanism.**
   Scenario: Hermes writes to `kanban.db` / `state.db` / `verification_evidence.db` mid-read by restic → torn page / mixed WAL state → snapshot contains a corrupt DB file. Every gate in the hardened preflight checks existence and non-emptiness, not integrity; restic exits 0; status `ok`. A restore yields a truncated Kanban board believed current. This is the backup-corollary of the brain-vault lesson: the gate validates presence, not restorability.
   Evidence (A2): OPTIONAL array includes `kanban.db`, `state.db`, `verification_evidence.db`; no `sqlite3 ... ".backup"` anywhere.
   Fix: before `restic backup`, copy each SQLite file atomically:
   ```bash
   for db in kanban.db state.db verification_evidence.db; do
     [ -f "$H/.hermes/$db" ] && sqlite3 "$H/.hermes/$db" ".backup '$H/.hermes/$db.snap'" \
       && mv "$H/.hermes/$db.snap" "$H/.hermes/$db.bak"
   done
   ```
   and back up the `.bak` copies (or rely on WAL mode + `PRAGMA wal_checkpoint(TRUNCATE)` if sqlite3 CLI is unavailable — but verify which mode the DBs are actually in; `[ASSUMPTION]` that they are not already safely WAL-isolated).

## ATTACKS

**Correctness**
- **A1 retention, `--keep 0`:** `[ "$KEPT" -gt "$KEEP" ]` with `KEEP=0` deletes the freshly verified dump from tonight's run, then exits 0 with `retained : 0`. No lower-bound guard. Also `--keep abc` makes `[ -gt ]` fail (nonzero → condition false under no `-e`), silently disabling pruning — unbounded growth with no error. Validate: `case "$KEEP" in ''|*[!0-9]*|0) exit 2;; esac`.
- **A1 count-before-dump race:** `SRC_EXACT` is measured before `pg_dump` starts; concurrent DELETEs during the dump make restored rows < counted rows → a healthy dump is deleted as "failed." False-negative direction only (safe, but it deletes good backups under write load). Snapshot the counts and dump inside a single `REPEATABLE READ` transaction, or tolerate `got_exact >= rows_at_dump_start` by re-measuring after the dump.
- **A1 skipped-run leaves stale status:** the flock-blocked branch deliberately writes nothing, so a monitor polling `db-backup.json` shows *yesterday's* `ok` whenever a run overlaps (e.g., slow verify-only night pushing past 02:30 next timer fire). Write a distinct `skipped` record to a sidecar key or accept journal-only — but decide explicitly; right now the omission looks principled and behaves like staleness.
- **A2 no timeout, no lock:** `restic backup/stats/forget` against `/mnt/z` with a hung SMB/NFS mount blocks forever; cron fires again tomorrow into a repo lock with no `flock` guard (A1 has one; A2 doesn't). Wrap in `timeout -k 600 4h` and take a lockfile.
- **A2 `SNAP` extraction fragility:** `tail -c 4000 | grep -o ... | tail -1` breaks if the JSON array is larger than the window or the cut lands mid-token; you then record `snapshot:"?"` in an `ok` status. Parse with `jq -r '.[-1].short_id'` — jq is a fair dependency for a script already depending on restic.
- **A2 no `restic check` ever:** repo index damage is discovered at restore time. Schedule `restic check --read-data-subset=x%` weekly; a backup repo nobody integrity-checks is the restic equivalent of the un-restored dump.

**Security**
- **A1 runs as root and shells `docker exec` with fixed strings** — no injection surface from untrusted input in practice (datnames matching `sg_restoretest_%` are the only variable interpolation into SQL, and they're role-restricted). Acceptable. The real exposure is the opposite: root + docker socket is root-equivalent by definition, so the header's boast that the service account avoids the docker group is moot once the script demands root. Say so honestly in the header rather than implying containment.
- **Dump file confidentiality:** dumps inherit root's umask (typically 022 → 0644). The 2750 parent directory mitigates traversal, but set `umask 077` before writing `$OUT` — a full-DB plaintext dump readable by any daemon running as a non-root group member is an unnecessary gift.
- **A2 `RESTIC_PASSWORD_FILE` sits inside the IDENTITY layer it backs up** — circular but fine; however nothing verifies its permissions. `[ -r ]` passes for world-readable. Assert `stat -c %a` ≤ 600 or fail.
- **Replay/idempotency:** A1's `$$`-suffixed scratch DB is safe under the flock; the orphan-reap would, however, drop a *human operator's* manually-named `sg_restoretest_*` database mid-use. Namespace automated scratches (`sg_restoretest_auto_%`) and reap only those.

**Data-truth / schema drift**
- **Stale header vs. code (A1):** the comment block says "docker is reached with `sudo -n` on purpose: the service account is deliberately NOT in the docker group," and the preflight message still says `(sudo -n docker failed)` — but the code is `d() { docker "$@"; }` under a mandatory-root gate. The comment documents a security posture the code no longer has. Future maintainers will trust the comment. Rewrite it.
- **Document-level:** the "VERIFIED CURRENT STATE" section asserts repo facts (61 tables, 29/29 migrations, file line counts, `section` registry values) with **zero line citations**, violating the document's own rule ("Every claim about the existing code must cite the line… If you cannot cite it, say `[ASSUMPTION]`"). Other seats will build Track B on these numbers unchallenged.
- **Seed/API drift risk for Track B/C:** the seed shape is camelCase (`feedUrl`, `sourceClass`, `termsUrl`). No `/api/feed` contract exists yet; if the F3 slice serializes snake_case (common Node/Postgres habit), the frontend drifts on day one. Pin the contract now: the doc's Track B item 6 must specify camelCase-over-the-wire explicitly, and `region` values include `QA` — which is Qatar's ISO code but collides visually with "quality assurance" in logs and filters; the proposed taxonomy upgrade should move to full ISO-3166 names or unambiguous slugs, not bare 2-letter strings.
- **Track C discipline:** any seat proposing feed URLs without live fetch verification is violating hard constraint 1 by assertion. Everything I would propose for Black-owned outlets (e.g., the obvious candidates in that space) is `[UNVERIFIED]` from this document alone — the seed PR must contain a fetched-and-parsed proof per URL, not confidence.

## HIGHEST RISK

**Blocker 2 — the privilege-blind inventory — because it is the original sin recurring with a clean conscience.** The Hermes incident was "include list drifted, status stayed green." The fix installed a required-path gate on Hermes, but A1 reintroduced the same fail-open shape one level down: the *database's* include list is implicitly "tables visible to `swanguard`," and every verification metric is computed through the same visibility filter, so omission is mathematically undetectable by the script as written. Cheapest de-risk before ship (~15 minutes): run the `pg_class` name-set query against the live DB today and diff it against `information_schema.tables` for the `swanguard` role. If the sets differ, you have found a live omission *right now*; if they're equal, ship the `pg_class`-based comparison anyway (blocker 2's replacement code) so the equivalence can't silently rot.

## CONFIDENCE

- **Whether `pg_dump` (version in the `radar-postgres-1` container, unknown) errors out or silently skips unreadable tables.** Version-dependent behavior; recent versions tend to fail loudly, older paths warn-and-continue. Blocker 2's fix is correct under either behavior, but the *severity* of the live exposure depends on it. Settle by: `docker exec radar-postgres-1 pg_dump --version`, plus creating a throwaway table owned by `postgres` with no grants to `swanguard` and running the script once.
- **Whether `swanguard` currently holds CREATEDB/rolsuper.** One query settles it: `select rolcreatedb, rolsuper from pg_roles where rolname='swanguard'`. If false, the nightly job has *never* produced a retained dump — check whether `/srv/radar/backups/db` contains anything older than a day.
- **Whether anything consumes `db-backup.json` / `last-backup.json` automatically,** or whether "status file" means "Sean reads it in a briefing." If nothing polls them, the stale-status findings downgrade one notch; if a briefing bot reads them, blocker 1 is actively dangerous today.
- **Whether radar has any offsite mechanism outside these two scripts** (the doc says this "closes the last uncovered database," implying none — but that's the document's claim, not evidence).
- **All Track C feed URLs:** unverifiable from a document; every proposal from every seat, including mine, is `[UNVERIFIED]` until fetched. Any seat asserting a feed URL without a captured HTTP 200 + parseable XML is guessing, and constraint 1 says guesses don't enter the seed.
- **Track B layout judgments** (Netflix-grid fitness, ticker a11y approach): I deliberately did not fight for screen-time on these — the Track A defects above are provable from the artifact in hand; the design questions are arguable taste, and the panel's scarce credibility should be spent on the restore path, not the column widths.
