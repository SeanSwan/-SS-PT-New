import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const syncScriptUrl = pathToFileURL(join(repoRoot, 'scripts', 'plaud-official-sync', 'swan-plaud-official-sync.mjs')).href;
const officialLauncherPath = join(repoRoot, 'scripts', 'launchers', 'Start-Swan-Plaud-Official-Sync.ps1');
const officialInstallerPath = join(repoRoot, 'scripts', 'launchers', 'Install-Swan-Plaud-Official-Autostart.ps1');
const tmpRoot = join(process.cwd(), 'tmp', 'swan-plaud-official-sync-test');
const execNode = promisify(execFile);

async function runPlaudSnippet(source) {
  const { stdout } = await execNode(process.execPath, ['--input-type=module', '-e', source], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}

describe('Swan official Plaud CLI sync agent', () => {
  beforeEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    await mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('parses official CLI file lists from JSON and conservative text output', async () => {
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const json = mod.parsePlaudFilesOutput(JSON.stringify({
        files: [
          { id: 'rec_123', name: 'Bench notes.m4a', created_at: '2026-02-10T18:00:00.000Z' },
        ],
      }));
      const text = mod.parsePlaudFilesOutput('ID: rec_456\\nName: Squat notes\\nCreated: 2026-02-12T18:00:00Z');
      console.log(JSON.stringify({ json, text }));
    `);
    const result = JSON.parse(output);

    expect(result.json).toEqual([{
      id: 'rec_123',
      name: 'Bench notes.m4a',
      recordedAt: '2026-02-10T18:00:00.000Z',
    }]);
    expect(result.text[0]).toMatchObject({ id: 'rec_456' });
  });

  it('detects unauthenticated Plaud CLI output without leaking tokens', async () => {
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const message = 'AUTH_FAILED Token invalid or expired. Run plaud login. secret=abc123';
      const rawJwt = [
        ['eyJhbGciOi', 'JIUzI1NiIs', 'InR5cCI6Ik', 'pXVCJ9'].join(''),
        ['eyJzdWIiOi', 'JvcGVyYXRvciIs', 'ImlhdCI6MTcx', 'MDAwMDAwMH0'].join(''),
        ['sflKxwRJSMe', 'KKF2QT4fwp', 'MeJf36POk6y', 'JV_adQssw5c'].join(''),
      ].join('.');
      console.log(JSON.stringify({
        auth: mod.isPlaudAuthFailure({ stdout: '', stderr: message, exitCode: 1 }),
        httpAudio: mod.parsePlaudAudioUrl('http://localhost/internal-audio.m4a?token=secret'),
        httpsLocalAudio: mod.parsePlaudAudioUrl('https://localhost/internal-audio.m4a?token=secret'),
        httpsPrivateAudio: mod.parsePlaudAudioUrl('https://169.254.169.254/latest/meta-data?token=secret'),
        httpsMappedLoopbackAudio: mod.parsePlaudAudioUrl('https://[::ffff:127.0.0.1]/audio.m4a?token=secret'),
        httpsMappedPrivateAudio: mod.parsePlaudAudioUrl('https://[::ffff:c0a8:0001]/audio.m4a?token=secret'),
        httpsCredentialedAudio: mod.parsePlaudAudioUrl('https://operator:download-secret@plaud-download.example/audio.m4a?token=secret'),
        httpsAudio: mod.parsePlaudAudioUrl('https://plaud-download.example/audio.m4a?token=secret'),
        fdCdnAudio: mod.parsePlaudAudioUrl('https://fd-media.plaudcdn.com/audio.m4a?token=secret'),
        fcCdnAudio: mod.parsePlaudAudioUrl('https://fc-media.plaudcdn.com/audio.m4a?token=secret'),
        ulaAudio: mod.parsePlaudAudioUrl('https://[fd00::1]/audio.m4a?token=secret'),
        redacted: mod.redactForLog('download https://example.com/audio.m4a?token=secret-abc and https://operator:url-secret@example.com/audio.m4a?token=userinfo-secret and Bearer xyz jwt ' + rawJwt + ' "access_token": "pld_json_secret" token: pld_colon_secret password=hunter2 refresh_token=refresh-secret accessToken=camel-secret'),
        command: mod.defaultCliCommandParts({}).join(' '),
      }));
    `);
    const result = JSON.parse(output);

    expect(result.auth).toBe(true);
    expect(result.httpAudio).toBeNull();
    expect(result.httpsLocalAudio).toBeNull();
    expect(result.httpsPrivateAudio).toBeNull();
    expect(result.httpsMappedLoopbackAudio).toBeNull();
    expect(result.httpsMappedPrivateAudio).toBeNull();
    expect(result.httpsCredentialedAudio).toBeNull();
    expect(result.httpsAudio).toBe('https://plaud-download.example/audio.m4a?token=secret');
    expect(result.fdCdnAudio).toBe('https://fd-media.plaudcdn.com/audio.m4a?token=secret');
    expect(result.fcCdnAudio).toBe('https://fc-media.plaudcdn.com/audio.m4a?token=secret');
    expect(result.ulaAudio).toBeNull();
    expect(result.redacted).not.toContain('secret-abc');
    expect(result.redacted).not.toContain('Bearer xyz');
    expect(result.redacted).not.toContain('eyJhbGci');
    expect(result.redacted).not.toContain('pld_json_secret');
    expect(result.redacted).not.toContain('pld_colon_secret');
    expect(result.redacted).not.toContain('hunter2');
    expect(result.redacted).not.toContain('refresh-secret');
    expect(result.redacted).not.toContain('camel-secret');
    expect(result.redacted).not.toContain('url-secret');
    expect(result.redacted).not.toContain('userinfo-secret');
    expect(result.redacted).toContain('https://example.com/audio.m4a?[redacted]');
    expect(result.redacted).toContain('https://[redacted]@example.com/audio.m4a?[redacted]');
    expect(result.redacted).toContain('[redacted-token]');
    expect(result.command).toBe('npx --yes @plaud-ai/cli');
  });

  it('keeps launcher diagnostics token-safe and preserves StartNow config', async () => {
    const launcher = await readFile(officialLauncherPath, 'utf8');
    const installer = await readFile(officialInstallerPath, 'utf8');
    const startNowBlock = installer.slice(installer.indexOf('function Start-OfficialSyncNow'));

    expect(launcher).toContain('function Redact-LauncherText');
    expect(launcher).toContain('function Normalize-ApiBaseUrl');
    expect(launcher).toContain('[System.IO.Directory]::CreateDirectory($logDir)');
    expect(launcher).toContain('$ApiBaseUrl = Normalize-ApiBaseUrl -Value $ApiBaseUrl');
    expect(launcher.indexOf('$script:LogPath = Join-Path $localRoot "launcher.log"'))
      .toBeLessThan(launcher.indexOf('$ApiBaseUrl = Normalize-ApiBaseUrl -Value $ApiBaseUrl'));
    expect(installer).toContain('function Normalize-ApiBaseUrl');
    expect(installer).toContain('$ApiBaseUrl = Normalize-ApiBaseUrl -Value $ApiBaseUrl');
    expect(launcher).not.toMatch(/Plaud CLI auth check failed:\s*\$\(\$output\s+-join\s+' '\)/);
    expect(launcher).not.toMatch(/Write-Host\s+\$_.Exception.Message/);
    expect(launcher).toMatch(/\$safeOutput\s*=\s*Redact-LauncherText\s+-Value\s*\(\$output\s+-join\s+' '\)/);
    expect(launcher).toMatch(/\$safeError\s*=\s*Redact-LauncherText\s+-Value\s+\$_.Exception.Message/);
    expect(launcher).toContain('[redacted-token]');
    expect(launcher).toContain('[redacted]@');
    expect(launcher).toContain('access_token|accessToken|refresh_token|refreshToken|secret|password');
    expect(startNowBlock).toContain('"-ApiBaseUrl"');
    expect(startNowBlock).toContain('"`"$ApiBaseUrl`"');
    expect(startNowBlock).toContain('"-Days"');
    expect(startNowBlock).toContain('"$Days"');
    expect(startNowBlock).toContain('"-PollSeconds"');
    expect(startNowBlock).toContain('"$PollSeconds"');
  });

  it('normalizes unsafe CLI polling configuration to safe defaults', async () => {
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const env = {
        LOCALAPPDATA: ${JSON.stringify(tmpRoot)},
        SWAN_PLAUD_LOOKBACK_DAYS: '-3',
        SWAN_PLAUD_POLL_INTERVAL_MS: 'not-a-number',
      };
      const parsed = typeof mod.parseArgs === 'function'
        ? mod.parseArgs(['--days', '0', '--poll-interval-ms', '1000'], env)
        : { parseArgsType: typeof mod.parseArgs };
      console.log(JSON.stringify(parsed));
    `);
    const result = JSON.parse(output);

    expect(result.days).toBe(7);
    expect(result.intervalMs).toBe(5 * 60 * 1000);
  });

  it('falls back to the official CLI command when the command env is blank', async () => {
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      let executed = null;
      const runner = mod.createPlaudCliRunner({
        commandParts: ['   '],
        execFileImpl: async (command, args) => {
          executed = { command, args };
          return { stdout: '{}', stderr: '' };
        },
      });
      await runner(['me']);
      console.log(JSON.stringify({
        defaultCommand: mod.defaultCliCommandParts({}).join(' '),
        blankCommand: mod.defaultCliCommandParts({ SWAN_PLAUD_CLI_COMMAND: '   ' }).join(' '),
        executed,
      }));
    `);
    const result = JSON.parse(output);

    expect(result.defaultCommand).toBe('npx --yes @plaud-ai/cli');
    expect(result.blankCommand).toBe('npx --yes @plaud-ai/cli');
    expect(result.executed).toEqual({
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ['--yes', '@plaud-ai/cli', 'me'],
    });
  });

  it('allows only exact localhost HTTP API bases for development', async () => {
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const accepted = [
        mod.normalizeApiBaseUrl('https://sswanstudios.com/'),
        mod.normalizeApiBaseUrl('http://localhost:10000/'),
        mod.normalizeApiBaseUrl('http://LOCALHOST:10000/api/../'),
      ];
      const rejected = [];
      for (const value of [
        'http://localhost.evil.example',
        'http://127.0.0.1:10000',
        'http://sswanstudios.com',
        'https://operator@sswanstudios.com',
        'https://sswanstudios.com/api',
        'https://sswanstudios.com?debug=true',
        'https://sswanstudios.com#frag',
      ]) {
        try { mod.normalizeApiBaseUrl(value); }
        catch (error) { rejected.push({ value, message: error.message }); }
      }
      console.log(JSON.stringify({ accepted, rejected }));
    `);
    const result = JSON.parse(output);

    expect(result.accepted).toEqual(['https://sswanstudios.com', 'http://localhost:10000', 'http://localhost:10000']);
    expect(result.rejected).toEqual([
      { value: 'http://localhost.evil.example', message: 'apiBaseUrl must be HTTPS, except localhost development' },
      { value: 'http://127.0.0.1:10000', message: 'apiBaseUrl must be HTTPS, except localhost development' },
      { value: 'http://sswanstudios.com', message: 'apiBaseUrl must be HTTPS, except localhost development' },
      { value: 'https://operator@sswanstudios.com', message: 'apiBaseUrl must be an origin URL' },
      { value: 'https://sswanstudios.com/api', message: 'apiBaseUrl must be an origin URL' },
      { value: 'https://sswanstudios.com?debug=true', message: 'apiBaseUrl must be an origin URL' },
      { value: 'https://sswanstudios.com#frag', message: 'apiBaseUrl must be an origin URL' },
    ]);
  });

  it('keeps the background polling loop alive after one top-level sync failure', async () => {
    const statePath = join(tmpRoot, 'loop-retry-state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const events = { cliCalls: [], sleeps: [], errors: [] };
      let failedOnce = false;
      const cliRunner = async (args) => {
        events.cliCalls.push(args.join(' '));
        if (!failedOnce) {
          failedOnce = true;
          throw new Error('temporary network token=secret-123 https://plaud.example/audio.m4a?token=download-secret');
        }
        if (args[0] === 'me') return { stdout: '{}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [] }), stderr: '', exitCode: 0 };
        throw new Error('unexpected cli ' + args.join(' '));
      };
      await mod.runLoop({
        statePath: ${JSON.stringify(statePath)},
        authToken: 'swan-token',
        cliRunner,
        intervalMs: 7,
        once: false,
      }, {
        maxIterations: 2,
        sleepImpl: async (ms) => { events.sleeps.push(ms); },
        logger: { error: (message) => events.errors.push(message) },
      });
      console.log(JSON.stringify(events));
    `);
    const result = JSON.parse(output);

    expect(result.cliCalls).toEqual(['me', 'me', 'recent --days 7']);
    expect(result.sleeps).toEqual([7]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('sync cycle failed');
    expect(result.errors[0]).not.toContain('secret-123');
    expect(result.errors[0]).not.toContain('download-secret');
  });

  it('keeps useful redacted diagnostics when a cycle rejects a non-Error value', async () => {
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const events = { errors: [] };
      const cliRunner = async () => {
        throw 'temporary token=secret-123 https://plaud.example/audio.m4a?token=download-secret';
      };
      await mod.runLoop({
        statePath: ${JSON.stringify(join(tmpRoot, 'plain-rejection-state.json'))},
        authToken: 'swan-token',
        cliRunner,
        intervalMs: 1,
        once: false,
      }, {
        maxIterations: 1,
        sleepImpl: async () => {},
        logger: { error: (message) => events.errors.push(message) },
      });
      console.log(JSON.stringify(events));
    `);
    const result = JSON.parse(output);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('temporary');
    expect(result.errors[0]).not.toContain('secret-123');
    expect(result.errors[0]).not.toContain('download-secret');
  });
});
