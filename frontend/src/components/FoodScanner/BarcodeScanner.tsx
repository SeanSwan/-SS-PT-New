import React, { useCallback, useRef, useState } from 'react';
import { AlertCircle, Camera, CameraOff, ScanBarcode, Search } from 'lucide-react';
import { useBarcodeCamera } from '../../hooks/useBarcodeCamera';
import {
  ButtonRow,
  CameraButton,
  CameraFrame,
  CameraScrim,
  CameraVideo,
  Controls,
  EngineBadge,
  FrameCopy,
  FrameHint,
  HeaderCopy,
  HeaderIcon,
  ManualForm,
  ManualInput,
  ManualLabel,
  ManualRow,
  ManualSubmit,
  Notice,
  Reticle,
  ReticleCorner,
  ScannerContainer,
  ScannerHeader,
  ScannerLine,
  Subtitle,
  Title,
} from './BarcodeScanner.styles';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  disabled?: boolean;
}

const sanitizeBarcode = (value: string) => value.replace(/\D/g, '').slice(0, 14);
const isSupportedBarcode = (value: string) => /^\d{8,14}$/.test(value);

const scannerEngineLabel = (engine: 'native' | 'zxing' | null) => {
  if (engine === 'native') return 'Native camera scanner';
  if (engine === 'zxing') return 'ZXing fallback scanner';
  return 'Camera scanner ready';
};

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, disabled = false }) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const stopCameraRef = useRef<() => void>(() => undefined);

  const submitBarcode = useCallback((rawBarcode: string) => {
    const barcode = sanitizeBarcode(rawBarcode);

    if (!isSupportedBarcode(barcode)) {
      setManualError('Enter a numeric UPC or EAN barcode between 8 and 14 digits.');
      return;
    }

    setManualError(null);
    setManualBarcode(barcode);
    onDetected(barcode);
  }, [onDetected]);

  const handleCameraDetected = useCallback((rawBarcode: string) => {
    const barcode = sanitizeBarcode(rawBarcode);
    if (!isSupportedBarcode(barcode)) {
      setManualError('Detected barcode was not a supported UPC or EAN value.');
      return;
    }

    stopCameraRef.current();
    submitBarcode(barcode);
  }, [submitBarcode]);

  const {
    videoRef,
    isScanning,
    startCamera,
    stopCamera,
    cameraError,
    supported,
    scannerEngine,
  } = useBarcodeCamera(handleCameraDetected);

  stopCameraRef.current = stopCamera;

  const handleManualChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setManualBarcode(sanitizeBarcode(event.target.value));
    setManualError(null);
  };

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitBarcode(manualBarcode);
  };

  const handleCameraToggle = () => {
    if (isScanning) {
      stopCamera();
      return;
    }

    startCamera();
  };

  return (
    <ScannerContainer aria-label="Food barcode scanner">
      <ScannerHeader>
        <HeaderIcon aria-hidden="true">
          <ScanBarcode size={24} />
        </HeaderIcon>
        <HeaderCopy>
          <Title>Product Barcode Scanner</Title>
          <Subtitle>Use the camera when available, or enter the number printed near the barcode.</Subtitle>
        </HeaderCopy>
      </ScannerHeader>

      <CameraFrame>
        <CameraVideo
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Barcode camera preview"
          data-active={isScanning ? 'true' : 'false'}
        />
        <CameraScrim />
        <Reticle aria-hidden="true">
          <ReticleCorner $position="top-left" />
          <ReticleCorner $position="top-right" />
          <ReticleCorner $position="bottom-left" />
          <ReticleCorner $position="bottom-right" />
          {isScanning && <ScannerLine />}
        </Reticle>
        <FrameCopy>
          <EngineBadge>{scannerEngineLabel(scannerEngine)}</EngineBadge>
          <FrameHint>
            {isScanning
              ? 'Hold the product barcode steady inside the frame.'
              : 'Camera scanning is ready when your browser grants camera access.'}
          </FrameHint>
        </FrameCopy>
      </CameraFrame>

      <Controls>
        <ButtonRow>
          <CameraButton
            type="button"
            onClick={handleCameraToggle}
            disabled={disabled || !supported}
            $active={isScanning}
          >
            {isScanning ? <CameraOff size={18} /> : <Camera size={18} />}
            {isScanning ? 'Stop Camera' : 'Scan with Camera'}
          </CameraButton>
        </ButtonRow>

        {!supported && (
          <Notice>
            <AlertCircle size={18} aria-hidden="true" />
            Camera scanning is unavailable in this browser. Manual entry still works.
          </Notice>
        )}

        {cameraError && (
          <Notice $tone="error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {cameraError}
          </Notice>
        )}

        <ManualForm onSubmit={handleManualSubmit} noValidate>
          <ManualLabel htmlFor="manual-barcode-number">Manual barcode number</ManualLabel>
          <ManualRow>
            <ManualInput
              id="manual-barcode-number"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={manualBarcode}
              onChange={handleManualChange}
              placeholder="049000042566"
              autoComplete="off"
              maxLength={14}
              aria-describedby={manualError ? 'manual-barcode-error' : undefined}
            />
            <ManualSubmit type="submit" disabled={disabled || !isSupportedBarcode(manualBarcode)}>
              <Search size={18} aria-hidden="true" />
              Use Barcode
            </ManualSubmit>
          </ManualRow>
          {manualError && (
            <Notice id="manual-barcode-error" $tone="error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {manualError}
            </Notice>
          )}
        </ManualForm>
      </Controls>
    </ScannerContainer>
  );
};

export default BarcodeScanner;
