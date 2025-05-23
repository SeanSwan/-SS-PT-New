import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Quagga from 'quagga';
import { useToast } from '../../hooks/use-toast';

const ScannerContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  overflow: hidden;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  background-color: #000;
  border-radius: 10px;
  overflow: hidden;
`;

const CameraFeed = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;

const ScanOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
`;

const ScannerLine = styled(motion.div)`
  position: absolute;
  width: 80%;
  height: 2px;
  background: linear-gradient(to right, 
    rgba(0, 255, 255, 0), 
    rgba(0, 255, 255, 0.8), 
    rgba(0, 255, 255, 0)
  );
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
`;

const ScannerBox = styled.div`
  position: relative;
  width: 70%;
  height: 50%;
  border: 2px solid rgba(0, 255, 255, 0.6);
  border-radius: 10px;
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5);
`;

const ScannerCorner = styled.div<{ position: string }>`
  position: absolute;
  width: 20px;
  height: 20px;
  border-style: solid;
  border-color: #00ffff;
  border-width: ${({ position }) => {
    if (position === 'top-left') return '2px 0 0 2px';
    if (position === 'top-right') return '2px 2px 0 0';
    if (position === 'bottom-left') return '0 0 2px 2px';
    if (position === 'bottom-right') return '0 2px 2px 0';
    return '0';
  }};
  
  ${({ position }) => {
    if (position === 'top-left') return 'top: -2px; left: -2px;';
    if (position === 'top-right') return 'top: -2px; right: -2px;';
    if (position === 'bottom-left') return 'bottom: -2px; left: -2px;';
    if (position === 'bottom-right') return 'bottom: -2px; right: -2px;';
    return '';
  }}
  
  border-radius: ${({ position }) => {
    if (position === 'top-left') return '10px 0 0 0';
    if (position === 'top-right') return '0 10px 0 0';
    if (position === 'bottom-left') return '0 0 0 10px';
    if (position === 'bottom-right') return '0 0 10px 0';
    return '0';
  }};
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  gap: 1rem;
`;

const ScanButton = styled.button`
  background: linear-gradient(135deg, #7851a9, #00ffff);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.25);
  }
  
  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ErrorMessage = styled.div`
  color: #ff4b6a;
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 75, 106, 0.1);
  border-radius: 8px;
  text-align: center;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  color: white;
  border-radius: 10px;
`;

const Spinner = styled(motion.div)`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #00ffff;
  margin-bottom: 1rem;
`;

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  isScanning: boolean;
  onScanToggle: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onDetected, 
  isScanning, 
  onScanToggle 
}) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [recognizingCode, setRecognizingCode] = useState(false);
  const { toast } = useToast();

  // Initialize the barcode scanner
  useEffect(() => {
    if (!isScanning) return;

    const initScanner = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser');
        }

        // Check if camera is available
        await navigator.mediaDevices.getUserMedia({ video: true });

        Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              width: 640,
              height: 480,
              facingMode: 'environment' // Use rear camera if available
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: true
          },
          numOfWorkers: 2,
          decoder: {
            readers: [
              'ean_reader',  // Standard EAN 13-digit barcode
              'ean_8_reader', // EAN 8-digit barcode
              'upc_reader',  // UPC-A 12-digit barcode
              'upc_e_reader', // UPC-E 6-digit barcode
              'code_39_reader', // For non-food items
              'code_128_reader', // For non-food items
            ]
          },
          locate: true
        }, (err: any) => {
          if (err) {
            console.error('Quagga initialization error:', err);
            setError('Failed to initialize the scanner. Please check your camera settings.');
            onScanToggle(); // Stop scanning attempt
            return;
          }
          
          console.log('Quagga initialization successful');
          setScannerInitialized(true);
          Quagga.start();
        });
        
        // Handle successful barcode detection
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            console.log('Barcode detected:', code);
            
            // Only process if we're not already recognizing a code
            if (!recognizingCode) {
              setRecognizingCode(true);
              
              // Play a sound to indicate successful scan
              const audio = new Audio('/assets/beep.mp3');
              audio.play().catch(e => console.log('Audio play failed:', e));
              
              // Pause scanner and call the onDetected callback
              Quagga.pause();
              onDetected(code);
              
              // Reset the recognizing state after a delay
              setTimeout(() => {
                setRecognizingCode(false);
              }, 1000);
            }
          }
        });
        
        // Handle processing errors
        Quagga.onProcessed((result) => {
          const drawingCtx = Quagga.canvas.ctx.overlay;
          const drawingCanvas = Quagga.canvas.dom.overlay;

          if (result) {
            if (result.boxes) {
              drawingCtx.clearRect(
                0,
                0,
                parseInt(drawingCanvas.getAttribute('width') || '0'),
                parseInt(drawingCanvas.getAttribute('height') || '0')
              );
              result.boxes
                .filter(box => box !== result.box)
                .forEach(box => {
                  Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                    color: 'green',
                    lineWidth: 2
                  });
                });
            }

            if (result.box) {
              Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
                color: '#00f',
                lineWidth: 2
              });
            }

            if (result.codeResult && result.codeResult.code) {
              Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, {
                color: 'red',
                lineWidth: 3
              });
            }
          }
        });
      } catch (error: any) {
        console.error('Camera access error:', error);
        setError(`Camera access error: ${error.message || 'Unknown error'}`);
        onScanToggle(); // Stop scanning attempt
      }
    };

    initScanner();

    // Cleanup function to stop the scanner when component unmounts or isScanning changes
    return () => {
      if (scannerInitialized) {
        console.log('Stopping Quagga scanner');
        Quagga.stop();
        setScannerInitialized(false);
      }
    };
  }, [isScanning, onScanToggle, onDetected, recognizingCode]);

  // Handle errors that occur during scanning
  useEffect(() => {
    if (error) {
      toast({
        title: 'Scanner Error',
        description: error,
        variant: 'destructive'
      });
      setError(null); // Clear the error after showing toast
    }
  }, [error, toast]);

  return (
    <ScannerContainer>
      <VideoContainer>
        <CameraFeed ref={scannerRef} />
        
        {isScanning && (
          <ScanOverlay>
            <ScannerBox>
              <ScannerCorner position="top-left" />
              <ScannerCorner position="top-right" />
              <ScannerCorner position="bottom-left" />
              <ScannerCorner position="bottom-right" />
              
              <ScannerLine 
                animate={{
                  y: [-50, 50, -50],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </ScannerBox>
          </ScanOverlay>
        )}
        
        {recognizingCode && (
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Spinner
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <div>Processing barcode...</div>
          </LoadingOverlay>
        )}
      </VideoContainer>
      
      <ControlsContainer>
        <ScanButton onClick={onScanToggle} disabled={recognizingCode}>
          {isScanning ? 'Stop Scanner' : 'Start Scanner'}
        </ScanButton>
      </ControlsContainer>
    </ScannerContainer>
  );
};

export default BarcodeScanner;