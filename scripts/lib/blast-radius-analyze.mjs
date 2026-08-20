/**
 * blast-radius-analyze.mjs — pure, dependency-free analysis of proposed content
 * and commands for irreversible-harm classes. No I/O, no model calls, so it is
 * unit-testable and cannot itself become a failure path.
 *
 * Consumed by scripts/hooks/db-blast-radius-gate.mjs.
 *
 * DESIGN NOTES (earned from a Kimi K3 hostile review, 2026-08-11):
 *  - Verb blocklists are theater against the incident class. The motivating bug
 *    was a `CREATE TABLE` — destructive by REFERENCE, not by verb. Class B is
 *    therefore the priority check, not an afterthought.
 *  - Postgres identifier folding is replicated exactly (see foldIdentifier).
 *    `REFERENCES Users(id)` UNQUOTED folds to `users` — the poisoned table.
 *    A naive case-sensitive compare would wave that through as "looks right".
 *  - Sequelize migrations are JavaScript. `queryInterface.dropTable('X')`
 *    contains no SQL verb, so JS idioms are matched alongside SQL.
 */

/** Harm classes. Ordered by how silent the failure is, worst first. */
export const CLASS = {
  B: 'B — referential drift (silent corruption; no error at run time)',
  A: 'A — destructive DDL/DML',
  Q: 'Q — whole-schema sync (drops/alters every table)',
  C: 'C — unbounded mutation (no effective WHERE)',
  D: 'D — irreversible migration (no or destructive down())',
  S: 'S — guard self-modification',
};

/**
 * Replicate PostgreSQL identifier resolution.
 *   "Users"  -> Users   (quoted: literal, case preserved)
 *   Users    -> users   (unquoted: folded to lower case)
 * This is the single most important function in the file. The incident's
 * near-miss twin is `REFERENCES Users(id)` with no quotes, which LOOKS correct
 * to a human and resolves to the dead lowercase table.
 */
export function foldIdentifier(raw) {
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return { name: trimmed.slice(1, -1), quoted: true };
  }
  return { name: trimmed.toLowerCase(), quoted: false };
}

/** Strip line/block comments so scans do not fire on prose or disabled code. */
function stripNoise(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/--[^\n]*/g, ' ');
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/**
 * Class B — resolve every FK target against the schema snapshot.
 * Returns findings for: poisoned targets, unknown tables, and type drift.
 */
export function checkReferences(text, snapshot) {
  const findings = [];
  if (!snapshot || !snapshot.tables) return findings;

  const known = new Map(Object.entries(snapshot.tables));
  const poisoned = snapshot.poisonedTables || {};

  // REFERENCES <table> ( <col> )  — table may be "Quoted" or bare.
  const re = /\bREFERENCES\s+("(?:[^"]+)"|[A-Za-z_][A-Za-z0-9_$]*)\s*\(\s*([^)]*?)\s*\)/gi;
  const scan = stripNoise(text);
  let m;
  while ((m = re.exec(scan)) !== null) {
    const raw = m[1];
    const { name, quoted } = foldIdentifier(raw);
    const line = lineAt(scan, m.index);

    if (Object.prototype.hasOwnProperty.call(poisoned, name)) {
      const p = poisoned[name];
      findings.push({
        cls: CLASS.B,
        line,
        detail:
          `REFERENCES ${raw} resolves to poisoned table \`${name}\`` +
          (quoted ? '' : ' (unquoted identifiers fold to lower case in Postgres)') +
          `. Canonical is "${p.canonical}". ${p.why}`,
        evidence: p.evidence,
        fix: `use REFERENCES "${p.canonical}"(id) — quoted, exact case`,
      });
      continue;
    }

    if (!known.has(name)) {
      // Unknown is reported, never silently allowed — but the message states
      // the snapshot's limits so a stale cache is not mistaken for proof.
      findings.push({
        cls: CLASS.B,
        line,
        detail:
          `REFERENCES ${raw} → table \`${name}\` is not in the schema snapshot ` +
          `(source: ${snapshot.source}, ${snapshot.tableCount} tables).`,
        fix: 'confirm the table exists, or regenerate: node scripts/schema-snapshot.mjs',
      });
      continue;
    }

    // Type drift: the FK column's declared type vs the target's PK type.
    const target = known.get(name);
    const colDecl = scan.slice(Math.max(0, m.index - 120), m.index);
    const typeMatch = colDecl.match(/\b(UUID|INTEGER|INT|BIGINT|SERIAL|TEXT|VARCHAR)\b[\s\S]*$/i);
    if (typeMatch && target.idType) {
      const declared = typeMatch[1].toUpperCase();
      const pk = target.idType.toUpperCase();
      const intish = ['INTEGER', 'INT', 'BIGINT', 'SERIAL'];
      const compatible = declared === pk || (intish.includes(declared) && intish.includes(pk));
      if (!compatible) {
        findings.push({
          cls: CLASS.B,
          line,
          detail: `FK typed ${declared} against \`${name}\`.id which the models declare ${pk}.`,
          evidence: 'backend/migrations/UUID-INTEGER-TYPE-MISMATCH-FIX.cjs (this class has bitten before)',
          fix: `declare the FK column as ${pk}`,
        });
      }
    }
  }
  return findings;
}

/** Class A + Q — destructive DDL/DML in SQL text or Sequelize JS idioms. */
export function checkDestructive(text) {
  const findings = [];
  const scan = stripNoise(text);

  const patterns = [
    { re: /\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b/gi, cls: CLASS.A, what: 'DROP of a table/database/schema' },
    { re: /\bTRUNCATE\b/gi, cls: CLASS.A, what: 'TRUNCATE' },
    { re: /\bDROP\s+COLUMN\b/gi, cls: CLASS.A, what: 'DROP COLUMN (data loss)' },
    // Receiver is deliberately ANY identifier, not literally `queryInterface`.
    // All 414 existing call sites in backend/migrations use `queryInterface`,
    // but new code aliases it constantly (`up: async (q) => q.dropTable(...)`),
    // and a receiver-specific pattern is a one-character evasion.
    { re: /\.\s*dropTable\s*\(/g, cls: CLASS.A, what: 'dropTable()' },
    { re: /\.\s*dropAllTables\s*\(/g, cls: CLASS.A, what: 'dropAllTables()' },
    { re: /\.\s*removeColumn\s*\(/g, cls: CLASS.A, what: 'removeColumn() (data loss)' },
    { re: /\.\s*bulkDelete\s*\(/g, cls: CLASS.A, what: 'bulkDelete()' },
    { re: /\.\s*sync\s*\(\s*\{[^}]*\bforce\s*:\s*true/g, cls: CLASS.Q, what: 'sync({ force: true }) — DROPS AND RECREATES EVERY TABLE' },
    { re: /\.\s*sync\s*\(\s*\{[^}]*\balter\s*:\s*true/g, cls: CLASS.Q, what: 'sync({ alter: true }) — mutates live schema from models' },
    { re: /\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/gi, cls: CLASS.A, what: 'disabling row-level security' },
  ];

  for (const { re, cls, what } of patterns) {
    let m;
    while ((m = re.exec(scan)) !== null) {
      findings.push({ cls, line: lineAt(scan, m.index), detail: what });
    }
  }
  return findings;
}

/** Class C — DELETE/UPDATE with no effective row restriction. */
export function checkUnbounded(text) {
  const findings = [];
  const scan = stripNoise(text);
  const re = /\b(DELETE\s+FROM|UPDATE)\s+("[^"]+"|[A-Za-z_][\w$]*)([\s\S]*?)(?=;|$)/gi;
  let m;
  while ((m = re.exec(scan)) !== null) {
    const verb = m[1].toUpperCase().startsWith('DELETE') ? 'DELETE' : 'UPDATE';
    const table = m[2];

    // DDL that merely NAMES the update event/privilege is not a DML statement:
    //     create trigger t before update on creator ...
    //     grant update on creator to app_role
    // Both capture "on" as the table and reported "UPDATE on on with no WHERE"
    // — a class-C false positive on ANY migration using triggers, in any repo.
    // Found 2026-08-18 while writing SwanGuard CM1. Narrow by construction: it
    // skips only matches whose "table" is a SQL keyword that cannot name one.
    if (/^(?:on|of|or|to|set)$/i.test(table.replace(/"/g, ''))) continue;
    const before = scan.slice(Math.max(0, m.index - 60), m.index);
    if (/\b(?:BEFORE|AFTER|INSTEAD\s+OF)\s+(?:\w+\s+OR\s+)*$/i.test(before)) continue;
    if (/\bGRANT\b[\w\s,]*$/i.test(before)) continue;

    const rest = m[3] || '';
    const line = lineAt(scan, m.index);
    const whereMatch = rest.match(/\bWHERE\b([\s\S]*)$/i);
    if (!whereMatch) {
      findings.push({ cls: CLASS.C, line, detail: `${verb} on ${table} with no WHERE — affects every row.` });
      continue;
    }
    const cond = whereMatch[1].trim();
    const tautology =
      /^(?:1\s*=\s*1|true)\b/i.test(cond) ||
      /\bid\s+IS\s+NOT\s+NULL\b/i.test(cond) ||
      /\bid\s*>\s*0\b/.test(cond);
    if (tautology) {
      findings.push({
        cls: CLASS.C,
        line,
        detail: `${verb} on ${table} with a tautological WHERE (\`${cond.split('\n')[0].slice(0, 40)}\`) — affects every row.`,
      });
    }
  }
  return findings;
}

/** Class D — a migration that cannot be undone. */
export function checkReversibility(text, filePath) {
  if (!/migrations?[\\/]/i.test(filePath || '')) return [];
  const scan = stripNoise(text);
  const declaresUp = /\bup\b\s*[:(]/.test(scan) || /exports\.up/.test(scan);
  if (!declaresUp) return [];

  const hasDown = /\bdown\b\s*[:(]/.test(scan) || /exports\.down/.test(scan);
  if (!hasDown) {
    return [{ cls: CLASS.D, line: 1, detail: 'migration defines up() but no down() — not reversible.' }];
  }
  const downBody = (scan.split(/\bdown\b\s*[:(]/)[1] || '').slice(0, 600);
  if (/\bdropTable\b|\bDROP\s+TABLE\b|\bTRUNCATE\b/i.test(downBody)) {
    return [{
      cls: CLASS.D,
      line: 1,
      detail: 'down() itself destroys data — a rollback would cause a second incident.',
    }];
  }
  return [];
}

/**
 * Extract file-write targets from a shell command. Kimi finding 1b: content
 * arriving via `cat > f <<EOF` or `tee f` never passes through Write/Edit, so
 * the static layer must inspect Bash redirections too.
 */
export function extractWriteTargets(command) {
  const targets = [];
  const cmd = String(command || '');
  const redirect = /(?:^|[|;&]|\s)(?:>>?|\btee\b(?:\s+-a)?)\s+("[^"]+"|'[^']+'|[^\s|;&>]+)/g;
  let m;
  while ((m = redirect.exec(cmd)) !== null) {
    targets.push(m[1].replace(/^["']|["']$/g, ''));
  }
  return targets;
}

/** Full analysis over a piece of proposed content. */
export function analyzeContent(text, filePath, snapshot) {
  // Class B is schema-RELATIVE and must not be judged across repo boundaries.
  // The snapshot describes exactly one application; a SwanGuard migration
  // measured against SwanStudios' 152 tables reported every SwanGuard table as
  // "referential drift" (found 2026-08-18, CM1). Skipping class B for foreign
  // files removes ONLY the check that cannot be meaningful there. Classes A
  // (destructive), C (unbounded) and D (reversibility) are schema-independent
  // and still run on every file, in every repo.
  const norm = (p) => String(p).replace(/\\/g, '/').toLowerCase();
  // A RELATIVE path is by definition relative to the gate's own cwd — this repo — so it is
  // NEVER foreign. Only an ABSOLUTE path pointing outside the snapshot's repo is.
  // REGRESSION CAUGHT 2026-08-19 by this guard's own suite: the first cut compared a
  // relative path ('backend/migrations/x.cjs') against an absolute repo root, failed the
  // prefix test, and silently skipped class B for files that ARE in this repo. That is a
  // hole, not a narrowing — the exact thing these changes must never introduce.
  const isAbsolute = /^(?:[a-z]:[\\/]|[\\/])/i.test(String(filePath));
  const foreign = Boolean(
    snapshot && snapshot._repoRoot && filePath && isAbsolute &&
    !norm(filePath).startsWith(norm(snapshot._repoRoot) + '/'),
  );
  return [
    ...(foreign ? [] : checkReferences(text, snapshot)),
    ...checkDestructive(text),
    ...checkUnbounded(text),
    ...checkReversibility(text, filePath),
  ];
}
