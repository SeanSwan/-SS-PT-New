/**
 * GalleryPage.tsx
 * ===============
 * Public photo gallery with Gemini 3.1 Pro's "Cosmic Gate" design.
 * - Event listing → Password gate → Justified photo grid → Lightbox
 * - Email capture is the gate. Downloads are free. Donations optional.
 * - Enhancement credit system with watermark overlay (CSS-only, downloads stay clean)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import VIPConversionModal from './gallery/VIPConversionModal';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Types ─────────────────────────────────────────────────────────────────
interface GalleryEventSummary {
  id: number;
  name: string;
  slug: string;
  sport: string | null;
  eventDate: string | null;
  location: string | null;
  photoCount: number;
  description: string | null;
  coverPhotoUrl: string | null;
}

interface GalleryPhoto {
  id: number;
  photoNumber: number;
  displayName: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  enhancedUrl: string | null;
  enhancementRequestCount: number;
}

interface EnhancementCredits {
  freeRemaining: number;
  purchasedCredits: number;
  isVip: boolean;
  freeUsedThisEvent: number;
}

// ── Animations ────────────────────────────────────────────────────────────
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const toastSlideIn = keyframes`
  0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
  100% { transform: translateX(-50%) translateY(0); opacity: 1; }
`;

const toastSlideOut = keyframes`
  0% { transform: translateX(-50%) translateY(0); opacity: 1; }
  100% { transform: translateX(-50%) translateY(20px); opacity: 0; }
`;

// ── Styled Components ─────────────────────────────────────────────────────
const PageWrapper = styled.div`
  min-height: 100vh;
  background: radial-gradient(ellipse at top, #120d26 0%, #002060 60%);
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', system-ui, sans-serif;
`;

const ContentMax = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  @media (max-width: 768px) { padding: 16px; }
`;

const PageTitle = styled.h1`
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #60C0F0, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 32px 0 8px;
  letter-spacing: -1px;
  @media (max-width: 768px) { font-size: 28px; margin: 16px 0 8px; }
`;

const PageSubtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 15px;
  margin: 0 0 32px;
`;

// ── Event Cards ───────────────────────────────────────────────────────────
const EventGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  @media (max-width: 480px) { grid-template-columns: 1fr; gap: 16px; }
`;

const EventCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.3s;
  &:hover { border-color: rgba(139, 92, 246, 0.3); }
`;

const EventCover = styled.div<{ $src: string | null }>`
  width: 100%;
  height: 200px;
  background: ${p => p.$src ? `url(${p.$src}) center/cover` : 'linear-gradient(135deg, #1a1035, #002060)'};
  position: relative;
`;

const SportBadge = styled.span`
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(139, 92, 246, 0.15);
  color: #60C0F0;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PhotoCountBadge = styled.span`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 32, 96, 0.85);
  color: rgba(255,255,255,0.9);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(8px);
`;

const EventInfo = styled.div`
  padding: 20px;
`;

const EventName = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #fff;
`;

const EventMeta = styled.p`
  font-size: 13px;
  color: rgba(255,255,255,0.45);
  margin: 0;
`;

// ── Password Gate (Cosmic Gate) ───────────────────────────────────────────
const GateOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 32, 96, 0.92);
  backdrop-filter: blur(40px);
`;

const GateCard = styled(motion.div)`
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 24px;
  padding: 40px;
  width: 90vw;
  max-width: 440px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
`;

const GateTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #60C0F0, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
  text-align: center;
`;

const GateSubtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  text-align: center;
  margin: 0 0 24px;
`;

const InputGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 6px;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  &:focus { border-color: rgba(139, 92, 246, 0.5); }
  &::placeholder { color: rgba(255,255,255,0.3); }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 12px;
  cursor: pointer;
  input { margin-top: 2px; min-width: 18px; min-height: 18px; }
`;

const SubmitButton = styled.button<{ $loading?: boolean }>`
  width: 100%;
  padding: 14px;
  min-height: 48px;
  background: linear-gradient(135deg, #60C0F0 0%, #8B5CF6 100%);
  border: none;
  border-radius: 12px;
  color: #002060;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  opacity: ${p => p.$loading ? 0.7 : 1};
  pointer-events: ${p => p.$loading ? 'none' : 'auto'};
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 13px;
  margin: 8px 0 0;
  text-align: center;
`;

// ── Photo Grid (Justified) ───────────────────────────────────────────────
const GridWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); gap: 4px; }
`;

const PhotoCard = styled.div<{ $selected?: boolean }>`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 4/3;
  ${p => p.$selected && css`
    &::after {
      content: '\u2605';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #60C0F0, #8B5CF6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #002060;
      font-size: 16px;
      z-index: 2;
    }
  `}
  &:hover img { transform: scale(1.02); }
`;

const PhotoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,32,96,0.9) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  padding: 12px;
  ${PhotoCard}:hover & { opacity: 1; }
`;

const PhotoLabel = styled.span`
  color: #fff;
  font-size: 13px;
  font-weight: 600;
`;

// ── Watermark Overlay (CSS-only, not on downloads) ────────────────────────
const WatermarkOverlay = styled.div`
  position: absolute;
  bottom: 3%;
  right: 3%;
  width: max(150px, 8vw);
  opacity: 0.35;
  mix-blend-mode: overlay;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
`;

const WatermarkLogo = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const WatermarkText = styled.span`
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: 2px;
  white-space: nowrap;
`;

// ── Lightbox ──────────────────────────────────────────────────────────────
const LightboxBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 32, 96, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LightboxImageWrapper = styled.div`
  position: relative;
  display: inline-block;
  max-width: 90vw;
  max-height: 90vh;
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  display: block;
`;

const LightboxControl = styled.button<{ $position?: 'left' | 'right' }>`
  position: fixed;
  top: 50%;
  ${p => p.$position === 'left' ? 'left: 16px;' : 'right: 16px;'}
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 301;
  &:hover { background: rgba(255, 255, 255, 0.15); }
`;

const LightboxClose = styled.button`
  position: fixed;
  top: 16px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  z-index: 301;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255, 255, 255, 0.15); }
`;

const LightboxActions = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 301;
`;

const LightboxBtn = styled.a<{ $primary?: boolean }>`
  padding: 12px 24px;
  min-height: 44px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.15);
  ${p => p.$primary
    ? 'background: linear-gradient(135deg, #60C0F0, #8B5CF6); color: #002060; border: none;'
    : 'background: rgba(255,255,255,0.08); color: #fff;'}
  &:hover { opacity: 0.9; }
`;

const EnhanceButton = styled.button<{ $hasCredits: boolean }>`
  padding: 12px 24px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: ${p => p.$hasCredits ? '#8B5CF6' : '#8B5CF6'};
  color: ${p => p.$hasCredits ? '#002060' : '#fff'};
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
`;

// ── Floating Credit Pill ──────────────────────────────────────────────────
const CreditPill = styled(motion.div)<{ $hasCredits: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(0, 32, 96, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid ${p => p.$hasCredits ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.25)'};
  border-radius: 100px;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 24px ${p => p.$hasCredits ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  pointer-events: none;
`;

const CreditDot = styled.span<{ $hasCredits: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$hasCredits ? '#8B5CF6' : '#8B5CF6'};
  box-shadow: 0 0 8px ${p => p.$hasCredits ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.6)'};
  animation: ${pulseGlow} 2s infinite;
`;

// ── Welcome Toast ─────────────────────────────────────────────────────────
const ToastWrapper = styled.div<{ $exiting?: boolean }>`
  position: fixed;
  bottom: 96px;
  left: 50%;
  z-index: 250;
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 16px;
  padding: 16px 24px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
  white-space: nowrap;
  animation: ${p => p.$exiting ? toastSlideOut : toastSlideIn} 0.4s ease forwards;
`;

// ── Upgrade Modal ─────────────────────────────────────────────────────────
const ModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 32, 96, 0.92);
  backdrop-filter: blur(20px);
`;

const ModalCard = styled(motion.div)`
  background: rgba(0, 32, 96, 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 24px;
  padding: 40px;
  width: 90vw;
  max-width: 640px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #60C0F0, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px;
  text-align: center;
`;

const ModalSubtitle = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  text-align: center;
  margin: 0 0 28px;
`;

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const PricingCard = styled.button<{ $highlighted?: boolean; $vip?: boolean }>`
  background: ${p => p.$vip
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.1))'
    : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${p => p.$highlighted
    ? 'rgba(139, 92, 246, 0.5)'
    : p.$vip
      ? 'rgba(139, 92, 246, 0.4)'
      : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 16px;
  padding: 24px 16px;
  cursor: pointer;
  color: #fff;
  text-align: center;
  transition: border-color 0.3s, transform 0.2s;
  &:hover {
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-2px);
  }
`;

const PricingLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 8px;
`;

const PricingPrice = styled.div`
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #60C0F0, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
`;

const PricingDesc = styled.div`
  font-size: 13px;
  color: rgba(255,255,255,0.6);
`;

const ReferralLink = styled.p`
  text-align: center;
  font-size: 13px;
  color: rgba(139, 92, 246, 0.7);
  cursor: pointer;
  margin: 0;
  &:hover { color: #60C0F0; text-decoration: underline; }
`;

const ModalCloseBtn = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255, 255, 255, 0.15); }
`;

// ── Floating Cart (Mobile) ────────────────────────────────────────────────
const FloatingCart = styled(motion.div)`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 400px;
  height: 64px;
  background: rgba(20, 20, 35, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 32px;
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.1);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
`;

// ── Thank You / Support Section ───────────────────────────────────────────
const SupportSection = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  margin-top: 24px;
  text-align: center;
`;

const SupportTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
`;

const SupportText = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  margin: 0 0 20px;
`;

const SupportButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const SupportBtn = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
  padding: 12px 24px;
  min-height: 44px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.12);
  ${p => p.$variant === 'primary' && 'background: linear-gradient(135deg, #60C0F0, #8B5CF6); color: #002060; border: none;'}
  ${p => p.$variant === 'secondary' && 'background: rgba(139, 92, 246, 0.1); color: #60C0F0; border-color: rgba(139, 92, 246,0.3);'}
  ${p => (!p.$variant || p.$variant === 'ghost') && 'background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);'}
  &:hover { opacity: 0.85; }
`;

const BackButton = styled.button`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 16px;
  &:hover { background: rgba(255,255,255,0.1); }
`;

const LoadingShimmer = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 12px;
`;

// ── Component ─────────────────────────────────────────────────────────────
const GalleryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  // State
  const [events, setEvents] = useState<GalleryEventSummary[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GalleryEventSummary | null>(null);
  const [galleryToken, setGalleryToken] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [gateSlug, setGateSlug] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [enhanceSelections, setEnhanceSelections] = useState<Set<number>>(new Set());
  const [showSupport, setShowSupport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Enhancement credit state
  const [credits, setCredits] = useState<EnhancementCredits>({ freeRemaining: 3, purchasedCredits: 0, isVip: false, freeUsedThisEvent: 0 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  // Welcome toast state
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gate form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  // Load events on mount + check for VIP success return
  useEffect(() => {
    loadEvents();
    const params = new URLSearchParams(window.location.search);
    if (params.get('vip') === 'success') {
      setShowVipModal(true);
    }
  }, []);

  // If slug param, open the gate for that event
  useEffect(() => {
    if (slug && !galleryToken) {
      setGateSlug(slug);
      setShowGate(true);
    } else if (slug && galleryToken) {
      loadPhotos(slug);
    }
  }, [slug, galleryToken]);

  // Fetch credits when gallery token is available
  const fetchCredits = useCallback(async () => {
    if (!galleryToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/gallery/credits`, {
        headers: { Authorization: `Bearer ${galleryToken}` },
      });
      const data = await res.json();
      if (data.success && data.credits) {
        setCredits(data.credits);
      }
    } catch {
      // Credits fetch failed — use defaults
    }
  }, [galleryToken]);

  useEffect(() => {
    if (galleryToken) {
      fetchCredits();
    }
  }, [galleryToken, fetchCredits]);

  // Welcome toast auto-dismiss
  const showToast = useCallback(() => {
    setShowWelcomeToast(true);
    setToastExiting(false);
    toastTimerRef.current = setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => setShowWelcomeToast(false), 400);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/events`);
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (eventSlug: string) => {
    if (!galleryToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/events/${eventSlug}/photos`, {
        headers: { Authorization: `Bearer ${galleryToken}` },
      });
      const data = await res.json();
      if (data.success) setPhotos(data.photos);
    } catch {
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: GalleryEventSummary) => {
    setSelectedEvent(event);
    setGateSlug(event.slug);
    setShowGate(true);
    navigate(`/gallery/${event.slug}`, { replace: true });
  };

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateLoading(true);
    setGateError('');

    try {
      const res = await fetch(`${API_BASE}/api/gallery/events/${gateSlug}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, newsletterOptIn, parentalConsent }),
      });
      const data = await res.json();

      if (!data.success) {
        setGateError(data.error || 'Access denied');
        return;
      }

      setGalleryToken(data.token);
      setSelectedEvent(prev => prev || data.event);
      setShowGate(false);
      loadPhotos(gateSlug);
      // Show welcome toast on first access
      showToast();
    } catch {
      setGateError('Connection error. Please try again.');
    } finally {
      setGateLoading(false);
    }
  };

  const totalCredits = credits.freeRemaining + credits.purchasedCredits;
  const hasCredits = credits.isVip || totalCredits > 0;

  const getEnhanceButtonLabel = () => {
    if (credits.isVip) return 'Enhance (VIP)';
    if (credits.freeRemaining > 0) return 'Enhance (Free)';
    if (credits.purchasedCredits > 0) return 'Enhance (1 credit)';
    return 'Enhance ($15)';
  };

  const handleEnhanceClick = async (photoId: number) => {
    if (!galleryToken) return;

    if (!hasCredits) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/gallery/enhancement-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({ photoIds: [photoId] }),
      });
      const data = await res.json();

      if (data.error === 'credits_required') {
        setShowUpgradeModal(true);
        return;
      }

      if (data.success) {
        // Refresh credits and show success
        await fetchCredits();
        setShowSupport(true);
      }
    } catch {
      // Best effort
    }
  };

  const toggleEnhanceSelection = (photoId: number) => {
    setEnhanceSelections(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const submitEnhancementRequest = async () => {
    if (enhanceSelections.size === 0 || !galleryToken) return;

    if (!hasCredits) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/gallery/enhancement-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({ photoIds: Array.from(enhanceSelections) }),
      });
      const data = await res.json();

      if (data.error === 'credits_required') {
        setShowUpgradeModal(true);
        return;
      }

      if (data.success) {
        setEnhanceSelections(new Set());
        await fetchCredits();
        setShowSupport(true);
      }
    } catch { /* best effort */ }
  };

  const handlePurchaseCredits = async (packageType: 'single' | 'bundle' | 'vip') => {
    if (!galleryToken) return;
    setPurchaseLoading(packageType);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/purchase-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({ packageType }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      // Best effort
    } finally {
      setPurchaseLoading(null);
    }
  };

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight' && lightboxIndex < photos.length - 1) setLightboxIndex(lightboxIndex + 1);
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, photos.length]);

  // Determine if we're in photo grid view (for credit pill visibility)
  const isPhotoGridView = !!galleryToken && photos.length > 0 && lightboxIndex === null;

  // Credit pill text
  const getCreditPillText = () => {
    if (credits.isVip) return 'VIP - Unlimited Enhancements';
    const total = credits.freeRemaining + credits.purchasedCredits;
    if (credits.freeRemaining > 0) return `${credits.freeRemaining} Free Enhancement Pass${credits.freeRemaining !== 1 ? 'es' : ''}`;
    if (credits.purchasedCredits > 0) return `${credits.purchasedCredits} Enhancement Credit${credits.purchasedCredits !== 1 ? 's' : ''}`;
    return '0 Enhancement Credits';
  };

  // ── Render: Event Listing ───────────────────────────────────────────────
  if (!slug && !galleryToken) {
    return (
      <PageWrapper>
        <ContentMax>
          <PageTitle>Swan Photography</PageTitle>
          <PageSubtitle>Browse photos from recent games. Enter your email and event password to access.</PageSubtitle>

          {loading ? (
            <EventGrid>
              {[1,2,3].map(i => <LoadingShimmer key={i} />)}
            </EventGrid>
          ) : events.length === 0 ? (
            <SupportSection initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SupportTitle>No events yet</SupportTitle>
              <SupportText>Check back soon for new game photos!</SupportText>
            </SupportSection>
          ) : (
            <EventGrid>
              {events.map((event, i) => (
                <EventCard
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleEventClick(event)}
                >
                  <EventCover $src={event.coverPhotoUrl}>
                    {event.sport && <SportBadge>{event.sport}</SportBadge>}
                    <PhotoCountBadge>{event.photoCount} photos</PhotoCountBadge>
                  </EventCover>
                  <EventInfo>
                    <EventName>{event.name}</EventName>
                    <EventMeta>
                      {event.eventDate && new Date(event.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {event.location && ` \u00B7 ${event.location}`}
                    </EventMeta>
                  </EventInfo>
                </EventCard>
              ))}
            </EventGrid>
          )}
        </ContentMax>

        {/* Password Gate Modal */}
        <AnimatePresence>
          {showGate && (
            <GateOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GateCard
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
              >
                <GateTitle>Access Swan Photography</GateTitle>
                <GateSubtitle>Enter your email and the event password shared by SwanStudios</GateSubtitle>

                <form onSubmit={handleGateSubmit}>
                  <InputGroup>
                    <Label>Email *</Label>
                    <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </InputGroup>
                  <InputGroup>
                    <Label>First Name</Label>
                    <Input type="text" placeholder="Optional" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </InputGroup>
                  <InputGroup>
                    <Label>Event Password *</Label>
                    <Input type="password" placeholder="Password from SwanStudios" value={password} onChange={e => setPassword(e.target.value)} required />
                  </InputGroup>
                  <CheckboxRow>
                    <input type="checkbox" checked={parentalConsent} onChange={e => setParentalConsent(e.target.checked)} />
                    I confirm I am a parent/guardian of a participant in this event
                  </CheckboxRow>
                  <CheckboxRow>
                    <input type="checkbox" checked={newsletterOptIn} onChange={e => setNewsletterOptIn(e.target.checked)} />
                    Keep me updated with SwanStudios news (you can unsubscribe anytime)
                  </CheckboxRow>
                  <SubmitButton type="submit" $loading={gateLoading}>
                    {gateLoading ? 'Verifying...' : 'View Photos'}
                  </SubmitButton>
                  {gateError && <ErrorText>{gateError}</ErrorText>}
                </form>

                <BackButton style={{ marginTop: 16, width: '100%', textAlign: 'center' }} onClick={() => { setShowGate(false); navigate('/gallery', { replace: true }); }}>
                  Back to Events
                </BackButton>
              </GateCard>
            </GateOverlay>
          )}
        </AnimatePresence>
      </PageWrapper>
    );
  }

  // ── Render: Photo Grid ──────────────────────────────────────────────────
  return (
    <PageWrapper>
      <ContentMax>
        <BackButton onClick={() => { setGalleryToken(null); setPhotos([]); setSelectedEvent(null); navigate('/gallery', { replace: true }); }}>
          &larr; Back to Events
        </BackButton>

        {selectedEvent && (
          <>
            <PageTitle>{selectedEvent.name}</PageTitle>
            <PageSubtitle>
              {selectedEvent.eventDate && new Date(selectedEvent.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent.location && ` \u00B7 ${selectedEvent.location}`}
              {` \u00B7 ${photos.length} photos \u00B7 All free to download`}
            </PageSubtitle>
          </>
        )}

        {loading ? (
          <EventGrid>
            {[1,2,3,4,5,6].map(i => <LoadingShimmer key={i} />)}
          </EventGrid>
        ) : (
          <GridWrapper>
            {photos.map(photo => (
              <PhotoCard
                key={photo.id}
                $selected={enhanceSelections.has(photo.id)}
                onClick={() => setLightboxIndex(photos.indexOf(photo))}
              >
                <PhotoImg
                  src={photo.thumbnailUrl || photo.url}
                  alt={photo.displayName}
                  loading="lazy"
                  onLoad={e => { (e.target as HTMLImageElement).style.animation = 'none'; }}
                />
                {/* CSS Watermark Overlay */}
                <WatermarkOverlay>
                  <WatermarkLogo src="/Logo.png" alt="" aria-hidden="true" />
                  <WatermarkText>sswanstudios.com</WatermarkText>
                </WatermarkOverlay>
                <PhotoOverlay>
                  <PhotoLabel>{photo.displayName}</PhotoLabel>
                </PhotoOverlay>
              </PhotoCard>
            ))}
          </GridWrapper>
        )}

        {/* Floating Credit Pill — only in photo grid view */}
        <AnimatePresence>
          {isPhotoGridView && enhanceSelections.size === 0 && (
            <CreditPill
              $hasCredits={hasCredits}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <CreditDot $hasCredits={hasCredits} />
              {getCreditPillText()}
            </CreditPill>
          )}
        </AnimatePresence>

        {/* Enhancement Selection Cart */}
        <AnimatePresence>
          {enhanceSelections.size > 0 && (
            <FloatingCart
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={submitEnhancementRequest}
            >
              <span>{enhanceSelections.size} photo{enhanceSelections.size !== 1 ? 's' : ''} selected for enhancement</span>
              <span style={{ color: '#60C0F0' }}>Submit &rarr;</span>
            </FloatingCart>
          )}
        </AnimatePresence>

        {/* Welcome Toast */}
        {showWelcomeToast && (
          <ToastWrapper $exiting={toastExiting}>
            Sean gifted you 3 Enhancement Passes!
          </ToastWrapper>
        )}

        {/* Support / Thank You Section */}
        <AnimatePresence>
          {showSupport && (
            <SupportSection initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <SupportTitle>Enhancement Request Submitted!</SupportTitle>
              <SupportText>Your enhanced photos will be delivered to your email. Love what we do? Here are ways to support SwanStudios:</SupportText>
              <SupportButtons>
                <SupportBtn $variant="primary" onClick={() => { /* TODO: referral modal */ }}>
                  Refer a Friend for Training
                </SupportBtn>
                <SupportBtn $variant="secondary" onClick={() => { /* TODO: donation modal */ }}>
                  Leave a Tip
                </SupportBtn>
                <SupportBtn $variant="ghost" onClick={() => setShowSupport(false)}>
                  No thanks, just send my photos!
                </SupportBtn>
              </SupportButtons>
            </SupportSection>
          )}
        </AnimatePresence>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <LightboxBackdrop
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxIndex(null)}
            >
              <LightboxImageWrapper onClick={e => e.stopPropagation()}>
                <LightboxImage
                  src={photos[lightboxIndex].enhancedUrl || photos[lightboxIndex].url}
                  alt={photos[lightboxIndex].displayName}
                />
                {/* Lightbox Watermark Overlay */}
                <WatermarkOverlay>
                  <WatermarkLogo src="/Logo.png" alt="" aria-hidden="true" />
                  <WatermarkText>sswanstudios.com</WatermarkText>
                </WatermarkOverlay>
              </LightboxImageWrapper>
              <LightboxClose onClick={() => setLightboxIndex(null)}>&#x2715;</LightboxClose>
              {lightboxIndex > 0 && (
                <LightboxControl $position="left" onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}>&#x2039;</LightboxControl>
              )}
              {lightboxIndex < photos.length - 1 && (
                <LightboxControl $position="right" onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}>&#x203A;</LightboxControl>
              )}
              <LightboxActions onClick={e => e.stopPropagation()}>
                <LightboxBtn href={photos[lightboxIndex].url} target="_blank" rel="noopener noreferrer">
                  Download Free
                </LightboxBtn>
                <EnhanceButton
                  $hasCredits={hasCredits}
                  onClick={() => handleEnhanceClick(photos[lightboxIndex!].id)}
                >
                  {enhanceSelections.has(photos[lightboxIndex].id)
                    ? '\u2605 Selected'
                    : getEnhanceButtonLabel()
                  }
                </EnhanceButton>
              </LightboxActions>
            </LightboxBackdrop>
          )}
        </AnimatePresence>

        {/* Upgrade Modal */}
        <AnimatePresence>
          {showUpgradeModal && (
            <ModalBackdrop
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
            >
              <ModalCard
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                style={{ position: 'relative' }}
              >
                <ModalCloseBtn onClick={() => setShowUpgradeModal(false)}>&#x2715;</ModalCloseBtn>
                <ModalTitle>Enhance Your Photos</ModalTitle>
                <ModalSubtitle>Professional AI enhancement makes your game photos pop. Choose a package:</ModalSubtitle>

                <PricingGrid>
                  <PricingCard onClick={() => handlePurchaseCredits('single')}>
                    <PricingLabel>Single</PricingLabel>
                    <PricingPrice>$15</PricingPrice>
                    <PricingDesc>1 Photo Enhancement</PricingDesc>
                    {purchaseLoading === 'single' && <PricingDesc style={{ marginTop: 8, color: '#60C0F0' }}>Redirecting...</PricingDesc>}
                  </PricingCard>

                  <PricingCard $highlighted onClick={() => handlePurchaseCredits('bundle')}>
                    <PricingLabel>Bundle</PricingLabel>
                    <PricingPrice>$50</PricingPrice>
                    <PricingDesc>5 Photo Enhancements</PricingDesc>
                    {purchaseLoading === 'bundle' && <PricingDesc style={{ marginTop: 8, color: '#60C0F0' }}>Redirecting...</PricingDesc>}
                  </PricingCard>

                  <PricingCard $vip onClick={() => { setShowUpgradeModal(false); setShowVipModal(true); }}>
                    <PricingLabel>VIP</PricingLabel>
                    <PricingPrice>$175</PricingPrice>
                    <PricingDesc>2 Sessions + 90-Day Plan + Unlimited Enhancements</PricingDesc>
                  </PricingCard>
                </PricingGrid>

                <ReferralLink onClick={() => { setShowUpgradeModal(false); }}>
                  Want 5 free passes? Refer a teammate to SwanStudios.
                </ReferralLink>
              </ModalCard>
            </ModalBackdrop>
          )}
        </AnimatePresence>

        {/* VIP Conversion Modal */}
        <VIPConversionModal
          isOpen={showVipModal}
          onClose={() => setShowVipModal(false)}
          email={email}
          eventSlug={slug || gateSlug || ''}
          galleryToken={galleryToken || ''}
          onVipActivated={() => {
            fetchCredits();
            setShowVipModal(false);
          }}
        />
      </ContentMax>

      {/* Password Gate (when navigating directly to /gallery/:slug) */}
      <AnimatePresence>
        {showGate && (
          <GateOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GateCard
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <GateTitle>Access Swan Photography</GateTitle>
              <GateSubtitle>Enter your email and the event password shared by SwanStudios</GateSubtitle>
              <form onSubmit={handleGateSubmit}>
                <InputGroup>
                  <Label>Email *</Label>
                  <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </InputGroup>
                <InputGroup>
                  <Label>First Name</Label>
                  <Input type="text" placeholder="Optional" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </InputGroup>
                <InputGroup>
                  <Label>Event Password *</Label>
                  <Input type="password" placeholder="Password from SwanStudios" value={password} onChange={e => setPassword(e.target.value)} required />
                </InputGroup>
                <CheckboxRow>
                  <input type="checkbox" checked={parentalConsent} onChange={e => setParentalConsent(e.target.checked)} />
                  I confirm I am a parent/guardian of a participant in this event
                </CheckboxRow>
                <CheckboxRow>
                  <input type="checkbox" checked={newsletterOptIn} onChange={e => setNewsletterOptIn(e.target.checked)} />
                  Keep me updated with SwanStudios news
                </CheckboxRow>
                <SubmitButton type="submit" $loading={gateLoading}>
                  {gateLoading ? 'Verifying...' : 'View Photos'}
                </SubmitButton>
                {gateError && <ErrorText>{gateError}</ErrorText>}
              </form>
            </GateCard>
          </GateOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default GalleryPage;
