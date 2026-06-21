import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeMaxAudioBytes } from '../../../scripts/plaud-official-sync/swan-plaud-official-sync.parsers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const syncScriptUrl = pathToFileURL(join(repoRoot, 'scripts', 'plaud-official-sync', 'swan-plaud-official-sync.mjs')).href;
const tmpRoot = join(process.cwd(), 'tmp', 'swan-plaud-official-sync-upload-test');
const execNode = promisify(execFile);

async function runPlaudSnippet(source) {
  const { stdout } = await execNode(process.execPath, ['--input-type=module', '-e', source], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}

describe('Swan official Plaud sync uploads', () => {
  beforeEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    await mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('uploads one Plaud file through Swan with official source and external id, then skips it by state', async () => {
    const statePath = join(tmpRoot, 'state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const calls = [];
      const cliRunner = async (args) => {
        calls.push(args.join(' '));
        if (args[0] === 'me') return { stdout: '{"email":"operator@example.test"}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [{
          id: 'rec_123',
          name: 'jackie-bench.m4a',
          created_at: '2026-02-10T18:00:00.000Z',
        }] }), stderr: '', exitCode: 0 };
        if (args[0] === 'audio') return { stdout: 'https://plaud-download.example/audio.m4a?token=download-secret', stderr: '', exitCode: 0 };
        throw new Error('unexpected cli ' + args.join(' '));
      };
      const fetchImpl = async (url, init = {}) => {
        if (url.startsWith('https://plaud-download.example/')) {
          return new Response(new Uint8Array([1, 2, 3, 4]), {
            status: 200,
            headers: { 'content-type': 'audio/m4a' },
          });
        }
        if (url !== 'https://sswanstudios.com/api/plaud/clips/upload') throw new Error('unexpected Swan URL ' + url);
        if (init.redirect !== 'manual') throw new Error('missing Swan redirect policy');
        if (init.headers.Authorization !== 'Bearer swan-token') throw new Error('missing Swan token');
        if (init.body.get('clipSource') !== 'plaud_official_sync') throw new Error('missing official source');
        if (init.body.get('clipExternalId') !== 'rec_123') throw new Error('missing external id');
        if (init.body.get('recordedAt') !== '2026-02-10T18:00:00.000Z') throw new Error('missing recordedAt');
        return new Response(JSON.stringify({
          success: true,
          clips: [{ clipId: '11111111-2222-3333-4444-555555555555', duplicate: false }],
          rejected: [],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      };
      const logger = { info() {}, warn() {}, error() {} };
      const config = {
        statePath: ${JSON.stringify(statePath)},
        apiBaseUrl: 'https://sswanstudios.com',
        authToken: 'swan-token',
        days: 7,
        cliRunner,
        fetchImpl,
        logger,
      };
      const first = await mod.syncOnce(config);
      const second = await mod.syncOnce(config);
      const state = JSON.parse(await (await import('node:fs/promises')).readFile(${JSON.stringify(statePath)}, 'utf8'));
      console.log(JSON.stringify({ first, second, calls, state }));
    `);
    const result = JSON.parse(output);

    expect(result.first.uploaded).toHaveLength(1);
    expect(result.second.skipped).toEqual([{ id: 'rec_123', reason: 'already_uploaded' }]);
    expect(result.calls.filter((item) => item === 'audio rec_123')).toHaveLength(1);
    expect(result.state.uploaded.rec_123.clipIds).toEqual(['11111111-2222-3333-4444-555555555555']);
  });

  it('does not mark a Swan rejected-only upload as uploaded', async () => {
    const statePath = join(tmpRoot, 'rejected-state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const cliRunner = async (args) => {
        if (args[0] === 'me') return { stdout: '{"email":"operator@example.test"}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [{
          id: 'rec_rejected',
          name: 'too-quiet.m4a',
          created_at: '2026-02-10T18:00:00.000Z',
        }] }), stderr: '', exitCode: 0 };
        if (args[0] === 'audio') return { stdout: 'https://plaud-download.example/audio.m4a?token=download-secret', stderr: '', exitCode: 0 };
        throw new Error('unexpected cli ' + args.join(' '));
      };
      const fetchImpl = async (url) => {
        if (url.startsWith('https://plaud-download.example/')) {
          return new Response(new Uint8Array([1, 2, 3, 4]), {
            status: 200,
            headers: { 'content-type': 'audio/m4a' },
          });
        }
        return new Response(JSON.stringify({
          success: true,
          clips: [],
          rejected: [{ filename: 'too-quiet.m4a', code: 'CLIP_TOO_SILENT', message: 'Audio is too quiet to process.' }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      };
      const logger = { info() {}, warn() {}, error() {} };
      const first = await mod.syncOnce({
        statePath: ${JSON.stringify(statePath)},
        apiBaseUrl: 'https://sswanstudios.com',
        authToken: 'swan-token',
        cliRunner,
        fetchImpl,
        logger,
      });
      const state = JSON.parse(await (await import('node:fs/promises')).readFile(${JSON.stringify(statePath)}, 'utf8'));
      console.log(JSON.stringify({ first, state }));
    `);
    const result = JSON.parse(output);

    expect(result.first.uploaded).toHaveLength(0);
    expect(result.first.failed[0]).toMatchObject({ id: 'rec_rejected' });
    expect(result.first.failed[0].error).toContain('CLIP_TOO_SILENT');
    expect(result.state.uploaded.rec_rejected).toBeUndefined();
    expect(result.state.failed.rec_rejected.error).toContain('CLIP_TOO_SILENT');
  });

  it('rejects oversized Plaud downloads before posting to Swan', async () => {
    const statePath = join(tmpRoot, 'oversized-state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const cliRunner = async (args) => {
        if (args[0] === 'me') return { stdout: '{}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [{ id: 'rec_big', name: 'big.m4a' }] }), stderr: '', exitCode: 0 };
        if (args[0] === 'audio') return { stdout: 'https://plaud-download.example/big.m4a', stderr: '', exitCode: 0 };
        throw new Error('unexpected cli');
      };
      const fetchImpl = async (url) => {
        if (!url.startsWith('https://plaud-download.example/')) throw new Error('Swan upload should not be called');
        return new Response(new Uint8Array([1]), {
          status: 200,
          headers: { 'content-type': 'audio/m4a', 'content-length': String(21 * 1024 * 1024) },
        });
      };
      const logger = { info() {}, warn() {}, error() {} };
      const result = await mod.syncOnce({
        statePath: ${JSON.stringify(statePath)},
        authToken: 'swan-token',
        cliRunner,
        fetchImpl,
        logger,
      });
      console.log(JSON.stringify(result));
    `);
    const result = JSON.parse(output);

    expect(result.uploaded).toEqual([]);
    expect(result.failed[0]).toMatchObject({ id: 'rec_big', error: 'PLAUD_AUDIO_TOO_LARGE' });
  });

  it('does not let malformed max-size env disable oversized download rejection', async () => {
    const statePath = join(tmpRoot, 'malformed-max-state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const oldLimit = process.env.SWAN_PLAUD_MAX_AUDIO_BYTES;
      process.env.SWAN_PLAUD_MAX_AUDIO_BYTES = 'Infinity';
      try {
        let swanCalls = 0;
        const cliRunner = async (args) => {
          if (args[0] === 'me') return { stdout: '{}', stderr: '', exitCode: 0 };
          if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [{ id: 'rec_limit_env', name: 'limit-env.m4a' }] }), stderr: '', exitCode: 0 };
          if (args[0] === 'audio') return { stdout: 'https://plaud-download.example/limit-env.m4a', stderr: '', exitCode: 0 };
          throw new Error('unexpected cli');
        };
        const fetchImpl = async (url) => {
          if (url.startsWith('https://plaud-download.example/')) {
            return new Response(new Uint8Array([1]), {
              status: 200,
              headers: { 'content-type': 'audio/m4a', 'content-length': String(21 * 1024 * 1024) },
            });
          }
          swanCalls += 1;
          return new Response(JSON.stringify({ success: true, clips: [{ clipId: 'clip_should_not_exist' }], rejected: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };
        const logger = { info() {}, warn() {}, error() {} };
        const result = await mod.syncOnce({
          statePath: ${JSON.stringify(statePath)},
          authToken: 'swan-token',
          cliRunner,
          fetchImpl,
          logger,
        });
        console.log(JSON.stringify({ result, swanCalls }));
      } finally {
        if (oldLimit === undefined) delete process.env.SWAN_PLAUD_MAX_AUDIO_BYTES;
        else process.env.SWAN_PLAUD_MAX_AUDIO_BYTES = oldLimit;
      }
    `);
    const result = JSON.parse(output);

    expect(result.swanCalls).toBe(0);
    expect(result.result.uploaded).toEqual([]);
    expect(result.result.failed[0]).toMatchObject({ id: 'rec_limit_env', error: 'PLAUD_AUDIO_TOO_LARGE' });
  });

  it('normalizes invalid max-size env values to the default cap', () => {
    const defaultCap = 20 * 1024 * 1024;

    expect(normalizeMaxAudioBytes('Infinity')).toBe(defaultCap);
    expect(normalizeMaxAudioBytes('-1')).toBe(defaultCap);
    expect(normalizeMaxAudioBytes('0.5')).toBe(defaultCap);
    expect(normalizeMaxAudioBytes('1048576.9')).toBe(1048576);
  });

  it('rejects explicit non-audio Plaud downloads before posting to Swan', async () => {
    const statePath = join(tmpRoot, 'html-state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const cliRunner = async (args) => {
        if (args[0] === 'me') return { stdout: '{}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [{ id: 'rec_html', name: 'not-audio.m4a' }] }), stderr: '', exitCode: 0 };
        if (args[0] === 'audio') return { stdout: 'https://plaud-download.example/not-audio', stderr: '', exitCode: 0 };
        throw new Error('unexpected cli');
      };
      const fetchImpl = async (url) => {
        if (!url.startsWith('https://plaud-download.example/')) throw new Error('Swan upload should not be called');
        return new Response(new TextEncoder().encode('<html>not audio</html>'), {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      };
      const logger = { info() {}, warn() {}, error() {} };
      const result = await mod.syncOnce({
        statePath: ${JSON.stringify(statePath)},
        authToken: 'swan-token',
        cliRunner,
        fetchImpl,
        logger,
      });
      console.log(JSON.stringify(result));
    `);
    const result = JSON.parse(output);

    expect(result.uploaded).toEqual([]);
    expect(result.failed[0]).toMatchObject({ id: 'rec_html', error: 'PLAUD_AUDIO_UNSUPPORTED_TYPE' });
  });

  it('blocks Plaud audio redirects instead of following them', async () => {
    const statePath = join(tmpRoot, 'redirect-state.json');
    const output = await runPlaudSnippet(`
      const mod = await import(${JSON.stringify(syncScriptUrl)});
      const cliRunner = async (args) => {
        if (args[0] === 'me') return { stdout: '{}', stderr: '', exitCode: 0 };
        if (args[0] === 'recent') return { stdout: JSON.stringify({ files: [{ id: 'rec_redirect', name: 'redirect.m4a' }] }), stderr: '', exitCode: 0 };
        if (args[0] === 'audio') return { stdout: 'https://plaud-download.example/redirect.m4a', stderr: '', exitCode: 0 };
        throw new Error('unexpected cli');
      };
      const fetchImpl = async (url, init = {}) => {
        if (url.startsWith('https://plaud-download.example/')) {
          if (init.redirect !== 'manual') throw new Error('DOWNLOAD_REDIRECT_POLICY_MISSING');
          return new Response(null, { status: 302, headers: { location: 'https://[::1]/audio.m4a' } });
        }
        throw new Error('Swan upload should not be called');
      };
      const logger = { info() {}, warn() {}, error() {} };
      const result = await mod.syncOnce({
        statePath: ${JSON.stringify(statePath)},
        authToken: 'swan-token',
        cliRunner,
        fetchImpl,
        logger,
      });
      console.log(JSON.stringify(result));
    `);
    const result = JSON.parse(output);

    expect(result.uploaded).toEqual([]);
    expect(result.failed[0]).toMatchObject({ id: 'rec_redirect', error: 'PLAUD_AUDIO_REDIRECT_BLOCKED' });
  });
});
