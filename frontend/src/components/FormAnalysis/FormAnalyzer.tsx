/**
 * FormAnalyzer — Real-Time AI Form Analysis Page
 * ================================================
 * Main page component for live camera-based exercise form analysis.
 * Uses MediaPipe Pose Landmarker for 33-point skeleton detection,
 * real-time biomechanics calculations, and coaching feedback.
 *
 * Gemini Design Directives:
 * 1. Neon wireframe HUD (VideoOverlay)
 * 2. Glassmorphic pulsing rep counter (RepCounter)
 * 3. AnimatePresence slide-up coaching cues (FeedbackPanel)
 * 4. Bottom action bar in mobile thumb zone
 *
 * PERF: Landmarks and jointQuality stored in refs (not state) to avoid
 * 60fps React re-renders. VideoOverlay runs its own rAF draw loop.
 * Only score/cues/reps use React state (update at 10fps max via useBiomechanics).
 *
 * ErrorBoundary wraps entire component — falls back to upload-only mode.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useCamera } from '../../hooks/useCamera';
import { useBiomechanics, type JointAngles } from '../../hooks/useBiomechanics';
import VideoOverlay, { type VideoOverlayRefs } from './VideoOverlay';
import RepCounter from './RepCounter';
import FeedbackPanel, { type FormCue } from './FeedbackPanel';
import { LANDMARK } from './constants';
import { EXERCISES } from './exerciseList';

// --- Styled Components ---

const PageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: #002060;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const VideoContainer = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #000;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
`;

const BottomBar = styled.div`
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: rgba(0, 32, 96, 0.7);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(96, 192, 240, 0.1);
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  min-width: 64px;
  min-height: 64px;
  border-radius: 50%;
  border: 2px solid ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 71, 87, 0.4)' :
    $variant === 'secondary' ? 'rgba(224, 236, 244, 0.2)' :
    'rgba(96, 192, 240, 0.4)'};
  background: ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 71, 87, 0.15)' :
    $variant === 'secondary' ? 'rgba(224, 236, 244, 0.05)' :
    'rgba(96, 192, 240, 0.15)'};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#FF4757' :
    $variant === 'secondary' ? '#E0ECF4' :
    '#60C0F0'};
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:active {
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(255, 71, 87, 0.3)' :
      $variant === 'secondary' ? 'rgba(224, 236, 244, 0.1)' :
      'rgba(96, 192, 240, 0.3)'};
  }
`;

const PillButton = styled(motion.button)<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 22px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.4)' : 'rgba(224, 236, 244, 0.15)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.15)' : 'rgba(0, 32, 96, 0.3)'};
  color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.6)'};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
`;

const ExerciseSelector = styled.div`
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  z-index: 15;
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const InitOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 32, 96, 0.9);
  backdrop-filter: blur(20px);
`;

const StatusText = styled.p`
  font-size: 14px;
  color: rgba(224, 236, 244, 0.7);
  text-align: center;
  max-width: 280px;
`;

const StartButton = styled(motion.button)`
  min-width: 200px;
  min-height: 56px;
  border-radius: 28px;
  border: 2px solid rgba(96, 192, 240, 0.4);
  background: rgba(96, 192, 240, 0.15);
  color: #60C0F0;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 1px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  font-size: 13px;
  color: #FF4757;
  text-align: center;
  max-width: 280px;
`;

// --- Component ---

const FormAnalyzer: React.FC = () => {
  const { initialize, detectFrame, isLoading, isReady, error: mpError } = useMediaPipe();
  const { videoRef, start: startCamera, stop: stopCamera, toggleFacing, isActive: cameraActive, facingMode, error: camError, hasMultipleCameras } = useCamera();
  const { processLandmarks, repState, resetReps, setTrackingJoint } = useBiomechanics();

  // UI state (low-frequency updates — max 10fps via useBiomechanics throttle)
  const [cues, setCues] = useState<FormCue[]>([]);
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [formScore, setFormScore] = useState<number | undefined>(undefined);
  const [showExercises, setShowExercises] = useState(false);

  // Hot-path refs (updated at 60fps, read by VideoOverlay's own rAF loop)
  const landmarksRef = useRef<any[] | null>(null);
  const jointQualityRef = useRef<Record<number, 'good' | 'warning' | 'danger'>>({});
  const dimensionsRef = useRef({ width: 640, height: 480 });
  const overlayActiveRef = useRef(false);

  // Stable rAF loop control — prevents zombie frames
  const isRunningRef = useRef(false);
  const isReadyRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const cueIdRef = useRef(0);
  const lastCueTimeRef = useRef<Record<string, number>>({});

  // Keep refs in sync with state
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);

  const overlayRefs: VideoOverlayRefs = {
    landmarks: landmarksRef,
    jointQuality: jointQualityRef,
    dimensions: dimensionsRef,
    active: overlayActiveRef,
  };

  const addCue = useCallback((message: string, severity: FormCue['severity']) => {
    const now = Date.now();
    // Deduplicate: same message within 4s
    if (lastCueTimeRef.current[message] && now - lastCueTimeRef.current[message] < 4000) return;
    lastCueTimeRef.current[message] = now;

    cueIdRef.current += 1;
    const id = `cue-${cueIdRef.current}`;
    setCues(prev => [...prev.slice(-2), { id, message, severity }]);
  }, []);

  // Single stable rAF loop — no dependency on isReady/isRunning (uses refs)
  useEffect(() => {
    const loop = () => {
      if (!isRunningRef.current || !isReadyRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const result = detectFrame(video, performance.now());
        if (result) {
          // Write to ref (no React re-render)
          landmarksRef.current = result.landmarks;

          const bio = processLandmarks(result.landmarks);
          if (bio) {
            // Compute per-joint quality
            const quality: Record<number, 'good' | 'warning' | 'danger'> = {};

            if (Math.abs(bio.kneeValgus.left) > 5) {
              quality[LANDMARK.LEFT_KNEE] = Math.abs(bio.kneeValgus.left) > 10 ? 'danger' : 'warning';
            }
            if (Math.abs(bio.kneeValgus.right) > 5) {
              quality[LANDMARK.RIGHT_KNEE] = Math.abs(bio.kneeValgus.right) > 10 ? 'danger' : 'warning';
            }
            if (Math.abs(bio.shoulderTilt) > 3) {
              quality[LANDMARK.LEFT_SHOULDER] = 'warning';
              quality[LANDMARK.RIGHT_SHOULDER] = 'warning';
            }
            if (Math.abs(bio.torsoLean) > 25) {
              quality[LANDMARK.LEFT_HIP] = 'warning';
              quality[LANDMARK.RIGHT_HIP] = 'warning';
            }

            // Write to ref (no React re-render)
            jointQualityRef.current = quality;

            // Score update via React state (at 10fps max — throttled by useBiomechanics)
            const dangerCount = Object.values(quality).filter(q => q === 'danger').length;
            const warningCount = Object.values(quality).filter(q => q === 'warning').length;
            const score = Math.max(0, 100 - dangerCount * 20 - warningCount * 8);
            setFormScore(score);

            // Coaching cues (also throttled by biomechanics 10fps gate)
            if (Math.abs(bio.kneeValgus.left) > 8 || Math.abs(bio.kneeValgus.right) > 8) {
              addCue('Push knees out over toes', 'warning');
            }
            if (Math.abs(bio.torsoLean) > 30) {
              addCue('Keep chest up — excessive forward lean', 'error');
            }
            if (Math.abs(bio.shoulderTilt) > 5) {
              addCue('Level your shoulders', 'info');
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
    // Stable deps — detectFrame and processLandmarks are useCallback with []
  }, [videoRef, detectFrame, processLandmarks, addCue]);

  // Track video dimensions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handler = () => {
      dimensionsRef.current = {
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
      };
    };
    video.addEventListener('loadedmetadata', handler);
    return () => video.removeEventListener('loadedmetadata', handler);
  }, [videoRef]);

  const handleStart = async () => {
    await Promise.all([initialize(), startCamera()]);
    overlayActiveRef.current = true;
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    overlayActiveRef.current = false;
    stopCamera();
    landmarksRef.current = null;
    jointQualityRef.current = {};
    setFormScore(undefined);
  };

  const handleExerciseChange = (exercise: typeof EXERCISES[number]) => {
    setSelectedExercise(exercise);
    setTrackingJoint(exercise.trackingJoint);
    resetReps();
    setShowExercises(false);
  };

  const handleCueDismiss = (id: string) => {
    setCues(prev => prev.filter(c => c.id !== id));
  };

  const error = mpError || camError;
  const showInit = !isRunning || (!isReady && isLoading);

  return (
    <PageWrapper>
      <VideoContainer>
        <Video ref={videoRef} playsInline muted autoPlay />

        <VideoOverlay refs={overlayRefs} />

        <RepCounter
          count={repState.count}
          phase={repState.phase}
          score={formScore}
          exerciseName={selectedExercise.name}
        />

        <FeedbackPanel cues={cues} onDismiss={handleCueDismiss} />

        {showExercises && (
          <ExerciseSelector>
            {EXERCISES.map(ex => (
              <PillButton
                key={ex.name}
                $active={ex.name === selectedExercise.name}
                onClick={() => handleExerciseChange(ex)}
                whileTap={{ scale: 0.95 }}
              >
                {ex.name}
              </PillButton>
            ))}
          </ExerciseSelector>
        )}

        {showInit && (
          <InitOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    border: '3px solid rgba(96, 192, 240, 0.2)',
                    borderTopColor: '#60C0F0',
                  }}
                />
                <StatusText>Loading AI pose model...</StatusText>
              </>
            ) : error ? (
              <>
                <ErrorText>{error}</ErrorText>
                <StartButton onClick={handleStart}>Try Again</StartButton>
              </>
            ) : (
              <>
                <StatusText>
                  Position your phone so your full body is visible.
                  The AI will analyze your form in real-time.
                </StatusText>
                <StartButton onClick={handleStart} whileTap={{ scale: 0.97 }}>
                  Start Analysis
                </StartButton>
              </>
            )}
          </InitOverlay>
        )}
      </VideoContainer>

      <BottomBar>
        {hasMultipleCameras && (
          <ActionButton
            $variant="secondary"
            onClick={toggleFacing}
            whileTap={{ scale: 0.9 }}
            title="Flip camera"
            aria-label="Flip camera"
          >
            {facingMode === 'user' ? '\u21A9' : '\u21AA'}
          </ActionButton>
        )}

        <ActionButton
          $variant="secondary"
          onClick={() => setShowExercises(prev => !prev)}
          whileTap={{ scale: 0.9 }}
          title="Change exercise"
          aria-label="Change exercise"
        >
          Ex
        </ActionButton>

        {isRunning ? (
          <ActionButton
            $variant="danger"
            onClick={handleStop}
            whileTap={{ scale: 0.9 }}
            title="Stop"
            aria-label="Stop analysis"
          >
            {'\u25A0'}
          </ActionButton>
        ) : (
          <ActionButton
            onClick={handleStart}
            whileTap={{ scale: 0.9 }}
            title="Start"
            aria-label="Start analysis"
          >
            {'\u25B6'}
          </ActionButton>
        )}

        <ActionButton
          $variant="secondary"
          onClick={resetReps}
          whileTap={{ scale: 0.9 }}
          title="Reset reps"
          aria-label="Reset rep counter"
        >
          0
        </ActionButton>
      </BottomBar>
    </PageWrapper>
  );
};

// --- ErrorBoundary Wrapper ---

class FormAnalyzerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[FormAnalyzer] Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', background: '#002060',
          color: '#E0ECF4', padding: '24px', textAlign: 'center',
        }}>
          <h2 style={{ marginBottom: 8 }}>Form Analysis Unavailable</h2>
          <p style={{ color: 'rgba(224, 236, 244, 0.6)', marginBottom: 16 }}>
            Real-time analysis failed to load. You can still upload a video for analysis.
          </p>
          <a
            href="/form-analysis"
            style={{
              padding: '12px 24px', borderRadius: 22,
              border: '1px solid rgba(96, 192, 240, 0.3)',
              color: '#60C0F0', textDecoration: 'none',
            }}
          >
            Reload
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

const FormAnalyzerPage: React.FC = () => (
  <FormAnalyzerErrorBoundary>
    <FormAnalyzer />
  </FormAnalyzerErrorBoundary>
);

export default FormAnalyzerPage;
