import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

export const UNVERIFIABLE_CODE = 'MIGRATION_PROBE_UNVERIFIABLE';
const unverifiable = (reason) => ({ state: 'UNVERIFIABLE', reason });

function installedCli(backendDir) {
  const cli = path.join(backendDir, 'node_modules', 'sequelize-cli', 'lib', 'sequelize');
  if (!fs.statSync(cli).isFile()) throw new Error('local CLI is not a file');
  return cli;
}

export function parseMigrationStatus(stdout, migrationName) {
  if (typeof stdout !== 'string' || !stdout.trim()) return unverifiable('local command returned no status output');
  const lines = stripVTControlCharacters(stdout).split(/\r?\n/).map((line) => line.trim());
  const targetLines = lines.filter((line) => line.includes(migrationName));
  const statuses = targetLines.map((line) => /^(up|down)\s+(\S+)$/.exec(line));
  if (statuses.length !== 1 || !statuses[0] || statuses[0][2] !== migrationName) {
    return unverifiable('local output has a missing, malformed, or duplicate target migration status');
  }
  return { state: statuses[0][1] === 'up' ? 'APPLIED' : 'PENDING' };
}

function commandFailure(error, timeoutMs) {
  if (error?.killed || error?.code === 'ETIMEDOUT') {
    return unverifiable(`local command timed out or was terminated (limit ${timeoutMs} ms)`);
  }
  if (error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return unverifiable('local status output exceeded the capture limit');
  // Never copy stderr/error.message: database clients can include credentials
  // or connection strings. A local error code is enough to direct diagnosis.
  const code = typeof error?.code === 'number' && Number.isInteger(error.code)
    ? String(error.code) : /^[A-Z][A-Z0-9_]{0,63}$/.test(error?.code || '') ? error.code : 'UNKNOWN';
  return unverifiable(`local command could not complete (${code})`);
}

export async function observeMigrationStatus({
  backendDir, migrationName, execFileImpl = execFile, resolveCli = installedCli,
  executable = process.execPath, timeoutMs = 15_000,
}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) return unverifiable('local command timeout must be positive');
  if (typeof migrationName !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(migrationName)) {
    return unverifiable('local target migration name is invalid');
  }
  let cli;
  try {
    cli = resolveCli(backendDir);
    if (typeof cli !== 'string' || !path.isAbsolute(cli)) return unverifiable('local CLI path is invalid');
  } catch {
    return unverifiable('local installed sequelize-cli entry point is unavailable');
  }
  return new Promise((resolve) => {
    try {
      // Node executes only an existing local file. No shell, npx, package
      // lookup/download, synchronous pipe capture, or automatic fallback.
      execFileImpl(executable, [cli, 'db:migrate:status', '--config', 'config/config.cjs',
        '--migrations-path', 'migrations', '--models-path', 'models', '--env', 'production'], {
        cwd: backendDir, encoding: 'utf8', shell: false, windowsHide: true,
        timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024,
      }, (error, stdout) => {
        resolve(error ? commandFailure(error, timeoutMs) : parseMigrationStatus(stdout, migrationName));
      });
    } catch (error) {
      resolve(commandFailure(error, timeoutMs));
    }
  });
}

export function createMigrationAppliedProbe(options) {
  return async () => {
    const result = await observeMigrationStatus(options);
    if (result.state === 'UNVERIFIABLE') {
      throw Object.assign(new Error(`Migration status UNVERIFIABLE: ${result.reason}. ` +
        'Check local backend dependencies, child-process permissions, and database configuration. ' +
        'No Render deployment conclusion was reached.'), { code: UNVERIFIABLE_CODE });
    }
    return result.state === 'APPLIED';
  };
}
