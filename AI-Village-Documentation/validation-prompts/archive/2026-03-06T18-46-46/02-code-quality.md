# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.2s
> **Files:** docs/ai-workflow/blueprints/AI-FORM-ANALYSIS-BLUEPRINT.md
> **Generated:** 3/6/2026, 10:46:46 AM

---

# Code Review: AI Form Analysis Blueprint

## Executive Summary
**Overall Assessment:** This is a **documentation/blueprint file**, not executable code. However, it contains **architectural and technical decisions** that will directly impact code quality, so I'm reviewing it for **technical soundness, implementation risks, and alignment with TypeScript/React best practices**.

---

## 🔴 CRITICAL Issues

### 1. Missing Type Safety Strategy for JSONB Fields
**Severity:** CRITICAL  
**Location:** Part 3 - Database Schema

```sql
"findings" JSONB,
"recommendations" JSONB,
"landmarkData" JSONB,
```

**Problem:**
- No TypeScript type definitions specified for JSONB columns
- Example `findings` structure shown, but no discriminated unions for `compensations` array
- Will lead to `any` types or unsafe type assertions in frontend code

**Required Fix:**
```typescript
// backend/types/formAnalysis.ts
export type CompensationType = 
  | 'knee_valgus' 
  | 'anterior_lean' 
  | 'lumbar_hyperextension'
  | 'shoulder_elevation'
  | 'hip_shift'
  | 'lateral_shift';

export type CompensationSeverity = 'mild' | 'moderate' | 'severe';

export interface Compensation {
  type: CompensationType;
  severity: CompensationSeverity;
  frames: number[];
  side: 'left' | 'right' | 'bilateral';
  likelyWeakMuscle: string;
  likelyTightMuscle: string;
}

export interface FormAnalysisFindings {
  jointAngles: {
    kneeFlexionMax: number;
    hipHingeMin: number;
    ankleDorsiflexion: number;
  };
  compensations: Compensation[];
  repScores: number[];
  fatigueDetected: boolean;
  fatigueOnsetRep: number | null;
  symmetryScore: number; // 0-1
  rangeOfMotionPercent: number; // 0-100
}

// Sequelize model typing
export interface FormAnalysisAttributes {
  id: string;
  userId: string;
  sessionId: string | null;
  exerciseName: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  analysisStatus: 'pending' | 'processing' | 'complete' | 'failed';
  overallScore: number | null;
  repCount: number | null;
  findings: FormAnalysisFindings | null;
  recommendations: CorrectiveRecommendation[] | null;
  landmarkData: LandmarkFrame[] | null; // Compressed
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. No Error Handling Strategy Defined
**Severity:** CRITICAL  
**Location:** Part 3 - Architecture, Part 5 - Phased Build

**Problem:**
- No mention of error boundaries for React components
- No retry logic for failed video analysis jobs
- No user-facing error messages specified
- Python service failures could leave jobs in "processing" state forever

**Required Additions:**

```typescript
// frontend/src/components/FormAnalysis/FormAnalyzer.tsx
import { ErrorBoundary } from 'react-error-boundary';

function FormAnalysisErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <ErrorContainer>
      <ErrorIcon />
      <ErrorTitle>Form Analysis Unavailable</ErrorTitle>
      <ErrorMessage>
        {error.message === 'CAMERA_PERMISSION_DENIED' 
          ? 'Camera access is required for real-time analysis. Please enable camera permissions.'
          : 'Unable to analyze form right now. Try uploading a video instead.'}
      </ErrorMessage>
      <RetryButton onClick={resetErrorBoundary}>Try Again</RetryButton>
    </ErrorContainer>
  );
}

// Wrap component
<ErrorBoundary FallbackComponent={FormAnalysisErrorFallback}>
  <FormAnalyzer />
</ErrorBoundary>
```

```typescript
// backend/workers/formAnalysisWorker.mjs
const formAnalysisQueue = new Queue('form-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Job failure handler
formAnalysisQueue.on('failed', async (job, err) => {
  await FormAnalysis.update(
    { 
      analysisStatus: 'failed',
      findings: { error: err.message }
    },
    { where: { id: job.data.analysisId } }
  );
  
  // Notify user
  await notificationService.send({
    userId: job.data.userId,
    type: 'FORM_ANALYSIS_FAILED',
    message: 'Video analysis failed. Please try a shorter video or contact support.',
  });
});
```

---

### 3. Performance Anti-Pattern: Real-Time Landmark Processing
**Severity:** CRITICAL  
**Location:** Part 3 - Component Architecture, Part 5 - Phase 3

**Problem:**
- `useBiomechanics()` hook will recalculate angles on **every frame** (30fps = 30 calculations/sec)
- No mention of memoization or throttling
- Will cause excessive re-renders and battery drain on mobile

**Required Fix:**

```typescript
// frontend/src/hooks/useBiomechanics.ts
import { useMemo, useRef } from 'react';
import { throttle } from 'lodash-es';

interface Landmarks {
  // MediaPipe 33-point format
}

interface BiomechanicsData {
  kneeAngle: number;
  hipAngle: number;
  // ...
}

export function useBiomechanics(landmarks: Landmarks | null) {
  const previousAngles = useRef<BiomechanicsData | null>(null);

  // Throttle calculations to 10fps instead of 30fps
  const calculateAngles = useMemo(
    () => throttle((lm: Landmarks): BiomechanicsData => {
      // Expensive calculations here
      const kneeAngle = calculateKneeFlexion(lm);
      const hipAngle = calculateHipHinge(lm);
      
      return { kneeAngle, hipAngle };
    }, 100), // 100ms = 10fps
    []
  );

  const angles = useMemo(() => {
    if (!landmarks) return previousAngles.current;
    
    const newAngles = calculateAngles(landmarks);
    previousAngles.current = newAngles;
    return newAngles;
  }, [landmarks, calculateAngles]);

  return angles;
}
```

---

## 🟠 HIGH Priority Issues

### 4. Missing Responsive Canvas Scaling Strategy
**Severity:** HIGH  
**Location:** Part 3 - Multi-Device Support

**Problem:**
- States "Canvas overlay scales with video element (percentage-based landmark coordinates)" but no implementation details
- MediaPipe returns normalized coordinates (0-1), but canvas drawing requires pixel coordinates
- No mention of handling device pixel ratio (Retina displays)

**Required Implementation:**

```typescript
// frontend/src/components/FormAnalysis/VideoOverlay.tsx
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const CanvasOverlay = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

interface VideoOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: NormalizedLandmark[] | null;
}

export function VideoOverlay({ videoRef, landmarks }: VideoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    if (!videoRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(videoRef.current);
    return () => resizeObserver.disconnect();
  }, [videoRef]);

  // Draw skeleton
  useEffect(() => {
    if (!canvasRef.current || !landmarks) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear previous frame
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Convert normalized coordinates to pixel coordinates
    landmarks.forEach((landmark) => {
      const x = landmark.x * dimensions.width;
      const y = landmark.y * dimensions.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.fill();
    });
  }, [landmarks, dimensions]);

  return <CanvasOverlay ref={canvasRef} />;
}
```

---

### 5. No Stale Closure Prevention in Camera Hook
**Severity:** HIGH  
**Location:** Part 3 - Component Architecture (`useCamera()` hook)

**Problem:**
- Camera stream cleanup must happen in effect cleanup, not in event handlers
- No mention of handling camera permission errors
- No strategy for switching between front/rear cameras on mobile

**Required Implementation:**

```typescript
// frontend/src/hooks/useCamera.ts
import { useEffect, useRef, useState, useCallback } from 'react';

type CameraFacing = 'user' | 'environment';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  switchCamera: () => Promise<void>;
  facing: CameraFacing;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>('user');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('CAMERA_PERMISSION_DENIED');
        } else if (err.name === 'NotFoundError') {
          setError('NO_CAMERA_FOUND');
        } else {
          setError('CAMERA_ERROR');
        }
      }
    }
  }, [facing]);

  const switchCamera = useCallback(async () => {
    stopCamera();
    setFacing(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  // Re-start camera when facing changes
  useEffect(() => {
    if (isActive) {
      startCamera();
    }
  }, [facing]); // Intentionally depend on facing

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return { videoRef, isActive, error, startCamera, stopCamera, switchCamera, facing };
}
```

---

### 6. Hardcoded Values Instead of Theme Tokens
**Severity:** HIGH  
**Location:** Part 2 - Exercise Analysis Features (scoring thresholds)

**Problem:**
- Rep quality scoring (0-100), severity levels ("mild", "moderate", "severe") are hardcoded
- No mention of theme tokens for UI feedback colors
- Will lead to magic numbers scattered across components

**Required Constants File:**

```typescript
// frontend/src/constants/formAnalysis.ts
export const FORM_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 0,
} as const;

export const COMPENSATION_SEVERITY = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
} as const;

export const ANALYSIS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED: 'failed',
} as const;

// Theme integration
export const getScoreColor = (score: number, theme: DefaultTheme): string => {
  if (score >= FORM_SCORE_THRESHOLDS.EXCELLENT) return theme.colors.success;
  if (score >= FORM_SCORE_THRESHOLDS.GOOD) return theme.colors.warning;
  if (score >= FORM_SCORE_THRESHOLDS.FAIR) return theme.colors.alert;
  return theme.colors.error;
};
```

```typescript
// frontend/src/components/FormAnalysis/RepCounter.tsx
import styled from 'styled-components';
import { FORM_SCORE_THRESHOLDS, getScoreColor } from '@/constants/formAnalysis';

interface ScoreBadgeProps {
  $score: number;
}

const ScoreBadge = styled.div<ScoreBadgeProps>`
  background: ${({ theme, $score }) => getScoreColor($score, theme)};
  color: ${({ theme }) => theme.colors.textPrimary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

export function RepCounter({ count, latestScore }: RepCounterProps) {
  return (
    <Container>
      <RepCount>{count} reps</RepCount>
      {latestScore !== null && (
        <ScoreBadge $score={latestScore}>
          {latestScore}/100
        </ScoreBadge>
      )}
    </Container>
  );
}
```

---

## 🟡 MEDIUM Priority Issues

### 7. Missing Key Props in Dynamic Lists
**Severity:** MEDIUM  
**Location:** Part 3 - Findings JSONB Structure (`compensations` array)

**Problem:**
- Compensations array will be rendered in UI, but no unique identifier specified
- Using array index as key will cause issues when items are added/removed

**Required Schema Update:**

```typescript
export interface Compensation {
  id: string; // UUID for stable keys
  type: CompensationType;
  severity: CompensationSeverity;
  frames: number[];
  side: 'left' | 'right' | 'bilateral';
  likelyWeakMuscle: string;
  likelyTightMuscle: string;
  timestamp: number; // When detected in video (seconds)
}
```

```typescript
// Component usage
{findings.compensations.map((comp) => (
  <CompensationCard key={comp.id}

---

*Part of SwanStudios 7-Brain Validation System*
