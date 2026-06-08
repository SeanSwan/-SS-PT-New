import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const syncScriptUrl = pathToFileURL(join(repoRoot, 'scripts', 'applaud-sync', 'swan-applaud-sync.mjs')).href;
const tmpRoot = join(process.cwd(), 'tmp', 'swan-applaud-sync-agent-test');
const execNode = promisify(execFile);

async function runApplaudSnippet(source) {
  const { stdout } = await execNode(process.execPath, ['--input-type=module', '-e', source], {
    cwd: repoRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}

async function touchOld(path, ageMs) {
  const when = new Date(Date.now() - ageMs);
  await utimes(path, when, when);
}

async function touchAt(path, when) {
  await utimes(path, when, when);
}

describe('Swan APPLAUD local sync agent', () => {
  beforeEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    await mkdir(tmpRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('scans only stable recent audio files and leaves other files untouched', async () => {
    const stableAudio = join(tmpRoot, 'client-a-set-1.m4a');
    const tooFreshAudio = join(tmpRoot, 'client-a-set-2.wav');
    const notes = join(tmpRoot, 'notes.txt');
    await writeFile(stableAudio, Buffer.from('stable audio bytes'));
    await writeFile(tooFreshAudio, Buffer.from('fresh audio bytes'));
    await writeFile(notes, 'not audio');
    await touchOld(stableAudio, 20_000);
    await touchOld(notes, 20_000);

    const output = await runApplaudSnippet(`
      import { scanAudioFiles } from ${JSON.stringify(syncScriptUrl)};
      const candidates = await scanAudioFiles(${JSON.stringify(tmpRoot)}, {
        nowMs: ${Date.now()},
        stableMs: 10_000,
        lookbackHours: 24,
      });
      console.log(JSON.stringify(candidates.map((item) => item.filePath)));
    `);

    expect(JSON.parse(output)).toEqual([stableAudio]);
    await expect(stat(notes)).resolves.toBeTruthy();
  });

  it('uploads a stable file through the PLAUD upload endpoint and deduplicates by fingerprint', async () => {
    const audio = join(tmpRoot, 'today-client.m4a');
    const statePath = join(tmpRoot, 'state.json');
    const recordedAt = new Date('2026-05-14T20:31:00.000Z');
    const nowMs = recordedAt.getTime() + 20_000;
    await writeFile(audio, Buffer.from('same recorder bytes'));
    await touchAt(audio, recordedAt);
    const output = await runApplaudSnippet(`
      import { syncOnce } from ${JSON.stringify(syncScriptUrl)};
      let calls = 0;
      const fetchImpl = async (url, init) => {
        calls += 1;
        if (url !== 'https://sswanstudios.com/api/plaud/clips/upload') throw new Error('unexpected upload URL');
        if (init.method !== 'POST') throw new Error('unexpected upload method');
        if (init.headers.Authorization !== 'Bearer test-token') throw new Error('missing auth token');
        if (init.body.get('clipSource') !== 'applaud_local_sync') throw new Error('missing clip source');
        if (init.body.get('recordedAt') !== ${JSON.stringify(recordedAt.toISOString())}) throw new Error('missing recordedAt');
        return new Response(JSON.stringify({
          success: true,
          clips: [{ clipId: '11111111-2222-3333-4444-555555555555', filename: 'today-client.m4a' }],
          rejected: [],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      };
      const logger = { info() {}, warn() {}, error() {} };
      const first = await syncOnce({
        watchDir: ${JSON.stringify(tmpRoot)},
        statePath: ${JSON.stringify(statePath)},
        apiBaseUrl: 'https://sswanstudios.com',
        authToken: 'test-token',
        stableMs: 10_000,
        lookbackHours: 24,
        nowMs: ${nowMs},
        fetchImpl,
        logger,
      });
      const second = await syncOnce({
        watchDir: ${JSON.stringify(tmpRoot)},
        statePath: ${JSON.stringify(statePath)},
        apiBaseUrl: 'https://sswanstudios.com',
        authToken: 'test-token',
        stableMs: 10_000,
        lookbackHours: 24,
        nowMs: ${nowMs},
        fetchImpl,
        logger,
      });
      console.log(JSON.stringify({
        firstUploaded: first.uploaded.length,
        secondUploaded: second.uploaded.length,
        secondAlreadySkipped: second.skipped.some((item) => item.reason === 'already_uploaded'),
        calls,
      }));
    `);
    const result = JSON.parse(output);

    expect(result.firstUploaded).toBe(1);
    expect(result.secondUploaded).toBe(0);
    expect(result.secondAlreadySkipped).toBe(true);
    expect(result.calls).toBe(1);
  });
});
