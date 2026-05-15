import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  scanAudioFiles,
  syncOnce,
} from '../../../scripts/applaud-sync/swan-applaud-sync.mjs';

const tmpRoot = join(process.cwd(), 'tmp', 'swan-applaud-sync-agent-test');

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

    const candidates = await scanAudioFiles(tmpRoot, {
      nowMs: Date.now(),
      stableMs: 10_000,
      lookbackHours: 24,
    });

    expect(candidates.map((item) => item.filePath)).toEqual([stableAudio]);
    await expect(stat(notes)).resolves.toBeTruthy();
  });

  it('uploads a stable file through the PLAUD upload endpoint and deduplicates by fingerprint', async () => {
    const audio = join(tmpRoot, 'today-client.m4a');
    const statePath = join(tmpRoot, 'state.json');
    const recordedAt = new Date('2026-05-14T20:31:00.000Z');
    const nowMs = recordedAt.getTime() + 20_000;
    await writeFile(audio, Buffer.from('same recorder bytes'));
    await touchAt(audio, recordedAt);
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe('https://sswanstudios.com/api/plaud/clips/upload');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer test-token');
      expect(init.body.get('clipSource')).toBe('applaud_local_sync');
      expect(init.body.get('recordedAt')).toBe(recordedAt.toISOString());
      return new Response(JSON.stringify({
        success: true,
        clips: [{ clipId: '11111111-2222-3333-4444-555555555555', filename: 'today-client.m4a' }],
        rejected: [],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const first = await syncOnce({
      watchDir: tmpRoot,
      statePath,
      apiBaseUrl: 'https://sswanstudios.com',
      authToken: 'test-token',
      stableMs: 10_000,
      lookbackHours: 24,
      nowMs,
      fetchImpl,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
    const second = await syncOnce({
      watchDir: tmpRoot,
      statePath,
      apiBaseUrl: 'https://sswanstudios.com',
      authToken: 'test-token',
      stableMs: 10_000,
      lookbackHours: 24,
      nowMs,
      fetchImpl,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    expect(first.uploaded).toHaveLength(1);
    expect(second.uploaded).toHaveLength(0);
    expect(second.skipped.some((item) => item.reason === 'already_uploaded')).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
