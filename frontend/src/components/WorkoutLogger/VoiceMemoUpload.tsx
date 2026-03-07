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
import { Upload, Mic, FileText, AlertTriangle, CheckCircle, X, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ---- Theme Tokens ---- */
const SWAN_CYAN = '#00FFFF';
const GALAXY_CORE = '#0a0a1a';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ---- Styled Components ---- */

const Container = styled.div`
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
`;

const DropLabel = styled.p`
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 12px 0 4px;
`;

const SubLabel = styled.p`
  color: #64748b;
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

const Spinner = styled(Loader)`
  animation: ${spin} 1s linear infinite;
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
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;

  summary {
    cursor: pointer;
    color: #94a3b8;
    font-size: 0.8rem;
    user-select: none;
  }

  pre {
    margin: 8px 0 0;
    color: #cbd5e1;
    font-size: 0.8rem;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
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

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
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
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      setError(msg);
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
              <Spinner size={32} color={SWAN_CYAN} />
              <DropLabel style={{ animation: `${pulse} 1.5s ease-in-out infinite` }}>
                Processing{clientName ? ` for ${clientName}` : ''}...
              </DropLabel>
              <SubLabel>Transcribing and parsing workout data</SubLabel>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Mic size={28} color={SWAN_CYAN} />
                <Upload size={28} color="#64748b" />
                <FileText size={28} color="#64748b" />
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
