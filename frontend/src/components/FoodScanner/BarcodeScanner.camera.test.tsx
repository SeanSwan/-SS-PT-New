
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BarcodeScanner from './BarcodeScanner';

const hookState = vi.hoisted(() => ({
  isScanning: false,
  cameraError: null as string | null,
  supported: true,
  scannerEngine: 'native' as 'native' | 'zxing' | null,
  startCamera: vi.fn(),
  stopCamera: vi.fn(),
  onDetected: (_barcode: string) => {},
}));

vi.mock('../../hooks/useBarcodeCamera', () => ({
  useBarcodeCamera: (onDetected: (barcode: string) => void) => {
    hookState.onDetected = onDetected;
    return {
      videoRef: { current: null },
      isScanning: hookState.isScanning,
      startCamera: hookState.startCamera,
      stopCamera: hookState.stopCamera,
      cameraError: hookState.cameraError,
      supported: hookState.supported,
      scannerEngine: hookState.scannerEngine,
    };
  },
}));

describe('FoodScanner BarcodeScanner camera flow', () => {
  beforeEach(() => {
    hookState.isScanning = false;
    hookState.cameraError = null;
    hookState.supported = true;
    hookState.scannerEngine = 'native';
    hookState.startCamera.mockReset();
    hookState.stopCamera.mockReset();
  });

  it('starts the real camera scanner instead of showing the old simulation copy', async () => {
    const user = userEvent.setup();

    render(<BarcodeScanner onDetected={vi.fn()} />);

    expect(screen.queryByText(/Camera barcode scanning will be available soon/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /scan with camera/i }));

    expect(hookState.startCamera).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/native camera scanner/i)).toBeInTheDocument();
  });

  it('keeps manual barcode entry available and validates numeric UPC/EAN values', async () => {
    const user = userEvent.setup();
    const onDetected = vi.fn();

    render(<BarcodeScanner onDetected={onDetected} />);

    const input = screen.getByLabelText(/manual barcode number/i);
    await user.type(input, 'abc049000042566');
    await user.click(screen.getByRole('button', { name: /use barcode/i }));

    expect(onDetected).toHaveBeenCalledWith('049000042566');
  });

  it('stops scanning when the camera hook detects a barcode', () => {
    const onDetected = vi.fn();

    render(<BarcodeScanner onDetected={onDetected} />);
    act(() => hookState.onDetected('049000042566'));

    expect(hookState.stopCamera).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith('049000042566');
  });
  it('keeps the camera active when the decoded value is not a supported product barcode', () => {
    const onDetected = vi.fn();

    render(<BarcodeScanner onDetected={onDetected} />);
    act(() => hookState.onDetected('qr-code-not-a-upc'));

    expect(hookState.stopCamera).not.toHaveBeenCalled();
    expect(onDetected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/not a supported UPC or EAN/i);
  });
});
