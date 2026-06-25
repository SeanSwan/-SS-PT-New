/**
 * VoiceUpload
 * ===========
 * Audio file upload button + in-browser recording for AI transcription.
 * Sends audio to the Whisper transcription endpoint and returns text.
 */
import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Paperclip, Loader2 } from 'lucide-react';
import { CS } from '../../styles/crystallineSwanTheme';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const UploadBtn = styled.button<{ $loading: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${CS.borderSubtle};
  background: rgba(0, 32, 96, 0.3);
  color: ${({ $loading }) => $loading ? CS.iceWing : CS.textMuted};
  cursor: ${({ $loading }) => $loading ? 'wait' : 'pointer'};
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: ${CS.wingPurple};
    color: ${CS.wingPurple};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${CS.wingPurple};
    outline-offset: 2px;
  }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
`;

const HiddenInput = styled.input`
  display: none;
`;

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

interface VoiceUploadProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceUpload: React.FC<VoiceUploadProps> = ({ onTranscript, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (uploading || disabled) return;
    fileInputRef.current?.click();
  }, [uploading, disabled]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    // Validate size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      onTranscript('[Error: File too large. Maximum 25MB.]');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch(`${API_BASE}/api/ai-chat/transcribe`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
        onTranscript(`[Transcription failed: ${errorData.error || res.statusText}]`);
        return;
      }

      const data = await res.json();
      if (data.success && data.text) {
        onTranscript(data.text);
      } else {
        onTranscript(`[Transcription failed: ${data.error || 'Unknown error'}]`);
      }
    } catch (err) {
      onTranscript('[Transcription failed: Network error]');
    } finally {
      setUploading(false);
    }
  }, [onTranscript]);

  return (
    <>
      <UploadBtn
        type="button"
        onClick={handleClick}
        $loading={uploading}
        disabled={disabled || uploading}
        aria-label={uploading ? 'Transcribing audio...' : 'Upload audio file for transcription'}
        title={uploading ? 'Transcribing...' : 'Upload voice memo (.mp3, .m4a, .wav)'}
      >
        {uploading ? <Spinner size={18} /> : <Paperclip size={18} />}
      </UploadBtn>
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept=".mp3,.m4a,.wav,.webm,.ogg,.flac,audio/*"
        onChange={handleFileChange}
      />
    </>
  );
};

export default VoiceUpload;
