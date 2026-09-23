#!/usr/bin/env node
/**
 * Schema snapshot generator — the truth source for the blast-radius gate's
 * referential checks (harm class B).
 *
 * WHY THIS IS MODEL-DERIVED, NOT DB-DERIVED
 * -----------------------------------------
 * The obvious design reads the live DB. That design cannot run: `psql` is
 * permission-gated, DATABASE_URL points at PRODUCTION (CLAUDE.md:49), and a
 * guard that needs production credentials to function is a guard that is
 * absent in CI, absent for a fresh agent, and absent exactly when a careless
 * agent is about to act.
 *
 * So the default snapshot is parsed from `backend/models/*.mjs`: zero
 * credentials, always available, deterministic, diffable in git.
 *
 * THE HONEST LIMITATION: models themselves drift from the real DB. That is
 * the single most-documented bug class in this repo (CLAUDE.md Rule 58). A
 * model-derived snapshot therefore proves "this FK disagrees with our own
 * models" — a strictly weaker claim than "this FK disagrees with production".
 * It still catches the incident that motivated this file (`REFERENCES users`
 * when every model says `"Users"`), because that error contradicts the models
 * too. Every snapshot records `source` so the gate can state which truth it
 * used and never overclaim.
 *
 * Usage:
 *   node scripts/schema-snapshot.mjs                 # write backend/schema-snapshot.json
 *   node scripts/schema-snapshot.mjs --check         # exit 2 if snapshot is stale
 *   node scripts/schema-snapshot.mjs --stdout        # print, write nothing
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MODELS_DIR = join(ROOT, 'backend', 'models');
const OUT_PATH = join(ROOT, 'backend', 'schema-snapshot.json');

/** Files in backend/models that are not model definitions. */
const NOT_MODELS = new Set(['associations.mjs', 'index.mjs', 'setupAssociations.mjs']);

/**
 * Sequelize accepts tableName as a bare identifier ('Users') or with quoting
 * baked into the string ('"Users"'). User.mjs:552 uses the latter. Both mean
 * the same physical table; the snapshot stores the UNQUOTED physical name and
 * remembers that it is case-sensitive.
 */
function stripSqlQuotes(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseModelFile(source, fileName) {
  // tableName: 'X'  |  tableName: "X"  |  tableName: `X`
  const tableMatch = source.match(/tableName\s*:\s*(['"`])([\s\S]*?)\1/);

  // Primary-key type: find the `id:` block and read its DataTypes.X.
  // Deliberately narrow — we only need the PK type for FK type-drift checks.
  let idType = null;
  const idBlock = source.match(/\bid\s*:\s*\{([\s\S]{0,400}?)\}/);
  if (idBlock) {
    const typeMatch = idBlock[1].match(/type\s*:\s*DataTypes\.([A-Z_]+)/);
    if (typeMatch) idType = typeMatch[1];
  }

  return {
    model: basename(fileName, '.mjs'),
    tableName: tableMatch ? stripSqlQuotes(tableMatch[2]) : null,
    declaredTableName: tableMatch ? tableMatch[2] : null,
    idType,
  };
}

function build() {
  if (!existsSync(MODELS_DIR)) {
    throw new Error(`models directory not found: ${MODELS_DIR}`);
  }

  const files = readdirSync(MODELS_DIR)
    .filter((f) => f.endsWith('.mjs') && !NOT_MODELS.has(f))
    .sort();

  const tables = {};
  const modelsWithoutTableName = [];
  const hash = createHash('sha256');

  for (const file of files) {
    const full = join(MODELS_DIR, file);
    const source = readFileSync(full, 'utf8');
    hash.update(file).update(source);

    const parsed = parseModelFile(source, file);
    if (!parsed.tableName) {
      // No explicit tableName → Sequelize auto-pluralizes. We cannot resolve
      // that reliably by static parse, so we record the gap instead of
      // guessing. The gate treats these as UNKNOWN, never as "missing".
      modelsWithoutTableName.push(parsed.model);
      continue;
    }
    tables[parsed.tableName] = {
      model: parsed.model,
      declaredAs: parsed.declaredTableName,
      idType: parsed.idType,
      caseSensitive: parsed.tableName !== parsed.tableName.toLowerCase(),
    };
  }

  return {
    $schema: 'swan-schema-snapshot/1',
    source: 'models',
    generatedFrom: 'backend/models/*.mjs',
    modelCount: files.length,
    tableCount: Object.keys(tables).length,
    // Fingerprint of the inputs. `--check` compares this, so a stale snapshot
    // is detectable without a DB and without trusting a timestamp.
    sourceDigest: hash.digest('hex').slice(0, 16),
    tables,
    modelsWithoutTableName,
    /**
     * Known stale/duplicate physical tables that EXIST in production but must
     * never be an FK target. Referencing these succeeds silently and binds to
     * dead data — the exact failure the gate exists to prevent.
     * See migration 20260730120000-repoint-user-fks-to-canonical-Users.cjs
     * (repointed 50 FKs off lowercase `users`).
     */
    poisonedTables: {
      users: {
        canonical: 'Users',
        why: 'stale lowercase duplicate; FK binds to dead table, joins return empty',
        evidence: 'backend/migrations/20260730120000-repoint-user-fks-to-canonical-Users.cjs',
      },
    },
  };
}

function main() {
  const argv = process.argv.slice(2);
  const snapshot = build();
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (argv.includes('--stdout')) {
    process.stdout.write(json);
    return 0;
  }

  if (argv.includes('--check')) {
    if (!existsSync(OUT_PATH)) {
      process.stderr.write('[schema-snapshot] MISSING — run: node scripts/schema-snapshot.mjs\n');
      return 2;
    }
    const existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    if (existing.sourceDigest !== snapshot.sourceDigest) {
      process.stderr.write(
        `[schema-snapshot] STALE — models changed since snapshot was taken.\n` +
          `  snapshot digest: ${existing.sourceDigest}\n` +
          `  current  digest: ${snapshot.sourceDigest}\n` +
          `  regenerate: node scripts/schema-snapshot.mjs\n`,
      );
      return 2;
    }
    process.stdout.write(
      `[schema-snapshot] current — ${snapshot.tableCount} tables, digest ${snapshot.sourceDigest}\n`,
    );
    return 0;
  }

  writeFileSync(OUT_PATH, json, 'utf8');
  process.stdout.write(
    `[schema-snapshot] wrote ${OUT_PATH}\n` +
      `  ${snapshot.tableCount} tables from ${snapshot.modelCount} model files (source: models)\n` +
      `  digest ${snapshot.sourceDigest}\n` +
      (snapshot.modelsWithoutTableName.length
        ? `  ${snapshot.modelsWithoutTableName.length} model(s) without explicit tableName → treated as UNKNOWN by the gate\n`
        : ''),
  );
  return 0;
}

process.exit(main());
