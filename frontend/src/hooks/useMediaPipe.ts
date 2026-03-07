/**
 * useMediaPipe Hook
 * =================
 * Loads the MediaPipe Pose Landmarker model (WASM/WebGL) and processes
 * video frames to return 33-point BlazePose landmarks.
 *
 * Architecture: @mediapipe/tasks-vision PoseLandmarker
 * - WASM backend for broad device support
 * - GPU delegate when WebGL2 available
 * - Lazy initialization (model loads on first call to initialize())
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// Lazy-load the heavy MediaPipe module
type PoseLandmarkerType = import('@mediapipe/tasks-vision').PoseLandmarker;
type NormalizedLandmark = import('@mediapipe/tasks-vision').NormalizedLandmark;

export interface MediaPipeResult {
  landmarks: NormalizedLandmark[];
  worldLandmarks: NormalizedLandmark[];
  timestamp: number;
}

export interface UseMediaPipeReturn {
  /** Call once to load the model. Resolves when ready. */
  initialize: () => Promise<void>;
  /** Process a single video frame. Returns landmarks or null. */
  detectFrame: (video: HTMLVideoElement, timestampMs: number) => MediaPipeResult | null;
  /** Whether the model is currently loading */
  isLoading: boolean;
  /** Whether the model is ready for inference */
  isReady: boolean;
  /** Error message if initialization failed */
  error: string | null;
  /** Cleanup resources */
  dispose: () => void;
}

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export function useMediaPipe(): UseMediaPipeReturn {
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initialize = useCallback(async () => {
    // Prevent duplicate initialization
    if (landmarkerRef.current || initPromiseRef.current) {
      return initPromiseRef.current ?? Promise.resolve();
    }

    const promise = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        landmarkerRef.current = landmarker;
        setIsReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load pose model';
        setError(message);
        console.error('[useMediaPipe] Initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    })();

    initPromiseRef.current = promise;
    return promise;
  }, []);

  const detectFrame = useCallback(
    (video: HTMLVideoElement, timestampMs: number): MediaPipeResult | null => {
      if (!landmarkerRef.current || video.readyState < 2) return null;

      try {
        const result = landmarkerRef.current.detectForVideo(video, timestampMs);

        if (!result.landmarks?.[0]) return null;

        return {
          landmarks: result.landmarks[0],
          worldLandmarks: result.worldLandmarks?.[0] ?? [],
          timestamp: timestampMs,
        };
      } catch {
        return null;
      }
    },
    []
  );

  const dispose = useCallback(() => {
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
    setIsReady(false);
    initPromiseRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  return { initialize, detectFrame, isLoading, isReady, error, dispose };
}
