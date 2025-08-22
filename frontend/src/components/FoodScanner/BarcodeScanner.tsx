/**
 * BarcodeScanner Component - PRODUCTION SIMPLIFIED
 * ==============================================
 * Simplified barcode scanner with manual entry capability
 * Quagga library temporarily removed for production stability
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
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
  background: linear-gradient(135deg, #1e1e3f, #0a0a1a);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PlaceholderContent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  padding: 2rem;
`;

const PlaceholderIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
`;

const PlaceholderText = styled.p`
  font-size: 1rem;
  opacity: 0.8;
  margin-bottom: 1rem;
  line-height: 1.4;
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
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
  gap: 1rem;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
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

const ManualInputContainer = styled.div`
  width: 100%;
  max-width: 400px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const InputLabel = styled.label`
  display: block;
  color: white;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const BarcodeInput = styled.input`
  width: 100%;
  padding: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  
  &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SubmitButton = styled(ScanButton)`
  width: 100%;
  margin-top: 0.5rem;
  background: linear-gradient(135deg, #2ed573, #00ffff);
`;

const InfoText = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  text-align: center;
  margin-top: 0.5rem;
  line-height: 1.4;
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
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const { toast } = useToast();

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      // Validate barcode format (basic validation)
      const cleanBarcode = manualBarcode.trim();
      if (cleanBarcode.length >= 8 && /^\d+$/.test(cleanBarcode)) {
        onDetected(cleanBarcode);
        setManualBarcode('');
        setShowManualInput(false);
        toast({
          title: 'Barcode Added',
          description: `Barcode ${cleanBarcode} has been processed.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Invalid Barcode',
          description: 'Please enter a valid numeric barcode (8+ digits).',
          variant: 'destructive'
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  return (
    <ScannerContainer>
      <VideoContainer>
        {!isScanning ? (
          <PlaceholderContent>
            <PlaceholderIcon>📷</PlaceholderIcon>
            <PlaceholderText>
              Camera barcode scanning will be available soon.<br/>
              Use manual entry below for now.
            </PlaceholderText>
          </PlaceholderContent>
        ) : (
          <>
            <PlaceholderContent>
              <PlaceholderIcon>🔍</PlaceholderIcon>
              <PlaceholderText>
                Scanning simulation active...<br/>
                Use manual entry for actual barcodes.
              </PlaceholderText>
            </PlaceholderContent>
            
            <ScanOverlay>
              <ScannerBox>
                <ScannerCorner position=\"top-left\" />
                <ScannerCorner position=\"top-right\" />
                <ScannerCorner position=\"bottom-left\" />
                <ScannerCorner position=\"bottom-right\" />
                
                <ScannerLine 
                  animate={{
                    y: [-50, 50, -50],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: \"easeInOut\"
                  }}
                />
              </ScannerBox>
            </ScanOverlay>
          </>
        )}
      </VideoContainer>
      
      <ControlsContainer>
        <ButtonRow>
          <ScanButton onClick={onScanToggle}>
            {isScanning ? 'Stop Scanner' : 'Start Scanner'}
          </ScanButton>
          
          <ScanButton 
            onClick={() => setShowManualInput(!showManualInput)}
            style={{ background: showManualInput ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)' : 'linear-gradient(135deg, #2ed573, #00ffff)' }}
          >
            {showManualInput ? 'Hide Manual Entry' : 'Manual Entry'}
          </ScanButton>
        </ButtonRow>
        
        {showManualInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ManualInputContainer>
              <InputLabel htmlFor=\"barcode-input\">
                Enter Barcode Number
              </InputLabel>
              <BarcodeInput
                id=\"barcode-input\"
                type=\"text\"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder=\"e.g., 123456789012\"
                pattern=\"[0-9]*\"
                inputMode=\"numeric\"
              />
              <SubmitButton 
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim()}
              >
                Add Barcode
              </SubmitButton>
              <InfoText>
                Enter the barcode number found on food packaging.<br/>
                Most barcodes are 8-13 digits long.
              </InfoText>
            </ManualInputContainer>
          </motion.div>
        )}
      </ControlsContainer>
    </ScannerContainer>
  );
};

export default BarcodeScanner;
