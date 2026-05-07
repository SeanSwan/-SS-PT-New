/**
 * useFileAttachment.ts
 * ====================
 * Manages selected files for Swan Coach Assistant.
 *
 * Routing contract:
 * - Audio transcript files can be sent as a 1-5 file PLAUD batch.
 * - Text/PDF transcript files remain single-file review uploads.
 * - Images/JSON can still be selected and previewed, but non-transcript
 *   delivery remains outside this hook.
 */
import { useState, useCallback, useRef } from 'react';

export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string | null;
}

export interface UseFileAttachmentReturn {
  files: AttachedFile[];
  addFiles: (fileList: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  openFilePicker: () => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TRANSCRIPT_MAX_FILE_SIZE = 20 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const TRANSCRIPT_CLASS_MIME_TYPES = [
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/flac',
  'audio/x-wav',
  'text/plain',
  'text/csv',
  'application/pdf',
] as const;

const ALLOWED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/json',
  ...TRANSCRIPT_CLASS_MIME_TYPES,
];

export function isTranscriptClassMime(mimeType: string): boolean {
  return (TRANSCRIPT_CLASS_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isAudioTranscriptMime(mimeType: string): boolean {
  return isTranscriptClassMime(mimeType) && mimeType.startsWith('audio/');
}

export function hasTranscriptClassFile(files: AttachedFile[]): boolean {
  return files.some((f) => isTranscriptClassMime(f.type));
}

export function countTranscriptClassFiles(files: AttachedFile[]): number {
  return files.filter((f) => isTranscriptClassMime(f.type)).length;
}

export function countAudioTranscriptFiles(files: AttachedFile[]): number {
  return files.filter((f) => isAudioTranscriptMime(f.type)).length;
}

export function hasOnlyAudioTranscriptFiles(files: AttachedFile[]): boolean {
  return files.length > 0 && files.every((f) => isAudioTranscriptMime(f.type));
}

export function useFileAttachment(): UseFileAttachmentReturn {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const newFiles = Array.from(fileList);

      if (files.length + newFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      const existingTranscriptCount = countTranscriptClassFiles(files);
      const existingAudioCount = countAudioTranscriptFiles(files);
      const existingDocCount = existingTranscriptCount - existingAudioCount;
      let incomingAudioCount = 0;
      let incomingDocCount = 0;

      const validated: AttachedFile[] = [];
      for (const file of newFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`${file.name}: unsupported file type`);
          continue;
        }

        const isTranscript = isTranscriptClassMime(file.type);
        const isAudioTranscript = isAudioTranscriptMime(file.type);

        if (isTranscript) {
          if (isAudioTranscript) incomingAudioCount += 1;
          else incomingDocCount += 1;

          const totalAudio = existingAudioCount + incomingAudioCount;
          const totalDoc = existingDocCount + incomingDocCount;

          if (totalDoc > 1) {
            setError(`${file.name}: only one text/PDF transcript is allowed per send. Remove the existing one first.`);
            continue;
          }

          if (totalAudio > 0 && totalDoc > 0) {
            setError(`${file.name}: upload audio clips separately from text/PDF transcripts.`);
            continue;
          }
        }

        const sizeLimit = isTranscript ? TRANSCRIPT_MAX_FILE_SIZE : MAX_FILE_SIZE;
        if (file.size > sizeLimit) {
          const limitMb = Math.round(sizeLimit / 1024 / 1024);
          setError(`${file.name}: exceeds ${limitMb}MB limit`);
          continue;
        }

        const previewUrl = IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : null;

        validated.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
        });
      }

      if (validated.length > 0) {
        setFiles((prev) => [...prev, ...validated]);
      }
    },
    [files],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      return [];
    });
    setError(null);
  }, []);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return { files, addFiles, removeFile, clearFiles, error, inputRef, openFilePicker };
}
