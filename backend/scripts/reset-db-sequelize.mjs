// backend/scripts/reset-db-sequelize.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location as a last resort
}

// Import the database and models
import sequelize from '../database.mjs';
// Import setupAssociations to ensure all associations are properly configured
import setupAssociations from '../setupAssociations.mjs';

/**
 * Refuse to run against a database we cannot PROVE is local.
 *
 * WHY: this script calls `sequelize.sync({ force: true })`, which DROPS AND RECREATES EVERY TABLE.
 * It imports `../database.mjs`, the same module the whole backend uses — and per CLAUDE.md, local
 * dev connects through DATABASE_URL to the PRODUCTION database for local/prod parity. So before
 * this guard, `npm run db:reset` would have dropped every table in production, with no prompt.
 *
 * FAIL-CLOSED BY DESIGN: the test is "can I prove this is local?", not "does this look remote?".
 * An unset or unrecognised DATABASE_URL refuses rather than proceeds, because the cost of a wrong
 * "allow" is total data loss and the cost of a wrong "deny" is typing one env var.
 *
 * Matches the existing house convention in scripts/setup-complete.mjs, which already gates its own
 * `sync({ force: true })` on ALLOW_DESTRUCTIVE_DB_RESET. Same variable on purpose — one flag to
 * reason about rather than a bespoke gate per script.
 */
function assertSafeToDropEverything() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isProvablyLocal = /(localhost|127\.0\.0\.1)/i.test(dbUrl);

  if (isProvablyLocal) return;

  if (process.env.ALLOW_DESTRUCTIVE_DB_RESET !== 'true') {
    throw new Error(
      'REFUSING TO RESET: DATABASE_URL is not provably local, and this script DROPS EVERY TABLE.\n'
      + '  If you genuinely intend to destroy all data in the target database, re-run with:\n'
      + '    ALLOW_DESTRUCTIVE_DB_RESET=true npm run db:reset\n'
      + '  Note: in this repo, local dev points at the PRODUCTION database (CLAUDE.md).',
    );
  }

  console.warn('⚠  ALLOW_DESTRUCTIVE_DB_RESET=true — dropping ALL tables on a NON-LOCAL database.');
}

// Execute the database reset
async function resetDatabase() {
  try {
    console.log('----- Database Reset Script -----');

    // Guard BEFORE anything destructive. Nothing automated invokes this script (verified: not in
    // render.yaml buildCommand/startCommand, not in .github/workflows, not in render-start.mjs),
    // so this gate cannot break a deploy.
    assertSafeToDropEverything();

    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // Setup associations before synchronizing models
    console.log('Setting up model associations...');
    setupAssociations();
    console.log('✅ Model associations configured successfully.');
    
    // Drop all tables and recreate them
    console.log('Dropping and recreating all tables...');
    await sequelize.sync({ force: true });
    console.log('✅ Database reset successfully. All tables have been recreated.');
    
    console.log('----- Database Reset Complete -----');
    
  } catch (error) {
    console.error(`❌ Database reset failed: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the database reset
resetDatabase().catch(error => {
  console.error(`Fatal error during database reset: ${error.message}`);
  process.exit(1);
});
