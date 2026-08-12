/**
 * FILE: config/config.qa.cjs
 * PURPOSE: Sequelize CLI config for the DISPOSABLE QA container ONLY.
 * OWNER: SwanStudios Mission QA.
 *
 * WHY THIS IS A SEPARATE FILE:
 * config/config.cjs is shared by development, test and production. Its `test`
 * environment defaults to localhost:5432 — the developer's own Postgres, not the
 * QA container — and it calls dotenv on the repo `.env`, so a stray PG_HOST or
 * DATABASE_URL there can silently redirect a migration. Adding a `qa` key to that
 * file would inherit both hazards.
 *
 * This file therefore:
 *   - does NOT load dotenv, so nothing in `.env` can redirect it
 *   - reads only SWAN_QA_DB_* variables, the same ones scripts/qa/qa-db.mjs uses
 *   - defaults to the loopback container on port 15433
 *   - defines exactly one environment, `qa`, so `--env production` against this
 *     config fails loudly instead of resolving to something real
 *
 * It is still not the safety boundary. `node scripts/qa/qa-db.mjs migrate` runs
 * the sentinel assertion first and refuses to migrate anything that has not
 * proven itself disposable. Run migrations through that, never directly.
 */

const host = process.env.SWAN_QA_DB_HOST || '127.0.0.1';
const port = Number(process.env.SWAN_QA_DB_PORT || '15433');

if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error(`config.qa.cjs: refusing host "${host}" — the QA database is loopback-only`);
}
if (port === 5432) {
  throw new Error('config.qa.cjs: refusing port 5432 — that is the developer Postgres, not the QA container');
}

module.exports = {
  qa: {
    username: process.env.SWAN_QA_DB_USER || 'swan_qa',
    password: process.env.SWAN_QA_DB_PASSWORD || 'swan_qa_local_only',
    database: process.env.SWAN_QA_DB_NAME || 'swan_qa',
    host,
    port,
    dialect: 'postgres',
    logging: false,
    // No SSL: this database never leaves loopback.
    dialectOptions: {},
  },
};
