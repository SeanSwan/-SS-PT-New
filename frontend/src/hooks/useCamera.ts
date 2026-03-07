/**
 * useCamera Hook
 * ==============
 * Manages getUserMedia for front/rear camera with permission handling.
 * Provides a video ref, stream controls, and camera toggle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCameraReturn {
  /** Attach this ref to a <video> element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Start the camera stream */
  start: () => Promise<void>;
  /** Stop the camera stream */
  stop: () => void;
  /** Toggle between front and rear cameras */
  toggleFacing: () => Promise<void>;
  /** Whether the camera is active */
  isActive: boolean;
  /** Current facing mode */
  facingMode: 'user' | 'environment';
  /** Error if camera access failed */
  error: string | null;
  /** Whether the device has multiple cameras */
  hasMultipleCameras: boolean;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check for multiple cameras on mount
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then(devices => {
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    }).catch(() => {});
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const startStream = useCallback(async (facing: 'user' | 'environment') => {
    setError(null);
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setFacingMode(facing);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (message.includes('NotFoundError') || message.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${message}`);
      }
      console.error('[useCamera] Failed to start camera:', err);
    }
  }, [stopStream]);

  const start = useCallback(() => startStream(facingMode), [startStream, facingMode]);

  const toggleFacing = useCallback(async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    await startStream(newFacing);
  }, [facingMode, startStream]);

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    start,
    stop: stopStream,
    toggleFacing,
    isActive,
    facingMode,
    error,
    hasMultipleCameras,
  };
}
