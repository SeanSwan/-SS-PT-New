/**
 * Database Backup Script
 * ======================
 *
 * Purpose: Create timestamped PostgreSQL database backups
 *
 * Usage:
 *   node scripts/backup-database.mjs [description]
 *
 * Examples:
 *   node scripts/backup-database.mjs "before-phase-2-migration"
 *   node scripts/backup-database.mjs
 *
 * Output: backups/swanstudios_YYYYMMDD_HHMMSS_description.sql
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'swanstudios';
const DB_USER = process.env.DB_USER || 'swanadmin';
const DB_PASSWORD = process.env.DB_PASSWORD;

async function createBackup(description = '') {
  try {
    console.log('🗄️  DATABASE BACKUP UTILITY');
    console.log('===========================\n');

    // Create backups directory if it doesn't exist
    const backupsDir = join(__dirname, '..', 'backups');
    await mkdir(backupsDir, { recursive: true });
    console.log(`📁 Backups directory: ${backupsDir}`);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('.')[0]; // YYYYMMDD_HHMMSS

    const descSuffix = description ? `_${description.replace(/[^a-z0-9]/gi, '-')}` : '';
    const filename = `${DB_NAME}_${timestamp}${descSuffix}.sql`;
    const backupPath = join(backupsDir, filename);

    console.log(`📝 Creating backup: ${filename}`);
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`   User: ${DB_USER}\n`);

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env };
    if (DB_PASSWORD) {
      env.PGPASSWORD = DB_PASSWORD;
    }

    // Execute pg_dump
    const command = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F p -f "${backupPath}"`;

    console.log('⏳ Running pg_dump...');
    const { stdout, stderr } = await execAsync(command, { env });

    if (stderr && !stderr.includes('warning')) {
      console.warn('⚠️  Warnings:', stderr);
    }

    console.log('✅ Backup created successfully!\n');
    console.log('📊 Backup Details:');
    console.log(`   Path: ${backupPath}`);

    // Get file size
    const { stdout: sizeOutput } = await execAsync(`dir "${backupPath}"`, { shell: 'cmd.exe' });
    const sizeMatch = sizeOutput.match(/(\d[\d,]*)\s+\w+\.sql/);
    if (sizeMatch) {
      const sizeBytes = parseInt(sizeMatch[1].replace(/,/g, ''));
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      console.log(`   Size: ${sizeMB} MB`);
    }

    console.log(`   Created: ${new Date().toLocaleString()}\n`);

    // Restoration instructions
    console.log('📖 To restore this backup:');
    console.log(`   psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${backupPath}"\n`);

    return backupPath;

  } catch (error) {
    console.error('❌ Backup failed:', error.message);

    if (error.message.includes('pg_dump')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Ensure PostgreSQL client tools are installed');
      console.error('   2. Add PostgreSQL bin directory to PATH');
      console.error('   3. Verify database credentials in .env file');
      console.error('   4. Check database connection: psql -h localhost -U swanadmin -d swanstudios');
    }

    throw error;
  }
}

// ============================================================================
// SUPERSEDED 2026-08-04 — this script CANNOT back up production. Use backup-db.mjs.
// ============================================================================
// Measured, not assumed: it reads DB_HOST/DB_PORT/DB_NAME/DB_USER and never DATABASE_URL, never
// loads .env, and so defaults to localhost:5432/swanstudios as swanadmin. Against this project's
// production credentials it cannot connect at all — and run non-interactively it HANGS on pg_dump's
// password prompt until something kills it (observed: killed at 90s). It also wrote into
// backend/backups/, the same disk as the source, and never verified that its output could be
// restored.
//
// Refusing to run is the point. A backup tool that appears to work while backing up nothing is
// worse than no tool, because it stops you looking for a real one — which is exactly how this
// project ended up with a proven recovery path for its CODE and none for its DATA (SWA-122).
//
// The logic above is left intact rather than deleted, so nothing is lost if some local workflow
// depended on it; it just no longer runs by accident.
console.error('backup-database.mjs is SUPERSEDED and cannot back up production.');
console.error('');
console.error('  It targets localhost (never reads DATABASE_URL) and hangs on the password prompt.');
console.error('  Use the replacement, which dumps production and PROVES the dump restorable by');
console.error('  restoring it into a scratch database and comparing table and row counts:');
console.error('');
console.error('    npm run backup:db          (from backend/)');
console.error('    npm run backup:db:verify   re-verify existing dumps');
console.error('');
console.error('  To run this legacy script anyway, set SWAN_ALLOW_LEGACY_DB_BACKUP=1.');
if (process.env.SWAN_ALLOW_LEGACY_DB_BACKUP !== '1') process.exit(2);

// CLI interface
const description = process.argv[2] || '';
createBackup(description)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
