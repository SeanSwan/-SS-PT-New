/**
 * ============================================================================
 * FILE: useFileAttachment.ts
 * PURPOSE: Manages file attachment state for the Coach Assistant input bar
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Handles file selection, validation, preview generation, and cleanup.
 * Files are held in state until the message is sent, then included in
 * the FormData upload to the AI chat endpoint.
 *
 * HOW IT FITS IN THE APP:
 * FileAttachmentButton → triggers file input → useFileAttachment (this)
 *   → AttachmentPreview shows selected files
 *   → CoachInputBar includes files in send payload
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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/json',
];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useFileAttachment(): UseFileAttachmentReturn {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    setError(null);
    const newFiles = Array.from(fileList);

    // Validate count
    if (files.length + newFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validated: AttachedFile[] = [];
    for (const file of newFiles) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`${file.name}: unsupported file type`);
        continue;
      }
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: exceeds 10MB limit`);
        continue;
      }

      const previewUrl = IMAGE_TYPES.includes(file.type)
        ? URL.createObjectURL(file)
        : null;

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
      setFiles(prev => [...prev, ...validated]);
    }
  }, [files.length]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter(f => f.id !== id);
    });
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles(prev => {
      prev.forEach(f => {
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
