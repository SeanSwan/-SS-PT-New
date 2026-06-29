import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { IScannerControls } from '@zxing/browser';

export type BarcodeScannerEngine = 'native' | 'zxing';

export interface UseBarcodeCamera {
  videoRef: RefObject<HTMLVideoElement>;
  isScanning: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  cameraError: string | null;
  supported: boolean;
  scannerEngine: BarcodeScannerEngine | null;
}

type DetectedBarcodeLike = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcodeLike[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

type GlobalBarcodeDetector = typeof globalThis & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

const hasCameraSupport = () =>
  typeof navigator !== 'undefined'
  && Boolean(navigator.mediaDevices?.getUserMedia);

const getNativeBarcodeDetector = () =>
  (globalThis as GlobalBarcodeDetector).BarcodeDetector;

const isPermissionError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return error.name === 'NotAllowedError'
    || error.name === 'PermissionDeniedError'
    || error.message.includes('Permission denied')
    || error.message.includes('NotAllowed');
};

const cameraErrorCopy = (error: unknown) => {
  if (isPermissionError(error)) {
    return 'Camera permission denied. Allow camera access and try again, or enter the barcode manually.';
  }

  return 'Camera scanning is unavailable on this device. Enter the barcode manually.';
};

export function useBarcodeCamera(
  onDetected: (barcode: string) => void,
): UseBarcodeCamera {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const rafRef = useRef<number>(0);
  const lastDetectedRef = useRef<string>('');

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [scannerEngine, setScannerEngine] = useState<BarcodeScannerEngine | null>(null);

  useEffect(() => {
    if (!hasCameraSupport()) {
      setSupported(false);
    }
  }, []);

  const emitDetected = useCallback((barcode: string | undefined) => {
    const code = barcode?.trim();
    if (!code || code === lastDetectedRef.current) return;

    lastDetectedRef.current = code;
    onDetected(code);
  }, [onDetected]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    detectorRef.current = null;
    lastDetectedRef.current = '';
    setIsScanning(false);
    setScannerEngine(null);
  }, []);

  const scanNativeFrame = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(scanNativeFrame);
      return;
    }

    detector
      .detect(video)
      .then((barcodes) => {
        emitDetected(barcodes[0]?.rawValue);
        if (streamRef.current) {
          rafRef.current = requestAnimationFrame(scanNativeFrame);
        }
      })
      .catch(() => {
        if (streamRef.current) {
          rafRef.current = requestAnimationFrame(scanNativeFrame);
        }
      });
  }, [emitDetected]);

  const waitForPreviewElement = useCallback(async () => {
    for (let index = 0; index < 5; index += 1) {
      if (videoRef.current) return videoRef.current;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return videoRef.current;
  }, []);

  const startNativeScanner = useCallback(async (preview: HTMLVideoElement | null) => {
    const BarcodeDetector = getNativeBarcodeDetector();
    if (!BarcodeDetector || !preview) return false;

    try {
      detectorRef.current = new BarcodeDetector({ formats: BARCODE_FORMATS });
    } catch {
      detectorRef.current = null;
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    streamRef.current = stream;
    preview.srcObject = stream;
    await preview.play();

    setScannerEngine('native');
    rafRef.current = requestAnimationFrame(scanNativeFrame);
    return true;
  }, [scanNativeFrame]);

  const startZxingScanner = useCallback(async (preview: HTMLVideoElement | null) => {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();

    const controls = await reader.decodeFromConstraints(
      CAMERA_CONSTRAINTS,
      preview ?? undefined,
      (result) => {
        emitDetected(result?.getText());
      },
    );

    zxingControlsRef.current = controls;
    setScannerEngine('zxing');
  }, [emitDetected]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!hasCameraSupport()) {
      setSupported(false);
      setCameraError('Camera access is not available in this browser. Enter the barcode manually.');
      return;
    }

    setSupported(true);
    setIsScanning(true);

    try {
      const preview = await waitForPreviewElement();
      const nativeStarted = await startNativeScanner(preview);
      if (!nativeStarted) {
        await startZxingScanner(preview);
      }
    } catch (error) {
      stopCamera();
      setCameraError(cameraErrorCopy(error));
    }
  }, [startNativeScanner, startZxingScanner, stopCamera, waitForPreviewElement]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    videoRef,
    isScanning,
    startCamera,
    stopCamera,
    cameraError,
    supported,
    scannerEngine,
  };
}
