/**
 * VoiceMemoUpload Component
 * =========================
 * Upload voice memos or text files to auto-parse into workout logs.
 * Sends file to POST /api/workout-logs/upload, receives parsed exercises.
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 * Touch targets: 44px minimum on all interactive elements
 */

import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Upload, Mic, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ---- Theme Tokens ---- */
const SWAN_CYAN = '#00FFFF';
const GALAXY_CORE = '#0a0a1a';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const waveAnimation = keyframes`
  0%, 100% { height: 8px; }
  50% { height: 32px; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/* ---- Styled Components ---- */

const Container = styled.div<{ $uploading?: boolean }>`
  background: rgba(255, 255, 255, 0.03);
  border: 2px dashed rgba(0, 255, 255, 0.25);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;

  &:hover, &.drag-over {
    border-color: ${SWAN_CYAN};
    background: rgba(0, 255, 255, 0.04);
  }

  ${({ $uploading }) => $uploading && `
    background: linear-gradient(90deg, rgba(0,255,255,0.02) 25%, rgba(0,255,255,0.08) 50%, rgba(0,255,255,0.02) 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 2s infinite linear;
    border-color: rgba(0, 255, 255, 0.4);
    cursor: default;
  `}
`;

const WaveContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  margin-bottom: 16px;
`;

const WaveBar = styled.div<{ $delay: string }>`
  width: 4px;
  background: ${SWAN_CYAN};
  border-radius: 2px;
  animation: ${waveAnimation} 1.2s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay};
  box-shadow: 0 0 8px ${SWAN_CYAN};
`;

const DropLabel = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 12px 0 4px;
`;

const SubLabel = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
  margin: 0;
`;

const HiddenInput = styled.input`
  display: none;
`;

const StatusBar = styled.div<{ $variant: 'info' | 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 0.85rem;
  color: ${(p) =>
    p.$variant === 'success' ? '#4ade80' :
    p.$variant === 'error' ? '#ff6b6b' : '#94a3b8'};
  background: ${(p) =>
    p.$variant === 'success' ? 'rgba(74, 222, 128, 0.08)' :
    p.$variant === 'error' ? 'rgba(255, 107, 107, 0.08)' : 'rgba(148, 163, 184, 0.08)'};
`;


const ConfidenceBadge = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(p) =>
    p.$level === 'high' ? 'rgba(74, 222, 128, 0.15)' :
    p.$level === 'medium' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(255, 107, 107, 0.15)'};
  color: ${(p) =>
    p.$level === 'high' ? '#4ade80' :
    p.$level === 'medium' ? '#facc15' : '#ff6b6b'};
`;

const PainFlagList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PainFlag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(255, 107, 107, 0.12);
  color: #ff6b6b;
`;

const TranscriptBox = styled.details`
  margin-top: 16px;
  background: rgba(10, 10, 26, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 12px;
  overflow: hidden;

  summary {
    cursor: pointer;
    color: ${SWAN_CYAN};
    font-size: 0.85rem;
    font-weight: 600;
    padding: 12px 16px;
    user-select: none;
    background: rgba(0, 255, 255, 0.05);
    transition: background 0.2s;

    &:hover {
      background: rgba(0, 255, 255, 0.1);
    }
  }

  pre {
    margin: 0;
    padding: 16px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 250px;
    overflow-y: auto;
    border-top: 1px solid rgba(0, 255, 255, 0.1);

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
    &::-webkit-scrollbar-thumb { background: rgba(0, 255, 255, 0.3); border-radius: 3px; }
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: flex-end;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: ${(p) => p.$primary ? 'none' : '1px solid rgba(255, 255, 255, 0.15)'};
  background: ${(p) => p.$primary ? `linear-gradient(135deg, ${SWAN_CYAN}, #00aadd)` : 'rgba(255, 255, 255, 0.04)'};
  color: ${(p) => p.$primary ? GALAXY_CORE : '#e2e8f0'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    ${(p) => p.$primary && `box-shadow: 0 6px 24px rgba(0, 255, 255, 0.4);`}
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* ---- Types ---- */

interface ParsedExercise {
  exerciseName: string;
  sets: Array<{
    setNumber: number;
    weight: number | null;
    reps: number;
    rpe?: number;
    formQuality?: number;
    notes?: string;
  }>;
  formRating?: number;
  painLevel?: number;
  performanceNotes?: string;
}

interface ParsedWorkout {
  exercises: ParsedExercise[];
  sessionNotes?: string;
  overallIntensity?: number;
  painFlags?: Array<{
    bodyRegion: string;
    side: string;
    mention: string;
  }>;
  confidence?: number;
  date?: string;
}

interface VoiceMemoUploadProps {
  clientId: number;
  clientName?: string;
  onParsed: (workout: ParsedWorkout, transcript: string) => void;
  onCancel?: () => void;
}

/* ---- Component ---- */

const ACCEPTED_TYPES = [
  'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm',
  'audio/ogg', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
  'audio/flac', 'audio/x-wav',
  'text/plain', 'text/csv',
  'application/pdf',
].join(',');

const VoiceMemoUpload: React.FC<VoiceMemoUploadProps> = ({
  clientId,
  clientName,
  onParsed,
  onCancel,
}) => {
  const { authAxios } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    transcript: string;
    parsedWorkout: ParsedWorkout;
  } | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);

    // Client-side validation
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', String(clientId));

      const response = await authAxios.post('/api/workout-logs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min for large audio files
      });

      if (response.data?.success) {
        setResult({
          transcript: response.data.transcript,
          parsedWorkout: response.data.parsedWorkout,
        });
      } else {
        setError(response.data?.error || 'Upload failed');
      }
    } catch (err: any) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The file may be too large or the server is busy.');
      } else if (!err.response) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.response?.data?.error || 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }, [authAxios, clientId]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleFile]);

  const confidenceLevel = (c?: number) => {
    if (!c) return 'low';
    if (c >= 0.8) return 'high';
    if (c >= 0.6) return 'medium';
    return 'low';
  };

  const handleApply = () => {
    if (result) {
      onParsed(result.parsedWorkout, result.transcript);
    }
  };

  return (
    <div>
      {!result && (
        <Container
          className={dragOver ? 'drag-over' : ''}
          $uploading={uploading}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload voice memo or file"
        >
          <HiddenInput
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={onFileSelect}
          />
          {uploading ? (
            <>
              <WaveContainer>
                <WaveBar $delay="0.0s" />
                <WaveBar $delay="0.2s" />
                <WaveBar $delay="0.4s" />
                <WaveBar $delay="0.2s" />
                <WaveBar $delay="0.0s" />
              </WaveContainer>
              <DropLabel style={{ animation: `${pulse} 1.5s ease-in-out infinite` }}>
                Processing{clientName ? ` for ${clientName}` : ''}...
              </DropLabel>
              <SubLabel>Transcribing and parsing workout data</SubLabel>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Mic size={28} color={SWAN_CYAN} />
                <Upload size={28} color="rgba(255,255,255,0.5)" />
                <FileText size={28} color="rgba(255,255,255,0.5)" />
              </div>
              <DropLabel>
                Drop voice memo or click to upload
              </DropLabel>
              <SubLabel>
                Supports: .m4a, .mp3, .wav, .webm, .ogg, .flac, .txt, .csv, .pdf (max 50MB)
              </SubLabel>
            </>
          )}
        </Container>
      )}

      {error && (
        <StatusBar $variant="error">
          <AlertTriangle size={16} />
          {error}
        </StatusBar>
      )}

      {result && (
        <>
          <StatusBar $variant="success">
            <CheckCircle size={16} />
            Parsed {result.parsedWorkout.exercises.length} exercises
            {result.parsedWorkout.confidence != null && (
              <ConfidenceBadge $level={confidenceLevel(result.parsedWorkout.confidence)}>
                {Math.round(result.parsedWorkout.confidence * 100)}% confidence
              </ConfidenceBadge>
            )}
          </StatusBar>

          {result.parsedWorkout.painFlags && result.parsedWorkout.painFlags.length > 0 && (
            <PainFlagList>
              {result.parsedWorkout.painFlags.map((flag, i) => (
                <PainFlag key={i}>
                  <AlertTriangle size={12} />
                  {flag.side} {flag.bodyRegion}: "{flag.mention}"
                </PainFlag>
              ))}
            </PainFlagList>
          )}

          <TranscriptBox>
            <summary>View transcript</summary>
            <pre>{result.transcript}</pre>
          </TranscriptBox>

          <ActionRow>
            {onCancel && (
              <ActionButton onClick={onCancel}>
                <X size={16} />
                Cancel
              </ActionButton>
            )}
            <ActionButton onClick={() => { setResult(null); setError(null); }}>
              Re-upload
            </ActionButton>
            <ActionButton $primary onClick={handleApply}>
              <CheckCircle size={16} />
              Apply to Workout Log
            </ActionButton>
          </ActionRow>
        </>
      )}
    </div>
  );
};

export default VoiceMemoUpload;
