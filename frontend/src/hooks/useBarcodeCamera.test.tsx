import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestBarcodeDetector = new (options?: unknown) => {
  detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

const barcodeDetectorMocks = vi.hoisted(() => {
  const detect = vi.fn();
  const ctor = vi.fn(function MockBarcodeDetector() {
    return { detect };
  });
  return { ctor, detect };
});

vi.mock('barcode-detector', () => ({
  BarcodeDetector: barcodeDetectorMocks.ctor,
}));

const barcodeGlobal = globalThis as typeof globalThis & {
  BarcodeDetector?: TestBarcodeDetector;
};

let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;
let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
let getUserMediaMock: ReturnType<typeof vi.fn>;
let trackStopMock: ReturnType<typeof vi.fn>;
const originalMediaDevices = navigator.mediaDevices;

function installAnimationFrameMocks() {
  rafCallbacks = [];
  rafId = 0;
  cancelAnimationFrameMock = vi.fn();
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    rafCallbacks.push(callback);
    rafId += 1;
    return rafId;
  }));
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
}

function installCameraMock(stream?: MediaStream) {
  trackStopMock = vi.fn();
  const cameraStream = stream ?? ({
    getTracks: () => [{ stop: trackStopMock }],
  } as unknown as MediaStream);
  getUserMediaMock = vi.fn().mockResolvedValue(cameraStream);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: getUserMediaMock },
  });
  return cameraStream;
}

function installNativeDetector() {
  const NativeBarcodeDetector = vi.fn(function MockNativeBarcodeDetector() {
    return { detect: barcodeDetectorMocks.detect };
  }) as unknown as TestBarcodeDetector;
  barcodeGlobal.BarcodeDetector = NativeBarcodeDetector;
  return NativeBarcodeDetector;
}

function attachVideo(ref: { current: HTMLVideoElement | null }) {
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
  Object.defineProperty(video, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  ref.current = video;
  return video;
}

async function renderCameraHook(onDetected = vi.fn()) {
  const { useBarcodeCamera } = await import('./useBarcodeCamera');
  const hook = renderHook(() => useBarcodeCamera(onDetected));
  attachVideo(hook.result.current.videoRef as { current: HTMLVideoElement | null });
  return { ...hook, onDetected };
}

async function runNextFrame() {
  const callback = rafCallbacks.shift();
  expect(callback).toBeTypeOf('function');
  await act(async () => {
    callback?.(performance.now());
    await Promise.resolve();
  });
}

describe('useBarcodeCamera', () => {
  beforeEach(() => {
    vi.resetModules();
    barcodeDetectorMocks.ctor.mockClear();
    barcodeDetectorMocks.detect.mockReset();
    delete barcodeGlobal.BarcodeDetector;
    installAnimationFrameMocks();
    installCameraMock();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
    delete barcodeGlobal.BarcodeDetector;
    vi.unstubAllGlobals();
  });

  it('starts scanning with native BarcodeDetector and emits detected codes', async () => {
    const NativeBarcodeDetector = installNativeDetector();
    barcodeDetectorMocks.detect.mockResolvedValue([{ rawValue: '012345678905' }]);
    const { result, onDetected } = await renderCameraHook();

    await act(async () => {
      await result.current.startCamera();
    });
    await runNextFrame();

    expect(NativeBarcodeDetector).toHaveBeenCalledWith({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    });
    expect(getUserMediaMock).toHaveBeenCalledWith({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('012345678905'));
    expect(result.current.isScanning).toBe(true);
  });

  it('loads the barcode-detector polyfill when native BarcodeDetector is missing', async () => {
    barcodeDetectorMocks.detect.mockResolvedValue([]);
    const { result } = await renderCameraHook();

    await act(async () => {
      await result.current.startCamera();
    });

    expect(barcodeDetectorMocks.ctor).toHaveBeenCalledTimes(1);
    expect(result.current.cameraError).toBeNull();
    expect(result.current.isScanning).toBe(true);
  });

  it('surfaces camera permission denial without starting scanning', async () => {
    installNativeDetector();
    getUserMediaMock.mockRejectedValueOnce(new Error('NotAllowedError'));
    const { result } = await renderCameraHook();

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraError).toContain('Camera permission denied');
    expect(result.current.isScanning).toBe(false);
  });

  it('suppresses duplicate back-to-back barcode detections', async () => {
    installNativeDetector();
    barcodeDetectorMocks.detect.mockResolvedValue([{ rawValue: '777777777777' }]);
    const { result, onDetected } = await renderCameraHook();

    await act(async () => {
      await result.current.startCamera();
    });
    await runNextFrame();
    await runNextFrame();

    await waitFor(() => expect(onDetected).toHaveBeenCalledTimes(1));
  });

  it('stops camera tracks and cancels the scan loop on stop', async () => {
    installNativeDetector();
    barcodeDetectorMocks.detect.mockResolvedValue([]);
    const { result } = await renderCameraHook();

    await act(async () => {
      await result.current.startCamera();
    });
    act(() => {
      result.current.stopCamera();
    });

    expect(trackStopMock).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrameMock).toHaveBeenCalled();
    expect(result.current.isScanning).toBe(false);
  });

  it('stops camera tracks and cancels the scan loop on unmount', async () => {
    installNativeDetector();
    barcodeDetectorMocks.detect.mockResolvedValue([]);
    const { result, unmount } = await renderCameraHook();

    await act(async () => {
      await result.current.startCamera();
    });
    unmount();

    expect(trackStopMock).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrameMock).toHaveBeenCalled();
  });
});