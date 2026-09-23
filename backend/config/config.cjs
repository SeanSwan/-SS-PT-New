const path = require('path');
const fs = require('fs');

/**
 * M-03 fix (hostile review of the review, 2026-09-18).
 *
 * This used to be `require('dotenv').config({ path: '../.env' })`. That path is
 * resolved against process.cwd(), so it only ever found the repo-root `.env`
 * when the process happened to start in `backend/`. Invoked from the repo root
 * — which is what `npm run migrate` does from the workspace root, and what any
 * tool that changes directory does — it silently loaded nothing and the config
 * the docs point at went unread. There is also a decoy `backend/.env` that
 * NEITHER the DB layer nor the migration CLI ever reads, so editing it produces
 * no effect and no error.
 *
 * Resolve against this file's own location instead, so the answer does not
 * depend on where the caller happened to be standing.
 */
const REPO_ROOT_ENV = path.resolve(__dirname, '..', '..', '.env');
require('dotenv').config({ path: REPO_ROOT_ENV });

if (!fs.existsSync(REPO_ROOT_ENV)) {
  console.warn(`[config] No .env at ${REPO_ROOT_ENV} — relying on process environment only.`);
}
if (fs.existsSync(path.resolve(__dirname, '..', '.env'))) {
  console.warn(
    '[config] backend/.env exists but is NOT read by the DB layer or the migration CLI. ' +
    `Edit ${REPO_ROOT_ENV} instead — see M-03 in the review ledger.`,
  );
}

/**
 * L-09 fix: no credential-shaped defaults.
 *
 * `password: process.env.PG_PASSWORD || 'postgres'` put a real-looking
 * credential literal in the repository. It is not a leak (it is a local
 * default), but it is the shape of one: it makes a misconfigured environment
 * look configured, and it teaches every reader that a password may be absent.
 * Absent now means absent, and PostgreSQL says so clearly.
 */
const devPassword = process.env.PG_PASSWORD || undefined;

module.exports = {
  development: {
    username: process.env.PG_USER || 'swanadmin',
    password: devPassword,
    database: process.env.PG_DB || 'swanstudios',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  },
  test: {
    username: process.env.PG_USER || 'swanadmin',
    password: devPassword,
    database: process.env.PG_DB_TEST || 'swanstudios_test',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    // Use the DATABASE_URL environment variable provided by Render
    // This is needed for Sequelize CLI migrations to work properly
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for Render PostgreSQL
      }
    },
    logging: false,
    pool: {
      max: 15,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
};
