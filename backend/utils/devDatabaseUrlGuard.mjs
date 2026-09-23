/**
 * H-06 guard — shared, connection-free core
 * ==========================================
 * Extracted from database.mjs so that standalone ops scripts (which build
 * their own Sequelize instance and therefore bypass the app's guarded
 * connection) can enforce the SAME rule with one line:
 *
 *   A non-production process whose DATABASE_URL points at a HOSTED database
 *   is refused unless SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL=1 is set.
 *
 * The 9 production SequelizeMeta rows in the review's §0 incident were
 * written because a dev-context command silently preferred the production
 * URL. Local/docker URLs stay allowed; the override is deliberately named
 * so that touching a hosted database from dev is always an explicit act.
 */

export const HOSTED_DB_PATTERN =
  /(render\.com|onrender\.com|amazonaws\.com|\.rds\.|azure\.|heroku|neon\.tech|supabase\.co|digitalocean)/i;

/**
 * Pure decision: may a non-production process use this DATABASE_URL?
 * @param {string|undefined} url
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {boolean}
 */
export function devDatabaseUrlAllowed(url, env = process.env) {
  if (!url) return false;
  if (!HOSTED_DB_PATTERN.test(url)) return true; // local/docker — normal dev
  return env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL === '1';
}

/**
 * Assert variant for standalone scripts that have NO local fallback (their
 * job is the hosted database — but reaching it from a non-production context
 * must be explicit). Prints a loud refusal and exits 1.
 *
 * No-op in production (NODE_ENV=production) — deploy tooling is unaffected.
 *
 * @param {string} scriptName - for the refusal message
 */
export function assertDevDatabaseUrlAllowed(scriptName) {
  if (process.env.NODE_ENV === 'production') return;

  const url = process.env.DATABASE_URL;
  if (!url) return; // scripts handle their own missing-URL messaging

  if (devDatabaseUrlAllowed(url)) {
    if (HOSTED_DB_PATTERN.test(url)) {
      console.warn(`⚠️  [${scriptName}] H-06 override active: connecting to a HOSTED database from a non-production process.`);
    }
    return;
  }

  console.error('');
  console.error(`⛔  [${scriptName}] H-06 guard: DATABASE_URL points at a HOSTED database`);
  console.error('    (render/rds/azure/neon/supabase/...) but this is NOT a production process.');
  console.error('    Refusing to run. Set SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL=1 only if you');
  console.error('    intend to touch that database.');
  console.error('');
  process.exit(1);
}
