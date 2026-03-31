/**
 * ============================================================================
 * FILE: useBarcodeCamera.ts
 * PURPOSE: Camera-based barcode detection using native BarcodeDetector API
 *          with barcode-detector WASM polyfill for Safari/iOS
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Opens the rear camera, continuously scans for barcodes
 * using the native BarcodeDetector API (Chrome/Edge) or WASM polyfill (Safari).
 * Returns the detected barcode string via onDetected callback.
 *
 * HOW IT FITS IN THE APP: FoodTracker/BarcodeScanner → useBarcodeCamera
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseBarcodeCamera {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isScanning: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  cameraError: string | null;
  supported: boolean;
}

let polyfillLoaded = false;

async function ensureBarcodeDetector(): Promise<boolean> {
  if (typeof globalThis.BarcodeDetector !== 'undefined') return true;
  if (polyfillLoaded) return typeof globalThis.BarcodeDetector !== 'undefined';

  try {
    const { BarcodeDetector } = await import('barcode-detector');
    globalThis.BarcodeDetector = BarcodeDetector as unknown as typeof globalThis.BarcodeDetector;
    polyfillLoaded = true;
    return true;
  } catch {
    return false;
  }
}

export function useBarcodeCamera(
  onDetected: (barcode: string) => void,
): UseBarcodeCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number>(0);
  const lastDetectedRef = useRef<string>('');

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // Check support on mount
  useEffect(() => {
    const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    if (!hasCamera) setSupported(false);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    lastDetectedRef.current = '';
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    detector
      .detect(video)
      .then((barcodes: DetectedBarcode[]) => {
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          // Debounce: don't fire same code twice in a row
          if (code && code !== lastDetectedRef.current) {
            lastDetectedRef.current = code;
            onDetected(code);
          }
        }
        if (streamRef.current) {
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      })
      .catch(() => {
        // Detection failed for this frame — keep scanning
        if (streamRef.current) {
          rafRef.current = requestAnimationFrame(scanFrame);
        }
      });
  }, [onDetected]);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    const ok = await ensureBarcodeDetector();
    if (!ok) {
      setCameraError('Barcode detection not supported on this device');
      setSupported(false);
      return;
    }

    try {
      detectorRef.current = new globalThis.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      });
    } catch {
      setCameraError('Failed to initialize barcode detector');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(msg.includes('NotAllowed') ? 'Camera permission denied — allow camera access and try again' : msg);
    }
  }, [scanFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { videoRef, isScanning, startCamera, stopCamera, cameraError, supported };
}
