/**
 * useFileAttachment — Coach Assistant attachment validation tests
 * ===============================================================
 * Locks the transcript-class file acceptance contract that the Swan-first
 * Coach Assistant transcript intake depends on:
 *
 *   1. Audio mime types are accepted (BLOCKER-1 fix from Phase 8 audit)
 *   2. Transcript-class files get the 50MB limit (aligned with
 *      backend/routes/workoutLogUploadRoutes.mjs:54 multer config)
 *   3. Non-transcript attachments still get the 10MB cap
 *   4. Only one transcript-class file allowed per send
 *   5. Image previews still work (regression lock for prior behavior)
 *
 * Helper exports `isTranscriptClassMime`, `hasTranscriptClassFile`, and
 * `countTranscriptClassFiles` are also locked here because the page-level
 * routing in handleSend depends on them.
 */
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFileAttachment,
  isTranscriptClassMime,
  hasTranscriptClassFile,
  countTranscriptClassFiles,
  TRANSCRIPT_CLASS_MIME_TYPES,
} from './useFileAttachment';

// jsdom does not provide URL.createObjectURL — stub before tests run.
beforeAll(() => {
  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: () => 'blob:test',
    });
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: () => {},
    });
  }
});

function makeFile(name: string, mime: string, sizeBytes: number): File {
  // jsdom File doesn't honor a constructor `size` prop; fake it via Object.defineProperty.
  const f = new File([new Uint8Array(1)], name, { type: mime });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
}

describe('useFileAttachment — transcript-class type acceptance', () => {
  it('exports the full set of transcript-class mime types', () => {
    // Locks the backend↔frontend contract: any mime added to the upload
    // route's multer filter must also be added here.
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/mp4');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/mpeg');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/wav');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/webm');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/ogg');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/x-m4a');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/m4a');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/aac');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/flac');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('audio/x-wav');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('text/plain');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('text/csv');
    expect(TRANSCRIPT_CLASS_MIME_TYPES).toContain('application/pdf');
  });

  it('isTranscriptClassMime distinguishes transcript files from chat attachments', () => {
    expect(isTranscriptClassMime('audio/mpeg')).toBe(true);
    expect(isTranscriptClassMime('audio/m4a')).toBe(true);
    expect(isTranscriptClassMime('text/plain')).toBe(true);
    expect(isTranscriptClassMime('application/pdf')).toBe(true);
    expect(isTranscriptClassMime('image/jpeg')).toBe(false);
    expect(isTranscriptClassMime('application/json')).toBe(false);
    expect(isTranscriptClassMime('')).toBe(false);
  });

  it('hasTranscriptClassFile returns true when at least one file is transcript-class', () => {
    expect(hasTranscriptClassFile([])).toBe(false);
    expect(
      hasTranscriptClassFile([
        { id: '1', file: new File([], 'a.png'), name: 'a.png', size: 100, type: 'image/png', previewUrl: null },
      ]),
    ).toBe(false);
    expect(
      hasTranscriptClassFile([
        { id: '1', file: new File([], 'a.png'), name: 'a.png', size: 100, type: 'image/png', previewUrl: null },
        { id: '2', file: new File([], 'b.mp3'), name: 'b.mp3', size: 100, type: 'audio/mpeg', previewUrl: null },
      ]),
    ).toBe(true);
  });

  it('countTranscriptClassFiles returns the exact transcript-class count', () => {
    expect(countTranscriptClassFiles([])).toBe(0);
    expect(
      countTranscriptClassFiles([
        { id: '1', file: new File([], 'a.png'), name: 'a.png', size: 100, type: 'image/png', previewUrl: null },
        { id: '2', file: new File([], 'b.mp3'), name: 'b.mp3', size: 100, type: 'audio/mpeg', previewUrl: null },
        { id: '3', file: new File([], 'c.txt'), name: 'c.txt', size: 100, type: 'text/plain', previewUrl: null },
      ]),
    ).toBe(2);
  });
});

describe('useFileAttachment — picker accepts transcript-class files', () => {
  it('accepts an audio/m4a file under 50MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('voice.m4a', 'audio/m4a', 8 * 1024 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].type).toBe('audio/m4a');
  });

  it('accepts an audio/mpeg file at exactly 50MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('big.mp3', 'audio/mpeg', 50 * 1024 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });

  it('rejects an audio file over 50MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('huge.mp3', 'audio/mpeg', 60 * 1024 * 1024)]);
    });
    expect(result.current.error).toMatch(/50MB limit/i);
    expect(result.current.files).toHaveLength(0);
  });

  it('accepts a text/plain transcript file', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('transcript.txt', 'text/plain', 50 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });

  it('accepts an application/pdf transcript file', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('notes.pdf', 'application/pdf', 100 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });
});

describe('useFileAttachment — non-transcript attachments still work', () => {
  it('accepts an image/png under 10MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('photo.png', 'image/png', 4 * 1024 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });

  it('rejects an image over 10MB (chat default cap unchanged)', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('big.png', 'image/png', 11 * 1024 * 1024)]);
    });
    expect(result.current.error).toMatch(/10MB limit/i);
    expect(result.current.files).toHaveLength(0);
  });

  it('rejects a fully unsupported mime type', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('virus.exe', 'application/octet-stream', 1024)]);
    });
    expect(result.current.error).toMatch(/unsupported file type/i);
    expect(result.current.files).toHaveLength(0);
  });
});

describe('useFileAttachment — single-transcript-per-send rule', () => {
  it('blocks adding a second transcript-class file to the same payload', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('one.mp3', 'audio/mpeg', 1024)]);
    });
    expect(result.current.files).toHaveLength(1);
    act(() => {
      result.current.addFiles([makeFile('two.m4a', 'audio/m4a', 1024)]);
    });
    // Second file rejected, error surfaced, original file preserved.
    expect(result.current.error).toMatch(/only one transcript-class file/i);
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('one.mp3');
  });

  it('blocks two transcript-class files added in the same call', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([
        makeFile('one.mp3', 'audio/mpeg', 1024),
        makeFile('two.m4a', 'audio/m4a', 1024),
      ]);
    });
    expect(result.current.error).toMatch(/only one transcript-class file/i);
    // First transcript file gets through, second is rejected.
    expect(result.current.files).toHaveLength(1);
  });

  it('allows mixing one transcript-class file with non-transcript files', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([
        makeFile('voice.mp3', 'audio/mpeg', 1024),
        makeFile('photo.png', 'image/png', 1024),
      ]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(2);
  });
});
