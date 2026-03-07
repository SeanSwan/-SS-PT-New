/**
 * UploadTab — Photo/Video Upload for Form Analysis
 * ==================================================
 * Drag-and-drop on desktop, file picker on mobile.
 * Shows upload progress, then polls for analysis results.
 */
import React, { useCallback, useRef, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormAnalysisAPI } from '../../hooks/useFormAnalysisAPI';
import { getScoreColor, getScoreGrade } from './constants';
import { EXERCISE_NAMES } from './exerciseList';

const ALLOWED_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'image/jpeg', 'image/png', 'image/webp',
];

// --- Styled Components ---

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const DropZone = styled.div<{ $isDragging: boolean; $hasFile: boolean }>`
  border: 2px dashed ${({ $isDragging, $hasFile }) =>
    $hasFile ? 'rgba(0, 255, 136, 0.3)' :
    $isDragging ? 'rgba(96, 192, 240, 0.6)' :
    'rgba(96, 192, 240, 0.2)'};
  border-radius: 20px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${({ $isDragging }) =>
    $isDragging ? 'rgba(96, 192, 240, 0.08)' : 'rgba(0, 32, 96, 0.3)'};
  backdrop-filter: blur(12px);

  &:hover {
    border-color: rgba(96, 192, 240, 0.4);
    background: rgba(96, 192, 240, 0.05);
  }
`;

const DropLabel = styled.p`
  font-size: 14px;
  color: rgba(224, 236, 244, 0.6);
  margin: 8px 0 0;
`;

const DropIcon = styled.div`
  font-size: 40px;
  margin-bottom: 8px;
`;

const FileName = styled.p`
  font-size: 13px;
  color: #60C0F0;
  font-weight: 600;
  margin-top: 8px;
  word-break: break-all;
`;

const FileSize = styled.span`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.4);
  margin-left: 8px;
`;

const ExerciseGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ExercisePill = styled.button<{ $selected: boolean }>`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 22px;
  border: 1px solid ${({ $selected }) => $selected ? 'rgba(96, 192, 240, 0.4)' : 'rgba(224, 236, 244, 0.1)'};
  background: ${({ $selected }) => $selected ? 'rgba(96, 192, 240, 0.15)' : 'rgba(0, 32, 96, 0.2)'};
  color: ${({ $selected }) => $selected ? '#60C0F0' : 'rgba(224, 236, 244, 0.5)'};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.3);
  }
`;

const SectionLabel = styled.h3`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
`;

const SubmitButton = styled(motion.button)`
  min-height: 56px;
  border-radius: 28px;
  border: 2px solid rgba(96, 192, 240, 0.4);
  background: rgba(96, 192, 240, 0.15);
  color: #60C0F0;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 1px;
  width: 100%;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(96, 192, 240, 0.1);
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #60C0F0, #00FF88);
  border-radius: 2px;
`;

const ResultCard = styled(motion.div)`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
`;

const ScoreDisplay = styled.div<{ $color: string }>`
  font-size: 64px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const GradeLabel = styled.p<{ $color: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 4px 0 16px;
`;

const FindingsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  text-align: left;
`;

const FindingItem = styled.li<{ $severity: string }>`
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 12px;
  font-size: 13px;
  color: ${({ $severity }) =>
    $severity === 'critical' ? '#FF4757' :
    $severity === 'warning' ? '#FFB800' :
    '#60C0F0'};
  background: ${({ $severity }) =>
    $severity === 'critical' ? 'rgba(255, 71, 87, 0.1)' :
    $severity === 'warning' ? 'rgba(255, 184, 0, 0.1)' :
    'rgba(96, 192, 240, 0.05)'};
`;

const StatusText = styled.p`
  font-size: 14px;
  color: rgba(224, 236, 244, 0.6);
  text-align: center;
`;

const ErrorText = styled.p`
  font-size: 13px;
  color: #FF4757;
  text-align: center;
`;

// --- Component ---

const UploadTab: React.FC = () => {
  const { uploadMedia, pollAnalysis, isUploading } = useFormAnalysisAPI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [exercise, setExercise] = useState('Squat');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleFile = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Use MP4, WebM, MOV, JPG, PNG, or WebP.');
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum 100MB.');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    setStatus('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file) return;
    setError(null);
    setStatus('uploading');

    try {
      const uploadResult = await uploadMedia(file, exercise);
      setStatus('processing');

      const analysis = await pollAnalysis(uploadResult.id, (update) => {
        if (update.analysisStatus === 'processing') setStatus('processing');
      });

      if (analysis.analysisStatus === 'complete') {
        setResult(analysis);
        setStatus('complete');
      } else {
        setError(analysis.analysisStatus === 'failed' ? 'Analysis failed. Try again.' : 'Unknown error');
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  };

  const scoreColor = result?.overallScore != null ? getScoreColor(result.overallScore) : '#60C0F0';
  const grade = result?.overallScore != null ? getScoreGrade(result.overallScore) : null;

  return (
    <Container>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <DropZone
        $isDragging={isDragging}
        $hasFile={!!file}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <DropIcon>{file ? (file.type.startsWith('video') ? '🎬' : '📸') : '📁'}</DropIcon>
        {file ? (
          <>
            <FileName>
              {file.name}
              <FileSize>({(file.size / (1024 * 1024)).toFixed(1)} MB)</FileSize>
            </FileName>
            <DropLabel>Tap to change file</DropLabel>
          </>
        ) : (
          <>
            <DropLabel>Drop a video or photo here</DropLabel>
            <DropLabel style={{ fontSize: 12 }}>or tap to browse</DropLabel>
          </>
        )}
      </DropZone>

      <div>
        <SectionLabel>Exercise</SectionLabel>
        <ExerciseGrid style={{ marginTop: 8 }}>
          {EXERCISE_NAMES.map(ex => (
            <ExercisePill
              key={ex}
              $selected={ex === exercise}
              onClick={() => setExercise(ex)}
            >
              {ex}
            </ExercisePill>
          ))}
        </ExerciseGrid>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {(status === 'uploading' || status === 'processing') && (
        <div>
          <ProgressBar>
            <ProgressFill
              initial={{ width: '0%' }}
              animate={{ width: status === 'uploading' ? '40%' : '80%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </ProgressBar>
          <StatusText style={{ marginTop: 8 }}>
            {status === 'uploading' ? 'Uploading...' : 'AI is analyzing your form...'}
          </StatusText>
        </div>
      )}

      <AnimatePresence>
        {status === 'complete' && result && (
          <ResultCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SectionLabel>Form Score</SectionLabel>
            <ScoreDisplay $color={scoreColor}>
              {result.overallScore ?? '--'}
            </ScoreDisplay>
            {grade && <GradeLabel $color={scoreColor}>{grade}</GradeLabel>}

            {result.findings?.length > 0 && (
              <FindingsList>
                {result.findings.map((f: any, i: number) => (
                  <FindingItem key={i} $severity={f.severity || 'info'}>
                    {f.message || f.description || JSON.stringify(f)}
                  </FindingItem>
                ))}
              </FindingsList>
            )}

            {result.recommendations?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <SectionLabel>Recommendations</SectionLabel>
                <FindingsList>
                  {result.recommendations.map((r: any, i: number) => (
                    <FindingItem key={i} $severity="info">
                      {typeof r === 'string' ? r : r.message || JSON.stringify(r)}
                    </FindingItem>
                  ))}
                </FindingsList>
              </div>
            )}
          </ResultCard>
        )}
      </AnimatePresence>

      <SubmitButton
        onClick={handleSubmit}
        disabled={!file || isUploading || status === 'uploading' || status === 'processing'}
        whileTap={{ scale: 0.97 }}
      >
        {status === 'uploading' ? 'Uploading...' :
         status === 'processing' ? 'Analyzing...' :
         status === 'complete' ? 'Analyze Another' :
         'Analyze Form'}
      </SubmitButton>
    </Container>
  );
};

export default UploadTab;
