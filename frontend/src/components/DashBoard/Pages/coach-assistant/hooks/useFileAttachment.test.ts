/**
 * useFileAttachment - Coach Assistant attachment validation tests
 * ==============================================================
 * Locks the transcript-class file acceptance contract used by the live
 * Swan Coach Assistant composer.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useFileAttachment,
  isTranscriptClassMime,
  isAudioTranscriptMime,
  hasTranscriptClassFile,
  countTranscriptClassFiles,
  countAudioTranscriptFiles,
  hasOnlyAudioTranscriptFiles,
  TRANSCRIPT_CLASS_MIME_TYPES,
} from './useFileAttachment';

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
  const f = new File([new Uint8Array(1)], name, { type: mime });
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
}

describe('useFileAttachment transcript-class type acceptance', () => {
  it('exports the full set of transcript-class mime types', () => {
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

  it('distinguishes transcript files from chat attachments', () => {
    expect(isTranscriptClassMime('audio/mpeg')).toBe(true);
    expect(isTranscriptClassMime('audio/m4a')).toBe(true);
    expect(isTranscriptClassMime('text/plain')).toBe(true);
    expect(isTranscriptClassMime('application/pdf')).toBe(true);
    expect(isTranscriptClassMime('image/jpeg')).toBe(false);
    expect(isTranscriptClassMime('application/json')).toBe(false);
    expect(isTranscriptClassMime('')).toBe(false);
  });

  it('only classifies audio mime types as audio transcript files', () => {
    expect(isAudioTranscriptMime('audio/mpeg')).toBe(true);
    expect(isAudioTranscriptMime('audio/m4a')).toBe(true);
    expect(isAudioTranscriptMime('text/plain')).toBe(false);
    expect(isAudioTranscriptMime('application/pdf')).toBe(false);
    expect(isAudioTranscriptMime('image/png')).toBe(false);
  });

  it('detects and counts transcript-class files', () => {
    const files = [
      { id: '1', file: new File([], 'a.png'), name: 'a.png', size: 100, type: 'image/png', previewUrl: null },
      { id: '2', file: new File([], 'b.mp3'), name: 'b.mp3', size: 100, type: 'audio/mpeg', previewUrl: null },
      { id: '3', file: new File([], 'c.txt'), name: 'c.txt', size: 100, type: 'text/plain', previewUrl: null },
    ];
    expect(hasTranscriptClassFile([])).toBe(false);
    expect(hasTranscriptClassFile(files)).toBe(true);
    expect(countTranscriptClassFiles(files)).toBe(2);
    expect(countAudioTranscriptFiles(files)).toBe(1);
    expect(hasOnlyAudioTranscriptFiles(files)).toBe(false);
  });

  it('classifies audio-only PLAUD batches', () => {
    const files = [
      { id: '1', file: new File([], 'a.mp3'), name: 'a.mp3', size: 100, type: 'audio/mpeg', previewUrl: null },
      { id: '2', file: new File([], 'b.m4a'), name: 'b.m4a', size: 100, type: 'audio/m4a', previewUrl: null },
    ];
    expect(countAudioTranscriptFiles(files)).toBe(2);
    expect(hasOnlyAudioTranscriptFiles(files)).toBe(true);
  });
});

describe('useFileAttachment picker accepts transcript-class files', () => {
  it('accepts an audio/m4a file under 20MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('voice.m4a', 'audio/m4a', 8 * 1024 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].type).toBe('audio/m4a');
  });

  it('accepts an audio/mpeg file at exactly 20MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('big.mp3', 'audio/mpeg', 20 * 1024 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });

  it('rejects an audio file over 20MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('huge.mp3', 'audio/mpeg', 25 * 1024 * 1024)]);
    });
    expect(result.current.error).toMatch(/20MB limit/i);
    expect(result.current.files).toHaveLength(0);
  });

  it('accepts one document transcript file', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('transcript.txt', 'text/plain', 50 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });
});

describe('useFileAttachment non-transcript attachments still work', () => {
  it('accepts an image/png under 10MB', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('photo.png', 'image/png', 4 * 1024 * 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(1);
  });

  it('rejects an image over 10MB', () => {
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

  it('does not expose raw local filenames in unsupported-type errors', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([
        makeFile('Marcus-private@example.com.exe', 'application/octet-stream', 1024),
      ]);
    });
    expect(result.current.error).toMatch(/unsupported file type/i);
    expect(result.current.error).not.toContain('Marcus-private@example.com');
    expect(result.current.error).not.toContain('private@example.com');
  });

  it('does not expose raw local filenames in size-limit errors', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([
        makeFile('Marcus-private@example.com.mp3', 'audio/mpeg', 25 * 1024 * 1024),
      ]);
    });
    expect(result.current.error).toMatch(/20MB limit/i);
    expect(result.current.error).not.toContain('Marcus-private@example.com');
    expect(result.current.error).not.toContain('private@example.com');
  });
});

describe('useFileAttachment transcript batching rules', () => {
  it('allows multiple audio clips for a PLAUD batch', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('one.mp3', 'audio/mpeg', 1024)]);
    });
    act(() => {
      result.current.addFiles([makeFile('two.m4a', 'audio/m4a', 1024)]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(2);
    expect(hasOnlyAudioTranscriptFiles(result.current.files)).toBe(true);
  });

  it('blocks adding a second document transcript to the same payload', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('one.txt', 'text/plain', 1024)]);
    });
    act(() => {
      result.current.addFiles([makeFile('two.pdf', 'application/pdf', 1024)]);
    });
    expect(result.current.error).toMatch(/only one text\/PDF transcript/i);
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].name).toBe('one.txt');
  });

  it('does not expose raw local filenames in transcript-batching errors', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([makeFile('first.txt', 'text/plain', 1024)]);
    });
    act(() => {
      result.current.addFiles([
        makeFile('Marcus-private@example.com.pdf', 'application/pdf', 1024),
      ]);
    });
    expect(result.current.error).toMatch(/only one text\/PDF transcript/i);
    expect(result.current.error).not.toContain('Marcus-private@example.com');
    expect(result.current.error).not.toContain('private@example.com');
  });

  it('blocks mixing audio clips with text/PDF transcripts', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([
        makeFile('one.mp3', 'audio/mpeg', 1024),
        makeFile('notes.txt', 'text/plain', 1024),
      ]);
    });
    expect(result.current.error).toMatch(/upload audio clips separately/i);
    expect(result.current.files).toHaveLength(1);
  });

  it('allows mixing one transcript-class file with non-transcript files', () => {
    const { result } = renderHook(() => useFileAttachment());
    act(() => {
      result.current.addFiles([
        makeFile('notes.txt', 'text/plain', 1024),
        makeFile('photo.png', 'image/png', 1024),
      ]);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.files).toHaveLength(2);
  });
});
