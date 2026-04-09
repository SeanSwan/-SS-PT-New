/**
 * BarcodeScanner — Camera-based barcode scanning for food lookup
 * Calls existing GET /api/food-scanner/scan/:barcode endpoint
 * Falls back to manual barcode text input on desktop
 *
 * Stretch goal — backend is fully ready, this is purely frontend
 * Gemini directive: cyan corner accents + animated laser scan line
 */

import React, { useState, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { ScanBarcode, Search, Plus, Loader2, AlertCircle, Camera, CameraOff } from 'lucide-react';
import { theme } from '../../theme/tokens';
import { useBarcodeCamera } from '../../hooks/useBarcodeCamera';
import IngredientSafetyPanel from './IngredientSafetyPanel';
import type { IngredientSafety } from './IngredientSafetyPanel';

interface ScannedProduct {
  id?: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  /** Raw ingredient list (string fallback for display only) */
  ingredientsList?: string;
  /** Structured ingredient safety data from FoodIngredient model */
  ingredients?: IngredientSafety[];
  overallRating?: 'good' | 'bad' | 'okay';
  healthRating?: number;
}

interface BarcodeScannerProps {
  onAddFood?: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    portion: string;
  }) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onAddFood }) => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanBarcode = useCallback(async (code: string) => {
    if (!code || code.length < 8) {
      setError('Barcode must be at least 8 digits');
      return;
    }

    setLoading(true);
    setError(null);
    setProduct(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/food-scanner/scan/${encodeURIComponent(code)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Product not found (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.product) {
        setProduct(data.product);
      } else {
        throw new Error(data.message || 'Product not found');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to scan barcode');
    } finally {
      setLoading(false);
    }
  }, []);

  // CRIT-02: Use a ref so stopCamera is never stale in the callback closure
  const stopCameraRef = useRef<(() => void) | null>(null);

  const handleCameraDetected = useCallback((code: string) => {
    setBarcode(code);
    stopCameraRef.current?.();
    scanBarcode(code);
  }, [scanBarcode]);

  const { videoRef, isScanning, startCamera, stopCamera, cameraError, supported } =
    useBarcodeCamera(handleCameraDetected);

  // Keep ref in sync with latest stopCamera from hook
  stopCameraRef.current = stopCamera;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scanBarcode(barcode.trim());
  };

  const handleAddToLog = () => {
    if (!product || !onAddFood) return;
    onAddFood({
      name: product.brand ? `${product.brand} ${product.name}` : product.name,
      calories: product.calories || 0,
      protein: product.protein || 0,
      carbs: product.carbs || 0,
      fat: product.fat || 0,
      portion: product.servingSize || '1 serving',
    });
    setProduct(null);
    setBarcode('');
  };

  return (
    <Container>
      <ScannerHeader>
        <ScanBarcode size={24} color={theme.colors.brand.cyan} />
        <div>
          <Title>Barcode Scanner</Title>
          <Subtitle>Scan or enter a barcode to look up nutrition data</Subtitle>
        </div>
      </ScannerHeader>

      {/* Camera / Scan Reticle */}
      <ReticleBox>
        {isScanning && (
          <CameraVideo ref={videoRef} autoPlay playsInline muted />
        )}
        <ReticleCorner $position="top-left" />
        <ReticleCorner $position="top-right" />
        <ReticleCorner $position="bottom-left" />
        <ReticleCorner $position="bottom-right" />
        {isScanning && <LaserLine />}
        {!isScanning && <ReticleText>Position barcode in frame</ReticleText>}
      </ReticleBox>

      {/* Camera Controls */}
      {supported && (
        <CameraButtonRow>
          <CameraButton
            type="button"
            onClick={isScanning ? stopCamera : startCamera}
            $active={isScanning}
          >
            {isScanning ? <CameraOff size={18} /> : <Camera size={18} />}
            {isScanning ? 'Stop Camera' : 'Scan with Camera'}
          </CameraButton>
        </CameraButtonRow>
      )}
      {cameraError && (
        <ErrorBox>
          <AlertCircle size={16} />
          {cameraError}
        </ErrorBox>
      )}

      {/* Manual Input Fallback */}
      <form onSubmit={handleSubmit}>
        <InputRow>
          <BarcodeInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter barcode number (e.g., 049000042566)"
            maxLength={14}
          />
          <ScanButton type="submit" disabled={loading || barcode.length < 8}>
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            {loading ? 'Scanning...' : 'Scan'}
          </ScanButton>
        </InputRow>
      </form>

      {error && (
        <ErrorBox>
          <AlertCircle size={16} />
          {error}
        </ErrorBox>
      )}

      {product && (
        <ProductCard>
          <ProductName>{product.brand && <Brand>{product.brand}</Brand>}{product.name}</ProductName>
          {product.servingSize && <Serving>Serving: {product.servingSize}</Serving>}

          <MacroRow>
            <MacroItem $color="#60C0F0">
              <MacroValue>{product.calories}</MacroValue>
              <MacroLabel>Calories</MacroLabel>
            </MacroItem>
            <MacroItem $color="#60C0F0">
              <MacroValue>{product.protein}g</MacroValue>
              <MacroLabel>Protein</MacroLabel>
            </MacroItem>
            <MacroItem $color="#8B5CF6">
              <MacroValue>{product.carbs}g</MacroValue>
              <MacroLabel>Carbs</MacroLabel>
            </MacroItem>
            <MacroItem $color="#C6A84B">
              <MacroValue>{product.fat}g</MacroValue>
              <MacroLabel>Fat</MacroLabel>
            </MacroItem>
          </MacroRow>

          {/* Ingredient Safety — Phase 3: shows IARC/EU-banned badges */}
          {Array.isArray(product.ingredients) && product.ingredients.length > 0 && (
            <IngredientSafetyPanel ingredients={product.ingredients} />
          )}

          {onAddFood && (
            <AddButton type="button" onClick={handleAddToLog}>
              <Plus size={18} />
              Add to Food Log
            </AddButton>
          )}
        </ProductCard>
      )}
    </Container>
  );
};

export default BarcodeScanner;

// ── Keyframes ──

const laserScan = keyframes`
  0% { transform: translateY(-80px); }
  100% { transform: translateY(80px); }
`;

const spinAnimation = keyframes`
  to { transform: rotate(360deg); }
`;

// ── Styled Components ──

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ScannerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${theme.colors.text.frost};
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.8rem;
  color: ${theme.colors.text.secondary};
  margin: 2px 0 0;
`;

const CameraVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
`;

const CameraButtonRow = styled.div`
  display: flex;
  justify-content: center;
`;

const CameraButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) => $active
    ? 'var(--midnight-sapphire, #002060)'
    : 'var(--wing-purple, #8B5CF6)'};
  color: var(--frost-white, #E0ECF4);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 12px ${({ $active }) =>
    $active ? 'rgba(96, 192, 240, 0.3)' : 'rgba(139, 92, 246, 0.3)'};

  &:hover {
    box-shadow: 0 0 20px ${({ $active }) =>
      $active ? 'rgba(96, 192, 240, 0.5)' : 'rgba(139, 92, 246, 0.5)'};
  }
`;

const ReticleBox = styled.div`
  position: relative;
  width: 100%;
  max-width: 320px;
  height: 200px;
  margin: 0 auto;
  background: rgba(0, 32, 96, 0.4);
  border: 2px solid var(--ice-wing, #60C0F0);
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(96, 192, 240, 0.3), inset 0 0 0 9999px rgba(10, 10, 15, 0.5);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ReticleCorner = styled.div<{ $position: string }>`
  position: absolute;
  width: 24px;
  height: 24px;
  border-color: ${theme.colors.brand.cyan};
  border-style: solid;
  border-width: 0;

  ${({ $position }) => $position === 'top-left' && `
    top: 12px; left: 12px;
    border-top-width: 3px; border-left-width: 3px;
    border-top-left-radius: 6px;
  `}
  ${({ $position }) => $position === 'top-right' && `
    top: 12px; right: 12px;
    border-top-width: 3px; border-right-width: 3px;
    border-top-right-radius: 6px;
  `}
  ${({ $position }) => $position === 'bottom-left' && `
    bottom: 12px; left: 12px;
    border-bottom-width: 3px; border-left-width: 3px;
    border-bottom-left-radius: 6px;
  `}
  ${({ $position }) => $position === 'bottom-right' && `
    bottom: 12px; right: 12px;
    border-bottom-width: 3px; border-right-width: 3px;
    border-bottom-right-radius: 6px;
  `}
`;

const LaserLine = styled.div`
  position: absolute;
  left: 20px;
  right: 20px;
  height: 2px;
  background: var(--ice-wing, #60C0F0);
  box-shadow: 0 0 8px var(--ice-wing, #60C0F0);
  animation: ${laserScan} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
`;

const ReticleText = styled.span`
  color: var(--frost-white, #E0ECF4);
  text-shadow: 0 1px 3px rgba(10, 10, 15, 0.9);
  font-size: 0.8rem;
  font-family: 'Sora', sans-serif;
  z-index: 1;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
`;

const BarcodeInput = styled.input`
  flex: 1;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.text.primary};
  font-size: 16px;
  font-family: 'Fira Code', monospace;
  letter-spacing: 2px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: ${theme.colors.brand.cyan};
    box-shadow: 0 0 0 1px ${theme.colors.brand.cyan}, 0 0 20px rgba(139, 92, 246, 0.4);
  }

  &::placeholder {
    color: ${theme.colors.text.secondary};
    letter-spacing: 0;
    font-family: 'Sora', sans-serif;
  }
`;

const ScanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: ${theme.colors.brand.purple};
  color: ${theme.colors.text.primary};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.3);
  white-space: nowrap;

  &:hover:not(:disabled) {
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin { animation: ${spinAnimation} 0.8s linear infinite; }
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: ${theme.colors.semantic.error};
  font-size: 0.85rem;
`;

const ProductCard = styled.div`
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s, border-color 0.2s;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(139, 92, 246, 0.4);
  }
`;

const ProductName = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${theme.colors.text.frost};
  margin: 0 0 4px;
`;

const Brand = styled.span`
  color: ${theme.colors.brand.cyan};
  margin-right: 6px;
`;

const Serving = styled.p`
  font-size: 0.8rem;
  color: ${theme.colors.text.secondary};
  margin: 0 0 16px;
`;

const MacroRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const MacroItem = styled.div<{ $color: string }>`
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${({ $color }) => `${$color}33`};
`;

const MacroValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.colors.text.primary};
  font-family: 'Fira Code', monospace;
`;

const MacroLabel = styled.div`
  font-size: 0.7rem;
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: ${theme.colors.brand.purple};
  color: ${theme.colors.text.primary};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.3);

  &:hover {
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.5);
  }
`;
