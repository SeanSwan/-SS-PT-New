import { describe, expect, it } from 'vitest';
import {
  normalizeApiBaseUrl,
  normalizePlaudAudioContentType,
  parsePlaudAudioUrl,
  parsePlaudFilesOutput,
} from '../../../scripts/plaud-official-sync/swan-plaud-official-sync.parsers.mjs';

describe('Swan official Plaud parser hardening', () => {
  it('rejects reserved object-property file ids before they can index sync state', () => {
    const dangerousJson = parsePlaudFilesOutput(JSON.stringify({
      files: [
        { id: '__proto__', name: 'Bad proto.m4a' },
        { id: 'Constructor', name: 'Bad constructor.m4a' },
        { id: 'prototype', name: 'Bad prototype.m4a' },
        { id: 'rec_safe', name: 'Safe note.m4a' },
      ],
    }));
    const dangerousText = parsePlaudFilesOutput(
      'ID: constructor\nName: Bad text\n\nID: rec_text_safe\nName: Safe text',
    );

    expect(dangerousJson).toEqual([{
      id: 'rec_safe',
      name: 'Safe note.m4a',
      recordedAt: null,
    }]);
    expect(dangerousText).toEqual([{
      id: 'rec_text_safe',
      name: 'Safe text',
      recordedAt: null,
    }]);
  });

  it('parses JSON file lists even when CLI status logs contain brackets first', () => {
    const output = [
      '[plaud] fetching recent recordings',
      'sync status: ok',
      JSON.stringify({
        files: [
          { id: 'rec_after_log', name: 'After log.m4a', recorded_at: '2026-02-10T18:00:00Z' },
        ],
      }),
    ].join('\n');

    expect(parsePlaudFilesOutput(output)).toEqual([{
      id: 'rec_after_log',
      name: 'After log.m4a',
      recordedAt: '2026-02-10T18:00:00.000Z',
    }]);
  });

  it('skips unrelated JSON status fragments before the file-list JSON', () => {
    const output = [
      '[1]',
      JSON.stringify({ status: 'ok', count: 1 }),
      JSON.stringify({
        files: [
          { id: 'rec_after_status', name: 'After status.m4a', created_at: '2026-02-11T18:00:00Z' },
        ],
      }),
    ].join('\n');

    expect(parsePlaudFilesOutput(output)).toEqual([{
      id: 'rec_after_status',
      name: 'After status.m4a',
      recordedAt: '2026-02-11T18:00:00.000Z',
    }]);
  });

  it('does not treat single JSON status ids as recordings', () => {
    const output = [
      JSON.stringify({ id: 'job_123', status: 'ok' }),
      JSON.stringify({
        files: [
          { id: 'rec_after_job', name: 'After job.m4a', recorded_at: '2026-02-12T18:00:00Z' },
        ],
      }),
    ].join('\n');

    expect(parsePlaudFilesOutput(output)).toEqual([{
      id: 'rec_after_job',
      name: 'After job.m4a',
      recordedAt: '2026-02-12T18:00:00.000Z',
    }]);
  });

  it('does not treat loose text status ids as recordings', () => {
    const output = [
      'job id: sync_123',
      'status: ok',
      '',
      'ID: rec_text_after',
      'Name: good.m4a',
    ].join('\n');

    expect(parsePlaudFilesOutput(output)).toEqual([{
      id: 'rec_text_after',
      name: 'good.m4a',
      recordedAt: null,
    }]);
  });

  it('does not let text records borrow the next recording name', () => {
    const output = [
      'ID: rec_missing_name',
      '',
      'ID: rec_named',
      'Name: named.m4a',
    ].join('\n');

    expect(parsePlaudFilesOutput(output)).toEqual([
      { id: 'rec_missing_name', name: 'rec_missing_name.m4a', recordedAt: null },
      { id: 'rec_named', name: 'named.m4a', recordedAt: null },
    ]);
  });

  it('rejects non-Swan HTTPS API origins before they can receive auth tokens', () => {
    expect(normalizeApiBaseUrl('https://sswanstudios.com/')).toBe('https://sswanstudios.com');
    expect(normalizeApiBaseUrl('http://localhost:10000/')).toBe('http://localhost:10000');
    expect(() => normalizeApiBaseUrl('https://sswanstudios.com.evil.test'))
      .toThrow('apiBaseUrl host must be sswanstudios.com or localhost');
    expect(() => normalizeApiBaseUrl('https://api.sswanstudios.com'))
      .toThrow('apiBaseUrl host must be sswanstudios.com or localhost');
    expect(() => normalizeApiBaseUrl('https://sswanstudios.com:4443'))
      .toThrow('apiBaseUrl production origin must use the default HTTPS port');
  });

  it('blocks IPv6 local and special download ranges', () => {
    expect(parsePlaudAudioUrl('https://[fe80::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[fe90::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[febf::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[fec0::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[feff::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2002:7f00:1::]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2002:a00:1::]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2001:0:4136:e378:8000:63bf:3fff:fdd2]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2001:db8::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[3ffe::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[ff00::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[64:ff9b::7f00:1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[64:ff9b:1::7f00:1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[100::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2001:2::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2001:10::1]/audio.m4a?token=secret')).toBeNull();
    expect(parsePlaudAudioUrl('https://[2001:20::1]/audio.m4a?token=secret')).toBeNull();
  });

  it('skips blocked audio URLs and keeps scanning for a safe download URL', () => {
    const output = 'debug https://127.0.0.1/nope.m4a download https://cdn.plaud.example/audio.m4a';

    expect(parsePlaudAudioUrl(output)).toBe('https://cdn.plaud.example/audio.m4a');
  });

  it('keeps downloaded audio content-types aligned with the backend upload allowlist', () => {
    const accepted = [
      [null, 'audio/m4a'],
      ['', 'audio/m4a'],
      ['Audio/X-M4A; charset=utf-8', 'audio/x-m4a'],
      ['audio/mp4', 'audio/mp4'],
      ['audio/mpeg', 'audio/mpeg'],
      ['audio/wav', 'audio/wav'],
      ['audio/webm', 'audio/webm'],
      ['application/octet-stream', 'application/octet-stream'],
    ];
    for (const [input, output] of accepted) expect(normalizePlaudAudioContentType(input)).toBe(output);
    for (const value of ['audio/not-real', 'audio/', 'text/html', 'application/json']) {
      expect(() => normalizePlaudAudioContentType(value)).toThrow('PLAUD_AUDIO_UNSUPPORTED_TYPE');
    }
  });
});
