/**
 * F5 harness — the entry point a test calls.
 *
 * Spawns the driver in a real child process with the stubbed boundaries in
 * place, and returns the process outcome plus the driver's report.
 *
 * No temp files: the report travels back on stdout, between markers. A temp
 * directory would need a recursive delete per scenario, and recursive bulk
 * deletes in this environment are both rate-limited and the thing that turns a
 * green suite red for reasons unrelated to what is being tested.
 *
 * SAFETY: DATABASE_URL is forced to a dead loopback port. The stubs mean no
 * connection is ever attempted, but if the hooks ever failed to load, a real
 * Sequelize would be pointed at 127.0.0.1:1 — never at the production host that
 * may be present in the ambient environment.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** backend/ — the cwd the runner expects (it resolves migrations relative to it). */
const BACKEND = join(HERE, '..', '..', '..');

const MARKER = '@@F5_REPORT@@';

export function runRunner(spec, options = {}) {
  const result = spawnSync(process.execPath, [
    '--import', './tests/helpers/f5-runner-harness/register.mjs',
    './tests/helpers/f5-runner-harness/driver.mjs',
    options.env || 'production',
  ], {
    cwd: BACKEND,
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: 'postgres://127.0.0.1:1/none',
      // Neutralise anything the ambient environment (dotenv) may have set, so a
      // scenario tests the flag it names and nothing else.
      SWAN_MIGRATE_STRICT: '',
      SWAN_MIGRATE_ALLOW_FAILURE: '',
      F5_SCENARIO_JSON: JSON.stringify(spec),
      ...(options.runnerPath ? { F5_RUNNER_PATH: options.runnerPath } : {}),
      ...(options.extraEnv || {}),
    },
  });

  const stdout = result.stdout || '';
  const at = stdout.lastIndexOf(MARKER);
  let report = null;
  if (at >= 0) {
    const line = stdout.slice(at + MARKER.length).split('\n')[0];
    try {
      report = JSON.parse(line);
    } catch {
      report = null;
    }
  }

  return {
    status: result.status,
    signal: result.signal,
    stdout,
    stderr: result.stderr || '',
    report,
  };
}
