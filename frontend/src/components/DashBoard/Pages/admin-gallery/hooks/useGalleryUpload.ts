/**
 * useGalleryUpload — the upload engine
 * ====================================
 * Ports the PROVEN archived upload flow: upload photos ONE AT A TIME to
 * /upload-single with live per-file progress, a 1.5s inter-file gap (server GC),
 * mid-batch cancel, live grid insertion, and retry-failed. A single file failing
 * never aborts the batch.
 *
 * A run-generation guard (runIdRef) makes reset()/gallery-switch abandon any
 * older loop cleanly (aborts its in-flight request, stops it mutating state).
 */

import { useCallback, useRef, useState } from 'react';
import { uploadSinglePhoto } from '../adminGalleryApi';
import { UPLOAD_LIMITS, type GalleryPhoto, type UploadFileStatus } from '../types';

const INTER_FILE_GAP_MS = 1500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface UploadResultMessage {
  tone: 'ok' | 'warn' | 'error';
  text: string;
}

interface UseGalleryUpload {
  fileStatuses: UploadFileStatus[];
  uploading: boolean;
  overallProgress: number;
  resultMessage: UploadResultMessage | null;
  failedCount: number;
  start: (eventId: number, files: File[], watermark: boolean, onPhotoUploaded: (p: GalleryPhoto) => void) => Promise<void>;
  retryFailed: (eventId: number, watermark: boolean, onPhotoUploaded: (p: GalleryPhoto) => void) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useGalleryUpload(): UseGalleryUpload {
  const [fileStatuses, setFileStatuses] = useState<UploadFileStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [resultMessage, setResultMessage] = useState<UploadResultMessage | null>(null);

  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const failedFilesRef = useRef<File[]>([]);
  const runIdRef = useRef(0);

  const setStatusAt = useCallback((index: number, patch: Partial<UploadFileStatus>) => {
    setFileStatuses((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }, []);

  const runUpload = useCallback(
    async (eventId: number, files: File[], watermark: boolean, onPhotoUploaded: (p: GalleryPhoto) => void) => {
      if (!files.length) return;

      // ── client-side pre-flight ──
      if (files.length > UPLOAD_LIMITS.maxFiles) {
        setResultMessage({ tone: 'error', text: `Too many files — max ${UPLOAD_LIMITS.maxFiles} per batch.` });
        return;
      }
      const oversized = files.filter((f) => f.size > UPLOAD_LIMITS.maxSizeMB * 1024 * 1024);
      if (oversized.length) {
        setResultMessage({
          tone: 'error',
          text: `${oversized.length} file(s) exceed ${UPLOAD_LIMITS.maxSizeMB}MB. Export smaller JPEGs and retry.`,
        });
        return;
      }

      const myRun = (runIdRef.current += 1);
      cancelledRef.current = false;
      failedFilesRef.current = [];
      setResultMessage(null);
      setUploading(true);
      setOverallProgress(0);
      setFileStatuses(files.map((f) => ({ name: f.name, status: 'pending', progress: 0 })));

      let uploaded = 0;

      for (let i = 0; i < files.length; i += 1) {
        if (runIdRef.current !== myRun) return; // reset/newer run superseded us — abandon silently
        if (cancelledRef.current) {
          setFileStatuses((prev) =>
            prev.map((s, idx) => (idx >= i && s.status !== 'done' ? { ...s, status: 'error', error: 'Cancelled' } : s)));
          break;
        }

        setStatusAt(i, { status: 'uploading', progress: 0 });
        abortRef.current = new AbortController();

        const result = await uploadSinglePhoto(eventId, files[i], {
          watermark,
          signal: abortRef.current.signal,
          onProgress: (percent) =>
            setStatusAt(i, { progress: percent, status: percent >= 100 ? 'processing' : 'uploading' }),
        });

        if (runIdRef.current !== myRun) return; // superseded during the await — don't touch state

        if (result.success && result.photo) {
          uploaded += 1;
          setStatusAt(i, { status: 'done', progress: 100 });
          onPhotoUploaded(result.photo);
        } else {
          setStatusAt(i, { status: 'error', error: result.error });
          if (result.error !== 'Cancelled') failedFilesRef.current.push(files[i]);
        }

        setOverallProgress(Math.round(((i + 1) / files.length) * 100));

        const isLast = i === files.length - 1;
        if (!isLast && !cancelledRef.current) await sleep(INTER_FILE_GAP_MS);
      }

      if (runIdRef.current !== myRun) return; // superseded during the final gap — abandon

      setUploading(false);
      setOverallProgress(100);

      const failed = failedFilesRef.current.length;
      if (cancelledRef.current) {
        setResultMessage({ tone: 'warn', text: `Upload cancelled — ${uploaded} photo(s) saved before stopping.` });
      } else if (uploaded && failed) {
        setResultMessage({ tone: 'warn', text: `${uploaded} uploaded, ${failed} failed. Retry the failed files below.` });
      } else if (uploaded) {
        setResultMessage({ tone: 'ok', text: `All ${uploaded} photo(s) uploaded successfully.` });
      } else {
        setResultMessage({ tone: 'error', text: 'No photos uploaded. Check the errors below and retry.' });
      }
    },
    [setStatusAt],
  );

  const start = useCallback(
    (eventId: number, files: File[], watermark: boolean, onPhotoUploaded: (p: GalleryPhoto) => void) =>
      runUpload(eventId, files, watermark, onPhotoUploaded),
    [runUpload],
  );

  const retryFailed = useCallback(
    (eventId: number, watermark: boolean, onPhotoUploaded: (p: GalleryPhoto) => void) => {
      const files = failedFilesRef.current;
      if (!files.length) return Promise.resolve();
      return runUpload(eventId, files, watermark, onPhotoUploaded);
    },
    [runUpload],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1; // invalidate any in-flight loop
    cancelledRef.current = false;
    abortRef.current?.abort();
    failedFilesRef.current = [];
    setFileStatuses([]);
    setUploading(false);
    setOverallProgress(0);
    setResultMessage(null);
  }, []);

  return {
    fileStatuses,
    uploading,
    overallProgress,
    resultMessage,
    failedCount: failedFilesRef.current.length,
    start,
    retryFailed,
    cancel,
    reset,
  };
}
