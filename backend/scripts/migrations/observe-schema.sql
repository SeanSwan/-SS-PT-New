-- observe-schema.sql — READ-ONLY production catalog observation for the
-- migrations-reconciliation workstream (slice S3).
--
-- WHY THIS FILE EXISTS
--   D1 — production's `users.id` type (integer vs uuid) and the `"Users"` vs
--   `users` relation split — is not determinable from the repository, which is
--   internally contradictory about it (models/User.mjs declares INTEGER;
--   two competing repair migrations exist, one of them inert because it has no
--   timestamp prefix). It is resolvable ONLY by timestamped catalog evidence.
--   D1 blocks S4 and S5.
--
-- AUTHORIZATION — READ THIS BEFORE RUNNING
--   This is a PRODUCTION READ. It is separately authorized per
--   03-contracts.md §3 and is NOT authorized by this file's existence.
--   Do not run it until the observer role and the private service definition
--   exist and the read has been explicitly approved for a specific time.
--
-- SAFETY
--   * READ ONLY transaction. No INSERT/UPDATE/DELETE/DDL anywhere in this file.
--   * statement_timeout 10s, lock_timeout 1s — bounded, so this cannot wedge
--     production even if it is run at a bad moment.
--   * No client record contents are selected. Every query below reads catalog
--     metadata (pg_class/pg_attribute/pg_constraint/pg_index/pg_depend) or a
--     metadata relation's migration NAMES. Nothing reads a row of client data.
--   * ON_ERROR_STOP is set, so a genuine failure ABORTS loudly rather than
--     being absorbed. Absent relations are reported as absent (section 1),
--     which is how "absent" is distinguished from "the query failed".
--
-- OPERATOR COMMAND (after authorization and private service provisioning)
--   psql -X -w --dbname=service=swan_schema_observer --set=ON_ERROR_STOP=1 \
--        --file=backend/scripts/migrations/observe-schema.sql
--
-- RECEIPT — the following cannot come from SQL and must be captured alongside
-- the output when the receipt is filed:
--   * sha256 of this file and of 03-contracts.md
--   * psql --version
--   * the exact command line as run, with the timestamp
--   * raw output kept restricted; redact any sensitive default literal before
--     the output is included in any review packet.

\pset pager off
\pset format aligned
\pset null '(null)'

\echo ''
\echo '############################################################'
\echo '# migrations-reconciliation — S3 read-only catalog observation'
\echo '############################################################'

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';

-- ── 0. Identity and transaction state ────────────────────────────────────────
-- Establishes WHEN this was observed, WHAT served it, and that the session was
-- genuinely read-only. D1 must be resolved by timestamped evidence, so the
-- timestamp is part of the evidence, not decoration.
\echo ''
\echo '=== 0a. IDENTITY AND TRANSACTION STATE (D1 core, carried verbatim) ==='
SELECT
  transaction_timestamp() AS observed_at_utc,
  current_setting('server_version_num') AS server_version_num,
  current_setting('transaction_read_only') AS transaction_read_only;

-- Extended identity. The contract requires the observer to "record timestamp,
-- tool version, source hashes, and an operator-local database identity". The
-- timestamp is in 0a above; this adds the server-side identity that D3's fix
-- calls for (database name, server address/port) without altering the core.
\echo '=== 0b. EXTENDED SERVER IDENTITY ==='
SELECT
  current_database()            AS database_name,
  current_user                  AS observed_as_role,
  current_setting('server_version') AS server_version,
  inet_server_addr()            AS server_addr,
  inet_server_port()            AS server_port,
  pg_postmaster_start_time()    AS postmaster_started_at;

-- ── 1. Target relation presence — absence reported EXPLICITLY ────────────────
-- The contract requires "distinguish absent relations from query failure".
-- A query returning no rows cannot do that. This section reports, per expected
-- relation, whether it exists at all and under which name and schema — so an
-- absent relation appears as a ROW saying '(absent)', not as silence.
\echo ''
\echo '=== 1. TARGET RELATION PRESENCE (absence is reported, not inferred) ==='
WITH expected(name) AS (
  VALUES ('users'), ('sessions'), ('orientations'), ('sociallikes'),
         ('gamifications'), ('messages'), ('sequelizemeta'), ('sequelizemetav2')
),
found AS (
  SELECT
    lower(replace(c.relname, '"', '')) AS name,
    n.nspname                          AS schema_name,
    c.relname                          AS actual_relname,
    c.relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
)
SELECT
  e.name                                                       AS expected_relation,
  count(f.name)                                                AS matching_relations,
  COALESCE(
    string_agg(
      format('%s.%s (relkind=%s)', f.schema_name, f.actual_relname, f.relkind),
      ', ' ORDER BY f.schema_name, f.actual_relname
    ),
    '(absent)'
  )                                                            AS resolved_as
FROM expected e
LEFT JOIN found f ON f.name = e.name
GROUP BY e.name
ORDER BY e.name;

-- ── 2. Columns of the target relations — THE D1 CORE ─────────────────────────
-- Verbatim from 03-contracts.md §3. This is the query whose output resolves D1:
-- it reports the physical type of every column of the target relations,
-- including whether the column participates in a primary key. It matches
-- users/Users case-insensitively and strips embedded quotes, so the
-- namespace/name ambiguity that makes D2/D3 undecidable is accounted for here.
\echo ''
\echo '=== 2. COLUMNS OF TARGET RELATIONS (D1 core) ==='
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
  a.attnotnull AS not_null,
  a.attidentity AS identity_kind,
  pg_get_expr(d.adbin, d.adrelid) AS default_expression,
  EXISTS (
    SELECT 1
    FROM pg_constraint p
    WHERE p.conrelid = c.oid
      AND p.contype = 'p'
      AND a.attnum = ANY(p.conkey)
  ) AS participates_in_primary_key
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
LEFT JOIN pg_attrdef d
  ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE c.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname !~ '^pg_'
  AND lower(replace(c.relname, '"', '')) IN (
    'users', 'sessions', 'orientations',
    'sociallikes', 'gamifications', 'messages',
    'sequelizemeta', 'sequelizemetav2'
  )
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum;

-- ── 3. Constraints on the target relations ───────────────────────────────────
\echo ''
\echo '=== 3. CONSTRAINTS ON TARGET RELATIONS ==='
SELECT
  n.nspname                          AS table_schema,
  c.relname                          AS table_name,
  k.conname                          AS constraint_name,
  k.contype                          AS constraint_type,
  k.convalidated                     AS validated,
  k.condeferrable                    AS deferrable,
  pg_get_constraintdef(k.oid, true)  AS definition
FROM pg_constraint k
JOIN pg_class c ON c.oid = k.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname !~ '^pg_'
  AND lower(replace(c.relname, '"', '')) IN (
    'users', 'sessions', 'orientations',
    'sociallikes', 'gamifications', 'messages',
    'sequelizemeta', 'sequelizemetav2'
  )
ORDER BY n.nspname, c.relname, k.conname;

-- ── 4. Declared FK graph around users — THE D1 CORE (recursive) ──────────────
-- Verbatim from 03-contracts.md §3. Establishes declared FK connectivity.
-- It does NOT establish unconstrained references or record ownership.
\echo ''
\echo '=== 4. DECLARED FK GRAPH AROUND users (D1 core) ==='
WITH RECURSIVE connected(oid) AS (
  SELECT c.oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_'
    AND lower(replace(c.relname, '"', '')) = 'users'
  UNION
  SELECT CASE
    WHEN k.conrelid = x.oid THEN k.confrelid
    ELSE k.conrelid
  END
  FROM connected x
  JOIN pg_constraint k
    ON k.contype = 'f'
   AND (k.conrelid = x.oid OR k.confrelid = x.oid)
)
SELECT
  ns.nspname AS source_schema,
  src.relname AS source_table,
  k.conname AS constraint_name,
  nt.nspname AS target_schema,
  dst.relname AS target_table,
  k.convalidated AS validated,
  pg_get_constraintdef(k.oid, true) AS definition
FROM pg_constraint k
JOIN pg_class src ON src.oid = k.conrelid
JOIN pg_namespace ns ON ns.oid = src.relnamespace
JOIN pg_class dst ON dst.oid = k.confrelid
JOIN pg_namespace nt ON nt.oid = dst.relnamespace
WHERE k.contype = 'f'
  AND (
    k.conrelid IN (SELECT oid FROM connected)
    OR k.confrelid IN (SELECT oid FROM connected)
  )
ORDER BY ns.nspname, src.relname, k.conname;

-- ── 5. Indexes on the target relations ───────────────────────────────────────
\echo ''
\echo '=== 5. INDEXES ON TARGET RELATIONS ==='
SELECT
  n.nspname                       AS table_schema,
  t.relname                       AS table_name,
  i.relname                       AS index_name,
  x.indisunique                   AS is_unique,
  x.indisprimary                  AS is_primary,
  pg_get_indexdef(x.indexrelid)   AS index_definition
FROM pg_index x
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE t.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname !~ '^pg_'
  AND lower(replace(t.relname, '"', '')) IN (
    'users', 'sessions', 'orientations',
    'sociallikes', 'gamifications', 'messages',
    'sequelizemeta', 'sequelizemetav2'
  )
ORDER BY n.nspname, t.relname, i.relname;

-- ── 6. Sequences owned by target-relation columns ────────────────────────────
-- Relevant to D1: an INTEGER autoincrement primary key is backed by an owned
-- sequence, a UUID key is not. This is corroborating evidence, not the verdict.
\echo ''
\echo '=== 6. SEQUENCES OWNED BY TARGET-RELATION COLUMNS ==='
SELECT
  ns.nspname  AS table_schema,
  t.relname   AS table_name,
  a.attname   AS column_name,
  sn.nspname  AS sequence_schema,
  s.relname   AS sequence_name
FROM pg_class t
JOIN pg_namespace ns ON ns.oid = t.relnamespace
JOIN pg_attribute a
  ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
JOIN pg_depend d
  ON d.refobjid = t.oid
 AND d.refobjsubid = a.attnum
 AND d.classid = 'pg_class'::regclass
 AND d.refclassid = 'pg_class'::regclass
JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
JOIN pg_namespace sn ON sn.oid = s.relnamespace
WHERE t.relkind IN ('r', 'p')
  AND ns.nspname <> 'information_schema'
  AND ns.nspname !~ '^pg_'
  AND lower(replace(t.relname, '"', '')) IN (
    'users', 'sessions', 'orientations',
    'sociallikes', 'gamifications', 'messages',
    'sequelizemeta', 'sequelizemetav2'
  )
ORDER BY ns.nspname, t.relname, a.attname;

-- ── 7. Historical migration names from each confirmed metadata relation ──────
-- The contract requires reading historical migration names from each confirmed
-- metadata relation "using safely quoted catalog identifiers". The relation name
-- and the name column are therefore resolved from the catalog and quoted with
-- %I, never interpolated as text. If a metadata relation is absent, section 1
-- already reported that and this section simply produces no statement for it.
\echo ''
\echo '=== 7. RECORDED MIGRATION NAMES PER METADATA RELATION ==='
SELECT format(
  'SELECT %L AS metadata_relation, %I AS migration_name FROM %I.%I ORDER BY 2;',
  c.relname, a.attname, n.nspname, c.relname
)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a
  ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE c.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname !~ '^pg_'
  AND lower(replace(c.relname, '"', '')) IN ('sequelizemeta', 'sequelizemetav2')
  AND lower(a.attname) = 'name'
ORDER BY n.nspname, c.relname;
\gexec

-- ── 8. Metadata relation shape ───────────────────────────────────────────────
-- Corroborates section 7: if a metadata relation exists but has no `name`
-- column, section 7 emits nothing for it and this section is why.
\echo ''
\echo '=== 8. METADATA RELATION SHAPE ==='
SELECT
  n.nspname       AS table_schema,
  c.relname       AS table_name,
  a.attnum        AS column_position,
  a.attname       AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a
  ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE c.relkind IN ('r', 'p')
  AND n.nspname <> 'information_schema'
  AND n.nspname !~ '^pg_'
  AND lower(replace(c.relname, '"', '')) IN ('sequelizemeta', 'sequelizemetav2')
ORDER BY n.nspname, c.relname, a.attnum;

COMMIT;

\echo ''
\echo '############################################################'
\echo '# observation complete — receipt requirements are in the file header'
\echo '############################################################'
