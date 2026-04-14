/**
 * ============================================================================
 * FILE: useFileAttachment.ts
 * PURPOSE: Manages file attachment state for the Coach Assistant input bar
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-14
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Handles file selection, validation, preview generation, and cleanup.
 * Files are held in state until the message is sent. The Coach Assistant
 * page then routes them based on type:
 *   - transcript-class files (audio/text/pdf): wired end-to-end. Route to
 *     POST /api/workout-logs/upload via useTranscriptIntake → review card
 *     → POST /api/admin/clients/:clientId/workouts on confirm.
 *   - other files (images / json): SELECTION still works (preview, remove,
 *     validation), but DELIVERY is NOT wired. The chat lane via
 *     useAIChat.sendMessageWithConversation accepts only
 *     (text, context, title, target, style) — no attachment payload — so
 *     non-transcript attachments are currently dropped on send. This is a
 *     known gap, scoped out of the Phase 9 transcript-intake slice.
 *
 * HOW IT FITS IN THE APP:
 * FileAttachmentButton → triggers file input → useFileAttachment (this)
 *   → AttachmentPreview shows selected files
 *   → CoachInputBar calls page handleSend
 *   → SwanCoachAssistantPage routes by type
 */

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────
const MAX_FILES = 5;

/** Default size cap for non-transcript attachments (images / json). */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Transcript-class file size limit. Aligned with the multer config at
 * backend/routes/workoutLogUploadRoutes.mjs:54 (50MB). Audio files exported
 * from PLAUD or recorded on phone routinely exceed 10MB; the chat-default
 * 10MB cap was rejecting real workouts before they ever hit the server.
 */
const TRANSCRIPT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Transcript-class mime types — files that the page routes through
 * POST /api/workout-logs/upload → transcript → parser pipeline.
 *
 * Must stay in sync with backend/routes/workoutLogUploadRoutes.mjs:58-66.
 * If you add a mime type here, also add it there (and vice versa).
 */
export const TRANSCRIPT_CLASS_MIME_TYPES = [
  // Audio (voice memos)
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
  // Text / docs that the parser also handles
  'text/plain',
  'text/csv',
  'application/pdf',
] as const;

const ALLOWED_TYPES: readonly string[] = [
  // Generic chat attachments
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/json',
  // Transcript-class types — accepted into the same input field, but
  // routed differently by the page (to /api/workout-logs/upload, not chat).
  ...TRANSCRIPT_CLASS_MIME_TYPES,
];

/**
 * Returns true if this mime type should be routed to the workout-log
 * upload pipeline instead of the chat AI endpoint.
 */
export function isTranscriptClassMime(mimeType: string): boolean {
  return (TRANSCRIPT_CLASS_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Returns true if any of the attached files is transcript-class.
 * Used by the page to decide whether handleSend should route to the
 * transcript intake flow.
 */
export function hasTranscriptClassFile(files: AttachedFile[]): boolean {
  return files.some((f) => isTranscriptClassMime(f.type));
}

/**
 * Returns the count of transcript-class files in the list. Used to enforce
 * the "exactly one transcript-class file per send" rule.
 */
export function countTranscriptClassFiles(files: AttachedFile[]): number {
  return files.filter((f) => isTranscriptClassMime(f.type)).length;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useFileAttachment(): UseFileAttachmentReturn {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const newFiles = Array.from(fileList);

      // Validate count
      if (files.length + newFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      // Enforce the single-transcript-class-per-send rule across both the
      // existing attachments and the new ones being added. The page also
      // re-checks this at send time as a defense in depth.
      const existingTranscriptCount = countTranscriptClassFiles(files);
      let incomingTranscriptCount = 0;

      const validated: AttachedFile[] = [];
      for (const file of newFiles) {
        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`${file.name}: unsupported file type`);
          continue;
        }

        const isTranscript = isTranscriptClassMime(file.type);

        // Enforce one-transcript-per-send. We do not silently drop the
        // second one — surface a clear error so the user sees it.
        if (isTranscript) {
          incomingTranscriptCount++;
          if (existingTranscriptCount + incomingTranscriptCount > 1) {
            setError(
              `${file.name}: only one transcript-class file is allowed per send. Remove the existing one first.`,
            );
            continue;
          }
        }

        // Validate size — transcript-class files get the 50MB cap to match
        // the upload route's multer config.
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
