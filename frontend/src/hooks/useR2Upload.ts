/**
 * useR2Upload — Presigned URL upload with progress + client-side hashing
 * ======================================================================
 * Implements the canonical Mode A/B upload flow:
 *   1. Client hashes file via hash-wasm (64MB chunks)
 *   2. Requests presigned PUT URL (Mode A if hash available, Mode B if not)
 *   3. Uploads directly to R2 with XHR progress tracking
 *   4. Calls upload-complete to verify + bind
 */

import { useState, useCallback, useRef } from 'react';

const API_BASE = '/api/v2/admin/videos';
const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB for streaming hash
const HASH_TIMEOUT_MS = 60_000; // 60s timeout

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export type UploadPhase = 'idle' | 'hashing' | 'requesting' | 'uploading' | 'verifying' | 'done' | 'error';

export interface UploadState {
  phase: UploadPhase;
  progress: number; // 0-100
  videoId: string | null;
  mode: 'A' | 'B' | null;
  error: string | null;
  checksumVerified: boolean;
}

export interface UseR2UploadReturn {
  state: UploadState;
  upload: (file: File) => Promise<{ videoId: string; mode: 'A' | 'B' } | null>;
  cancel: () => void;
  reset: () => void;
}

const INITIAL_STATE: UploadState = {
  phase: 'idle',
  progress: 0,
  videoId: null,
  mode: null,
  error: null,
  checksumVerified: false,
};

/**
 * Stream-hash a file using hash-wasm in 64MB chunks.
 * Returns hex string or null on timeout/error.
 */
async function hashFile(file: File, onProgress?: (pct: number) => void): Promise<string | null> {
  try {
    const { createSHA256 } = await import('hash-wasm');
    const hasher = await createSHA256();
    hasher.init();

    let offset = 0;
    const size = file.size;

    while (offset < size) {
      const end = Math.min(offset + CHUNK_SIZE, size);
      const chunk = await file.slice(offset, end).arrayBuffer();
      hasher.update(new Uint8Array(chunk));
      offset = end;
      onProgress?.(Math.round((offset / size) * 100));
    }

    return hasher.digest('hex');
  } catch (err) {
    console.warn('[useR2Upload] hash-wasm unavailable or failed:', err);
    return null;
  }
}

export function useR2Upload(): UseR2UploadReturn {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    cancelledRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setState(prev => ({ ...prev, phase: 'idle', error: 'Upload cancelled' }));
  }, []);

  const upload = useCallback(async (file: File): Promise<{ videoId: string; mode: 'A' | 'B' } | null> => {
    cancelledRef.current = false;
    setState({ ...INITIAL_STATE, phase: 'hashing' });

    try {
      // Step 1: Hash file (with timeout)
      let sha256hex: string | null = null;
      try {
        sha256hex = await Promise.race([
          hashFile(file, (pct) => setState(prev => ({ ...prev, progress: pct }))),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), HASH_TIMEOUT_MS)),
        ]);
      } catch {
        sha256hex = null;
      }

      if (cancelledRef.current) return null;
      setState(prev => ({ ...prev, phase: 'requesting', progress: 0 }));

      // Step 2: Request presigned URL + create draft row
      const urlRes = await fetch(`${API_BASE}/upload-url`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          fileSize: file.size,
          sha256hex,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Upload URL request failed (${urlRes.status})`);
      }

      const urlJson = await urlRes.json();
      const urlData = urlJson?.data ?? urlJson;
      const { videoId, uploadUrl, objectKey, mode } = urlData;

      if (cancelledRef.current) return null;
      setState(prev => ({ ...prev, phase: 'uploading', videoId, mode, progress: 0 }));

      // Step 3: Upload to R2 via presigned PUT
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setState(prev => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`R2 upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        // Mode A: include checksum header
        if (mode === 'A' && sha256hex) {
          const b64 = btoa(
            sha256hex.match(/.{2}/g)!.map(byte => String.fromCharCode(parseInt(byte, 16))).join('')
          );
          xhr.setRequestHeader('x-amz-checksum-sha256', b64);
        }

        xhr.send(file);
      });

      if (cancelledRef.current) return null;
      setState(prev => ({ ...prev, phase: 'verifying', progress: 100 }));

      // Step 4: Verify upload
      const completeRes = await fetch(`${API_BASE}/upload-complete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ videoId, objectKey }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Upload verification failed (${completeRes.status})`);
      }

      const completeJson = await completeRes.json();
      const result = completeJson?.data ?? completeJson;
      setState({
        phase: 'done',
        progress: 100,
        videoId,
        mode,
        error: null,
        checksumVerified: result.checksumVerified ?? false,
      });

      return { videoId, mode };
    } catch (err: any) {
      if (cancelledRef.current) return null;
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: err.message || 'Upload failed',
      }));
      return null;
    }
  }, []);

  return { state, upload, cancel, reset };
}

/* ─── Thumbnail Upload ──────────────────────────────────────────── */

export function useThumbnailUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadThumbnail = useCallback(async (videoId: string, file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      // Get presigned thumbnail URL
      const urlRes = await fetch(`${API_BASE}/thumbnail-url`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          videoId,
          filename: file.name,
          contentType: file.type || 'image/jpeg',
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get thumbnail upload URL');
      }

      const thumbJson = await urlRes.json();
      const thumbData = thumbJson?.data ?? thumbJson;
      // Backend returns { thumbnailUrl (presigned PUT), thumbnailKey }
      const { thumbnailUrl: uploadUrl, thumbnailKey } = thumbData;

      // Upload directly to R2
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!putRes.ok) throw new Error('Thumbnail upload failed');

      return thumbnailKey;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadThumbnail, uploading, error };
}
