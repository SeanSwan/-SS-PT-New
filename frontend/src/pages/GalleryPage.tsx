/**
 * GalleryPage.tsx
 * ===============
 * Public photo gallery with Gemini 3.1 Pro's "Cosmic Gate" design.
 * - Event listing → Password gate → Justified photo grid → Lightbox
 * - Email capture is the gate. Downloads are free. Donations optional.
 * - Enhancement credit system with watermark overlay (CSS-only, downloads stay clean)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled, { keyframes, css } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../utils/imageUrl';
import { motion, AnimatePresence } from 'framer-motion';
import VIPConversionModal from './gallery/VIPConversionModal';
import PhotoFeedback from './gallery/PhotoFeedback';
import PhotoDetailModal from './gallery/PhotoDetailModal';
import GalleryInfoCard from './gallery/GalleryInfoCard';
import MessageModal from './gallery/MessageModal';
import DonationModal from './gallery/DonationModal';
import ReferralModal from './gallery/ReferralModal';

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
  mediumUrl: string | null;
  width: number | null;
  height: number | null;
  enhancedUrl: string | null;
  enhancementRequestCount: number;
  sourceType?: 'raw' | 'jpeg';
}

interface EnhancementCredits {
  freeRemaining: number;
  purchasedCredits: number;
  isVip: boolean;
  freeUsedThisEvent: number;
}

interface PhotoVoteData {
  thumbsUp: number;
  thumbsDown: number;
  userVote: 1 | -1 | null;
}

interface RootState {
  auth?: {
    user?: {
      email?: string;
      firstName?: string;
      availableSessions?: number;
    };
  };
}

interface GalleryLocationState {
  showVipModal?: boolean;
}

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

// ── Hero Animations ──────────────────────────────────────────────────────
const heroScaleDown = keyframes`
  from { transform: scale(1.15); }
  to { transform: scale(1); }
`;

const heroFadeUp = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
`;

const heroShine = keyframes`
  0% { left: -100%; }
  20% { left: 100%; }
  100% { left: 100%; }
`;

// ── Hero Styled Components ───────────────────────────────────────────────
const HeroSection = styled.section`
  position: relative;
  width: 100%;
  min-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: #001030;
`;

const HeroBackground = styled.div<{ $offsetY?: number }>`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: -10%;
    background: linear-gradient(
      135deg,
      #001030 0%,
      #002060 25%,
      #003080 50%,
      #001840 75%,
      #000a20 100%
    );
    background-size: 400% 400%;

    @media (prefers-reduced-motion: no-preference) {
      animation: ${heroScaleDown} 4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
  }

  /* Sapphire Vault gradient overlay */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at 30% 40%,
      rgba(96, 192, 240, 0.08) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 70% 60%,
      rgba(139, 92, 246, 0.06) 0%,
      transparent 50%
    );
  }
`;

const HeroContentGrid = styled.div`
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1440px;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (min-width: 768px) {
    padding: 0 48px;
  }

  @media (min-width: 1280px) {
    padding: 0 80px;
  }
`;

const VaultCard = styled.div`
  background: linear-gradient(135deg, rgba(0, 32, 96, 0.6) 0%, rgba(0, 48, 128, 0.2) 100%);
  backdrop-filter: blur(24px) saturate(120%);
  -webkit-backdrop-filter: blur(24px) saturate(120%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-top: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 24px;
  padding: 40px 28px;
  box-shadow: 0 32px 64px -16px rgba(0, 10, 30, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  max-width: 720px;
  width: 100%;

  opacity: 0;
  animation: ${heroFadeUp} 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.4s;

  @media (min-width: 768px) {
    padding: 56px 48px;
  }
`;

const HeroEyebrow = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #C6A84B;
  margin-bottom: 16px;

  opacity: 0;
  animation: ${heroFadeUp} 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.55s;

  @media (min-width: 768px) {
    font-size: 14px;
    margin-bottom: 24px;
  }
`;

const HeroHeadline = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 38px;
  font-weight: 800;
  line-height: 1.1;
  color: #F8FAFC;
  margin: 0 0 24px 0;
  letter-spacing: -0.02em;

  opacity: 0;
  animation: ${heroFadeUp} 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.7s;

  .drama {
    display: block;
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-weight: 600;
    color: #8B5CF6;
    text-shadow: 0 0 24px rgba(139, 92, 246, 0.4);
    margin-top: 8px;
  }

  @media (min-width: 768px) {
    font-size: 56px;
  }

  @media (min-width: 1280px) {
    font-size: 72px;
  }
`;

const HeroSubheadline = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 300;
  line-height: 1.6;
  color: rgba(248, 250, 252, 0.8);
  margin: 0 0 40px 0;
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;

  opacity: 0;
  animation: ${heroFadeUp} 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.85s;

  @media (min-width: 768px) {
    font-size: 18px;
    margin-bottom: 48px;
  }
`;

const HeroButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  justify-content: center;
  align-items: center;

  opacity: 0;
  animation: ${heroFadeUp} 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 1s;

  @media (min-width: 430px) {
    flex-direction: row;
  }
`;

const HeroBaseButton = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 0 32px;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.05em;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  white-space: nowrap;
`;

const HeroPrimaryButton = styled(HeroBaseButton)`
  background: linear-gradient(135deg, #D4AF37 0%, #AA801E 100%);
  color: #001030;
  border: none;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.4) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: skewX(-25deg);
    animation: ${heroShine} 6s infinite;
  }

  &:hover, &:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(198, 168, 75, 0.3), 0 0 20px rgba(198, 168, 75, 0.4);
    outline: none;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const HeroSecondaryButton = styled(HeroBaseButton)`
  background: rgba(96, 192, 240, 0.05);
  color: #F8FAFC;
  border: 1px solid rgba(96, 192, 240, 0.3);
  backdrop-filter: blur(8px);

  &:hover, &:focus-visible {
    background: rgba(96, 192, 240, 0.15);
    border-color: #60C0F0;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(96, 192, 240, 0.15);
    outline: none;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const HeroScrollIndicator = styled.button`
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(248, 250, 252, 0.4);
  border: 0;
  background: transparent;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.3s;

  opacity: 0;
  animation: ${heroFadeUp} 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 1.5s;

  &:hover {
    color: rgba(248, 250, 252, 0.7);
  }

  &::after {
    content: '';
    width: 1px;
    height: 32px;
    background: linear-gradient(to bottom, rgba(96, 192, 240, 0.4), transparent);
  }

  @media (max-width: 767px) {
    display: none;
  }
`;

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
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
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

const PhotographerNote = styled.blockquote`
  position: relative;
  margin: -16px 0 28px;
  padding: 16px 20px 16px 24px;
  background: rgba(198, 168, 75, 0.04);
  border-left: 3px solid rgba(198, 168, 75, 0.4);
  border-radius: 0 12px 12px 0;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;

  &::before {
    content: '"';
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 28px;
    color: rgba(198, 168, 75, 0.3);
    font-family: 'Cormorant Garamond', Georgia, serif;
    line-height: 1;
  }

  @media (max-width: 480px) {
    font-size: 14px;
    padding: 12px 16px 12px 20px;
  }
`;

const PhotographerAttribution = styled.div`
  margin-top: 8px;
  font-family: 'Sora', system-ui, sans-serif;
  font-style: normal;
  font-size: 12px;
  color: rgba(198, 168, 75, 0.6);
  font-weight: 500;
`;

// ── Event Cards ───────────────────────────────────────────────────────────
const EventGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  @media (max-width: 480px) { grid-template-columns: 1fr; gap: 16px; }
`;

const EventCard = styled(motion.button)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  text-align: left;
  transition: border-color 0.3s;
  &:hover { border-color: rgba(139, 92, 246, 0.3); }
`;

const EventCover = styled.div<{ $src: string | null }>`
  width: 100%;
  height: 200px;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe ? `url(${cssUrlValue(safe)}) center/cover` : 'linear-gradient(135deg, #1a1035, #002060)';
  }};
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
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
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
  background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%);
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
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); gap: 8px; }
`;

const PhotoCardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
`;

const PhotoCard = styled.button<{ $selected?: boolean }>`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 0;
  padding: 0;
  aspect-ratio: 4/3;
  ${p => p.$selected && css`
    &::after {
      content: '\u2605';
      position: absolute;
      top: 8px;
      left: 8px;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #8B5CF6, #60C0F0);
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

const PhotoFilename = styled.div`
  text-align: center;
  color: #fff;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (max-width: 480px) { font-size: 10px; }
`;

// ── Watermark Overlay (CSS-only, not on downloads) ────────────────────────
const _WatermarkOverlay = styled.div`
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

const _WatermarkLogo = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

const _WatermarkText = styled.span`
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: 2px;
  white-space: nowrap;
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
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
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
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
`;

const PricingDesc = styled.div`
  font-size: 13px;
  color: rgba(255,255,255,0.6);
`;

const ReferralLink = styled.button`
  text-align: center;
  width: 100%;
  font-size: 13px;
  color: rgba(139, 92, 246, 0.7);
  background: transparent;
  border: 0;
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
const FloatingCart = styled(motion.button)`
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

const SourceTypeBadge = styled.span<{ $raw?: boolean }>`
  margin-left: 6px;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  vertical-align: middle;
  background: ${({ $raw }) => $raw ? 'rgba(139,92,246,0.2)' : 'rgba(96,192,240,0.2)'};
  color: ${({ $raw }) => $raw ? '#8B5CF6' : '#60C0F0'};
  border: 1px solid ${({ $raw }) => $raw ? 'rgba(139,92,246,0.3)' : 'rgba(96,192,240,0.3)'};
`;

const LoadMoreSentinel = styled.div`
  height: 1px;
  width: 100%;
`;

const FloatingCartAction = styled.span`
  color: #60C0F0;
`;

const ModalCardPositioned = styled(ModalCard)`
  position: relative;
`;

const RedirectingDesc = styled(PricingDesc)`
  margin-top: 8px;
  color: #60C0F0;
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
  ${p => p.$variant === 'primary' && 'background: linear-gradient(135deg, #8B5CF6, #60C0F0); color: #002060; border: none;'}
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

const BackButtonFull = styled(BackButton)`
  margin-top: 16px;
  width: 100%;
  text-align: center;
`;

const DownloadAllBar = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 4px 0 22px;
`;

const DownloadAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  min-height: 44px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  color: var(--midnight-sapphire, #002060);
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-purple, #8B5CF6));
  transition: opacity 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  &:hover:not(:disabled) { opacity: 0.92; box-shadow: 0 6px 22px var(--accent-primary-glow, rgba(96, 192, 240, 0.4)); }
  &:disabled { opacity: 0.6; cursor: progress; }
  @media (prefers-reduced-motion: no-preference) {
    &:active:not(:disabled) { transform: translateY(1px); }
  }
`;

const DownloadAllHint = styled.span`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
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
  const location = useLocation();
  const authUser = useSelector((state: RootState) => state.auth?.user);

  // State
  const [events, setEvents] = useState<GalleryEventSummary[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GalleryEventSummary | null>(null);
  const [galleryToken, setGalleryToken] = useState<string | null>(() => {
    // Restore gallery session on back-button navigation
    try {
      const saved = sessionStorage.getItem(`gallery-token-${slug || ''}`);
      return saved || null;
    } catch { return null; }
  });
  const [showGate, setShowGate] = useState(false);
  const [gateSlug, setGateSlug] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [enhanceSelections, setEnhanceSelections] = useState<Set<number>>(new Set());
  const [showSupport, setShowSupport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Progressive photo loading — show PHOTOS_PER_BATCH at a time, load more on scroll
  const PHOTOS_PER_BATCH = 24;
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(PHOTOS_PER_BATCH);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Enhancement credit state
  const [credits, setCredits] = useState<EnhancementCredits>({ freeRemaining: 3, purchasedCredits: 0, isVip: false, freeUsedThisEvent: 0 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  // Welcome toast state
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Sean gifted you 3 Enhancement Passes!');
  const [toastExiting, setToastExiting] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resilience: AbortController for fetch cleanup on unmount/navigation
  const photosAbortRef = useRef<AbortController | null>(null);
  const eventsAbortRef = useRef<AbortController | null>(null);
  // React-friendly image reload trigger (increment to force re-render of failed images)
  const [imageReloadKey, setImageReloadKey] = useState(0);
  // Track which photo IDs have failed loading (for retry logic)
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set());

  // Progressive photo loading — IntersectionObserver loads more rows as user scrolls
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisiblePhotoCount(prev => Math.min(prev + PHOTOS_PER_BATCH, photos.length));
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [photos.length]);

  // Reset visible count when photos change (new event selected)
  useEffect(() => {
    setVisiblePhotoCount(PHOTOS_PER_BATCH);
  }, [selectedEvent]);

  // Gate form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');

  // Photo voting state
  const [votesMap, setVotesMap] = useState<Record<number, PhotoVoteData>>({});
  const [hoveredPhotoId, setHoveredPhotoId] = useState<number | null>(null);

  // Load events on mount + check for VIP success return + signup redirect
  useEffect(() => {
    loadEvents();
    const params = new URLSearchParams(window.location.search);
    if (params.get('vip') === 'success') {
      setShowVipModal(true);
    }
    // If redirected back from signup, auto-open VIP modal for new client
    const state = location.state as GalleryLocationState | null;
    if (state?.showVipModal) {
      setShowVipModal(true);
      // Clean up state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // If slug param, open the gate for that event
  useEffect(() => {
    if (slug && !galleryToken) {
      setGateSlug(slug);
      setShowGate(true);
    } else if (slug && galleryToken) {
      loadPhotos(slug);
    }
  // loadPhotos is intentionally kept out of the dependency array because it is
  // defined below this effect and captures the current gallery session state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const showToast = useCallback((message = 'Sean gifted you 3 Enhancement Passes!') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    setShowWelcomeToast(true);
    setToastExiting(false);
    toastTimerRef.current = setTimeout(() => {
      setToastExiting(true);
      setTimeout(() => setShowWelcomeToast(false), 400);
    }, 4000);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const creditStatus = params.get('credits');
    const donationStatus = params.get('donation');
    if (!creditStatus && !donationStatus) return;

    if (creditStatus === 'success') {
      showToast('Enhancement credits are ready. Select your photos when you are ready.');
      if (galleryToken) void fetchCredits();
    } else if (creditStatus === 'cancelled') {
      showToast('Credit checkout cancelled. Your gallery is still open.');
    }

    if (donationStatus === 'success') {
      showToast('Thank you for supporting SwanStudios.');
    } else if (donationStatus === 'cancelled') {
      showToast('Donation checkout cancelled. Your gallery is still open.');
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('credits');
    url.searchParams.delete('donation');
    url.searchParams.delete('package');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }, [fetchCredits, galleryToken, showToast]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      // Cleanup: abort any in-flight fetch requests on unmount
      photosAbortRef.current?.abort();
      eventsAbortRef.current?.abort();
    };
  }, []);

  // Visibility API: when user returns to tab, retry any failed images
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && failedImageIds.size > 0) {
        // Increment reload key to trigger React re-render of failed images
        setImageReloadKey(prev => prev + 1);
        setFailedImageIds(new Set());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [failedImageIds.size]);

  const loadEvents = async () => {
    eventsAbortRef.current?.abort();
    const controller = new AbortController();
    eventsAbortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/events`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setError('Failed to load events');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const loadPhotos = async (eventSlug: string) => {
    if (!galleryToken) return;
    // Cancel any in-flight photo request
    photosAbortRef.current?.abort();
    const controller = new AbortController();
    photosAbortRef.current = controller;

    // Restore cached photos immediately (show stale while fetching fresh)
    try {
      const cached = sessionStorage.getItem(`gallery-photos-${eventSlug}`);
      if (cached) {
        const { photos: cachedPhotos, timestamp } = JSON.parse(cached);
        // Use cache if < 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setPhotos(cachedPhotos);
        }
      }
    } catch { /* cache parse failed, ignore */ }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/events/${eventSlug}/photos`, {
        headers: { Authorization: `Bearer ${galleryToken}` },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const data = await res.json();
      if (data.success) {
        setPhotos(data.photos);
        setFailedImageIds(new Set()); // Reset failed images on fresh load
        // Cache photos in sessionStorage for navigation resilience
        try {
          sessionStorage.setItem(`gallery-photos-${eventSlug}`, JSON.stringify({
            photos: data.photos,
            timestamp: Date.now(),
          }));
        } catch { /* sessionStorage full, ignore */ }
        // Fetch votes after photos load
        loadVotes(eventSlug);
        // Ensure selectedEvent is populated (needed when navigating directly with cached token)
        setSelectedEvent(prev => {
          if (prev) return prev;
          const listed = events.find(ev => ev.slug === eventSlug);
          if (listed) return listed;
          // Fetch event details if not available yet (also use abort signal)
          fetch(`${API_BASE}/api/gallery/events/${eventSlug}`, { signal: controller.signal })
            .then(r => r.json())
            .then(d => { if (d.success && d.event && !controller.signal.aborted) setSelectedEvent(d.event); })
            .catch(() => {});
          return prev;
        });
      }
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setError('Failed to load photos');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const loadVotes = async (eventSlug: string) => {
    if (!galleryToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/gallery/events/${eventSlug}/votes`, {
        headers: { Authorization: `Bearer ${galleryToken}` },
      });
      const data = await res.json();
      if (data.success) setVotesMap(data.votes || {});
    } catch {
      // Non-critical — votes just won't show
    }
  };

  const handleVote = useCallback(async (photoId: number, voteType: 1 | -1) => {
    if (!galleryToken) return;

    const prev = votesMap[photoId] || { thumbsUp: 0, thumbsDown: 0, userVote: null };

    // Optimistic update
    const isToggleOff = prev.userVote === voteType;
    const optimistic: PhotoVoteData = isToggleOff
      ? {
          thumbsUp: prev.thumbsUp - (voteType === 1 ? 1 : 0),
          thumbsDown: prev.thumbsDown - (voteType === -1 ? 1 : 0),
          userVote: null,
        }
      : {
          thumbsUp: prev.thumbsUp + (voteType === 1 ? 1 : 0) - (prev.userVote === 1 ? 1 : 0),
          thumbsDown: prev.thumbsDown + (voteType === -1 ? 1 : 0) - (prev.userVote === -1 ? 1 : 0),
          userVote: voteType,
        };

    setVotesMap(m => ({ ...m, [photoId]: optimistic }));

    try {
      const res = await fetch(`${API_BASE}/api/gallery/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({ photoId, voteType }),
      });
      const data = await res.json();
      if (data.success) {
        // Use server-confirmed counts
        setVotesMap(m => ({
          ...m,
          [photoId]: {
            thumbsUp: data.thumbsUp,
            thumbsDown: data.thumbsDown,
            userVote: data.userVote,
          },
        }));
      }
    } catch {
      // Revert on failure
      setVotesMap(m => ({ ...m, [photoId]: prev }));
    }
  }, [galleryToken, votesMap]);

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
      // Persist token so back-button navigation doesn't require re-login
      try { sessionStorage.setItem(`gallery-token-${gateSlug}`, data.token); } catch { /* best-effort gallery token persistence */ }
      // Merge access gate event with events list data (which includes description)
      setSelectedEvent(prev => {
        if (prev) return prev;
        const listed = events.find(ev => ev.slug === data.event.slug);
        return listed ? { ...data.event, ...listed } : data.event;
      });
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

  // ── Browser back button: close photo modal instead of navigating away ──
  const closingViaBack = useRef(false);

  const openPhotoModal = useCallback((index: number) => {
    setLightboxIndex(index);
    window.history.pushState({ galleryPhoto: index }, '');
  }, []);

  const closePhotoModal = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex(null);
    // Pop the history entry we pushed — guard against popstate re-entry
    if (window.history.state?.galleryPhoto !== undefined) {
      closingViaBack.current = true;
      window.history.back();
    }
  }, [lightboxIndex]);

  useEffect(() => {
    const onPopState = () => {
      // If we triggered this via closePhotoModal, skip (already handled)
      if (closingViaBack.current) {
        closingViaBack.current = false;
        return;
      }
      // User pressed browser back — close modal without extra history.back()
      if (lightboxIndex !== null) {
        setLightboxIndex(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [lightboxIndex]);

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

  const _toggleEnhanceSelection = (photoId: number) => {
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

  const handlePurchaseCredits = async (packageType: 'single' | 'bundle5' | 'vip') => {
    if (!galleryToken) return;
    setPurchaseLoading(packageType);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/purchase-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({ package: packageType }),
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

  const handleDownloadOriginal = async (photoId: number) => {
    if (!galleryToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/gallery/photos/${photoId}/download`, {
        headers: { Authorization: `Bearer ${galleryToken}` },
      });
      const data = await res.json();
      if (data.success && data.downloadUrl) {
        const filename = data.filename || 'photo.jpg';
        // Fetch as blob to force browser download manager (cross-origin URLs open in new tab otherwise)
        try {
          const blobRes = await fetch(data.downloadUrl);
          const blob = await blobRes.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Blob fetch failed (CORS), fall back to direct link
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch {
      // Fallback: open the photo URL directly
      const photo = photos.find(p => p.id === photoId);
      if (photo) window.open(photo.url, '_blank');
    }
  };

  // Download the whole event as a single ZIP. Direct navigation with the access
  // token as a query param (the backend accepts ?token=) so the browser streams
  // the zip to disk — no in-tab buffering that would OOM on large galleries.
  const handleDownloadAll = () => {
    if (!galleryToken || downloadingAll) return;
    const eventSlug = selectedEvent?.slug || slug || gateSlug;
    if (!eventSlug) return;
    setDownloadingAll(true);
    try {
      const url = `${API_BASE}/api/gallery/events/${encodeURIComponent(eventSlug)}/download-all?token=${encodeURIComponent(galleryToken)}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventSlug}-photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // The browser owns the actual streaming download from here; re-enable the
      // button shortly so a stalled request doesn't lock it forever.
      window.setTimeout(() => setDownloadingAll(false), 4000);
    }
  };

  // Determine if we're in photo grid view (for credit pill visibility)
  const isPhotoGridView = !!galleryToken && photos.length > 0 && lightboxIndex === null;

  // Credit pill text
  const getCreditPillText = () => {
    if (credits.isVip) return 'VIP - Unlimited Enhancements';
    if (credits.freeRemaining > 0) return `${credits.freeRemaining} Free Enhancement Pass${credits.freeRemaining !== 1 ? 'es' : ''}`;
    if (credits.purchasedCredits > 0) return `${credits.purchasedCredits} Enhancement Credit${credits.purchasedCredits !== 1 ? 's' : ''}`;
    return '0 Enhancement Credits';
  };

  // ── Render: Event Listing ───────────────────────────────────────────────
  if (!slug && !galleryToken) {
    return (
      <PageWrapper>
        {/* Cinematic Hero Section — Crystalline Swan Vault */}
        <HeroSection aria-label="SwanStudios Elite Photography">
          <HeroBackground aria-hidden="true" />
          <HeroContentGrid>
            <VaultCard>
              <HeroEyebrow>SwanStudios Photography</HeroEyebrow>
              <HeroHeadline>
                Every Moment.
                <span className="drama">Immortalized.</span>
              </HeroHeadline>
              <HeroSubheadline>
                Premium photography for life&apos;s defining moments — events, portraits,
                fitness transformations, and everything in between.
                Preserved securely in the SwanStudios Vault.
              </HeroSubheadline>
              <HeroButtonGroup>
                <HeroPrimaryButton
                  onClick={() => {
                    const eventsSection = document.getElementById('events-section');
                    eventsSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  aria-label="Browse event galleries"
                >
                  Access Event Galleries
                </HeroPrimaryButton>
                <HeroSecondaryButton
                  as="a"
                  href="/contact"
                  aria-label="Inquire about photography services"
                >
                  Inquire About Photography
                </HeroSecondaryButton>
              </HeroButtonGroup>
            </VaultCard>
          </HeroContentGrid>
          <HeroScrollIndicator
            onClick={() => {
              const eventsSection = document.getElementById('events-section');
              eventsSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            EXPLORE
          </HeroScrollIndicator>
        </HeroSection>

        {/* Event Listing */}
        <ContentMax id="events-section">
          <PageTitle>Recent Events</PageTitle>
          <PageSubtitle>Browse photos from recent events. Enter your email and event password to access.</PageSubtitle>
          {error && <ErrorText>{error}</ErrorText>}

          {loading ? (
            <EventGrid>
              {[1,2,3].map(i => <LoadingShimmer key={i} />)}
            </EventGrid>
          ) : events.length === 0 ? (
            <SupportSection initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SupportTitle>No events yet</SupportTitle>
              <SupportText>Check back soon for new event photos!</SupportText>
            </SupportSection>
          ) : (
            <EventGrid>
              {events.map((event, i) => (
                <EventCard
                  key={event.id}
                  type="button"
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
                      {event.eventDate && new Date(event.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
                <GateTitle>Access SwanStudios Photography</GateTitle>
                <GateSubtitle>Enter your email and the event password shared by SwanStudios</GateSubtitle>

                <form onSubmit={handleGateSubmit}>
                  <InputGroup>
                    <Label htmlFor="gallery-event-gate-email">Email *</Label>
                    <Input id="gallery-event-gate-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </InputGroup>
                  <InputGroup>
                    <Label htmlFor="gallery-event-gate-first-name">First Name</Label>
                    <Input id="gallery-event-gate-first-name" type="text" placeholder="Optional" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </InputGroup>
                  <InputGroup>
                    <Label htmlFor="gallery-event-gate-password">Event Password *</Label>
                    <Input id="gallery-event-gate-password" type="password" placeholder="Password from SwanStudios" value={password} onChange={e => setPassword(e.target.value)} required />
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

                <BackButtonFull onClick={() => { setShowGate(false); navigate('/gallery', { replace: true }); }}>
                  Back to Events
                </BackButtonFull>
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
        <BackButton onClick={() => { setGalleryToken(null); try { sessionStorage.removeItem(`gallery-token-${slug || gateSlug}`); } catch { /* best-effort gallery token cleanup */ } setPhotos([]); setSelectedEvent(null); navigate('/gallery', { replace: true }); }}>
          &larr; Back to Events
        </BackButton>

        {selectedEvent && (
          <>
            <PageTitle>{selectedEvent.name}</PageTitle>
            <PageSubtitle>
              {selectedEvent.eventDate && new Date(selectedEvent.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {selectedEvent.location && ` \u00B7 ${selectedEvent.location}`}
              {` \u00B7 ${photos.length} photos \u00B7 All free to download`}
            </PageSubtitle>
            {selectedEvent.description && (
              <PhotographerNote>
                {selectedEvent.description}
                <PhotographerAttribution>— Sean Swan, SwanStudios</PhotographerAttribution>
              </PhotographerNote>
            )}
          </>
        )}

        {selectedEvent && !loading && photos.length > 0 && (
          <DownloadAllBar>
            <DownloadAllButton type="button" onClick={handleDownloadAll} disabled={downloadingAll} aria-label={`Download all ${photos.length} photos as a ZIP file`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloadingAll ? 'Preparing ZIP…' : `Download all ${photos.length} photos (ZIP)`}
            </DownloadAllButton>
            <DownloadAllHint>Free · one zip file · large galleries may take a moment</DownloadAllHint>
          </DownloadAllBar>
        )}

        {/* Gallery Info Card — actions for message, donation, VIP */}
        {selectedEvent && !loading && photos.length > 0 && (
          <GalleryInfoCard
            onOpenMessage={() => setShowMessageModal(true)}
            onOpenDonation={() => setShowDonationModal(true)}
            onOpenVip={() => {
              if (authUser?.availableSessions && authUser.availableSessions > 0) {
                navigate('/store');
              } else {
                setShowVipModal(true);
              }
            }}
            freeCredits={credits.freeRemaining}
          />
        )}

        {loading ? (
          <EventGrid>
            {[1,2,3,4,5,6].map(i => <LoadingShimmer key={i} />)}
          </EventGrid>
        ) : (
          <>
          <GridWrapper>
            {photos.slice(0, visiblePhotoCount).map((photo, index) => {
              const voteData = votesMap[photo.id];
              return (
                <PhotoCardWrapper key={photo.id}>
                  <PhotoCard
                    $selected={enhanceSelections.has(photo.id)}
                    type="button"
                    onClick={() => openPhotoModal(index)}
                    onMouseEnter={() => setHoveredPhotoId(photo.id)}
                    onMouseLeave={() => setHoveredPhotoId(null)}
                  >
                    <PhotoImg
                      key={`${photo.id}-${imageReloadKey}`}
                      src={
                        failedImageIds.has(photo.id)
                          ? `${photo.thumbnailUrl || photo.url}${(photo.thumbnailUrl || photo.url).includes('?') ? '&' : '?'}retry=${imageReloadKey}`
                          : (photo.thumbnailUrl || photo.url)
                      }
                      alt={photo.displayName || `Photo ${photo.photoNumber}`}
                      loading="lazy"
                      width={photo.width || undefined}
                      height={photo.height || undefined}
                      onLoad={() => {
                        // Clear from failed set if it was retried successfully
                        if (failedImageIds.has(photo.id)) {
                          setFailedImageIds(prev => { const next = new Set(prev); next.delete(photo.id); return next; });
                        }
                      }}
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        // If thumbnail failed, try the full URL
                        if (photo.thumbnailUrl && img.src.includes(photo.thumbnailUrl.split('?')[0])) {
                          img.src = photo.url;
                          return;
                        }
                        // Track this image as failed for tab-switch retry
                        setFailedImageIds(prev => new Set(prev).add(photo.id));
                      }}
                    />
                    <PhotoOverlay>
                      <PhotoLabel>{photo.displayName}</PhotoLabel>
                    </PhotoOverlay>
                  </PhotoCard>
                  <PhotoFeedback
                    photoId={photo.id}
                    thumbsUp={voteData?.thumbsUp || 0}
                    thumbsDown={voteData?.thumbsDown || 0}
                    userVote={voteData?.userVote || null}
                    onVote={handleVote}
                    isHovered={hoveredPhotoId === photo.id}
                  />
                  <PhotoFilename>
                    {photo.displayName}
                    {photo.sourceType && (
                      <SourceTypeBadge $raw={photo.sourceType === 'raw'}>
                        {photo.sourceType === 'raw' ? 'RAW' : 'HQ JPEG'}
                      </SourceTypeBadge>
                    )}
                  </PhotoFilename>
                </PhotoCardWrapper>
              );
            })}
          </GridWrapper>
          {/* Sentinel for loading more photos as user scrolls */}
          {visiblePhotoCount < photos.length && (
            <LoadMoreSentinel ref={loadMoreRef} />
          )}
          </>
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
              type="button"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={submitEnhancementRequest}
            >
              <span>{enhanceSelections.size} photo{enhanceSelections.size !== 1 ? 's' : ''} selected for enhancement</span>
              <FloatingCartAction>Submit &rarr;</FloatingCartAction>
            </FloatingCart>
          )}
        </AnimatePresence>

        {/* Welcome Toast */}
        {showWelcomeToast && (
          <ToastWrapper $exiting={toastExiting}>
            {toastMessage}
          </ToastWrapper>
        )}

        {/* Support / Thank You Section */}
        <AnimatePresence>
          {showSupport && (
            <SupportSection initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <SupportTitle>Enhancement Request Submitted!</SupportTitle>
              <SupportText>Your enhanced photos will be delivered to your email. Love what we do? Here are ways to support SwanStudios:</SupportText>
              <SupportButtons>
                <SupportBtn $variant="primary" onClick={() => { setShowSupport(false); setShowReferralModal(true); }}>
                  Refer a Friend for Training
                </SupportBtn>
                <SupportBtn $variant="secondary" onClick={() => { setShowSupport(false); setShowDonationModal(true); }}>
                  Leave a Tip
                </SupportBtn>
                <SupportBtn $variant="ghost" onClick={() => setShowSupport(false)}>
                  No thanks, just send my photos!
                </SupportBtn>
              </SupportButtons>
            </SupportSection>
          )}
        </AnimatePresence>

        {/* Photo Detail Modal (replaces simple lightbox) */}
        <PhotoDetailModal
          isOpen={lightboxIndex !== null && !!photos[lightboxIndex!]}
          photo={lightboxIndex !== null ? photos[lightboxIndex] : null}
          photoIndex={lightboxIndex ?? 0}
          totalPhotos={photos.length}
          credits={credits}
          voteData={lightboxIndex !== null && photos[lightboxIndex] ? (votesMap[photos[lightboxIndex].id] || null) : null}
          onClose={closePhotoModal}
          onPrev={() => setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
          onNext={() => setLightboxIndex(prev => prev !== null && prev < photos.length - 1 ? prev + 1 : prev)}
          onDownloadOriginal={handleDownloadOriginal}
          onRequestEnhancement={handleEnhanceClick}
          onVote={handleVote}
          onUpgrade={() => setShowUpgradeModal(true)}
          downloadUrl={lightboxIndex !== null && photos[lightboxIndex] ? photos[lightboxIndex].url : ''}
          enhancementRequested={lightboxIndex !== null && photos[lightboxIndex] ? enhanceSelections.has(photos[lightboxIndex].id) : false}
          galleryToken={galleryToken || undefined}
        />

        {/* Upgrade Modal */}
        <AnimatePresence>
          {showUpgradeModal && (
            <ModalBackdrop
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowUpgradeModal(false);
              }}
            >
              <ModalCardPositioned
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <ModalCloseBtn onClick={() => setShowUpgradeModal(false)}>&#x2715;</ModalCloseBtn>
                <ModalTitle>Enhance Your Photos</ModalTitle>
                <ModalSubtitle>Professional AI enhancement makes your photos pop. Choose a package:</ModalSubtitle>

                <PricingGrid>
                  <PricingCard type="button" onClick={() => handlePurchaseCredits('single')}>
                    <PricingLabel>Single</PricingLabel>
                    <PricingPrice>$15</PricingPrice>
                    <PricingDesc>1 Photo Enhancement</PricingDesc>
                    {purchaseLoading === 'single' && <RedirectingDesc>Redirecting...</RedirectingDesc>}
                  </PricingCard>

                  <PricingCard type="button" $highlighted onClick={() => handlePurchaseCredits('bundle5')}>
                    <PricingLabel>Bundle</PricingLabel>
                    <PricingPrice>$50</PricingPrice>
                    <PricingDesc>5 Photo Enhancements</PricingDesc>
                    {purchaseLoading === 'bundle5' && <RedirectingDesc>Redirecting...</RedirectingDesc>}
                  </PricingCard>

                  <PricingCard type="button" $vip onClick={() => { setShowUpgradeModal(false); setShowVipModal(true); }}>
                    <PricingLabel>VIP</PricingLabel>
                    <PricingPrice>$175</PricingPrice>
                    <PricingDesc>2 Sessions + 90-Day Plan + Unlimited Enhancements</PricingDesc>
                  </PricingCard>
                </PricingGrid>

                <ReferralLink type="button" onClick={() => { setShowUpgradeModal(false); setShowReferralModal(true); }}>
                  Want 5 free passes? Refer a teammate to SwanStudios.
                </ReferralLink>
              </ModalCardPositioned>
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

        {/* Message Modal */}
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          email={email}
          galleryToken={galleryToken || ''}
          eventSlug={selectedEvent?.slug || slug || gateSlug || ''}
        />

        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          email={email}
          galleryToken={galleryToken || ''}
          eventSlug={selectedEvent?.slug || slug || gateSlug || ''}
        />

        <ReferralModal
          isOpen={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          email={email}
          galleryToken={galleryToken || ''}
          eventSlug={selectedEvent?.slug || slug || gateSlug || ''}
          onReferralSubmitted={fetchCredits}
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
              <GateTitle>Access SwanStudios Photography</GateTitle>
              <GateSubtitle>Enter your email and the event password shared by SwanStudios</GateSubtitle>
              <form onSubmit={handleGateSubmit}>
                <InputGroup>
                  <Label htmlFor="gallery-direct-gate-email">Email *</Label>
                  <Input id="gallery-direct-gate-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="gallery-direct-gate-first-name">First Name</Label>
                  <Input id="gallery-direct-gate-first-name" type="text" placeholder="Optional" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </InputGroup>
                <InputGroup>
                  <Label htmlFor="gallery-direct-gate-password">Event Password *</Label>
                  <Input id="gallery-direct-gate-password" type="password" placeholder="Password from SwanStudios" value={password} onChange={e => setPassword(e.target.value)} required />
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
