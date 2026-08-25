/**
 * shadow-table-extract.mjs — which tables does a migration touch?
 *
 * SIDE-EFFECT FREE ON PURPOSE, carved out of shadow-delta-audit.mjs the same way and for the
 * same reason ox-identity.mjs was carved out of ox-final-review.mjs: the audit script does its
 * work at import time, so a test could not import it without running a git diff and exiting.
 * A pure module is testable without a repo range, a database, or a network call.
 *
 * CONTRACT — the important part:
 *   returns string[]  → these are the tables, determined
 *   returns null      → COULD NOT DETERMINE. Not "no tables". The caller must treat this as
 *                       UNKNOWN coverage and fail closed.
 *
 * That distinction is the whole point. An earlier version returned [] for both cases, so a
 * migration this extractor could not read rendered as "OK: no added migration targets a
 * skipped table" — a reassuring line emitted by a check that had seen nothing. That is the
 * vacuous-green shape which produced three rejected review rounds on SWA-200, reproduced
 * inside the very helper written to close it. Found by testing the helper against real repo
 * history rather than trusting it.
 */

/**
 * @param {string} src  migration file source
 * @returns {string[]|null}  tables, or null when undeterminable
 */
export function tablesFromSource(src) {
  if (typeof src !== 'string' || src.trim() === '') return null;

  // const X = 'literal' / let X = "literal" — 4 of 125 migrations in this repo name their
  // table through a const rather than inline, and the first one this helper met was one of them.
  const consts = new Map();
  const cre = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  let cm;
  while ((cm = cre.exec(src)) !== null) consts.set(cm[1], cm[2]);

  const out = new Set();

  // queryInterface.<call>('table' | IDENT, ...)
  const CALLS = [
    'createTable', 'dropTable', 'addColumn', 'removeColumn', 'changeColumn', 'renameColumn',
    'addIndex', 'removeIndex', 'addConstraint', 'removeConstraint',
    'bulkUpdate', 'bulkDelete', 'bulkInsert', 'describeTable',
  ];
  for (const c of CALLS) {
    const re = new RegExp(c + String.raw`\(\s*(?:['"\`]([A-Za-z0-9_]+)['"\`]|([A-Za-z_$][\w$]*))`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m[1]) out.add(m[1]);
      else if (m[2] && consts.has(m[2])) out.add(consts.get(m[2]));
      // An identifier we cannot resolve is NOT added — inventing a table name would be worse
      // than admitting we do not know, which is what returning null below does.
    }
  }

  // Raw SQL: several migrations bypass queryInterface entirely via sequelize.query.
  const SQL = [
    /ALTER\s+TABLE\s+"?([A-Za-z0-9_]+)"?/gi,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
    /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi,
    /INSERT\s+INTO\s+"?([A-Za-z0-9_]+)"?/gi,
    /DELETE\s+FROM\s+"?([A-Za-z0-9_]+)"?/gi,
    /UPDATE\s+"?([A-Za-z0-9_]+)"?\s+SET/gi,
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+"?([A-Za-z0-9_]+)"?/gi,
  ];
  for (const re of SQL) {
    let m;
    while ((m = re.exec(src)) !== null) out.add(m[1]);
  }

  // Template interpolation into raw SQL: ALTER TABLE ${TABLE_NAME}
  const interp = /(?:ALTER\s+TABLE|UPDATE|INSERT\s+INTO|DELETE\s+FROM|CREATE\s+TABLE)\s+\$\{\s*([A-Za-z_$][\w$]*)\s*\}/gi;
  let im;
  while ((im = interp.exec(src)) !== null) {
    if (consts.has(im[1])) out.add(consts.get(im[1]));
  }

  // DECLARED ESCAPE.
  //
  // Some migrations compute their table set at runtime — this repo has one that loops an array
  // of FK descriptors doing `ALTER TABLE ${fk.src}`. No static extractor can read that, and
  // blocking every such migration forever is an outage, not a gate. So the author declares:
  //
  //     // shadow-tables: users, sessions, workout_logs
  //
  // Deliberate, greppable and reviewable — the same shape as the lane guard's --allow-foreign.
  // The alternative was printing OK for a file nothing had read.
  const decl = /\/\/\s*shadow-tables:\s*([^\n]+)/i.exec(src);
  if (decl) {
    for (const t of decl[1].split(',').map((x) => x.trim()).filter(Boolean)) out.add(t);
  }

  return out.size ? [...out] : null;
}
