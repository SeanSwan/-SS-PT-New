import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const syncScriptUrl = pathToFileURL(join(repoRoot, 'scripts', 'plaud-official-sync', 'swan-plaud-official-sync.mjs')).href;
const launcherPath = join(repoRoot, 'scripts', 'launchers', 'Start-Swan-Plaud-Official-Sync.ps1');
const healthCheckPath = join(repoRoot, 'scripts', 'qa', 'check-plaud-official-sync.mjs');
const tmpRoot = join(process.cwd(), 'tmp', 'swan-plaud-official-sync-dry-run-test');
const execFileAsync = promisify(execFile);

async function runSyncSnippet(body) {
  const script = `
    import * as mod from ${JSON.stringify(syncScriptUrl)};
    const result = await (async () => {
${body}
    })();
    process.stdout.write(JSON.stringify(result));
  `;
  const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout || 'null');
}

describe('Swan official Plaud sync dry-run mode', () => {
  beforeEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    await mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('discovers Plaud recordings without downloading, uploading, or writing state', async () => {
    const statePath = join(tmpRoot, 'dry-run-state.json');
    const result = await runSyncSnippet(`
      const statePath = ${JSON.stringify(statePath)};
      const calls = [];
      const messages = [];
      const cliRunner = async (args) => {
        calls.push(args.join(' '));
        if (args[0] === 'me') return { stdout: '{"email":"operator@example.test"}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') {
          return {
            stdout: JSON.stringify({
              files: [{
                id: 'rec_dry_123',
                name: 'jackie-session.m4a',
                created_at: '2026-02-10T18:00:00.000Z',
              }],
            }),
            stderr: '',
            exitCode: 0,
          };
        }
        throw new Error(\`dry-run should not call Plaud \${args.join(' ')}\`);
      };
      const summary = await mod.syncOnce({
        statePath,
        dryRun: true,
        cliRunner,
        fetchImpl: async () => {
          throw new Error('dry-run should not fetch audio or upload to Swan');
        },
        logger: { info: (message) => messages.push(message), error() {}, warn() {} },
      });
      return { summary, calls, messages };
    `);

    expect(result.summary).toMatchObject({
      dryRun: true,
      discovered: 1,
      uploaded: [],
      failed: [],
      skipped: [{
        id: 'rec_dry_123',
        name: 'jackie-session.m4a',
        recordedAt: '2026-02-10T18:00:00.000Z',
        reason: 'dry_run',
      }],
    });
    expect(result.calls).toEqual(['me', 'recent --days 7']);
    expect(result.messages[0]).toContain('dry-run skipped rec_dry_123');
    await expect(readFile(statePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('parses dry-run from CLI args and environment', async () => {
    const result = await runSyncSnippet(`
      const tmpRoot = ${JSON.stringify(tmpRoot)};
      let invalidMessage = null;
      try {
        mod.parseArgs(['--api-base-url', 'https://sswanstudios.com/api'], { LOCALAPPDATA: tmpRoot });
      } catch (error) {
        invalidMessage = error.message;
      }
      return {
        dryRunArg: mod.parseArgs(['--dry-run'], { LOCALAPPDATA: tmpRoot }).dryRun,
        dryRunTrue: mod.parseArgs([], { LOCALAPPDATA: tmpRoot, SWAN_PLAUD_DRY_RUN: 'true' }).dryRun,
        dryRunOne: mod.parseArgs([], { LOCALAPPDATA: tmpRoot, SWAN_PLAUD_DRY_RUN: '1' }).dryRun,
        dryRunDefault: mod.parseArgs([], { LOCALAPPDATA: tmpRoot }).dryRun,
        invalidMessage,
      };
    `);

    expect(result.dryRunArg).toBe(true);
    expect(result.dryRunTrue).toBe(true);
    expect(result.dryRunOne).toBe(true);
    expect(result.dryRunDefault).toBe(false);
    expect(result.invalidMessage).toBe('apiBaseUrl must be an origin URL');
  });

  it('validates API base before any Plaud CLI calls even in dry-run mode', async () => {
    const result = await runSyncSnippet(`
      const calls = [];
      let message = null;
      try {
        await mod.syncOnce({
          statePath: ${JSON.stringify(join(tmpRoot, 'invalid-api-state.json'))},
          apiBaseUrl: 'https://sswanstudios.com/api',
          dryRun: true,
          cliRunner: async (args) => {
            calls.push(args.join(' '));
            return { stdout: '{}', stderr: '', exitCode: 0 };
          },
          logger: { info() {}, error() {}, warn() {} },
        });
      } catch (error) {
        message = error.message;
      }
      return { message, calls };
    `);

    expect(result.message).toBe('apiBaseUrl must be an origin URL');
    expect(result.calls).toEqual([]);
  });

  it('does not treat inherited Object keys as already-uploaded recording ids', async () => {
    const statePath = join(tmpRoot, 'object-key-state.json');
    const summary = await runSyncSnippet(`
      const statePath = ${JSON.stringify(statePath)};
      const cliRunner = async (args) => {
        if (args[0] === 'me') return { stdout: '{}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') {
          return {
            stdout: JSON.stringify({ files: [{ id: 'toString', name: 'object-key.m4a' }] }),
            stderr: '',
            exitCode: 0,
          };
        }
        throw new Error(\`unexpected Plaud call \${args.join(' ')}\`);
      };
      return mod.syncOnce({
        statePath,
        dryRun: true,
        cliRunner,
        logger: { info() {}, error() {}, warn() {} },
      });
    `);

    expect(summary.skipped).toEqual([{
      id: 'toString',
      name: 'object-key.m4a',
      recordedAt: null,
      reason: 'dry_run',
    }]);
  });

  it('uses shell mode for Windows npx commands to avoid cmd spawn failures', async () => {
    const healthCheck = await readFile(healthCheckPath, 'utf8');
    const { seen, platform } = await runSyncSnippet(`
      let seen = null;
      const runner = mod.createPlaudCliRunner({
        commandParts: ['npx', '--yes', '@plaud-ai/cli'],
        execFileImpl: async (command, args, options) => {
          seen = { command, args, options };
          return { stdout: '{}', stderr: '' };
        },
      });
      await runner(['me']);
      return { seen, platform: process.platform };
    `);

    if (platform === 'win32') {
      expect(seen.command).toBe('npx.cmd');
      expect(seen.options.shell).toBe(true);
    } else {
      expect(seen.command).toBe('npx');
      expect(seen.options.shell).toBe(false);
    }
    expect(seen.args).toEqual(['--yes', '@plaud-ai/cli', 'me']);
    expect(healthCheck).toContain('usesWindowsShellCommand');
    expect(healthCheck).toContain('shell: usesWindowsShellCommand');
    expect(healthCheck).toContain('[redacted-token]');
    expect(healthCheck).toContain('[redacted]@');
    expect(healthCheck).toContain('access_token|accessToken|refresh_token|refreshToken|secret|password');
  });

  it('lets the PowerShell launcher dry-run without requesting a Swan upload token', async () => {
    const launcher = await readFile(launcherPath, 'utf8');

    expect(launcher).toContain('[switch]$DryRun');
    expect(launcher).toContain('function Invoke-NativeCommand');
    expect(launcher).toContain('$result = Invoke-NativeCommand -FilePath $npx.Source');
    expect(launcher).toContain('if ($result.ExitCode -ne 0)');
    expect(launcher).toContain('dryRun=$DryRun');
    expect(launcher).toContain('if (-not $DryRun) {');
    expect(launcher).toContain('$token = Get-UsableToken');
    expect(launcher).toContain('$env:SWAN_AUTH_TOKEN = $token');
    expect(launcher).toContain('$args += "--dry-run"');
    expect(launcher).toContain('Dry run: recordings will be discovered only, not downloaded or uploaded.');
    expect(launcher).toContain('$nodeExitCode = $LASTEXITCODE');
    expect(launcher).toContain('if ($nodeExitCode -ne 0) { exit $nodeExitCode }');
  });
});
