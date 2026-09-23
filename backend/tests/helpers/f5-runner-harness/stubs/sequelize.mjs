/**
 * F5 harness — intercepted DATABASE boundary.
 *
 * Astra RT-4/F5 (2026-09-20) asked for the runner's real control flow to be
 * executed against intercepted database, child-process and exit boundaries,
 * instead of asserting on the runner's source text.
 *
 * This module replaces the `sequelize` specifier for the duration of a harness
 * run (see ../hooks.mjs). It is deliberately dumb: it records every query and
 * answers the two queries safe-migrate.mjs actually issues.
 *
 * WHAT THIS PROVES: the set of writes the runner ATTEMPTS against SequelizeMeta.
 * WHAT THIS DOES NOT PROVE: that PostgreSQL accepts them. That is a schema
 * property, not a control-flow property, and it is out of scope here.
 */

/** Rows returned for `SELECT name FROM "SequelizeMeta"` — i.e. "already executed". */
let executedRows = [];

/** Every query the runner issued, in order. */
const queries = [];

export function setExecutedRows(names) {
  executedRows = [...names];
}

export function getQueries() {
  return queries;
}

/** The writes that matter for H-03: attempts to record a migration as applied. */
export function getMetadataInserts() {
  return queries.filter(q => /INSERT\s+INTO\s+"SequelizeMeta"/i.test(q.sql));
}

export class Sequelize {
  constructor(...ctorArgs) {
    this.ctorArgs = ctorArgs;
    this.closed = false;
  }

  async authenticate() {
    return true;
  }

  async close() {
    this.closed = true;
    return true;
  }

  async query(sql, opts) {
    const normalised = String(sql).replace(/\s+/g, ' ').trim();
    queries.push({ sql: normalised, replacements: opts && opts.replacements });

    if (/FROM\s+"SequelizeMeta"/i.test(normalised)) {
      return [executedRows.map(name => ({ name })), executedRows.length];
    }
    return [[], 0];
  }
}

export default Sequelize;
