/**
 * VoiceMemoUpload Component
 * =========================
 * Upload voice memos or text files to auto-parse into workout logs.
 * Sends file to POST /api/workout-logs/upload, receives parsed exercises.
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Crystalline Swan (cosmic dark, cyan accents, glass surfaces)
 * Touch targets: 44px minimum on all interactive elements
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Mic, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  ActionButton,
  ActionRow,
  ConfidenceBadge,
  Container,
  DropLabel,
  HiddenInput,
  PainFlag,
  PainFlagList,
  PulsingDropLabel,
  StatusBar,
  SubLabel,
  TranscriptBox,
  VOICE_MEMO_ACCENT,
  VOICE_MEMO_MUTED_ICON,
  WaveBar,
  WaveContainer,
} from './VoiceMemoUpload.styles';

/* ---- Types ---- */

export interface ParsedExercise {
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

export interface ParsedWorkout {
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

type VoiceMemoPainFlag = NonNullable<ParsedWorkout['painFlags']>[number];

/* ---- Component ---- */

const ACCEPTED_TYPES = [
  'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm',
  'audio/ogg', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
  'audio/flac', 'audio/x-wav',
  'text/plain', 'text/csv',
  'application/pdf',
].join(',');

export const MAX_UPLOAD_FILE_SIZE_MB = 20;
export const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;

export const voiceMemoPainFlagKey = (flag: VoiceMemoPainFlag): string =>
  ['pain', flag.side, flag.bodyRegion, flag.mention].filter(Boolean).join('|');

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

    // Client-side validation
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${MAX_UPLOAD_FILE_SIZE_MB}MB.`);
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
          onKeyDown={(e) => {
            if (uploading) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
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
              <PulsingDropLabel>
                Processing{clientName ? ` for ${clientName}` : ''}...
              </PulsingDropLabel>
              <SubLabel>Transcribing and parsing workout data</SubLabel>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Mic size={28} color={VOICE_MEMO_ACCENT} />
                <Upload size={28} color={VOICE_MEMO_MUTED_ICON} />
                <FileText size={28} color={VOICE_MEMO_MUTED_ICON} />
              </div>
              <DropLabel>
                Drop voice memo or click to upload
              </DropLabel>
              <SubLabel>
                Supports: .m4a, .mp3, .wav, .webm, .ogg, .flac, .txt, .csv, .pdf (max {MAX_UPLOAD_FILE_SIZE_MB}MB)
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
              {result.parsedWorkout.painFlags.map((flag) => (
                <PainFlag key={voiceMemoPainFlagKey(flag)}>
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
              <ActionButton type="button" onClick={onCancel}>
                <X size={16} />
                Cancel
              </ActionButton>
            )}
            <ActionButton type="button" onClick={() => { setResult(null); setError(null); }}>
              Re-upload
            </ActionButton>
            <ActionButton type="button" $primary onClick={handleApply}>
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
