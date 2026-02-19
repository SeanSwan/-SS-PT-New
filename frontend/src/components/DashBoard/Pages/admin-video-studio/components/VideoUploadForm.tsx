/**
 * VideoUploadForm.tsx
 * ===================
 * Full video upload workflow with client-side SHA-256 hashing,
 * presigned URL upload to R2, and verification.
 *
 * Flow: File select -> SHA-256 hash (64MB chunked) -> Presigned URL -> XHR PUT -> Verify
 * Mode A: Verified upload (checksum header), Mode B: Fallback (no checksum)
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  Upload, FileVideo, X, Check, AlertCircle,
  Shield, ShieldOff, Link2, Loader,
} from 'lucide-react';
import { createSHA256 } from 'hash-wasm';

// ── Types ──────────────────────────────────────────────────────────────────
interface VideoUploadFormProps {
  onUploadComplete: (videoId: string) => void;
  onClose: () => void;
}

type UploadStage = 'idle' | 'hashing' | 'requesting' | 'uploading' | 'verifying' | 'success' | 'error';

// ── API helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const CHUNK_SIZE = 64 * 1024 * 1024; // 64 MB
const HASH_TIMEOUT = 60_000; // 60s

// ── Animations ─────────────────────────────────────────────────────────────
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 255, 0.2); }
  50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ── Styled Components ──────────────────────────────────────────────────────
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Modal = styled(motion.div)`
  background: rgba(10, 10, 26, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #94a3b8;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1.5rem;
`;

const DropZone = styled.div<{ $isDragging: boolean; $hasFile: boolean }>`
  border: 2px dashed ${p =>
    p.$isDragging ? '#00ffff' : p.$hasFile ? '#22c55e' : 'rgba(59, 130, 246, 0.4)'};
  border-radius: 12px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: ${p =>
    p.$isDragging
      ? 'rgba(0, 255, 255, 0.06)'
      : p.$hasFile
        ? 'rgba(34, 197, 94, 0.06)'
        : 'rgba(30, 58, 138, 0.15)'};

  &:hover {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.04);
  }
`;

const DropLabel = styled.p`
  color: #94a3b8;
  margin: 0.75rem 0 0;
  font-size: 0.9rem;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #e2e8f0;
  font-size: 0.95rem;
`;

const HiddenInput = styled.input`
  display: none;
`;

const ProgressWrap = styled.div`
  margin-top: 1.25rem;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #94a3b8;
  font-size: 0.82rem;
  margin-bottom: 0.4rem;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  width: ${p => p.$percent}%;
  background: linear-gradient(90deg, #3b82f6, #00ffff);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ModeBadge = styled.span<{ $mode: 'A' | 'B' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  margin-top: 0.75rem;
  background: ${p => (p.$mode === 'A' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)')};
  color: ${p => (p.$mode === 'A' ? '#22c55e' : '#eab308')};
  border: 1px solid ${p => (p.$mode === 'A' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)')};
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  color: #fca5a5;
  font-size: 0.88rem;
  margin-top: 1rem;
`;

const SuccessBox = styled(motion.div)`
  text-align: center;
  padding: 1.5rem 0;
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  border: 2px solid #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  animation: ${pulseGlow} 2s infinite;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.5rem;
  min-height: 44px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${p =>
    p.$variant === 'ghost'
      ? `
    background: transparent;
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #94a3b8;
    &:hover { background: rgba(59, 130, 246, 0.1); color: #e2e8f0; }
  `
      : `
    background: linear-gradient(135deg, #3b82f6, #00c8ff);
    border: none;
    color: #fff;
    &:hover { opacity: 0.9; transform: translateY(-1px); }
    &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  `}
`;

const SpeedInfo = styled.span`
  color: #64748b;
  font-size: 0.78rem;
`;

// ── Utility ────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// ── Component ──────────────────────────────────────────────────────────────
const VideoUploadForm: React.FC<VideoUploadFormProps> = ({ onUploadComplete, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [hashProgress, setHashProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [sha256hex, setSha256hex] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // ── Validate file ────────────────────────────────────────────────────
  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return `Unsupported file type: ${f.type}. Accepted: MP4, WebM, QuickTime.`;
    }
    if (f.size > MAX_SIZE) {
      return `File too large (${formatBytes(f.size)}). Maximum is 2 GB.`;
    }
    return null;
  }, []);

  // ── Handle file selection ────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setFile(f);
    setStage('idle');
    setSha256hex(null);
    setVideoId(null);
  }, [validateFile]);

  // ── Drag and drop ────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── SHA-256 hashing (64MB chunks, 60s timeout) ──────────────────────
  const computeHash = useCallback(async (f: File): Promise<string | null> => {
    setStage('hashing');
    setHashProgress(0);
    try {
      const hasher = await createSHA256();
      hasher.init();
      let offset = 0;
      const startTime = Date.now();

      while (offset < f.size) {
        if (Date.now() - startTime > HASH_TIMEOUT) {
          return null; // Mode B fallback
        }
        const end = Math.min(offset + CHUNK_SIZE, f.size);
        const chunk = f.slice(offset, end);
        const buffer = await chunk.arrayBuffer();
        hasher.update(new Uint8Array(buffer));
        offset = end;
        setHashProgress(Math.round((offset / f.size) * 100));
      }
      return hasher.digest('hex');
    } catch {
      return null; // Mode B fallback
    }
  }, []);

  // ── Upload pipeline ──────────────────────────────────────────────────
  const startUpload = useCallback(async () => {
    if (!file) return;
    setError(null);

    // Step 1: Hash
    const hash = await computeHash(file);
    setSha256hex(hash);

    // Step 2: Request presigned URL
    setStage('requesting');
    let presignRes: any;
    try {
      const resp = await fetch('/api/v2/admin/videos/upload-url', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          sha256hex: hash,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${resp.status}`);
      }
      presignRes = await resp.json();
    } catch (e: any) {
      setError(e.message || 'Failed to get upload URL');
      setStage('error');
      return;
    }

    const { uploadUrl, objectKey, videoId: vid } = presignRes;

    // Step 3: Upload to R2 via XHR
    setStage('uploading');
    setUploadProgress(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        let lastLoaded = 0;
        let lastTime = Date.now();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);

            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            if (dt > 0.5) {
              const speed = (e.loaded - lastLoaded) / dt;
              setUploadSpeed(`${formatBytes(speed)}/s`);
              lastLoaded = e.loaded;
              lastTime = now;
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Upload network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        if (hash) {
          xhr.setRequestHeader('x-amz-checksum-sha256', hexToBase64(hash));
        }
        xhr.send(file);
      });
    } catch (e: any) {
      setError(e.message);
      setStage('error');
      return;
    }

    // Step 4: Verify
    setStage('verifying');
    try {
      const resp = await fetch('/api/v2/admin/videos/upload-complete', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ videoId: vid, objectKey }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Verification failed');
      }
    } catch (e: any) {
      setError(e.message);
      setStage('error');
      return;
    }

    setVideoId(vid);
    setStage('success');
    onUploadComplete(vid);
  }, [file, computeHash, onUploadComplete]);

  // ── Render ───────────────────────────────────────────────────────────
  const mode: 'A' | 'B' = sha256hex ? 'A' : 'B';
  const isWorking = ['hashing', 'requesting', 'uploading', 'verifying'].includes(stage);

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Modal
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
      >
        <CloseBtn onClick={onClose} aria-label="Close upload form">
          <X size={18} />
        </CloseBtn>

        <Title>Upload Video</Title>

        <AnimatePresence mode="wait">
          {stage === 'success' && videoId ? (
            <SuccessBox
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <SuccessIcon><Check size={28} color="#22c55e" /></SuccessIcon>
              <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>Upload Complete</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.3rem' }}>
                Video ID: <code style={{ color: '#00ffff' }}>{videoId}</code>
              </p>
              <ModeBadge $mode={mode}>
                {mode === 'A' ? <Shield size={14} /> : <ShieldOff size={14} />}
                {mode === 'A' ? 'Mode A (Verified)' : 'Mode B (Pending Verification)'}
              </ModeBadge>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <ActionBtn $variant="ghost" onClick={onClose}>Close</ActionBtn>
                <ActionBtn onClick={() => {
                  setFile(null);
                  setStage('idle');
                  setSha256hex(null);
                  setVideoId(null);
                  setUploadProgress(0);
                  setHashProgress(0);
                  setError(null);
                }}>
                  <Upload size={16} /> Upload Another
                </ActionBtn>
              </div>
            </SuccessBox>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Drop zone */}
              <DropZone
                $isDragging={isDragging}
                $hasFile={!!file}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !isWorking && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Drop video file here or click to browse"
              >
                <HiddenInput
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
                {file ? (
                  <FileInfo>
                    <FileVideo size={22} color="#00ffff" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatBytes(file.size)}</div>
                    </div>
                  </FileInfo>
                ) : (
                  <>
                    <Upload size={36} color={isDragging ? '#00ffff' : '#3b82f6'} />
                    <DropLabel>
                      Drag & drop a video here, or <span style={{ color: '#00ffff', cursor: 'pointer' }}>browse</span>
                    </DropLabel>
                    <DropLabel style={{ fontSize: '0.78rem', color: '#475569' }}>
                      MP4, WebM, QuickTime &mdash; up to 2 GB
                    </DropLabel>
                  </>
                )}
              </DropZone>

              {/* Hash progress */}
              {stage === 'hashing' && (
                <ProgressWrap>
                  <ProgressLabel>
                    <span>Computing checksum...</span>
                    <span>{hashProgress}%</span>
                  </ProgressLabel>
                  <ProgressTrack>
                    <ProgressFill $percent={hashProgress} />
                  </ProgressTrack>
                </ProgressWrap>
              )}

              {/* Upload progress */}
              {stage === 'uploading' && (
                <ProgressWrap>
                  <ProgressLabel>
                    <span>Uploading...</span>
                    <span>{uploadProgress}% <SpeedInfo>{uploadSpeed}</SpeedInfo></span>
                  </ProgressLabel>
                  <ProgressTrack>
                    <ProgressFill $percent={uploadProgress} />
                  </ProgressTrack>
                </ProgressWrap>
              )}

              {/* Status messages */}
              {stage === 'requesting' && (
                <ProgressWrap>
                  <ProgressLabel>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Requesting upload URL...
                    </span>
                  </ProgressLabel>
                </ProgressWrap>
              )}

              {stage === 'verifying' && (
                <ProgressWrap>
                  <ProgressLabel>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Verifying upload...
                    </span>
                  </ProgressLabel>
                </ProgressWrap>
              )}

              {/* Mode badge after hashing */}
              {sha256hex !== null && stage !== 'hashing' && stage !== 'idle' && (
                <ModeBadge $mode={mode}>
                  {mode === 'A' ? <Shield size={14} /> : <ShieldOff size={14} />}
                  {mode === 'A' ? 'Mode A (Verified)' : 'Mode B (Pending Verification)'}
                </ModeBadge>
              )}

              {/* Error */}
              {error && (
                <ErrorBox>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{error}</span>
                </ErrorBox>
              )}

              {/* Action buttons */}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <ActionBtn $variant="ghost" onClick={onClose} disabled={isWorking}>
                  Cancel
                </ActionBtn>
                <ActionBtn
                  onClick={startUpload}
                  disabled={!file || isWorking}
                >
                  {isWorking ? (
                    <>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {stage === 'hashing' ? 'Hashing...' : stage === 'uploading' ? 'Uploading...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Start Upload
                    </>
                  )}
                </ActionBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </Overlay>
  );
};

export default VideoUploadForm;
