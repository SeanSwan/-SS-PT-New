/**
 * FormAnalysisOverlay — AI-powered exercise form analysis
 * Crystalline Swan kinematic overlay with diamond CrystalNodes
 * Lazy-loaded from PhotoDetailModal for bundle efficiency
 */
import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { CrystalNode } from '../../components/ui/crystalline-primitives/CrystalNode';
import { FrostedBone } from '../../components/ui/crystalline-primitives/FrostedBone';
import { AIFeedbackCard, feedbackCardAnimations } from '../../components/ui/crystalline-primitives/AIFeedbackCard';

// ── Types ──
interface Keypoint { name: string; x: number; y: number; confidence: number; }
interface Correction { joint: string; severity: 'adjust' | 'minor'; message: string; angle: number | null; }
interface AnalysisResult {
  success: boolean;
  keypoints: Keypoint[];
  bones: number[][];
  corrections: Correction[];
  exerciseDetected: string;
  overallScore: number | null;
  summary: string;
  error?: string;
}

interface FormAnalysisOverlayProps {
  photoId: number;
  photoUrl: string;
  galleryToken: string;
  onClose: () => void;
}

// ── Scanning animation ──
const scanSweep = keyframes`
  0% { top: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
`;

const ScanLine = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(96, 192, 240, 0.6), transparent);
  box-shadow: 0 0 20px rgba(96, 192, 240, 0.4);
  animation: ${scanSweep} 2s ease-in-out;
  pointer-events: none;
  z-index: 15;
`;

const Container = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 20, 60, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
`;

const Header = styled.div`
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  color: #E0ECF4;
  margin: 0;
`;

const CloseBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(224, 236, 244, 0.15);
  background: transparent;
  color: #E0ECF4;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { border-color: rgba(96, 192, 240, 0.4); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const ImageContainer = styled.div`
  position: relative;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;

  img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 12px;
  }
`;

const ScoreBar = styled.div`
  max-width: 800px;
  width: 100%;
  margin: 16px auto;
  padding: 16px 24px;
  background: rgba(0, 48, 128, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 430px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ScoreCircle = styled.div<{ $score: number }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid ${p => p.$score >= 80 ? '#60C0F0' : p.$score >= 60 ? '#C6A84B' : '#8B5CF6'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${p => p.$score >= 80 ? '#60C0F0' : p.$score >= 60 ? '#C6A84B' : '#8B5CF6'};
  flex-shrink: 0;
`;

const ScoreInfo = styled.div`
  flex: 1;

  .exercise {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #E0ECF4;
    text-transform: capitalize;
  }

  .summary {
    font-family: 'Sora', sans-serif;
    font-size: 0.875rem;
    color: rgba(224, 236, 244, 0.7);
    margin-top: 4px;
  }
`;

const CorrectionsList = styled.div`
  max-width: 800px;
  width: 100%;
  margin: 0 auto 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CorrectionItem = styled.div`
  padding: 12px 16px;
  background: rgba(0, 48, 128, 0.4);
  border-left: 3px solid #8B5CF6;
  border-radius: 0 8px 8px 0;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;

  .joint {
    font-family: 'Fira Code', monospace;
    color: #50A0F0;
    font-size: 0.75rem;
    text-transform: uppercase;
  }
`;

const StatusText = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.5rem;
  color: #60C0F0;
  text-align: center;
  padding: 48px 24px;
`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const FormAnalysisOverlay: React.FC<FormAnalysisOverlayProps> = ({
  photoId, photoUrl, galleryToken, onClose,
}) => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      try {
        const res = await fetch(`${API_BASE}/api/gallery/analyze-form`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${galleryToken}`,
          },
          body: JSON.stringify({ photoId }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (data.success) {
          setResult(data);
        } else {
          setError(data.error || 'Analysis failed');
        }
      } catch {
        if (!cancelled) setError('Network error — please try again');
      } finally {
        if (!cancelled) setScanning(false);
      }
    }

    analyze();
    return () => { cancelled = true; };
  }, [photoId, galleryToken]);

  // Map corrections to joint positions for overlay
  const correctionMap = useMemo(() => {
    if (!result) return new Map<string, Correction>();
    const map = new Map<string, Correction>();
    result.corrections.forEach(c => map.set(c.joint, c));
    return map;
  }, [result]);

  return (
    <Container>
      <Header>
        <Title>Swan Form Analysis</Title>
        <CloseBtn onClick={onClose} aria-label="Close analysis">✕</CloseBtn>
      </Header>

      {scanning && <StatusText>Analyzing your form...</StatusText>}

      {error && <StatusText style={{ color: '#8B5CF6' }}>{error}</StatusText>}

      <ImageContainer>
        <img src={photoUrl} alt="Form analysis" />

        {/* Scan line animation while analyzing */}
        {scanning && <ScanLine />}

        {/* Kinematic skeleton overlay */}
        {result && (
          <>
            {/* Bones (SVG lines) */}
            <FrostedBone viewBox="0 0 100 100" preserveAspectRatio="none">
              {result.bones.map(([i, j], idx) => {
                const a = result.keypoints.find(k => k.name === result.jointNames[i]);
                const b = result.keypoints.find(k => k.name === result.jointNames[j]);
                if (!a || !b) return null;
                return (
                  <line
                    key={idx}
                    x1={a.x * 100} y1={a.y * 100}
                    x2={b.x * 100} y2={b.y * 100}
                  />
                );
              })}
            </FrostedBone>

            {/* Crystal nodes (diamond joints) */}
            {result.keypoints.filter(k => k.confidence > 0.4).map((kp) => {
              const correction = correctionMap.get(kp.name);
              const status = correction ? 'adjust' : 'perfect';
              return (
                <CrystalNode
                  key={kp.name}
                  $status={status}
                  style={{
                    left: `calc(${kp.x * 100}% - 6px)`,
                    top: `calc(${kp.y * 100}% - 6px)`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * result.keypoints.indexOf(kp) }}
                />
              );
            })}

            {/* Feedback cards for corrections */}
            <AnimatePresence>
              {result.corrections.slice(0, 3).map((correction, idx) => {
                const kp = result.keypoints.find(k => k.name === correction.joint);
                if (!kp) return null;
                return (
                  <div
                    key={correction.joint}
                    style={{
                      position: 'absolute',
                      left: `${Math.min(70, kp.x * 100 + 5)}%`,
                      top: `${kp.y * 100}%`,
                      zIndex: 20,
                    }}
                  >
                    <AIFeedbackCard
                      {...feedbackCardAnimations}
                      transition={{ ...feedbackCardAnimations.transition, delay: 0.3 + idx * 0.2 }}
                      role="status"
                      aria-live="polite"
                    >
                      <h4>{correction.joint.replace(/_/g, ' ')}</h4>
                      <p>{correction.message}</p>
                      {correction.angle && (
                        <span className="metric">{correction.angle}°</span>
                      )}
                    </AIFeedbackCard>
                  </div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </ImageContainer>

      {/* Score + Summary */}
      {result && result.overallScore !== null && (
        <ScoreBar>
          <ScoreCircle $score={result.overallScore}>{result.overallScore}</ScoreCircle>
          <ScoreInfo>
            <div className="exercise">{result.exerciseDetected}</div>
            <div className="summary">{result.summary}</div>
          </ScoreInfo>
        </ScoreBar>
      )}

      {/* Corrections list */}
      {result && result.corrections.length > 0 && (
        <CorrectionsList>
          {result.corrections.map(c => (
            <CorrectionItem key={c.joint}>
              <div className="joint">{c.joint.replace(/_/g, ' ')}</div>
              {c.message}
            </CorrectionItem>
          ))}
        </CorrectionsList>
      )}

      {result && result.corrections.length === 0 && (
        <StatusText style={{ fontSize: '1.25rem' }}>
          Perfect form — no corrections needed
        </StatusText>
      )}
    </Container>
  );
};

export default FormAnalysisOverlay;
