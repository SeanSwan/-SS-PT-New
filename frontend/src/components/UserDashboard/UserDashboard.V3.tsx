/**
 * SwanStudios User Dashboard V3 - Cinematic Galaxy-Swan Edition
 * =============================================================
 *
 * V3 visual upgrade of the optimized dashboard with cinematic enhancements:
 * - Noise overlay for film-grain depth
 * - Extended 10-breakpoint responsive matrix (320px through 3840px)
 * - Enhanced glassmorphism with cyan glow accents
 * - All original logic, data flow, and component structure preserved
 *
 * Key Features:
 * - Lazy-loaded modular components for optimal performance
 * - Professional UI/UX with consistent Galaxy-Swan design system
 * - Responsive design with 10-breakpoint matrix
 * - Smooth animations and micro-interactions
 * - Real-time data integration with comprehensive error handling
 */

import React, { useState, useRef, useCallback, Suspense, lazy } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Settings,
  Heart,
  Share2,
  Upload,
  Edit3,
  Users,
  Activity,
  Star,
  Crown,
  Sparkles,
  Image as ImageIcon,
  Music2,
  Award,
  TrendingUp,
  Zap,
  Target,
  Plus
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import { useProfile } from '../../hooks/profile/useProfile';

// Lazy load components for better performance
const CommunityFeed = lazy(() => import('./components/CommunityFeed'));
const CreativeGallery = lazy(() => import('./components/CreativeGallery'));
const PhotoGallery = lazy(() => import('./components/PhotoGallery'));
const AboutSection = lazy(() => import('./components/AboutSection'));
const ActivitySection = lazy(() => import('./components/ActivitySection'));
const EditProfileModal = lazy(() => import('./components/EditProfileModal'));

// ─── V3 Enhancement: Cinematic Noise Overlay ───────────────────────────────
const NoiseOverlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.04;
  pointer-events: none;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

// ─── V3 Enhancement: Main content z-index wrapper ──────────────────────────
const MainContentZWrapper = styled.div`
  position: relative;
  z-index: 2;
`;

// Professional-grade animations with performance consideration
const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const subtleGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1), 0 8px 32px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2), 0 12px 40px rgba(0, 0, 0, 0.15);
  }
`;

const pulseScale = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Professional Styled Components with enhanced design system
const ProfileContainer = styled(motion.div)`
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  position: relative;
  overflow: hidden;

  /* Subtle background pattern for premium feel */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;

  @media (max-width: 1024px) {
    max-width: 100%;
    padding: 2rem 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }

  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.75rem 0.5rem;
  }

  @media (min-width: 2560px) {
    max-width: 1600px;
    padding: 4rem 3rem;
  }

  @media (min-width: 3840px) {
    max-width: 2200px;
    padding: 5rem 4rem;
  }
`;

const ProfileHeader = styled(motion.div)`
  position: relative;
  border-radius: 24px;
  overflow: visible;
  margin-bottom: 3rem;
  background: ${({ theme }) => theme.gradients?.card || 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'};
  backdrop-filter: blur(24px);
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.12)'};
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.35),
      0 12px 24px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    /* V3: Cyan glow on hover */
    border-color: rgba(0, 255, 255, 0.15);
  }

  @media (max-width: 768px) {
    border-radius: 20px;
    margin-bottom: 2rem;

    &:hover {
      transform: none;
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    border-radius: 16px;
    margin-bottom: 1.5rem;
  }

  @media (min-width: 2560px) {
    border-radius: 28px;
    margin-bottom: 4rem;
  }

  @media (min-width: 3840px) {
    border-radius: 32px;
    margin-bottom: 5rem;
  }
`;

const BackgroundSection = styled.div<{ $backgroundImage?: string }>`
  height: 320px;
  position: relative;
  border-radius: 24px 24px 0 0;
  background: ${({ $backgroundImage, theme }) =>
    $backgroundImage
      ? `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%), url(${$backgroundImage})`
      : theme.gradients?.hero || 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  };
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  /* Premium gradient overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.1) 0%,
      transparent 50%,
      rgba(139, 69, 19, 0.05) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }

  @media (max-width: 768px) {
    height: 220px;
    background-attachment: scroll;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    height: 180px;
    border-radius: 16px 16px 0 0;
  }

  @media (min-width: 2560px) {
    height: 420px;
  }

  @media (min-width: 3840px) {
    height: 520px;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120px;
    background: linear-gradient(transparent, var(--bg-base));
    z-index: 1;
  }

  /* Professional upload overlay */
  .upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 2;

    .upload-text {
      color: white;
      font-size: 1.2rem;
      font-weight: 600;
      margin-top: 0.75rem;
      text-align: center;
      letter-spacing: 0.025em;
    }

    .upload-icon {
      color: rgba(255, 255, 255, 0.9);
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
  }

  &:hover .upload-overlay {
    opacity: 1;
  }
`;

const ProfileImageSection = styled.div`
  position: absolute;
  top: 230px;  /* 320px cover height - 90px (half of 180px avatar) = center on cover boundary */
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;

  @media (max-width: 768px) {
    top: 150px;  /* 220px cover height - 70px (half of 140px avatar) = center on cover boundary */
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    top: 120px;
  }

  @media (min-width: 2560px) {
    top: 330px;
  }

  @media (min-width: 3840px) {
    top: 430px;
  }
`;

const ProfileImageContainer = styled(motion.div)`
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto;

  /* Professional ring effect */
  &::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0deg,
      ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 120deg,
      ${({ theme }) => theme.colors?.accent || '#F59E0B'} 240deg,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 360deg
    );
    animation: ${pulseScale} 4s ease-in-out infinite;
    opacity: 0.8;
  }

  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    background: var(--bg-base);
    z-index: 1;
  }

  @media (max-width: 768px) {
    width: 140px;
    height: 140px;

    &::before {
      top: -6px;
      left: -6px;
      right: -6px;
      bottom: -6px;
    }

    &::after {
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    width: 120px;
    height: 120px;

    &::before {
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
    }

    &::after {
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
    }
  }

  @media (min-width: 2560px) {
    width: 220px;
    height: 220px;
  }

  @media (min-width: 3840px) {
    width: 260px;
    height: 260px;
  }
`;

const ProfileImage = styled.div<{ $image?: string }>`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  z-index: 2;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(255, 255, 255, 0.1);
  animation: ${subtleGlow} 6s ease-in-out infinite;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  ${({ $image, theme }) => $image
    ? css`
      background: url(${$image});
      background-size: cover;
      background-position: center;
      border: 4px solid var(--bg-base, #0a0a1a);
    `
    : css`
      background: linear-gradient(135deg, ${theme.colors?.primary || '#3B82F6'}, ${theme.colors?.secondary || '#8B5CF6'});
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 3.5rem;
      font-weight: 700;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      letter-spacing: 0.05em;
      border: 5px solid transparent;
    `
  }

  &:hover {
    transform: scale(1.05);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.2),
      0 12px 40px rgba(0, 0, 0, 0.5),
      0 6px 20px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover { transform: none; }
  }

  @media (max-width: 768px) {
    font-size: 2.5rem;
    border-width: 3px;
    &:hover { transform: none; }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 2rem;
    border-width: 2px;
  }

  @media (min-width: 2560px) {
    font-size: 4.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 5.5rem;
  }
`;

const ImageUploadButton = styled(motion.button)`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 100%
  );
  border: 3px solid var(--bg-base, #0a0a1a);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  z-index: 3;

  /* Professional hover effects */
  &:hover {
    transform: scale(1.15) translateY(-2px);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
    background: linear-gradient(135deg,
      ${({ theme }) => theme.colors?.accent || '#F59E0B'} 0%,
      ${({ theme }) => theme.colors?.primary || '#3B82F6'} 100%
    );
  }

  &:active {
    transform: scale(1.05);
  }

  /* Icon styling */
  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    bottom: 6px;
    right: 6px;
    border-width: 2px;

    &:hover {
      transform: scale(1.1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

const ProfileInfo = styled(motion.div)`
  text-align: center;
  padding: 90px 2rem 3rem;
  position: relative;

  /* Subtle backdrop for better text readability */
  &::before {
    content: '';
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 120%;
    height: calc(100% - 60px);
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 0, 0, 0.1) 20%,
      rgba(0, 0, 0, 0.05) 80%,
      transparent 100%
    );
    border-radius: 0 0 24px 24px;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    padding: 80px 1rem 2rem;

    &::before {
      top: 50px;
      width: 110%;
      height: calc(100% - 50px);
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 70px 0.75rem 1.5rem;
  }

  @media (min-width: 2560px) {
    padding: 110px 3rem 4rem;
  }

  @media (min-width: 3840px) {
    padding: 130px 4rem 5rem;
  }
`;

const DisplayName = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 35%,
    ${({ theme }) => theme.colors?.accent || '#F59E0B'} 70%,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.75rem;
  animation: ${slideInUp} 0.8s ease-out;
  letter-spacing: -0.02em;
  line-height: 1.1;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  /* Premium text effect */
  position: relative;

  &::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.1) 0%,
      rgba(139, 92, 246, 0.1) 35%,
      rgba(245, 158, 11, 0.1) 70%,
      rgba(59, 130, 246, 0.1) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: blur(2px);
    z-index: -1;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    font-size: 2.25rem;
    letter-spacing: -0.01em;
  }

  @media (max-width: 480px) {
    font-size: 1.875rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1.5rem;
  }

  @media (min-width: 2560px) {
    font-size: 3.75rem;
  }

  @media (min-width: 3840px) {
    font-size: 4.5rem;
  }
`;

const Username = styled.p`
  color: var(--text-secondary);
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
  animation: ${slideInUp} 0.8s ease-out 0.1s both;

  /* Subtle text enhancement */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    font-size: 1.125rem;
  }

  @media (max-width: 480px) {
    font-size: 1rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 0.875rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.75rem;
  }
`;

const UserRole = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 100%
  );
  color: white;
  border-radius: 30px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.25),
    0 4px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: ${slideInUp} 0.8s ease-out 0.2s both;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Premium glow effect */
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.3),
      0 6px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);

    &::before {
      left: 100%;
    }
  }

  /* Icon styling */
  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.25rem;
    font-size: 0.875rem;

    &:hover {
      transform: translateY(-1px) scale(1.02);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    &:hover {
      transform: none;
    }

    &::before {
      display: none;
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    gap: 0.4rem;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.75rem;
    font-size: 1.125rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 2rem;
    font-size: 1.25rem;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin: 2.5rem 0;

  @media (max-width: 768px) {
    gap: 1.5rem;
    margin: 2rem 0;
  }

  @media (max-width: 480px) {
    gap: 1rem;
    margin: 1.5rem 0;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 0.5rem;
    margin: 1rem 0;
  }

  @media (min-width: 2560px) {
    gap: 4rem;
    margin: 3rem 0;
  }

  @media (min-width: 3840px) {
    gap: 5rem;
    margin: 3.5rem 0;
  }
`;

const StatItem = styled(motion.div)`
  text-align: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 1rem;
  border-radius: 16px;
  background: var(--bg-elevated);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;

  /* Premium hover effects */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-8px) scale(1.05);
    background: var(--bg-elevated);
    border-color: color-mix(in srgb, var(--accent-primary) 40%, transparent);
    box-shadow:
      0 12px 32px rgba(0, 0, 0, 0.2),
      0 6px 16px rgba(0, 0, 0, 0.15),
      inset 0 1px 2px rgba(255, 255, 255, 0.1),
      0 0 20px rgba(0, 255, 255, 0.05);
    /* V3: Cyan glow on hover */
    border-color: rgba(0, 255, 255, 0.15);

    &::before {
      left: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }

    &::before {
      display: none;
    }
  }

  @media (max-width: 768px) {
    padding: 0.75rem;

    &:hover {
      transform: translateY(-4px) scale(1.02);
    }
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 1.5rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 2rem;
    border-radius: 24px;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors?.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.colors?.secondary || '#8B5CF6'} 50%,
    ${({ theme }) => theme.colors?.accent || '#F59E0B'} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: ${subtleGlow} 4s ease-in-out infinite;
  position: relative;

  /* Fallback for browsers that don't support background-clip */
  @supports not (-webkit-background-clip: text) {
    color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    background: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1.25rem;
  }

  @media (min-width: 2560px) {
    font-size: 2.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 3rem;
  }
`;

const StatLabel = styled.div`
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  margin-top: 0.25rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.9;
  transition: all 0.3s ease;

  ${StatItem}:hover & {
    color: var(--accent-primary);
    opacity: 1;
  }

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 0.7rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.25rem;
  }
`;

const Bio = styled.p`
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto 2rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 0.8rem;
    margin: 0 auto 1.25rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.15rem;
    max-width: 800px;
  }

  @media (min-width: 3840px) {
    font-size: 1.3rem;
    max-width: 1000px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 0.5rem;
  }

  @media (min-width: 2560px) {
    gap: 1.25rem;
  }

  @media (min-width: 3840px) {
    gap: 1.5rem;
  }
`;

const PrimaryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #00ffff, #7851a9)'};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    border-radius: 10px;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.75rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 2rem;
    font-size: 1.25rem;
  }
`;

const SecondaryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-surface, var(--bg-elevated));
    transform: translateY(-2px);
    /* V3: Cyan glow on hover */
    border-color: rgba(0, 255, 255, 0.15);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.05);
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  @media (min-width: 2560px) {
    width: 52px;
    height: 52px;
  }

  @media (min-width: 3840px) {
    width: 56px;
    height: 56px;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
    margin-top: 1rem;
  }

  @media (min-width: 2560px) {
    grid-template-columns: 380px 1fr;
    gap: 2.5rem;
    margin-top: 3rem;
  }

  @media (min-width: 3840px) {
    grid-template-columns: 460px 1fr;
    gap: 3rem;
    margin-top: 4rem;
  }
`;

const Sidebar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
  }

  @media (min-width: 2560px) {
    gap: 2rem;
  }

  @media (min-width: 3840px) {
    gap: 2.5rem;
  }
`;

const SidebarCard = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: all 0.3s ease;

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  &:hover {
    border-color: rgba(0, 255, 255, 0.15);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 0 20px rgba(0, 255, 255, 0.05);
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 1rem;
    border-radius: 12px;
  }

  @media (min-width: 2560px) {
    padding: 2rem;
    border-radius: 20px;
  }

  @media (min-width: 3840px) {
    padding: 2.5rem;
    border-radius: 24px;
  }
`;

const SidebarTitle = styled.h3`
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    font-size: 1rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.4rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.6rem;
  }
`;

const MainContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    gap: 1rem;
  }

  @media (min-width: 2560px) {
    gap: 2rem;
  }

  @media (min-width: 3840px) {
    gap: 2.5rem;
  }
`;

const TabNavigation = styled.div`
  display: flex;
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 0.5rem;
  overflow-x: auto;

  /* V3: Enhanced glassmorphism */
  backdrop-filter: blur(24px);

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    border-radius: 12px;
    padding: 0.375rem;
  }

  @media (min-width: 2560px) {
    border-radius: 20px;
    padding: 0.625rem;
  }

  @media (min-width: 3840px) {
    border-radius: 24px;
    padding: 0.75rem;
  }
`;

const Tab = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #7851a9))' : 'transparent'
  };
  color: ${({ $active }) =>
    $active ? 'white' : 'var(--text-secondary)'
  };
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: ${({ $active }) => $active ? '600' : '500'};

  &:hover {
    background: ${({ $active }) =>
      $active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #7851a9))' : 'var(--bg-surface, var(--bg-elevated))'
    };
    color: ${({ $active }) =>
      $active ? 'white' : 'var(--text-primary)'
    };
  }

  /* V3: Extended breakpoints */
  @media (max-width: 320px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }

  @media (min-width: 2560px) {
    padding: 0.9rem 1.25rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 1rem 1.5rem;
    font-size: 1.25rem;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors?.primary || '#00ffff'};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Simplified Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2>🌟 Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #00ffff, #7851a9)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🚀 Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main component interface
interface UserDashboardV3Props {}

/**
 * V3 Cinematic User Dashboard Component
 *
 * Visual-only upgrade of the optimized dashboard:
 * - Noise overlay for cinematic film-grain depth
 * - Extended 10-breakpoint responsive matrix (320px through 3840px)
 * - Enhanced glassmorphism with cyan glow accents
 * - All original logic, data flow, and component structure preserved
 */
const UserDashboardV3: React.FC<UserDashboardV3Props> = () => {
  const { user } = useAuth();
  const { theme } = useUniversalTheme();

  const {
    profile,
    stats,
    isLoading,
    error,
    uploadProfilePhoto,
    uploadBannerPhoto,
    updateProfile,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials
  } = useProfile();

  const navigate = useNavigate();

  // Local state
  const [activeTab, setActiveTab] = useState('feed');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load banner image from profile data
  React.useEffect(() => {
    if (profile?.bannerPhoto) {
      setBackgroundImage(profile.bannerPhoto);
    }
  }, [profile?.bannerPhoto]);

  // Refs for file uploads
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Memoized stats with fallbacks
  const displayStats = React.useMemo(() => ({
    posts: stats?.posts || 0,
    followers: stats?.followers || 0,
    following: stats?.following || 0,
    workouts: stats?.workouts || 0,
    points: stats?.points || 0,
    level: stats?.level || 1
  }), [stats]);

  // File upload handlers
  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background') => {
    if (!file || !file.type.startsWith('image/')) return;

    try {
      if (type === 'profile') {
        await uploadProfilePhoto(file);
      } else {
        // Show optimistic preview immediately
        const previewUrl = URL.createObjectURL(file);
        setBackgroundImage(previewUrl);
        // Upload to backend — profile.bannerPhoto will update via useEffect
        await uploadBannerPhoto(file);
        // Don't revoke blob URL here — the useEffect will replace backgroundImage
        // with the real server URL when profile.bannerPhoto updates
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Revert optimistic update on error
      if (type === 'background') {
        setBackgroundImage(profile?.bannerPhoto || null);
      }
    }
  }, [uploadProfilePhoto, uploadBannerPhoto, profile?.bannerPhoto]);

  const handleProfileImageClick = useCallback(() => {
    profileInputRef.current?.click();
  }, []);

  const handleBackgroundClick = useCallback(() => {
    backgroundInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'background') => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);

  // Action handlers
  const handleEditProfile = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleSettings = useCallback(() => {
    navigate('/dashboard/profile');
  }, [navigate]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/user-dashboard`;
    const shareData = {
      title: `${getDisplayName()} on SwanStudios`,
      url: shareUrl
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Profile link copied to clipboard!');
      } catch {
        // Fallback
      }
    }
  }, [getDisplayName]);

  // Loading state
  if (isLoading && !profile) {
    return (
      <ProfileContainer>
        <NoiseOverlay />
        <MainContentZWrapper>
          <LoadingContainer>
            <LoadingSpinner />
          </LoadingContainer>
        </MainContentZWrapper>
      </ProfileContainer>
    );
  }

  // Error state
  if (error && !profile) {
    return (
      <ProfileContainer>
        <NoiseOverlay />
        <MainContentZWrapper>
          <ContentWrapper>
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <h2>⚠️ Error Loading Profile</h2>
              <p style={{ marginBottom: '2rem' }}>{error}</p>
              <PrimaryButton onClick={() => window.location.reload()}>
                Retry
              </PrimaryButton>
            </div>
          </ContentWrapper>
        </MainContentZWrapper>
      </ProfileContainer>
    );
  }

  return (
    <ErrorBoundary>
      <ProfileContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* V3: Cinematic noise overlay */}
        <NoiseOverlay />

        {/* V3: Main content z-index wrapper sits above noise */}
        <MainContentZWrapper>
          <ContentWrapper>
            {/* Profile Header */}
            <ProfileHeader
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <BackgroundSection
                $backgroundImage={backgroundImage}
                onClick={handleBackgroundClick}
              >
                <div className="upload-overlay">
                  <Camera size={48} className="upload-icon" />
                  <div className="upload-text">
                    {backgroundImage ? 'Change Cover Photo' : 'Add Cover Photo'}
                  </div>
                </div>
              </BackgroundSection>

              <ProfileImageSection>
                <ProfileImageContainer
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ProfileImage $image={profile?.photo}>
                    {!profile?.photo && getUserInitials()}
                  </ProfileImage>

                  <ImageUploadButton
                    onClick={handleProfileImageClick}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Camera size={20} />
                  </ImageUploadButton>
                </ProfileImageContainer>
              </ProfileImageSection>

              <ProfileInfo
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <DisplayName>{getDisplayName()}</DisplayName>
                <Username>@{getUsernameForDisplay()}</Username>

                <UserRole
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Crown size={16} />
                  {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || 'User'}
                </UserRole>

                <StatsContainer>
                  <StatItem whileHover={{ scale: 1.1 }}>
                    <StatValue>{displayStats.posts}</StatValue>
                    <StatLabel>Posts</StatLabel>
                  </StatItem>
                  <StatItem whileHover={{ scale: 1.1 }}>
                    <StatValue>{displayStats.followers}</StatValue>
                    <StatLabel>Followers</StatLabel>
                  </StatItem>
                  <StatItem whileHover={{ scale: 1.1 }}>
                    <StatValue>{displayStats.following}</StatValue>
                    <StatLabel>Following</StatLabel>
                  </StatItem>
                </StatsContainer>

                <Bio>
                  {profile?.bio ||
                    "✨ Spreading positive energy through fitness & wellness • 🌟 SwanStudios community member • 💪 Join me on this transformation journey!"
                  }
                </Bio>

                <ActionButtons>
                  <PrimaryButton
                    onClick={handleEditProfile}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Edit3 size={20} />
                    Edit Profile
                  </PrimaryButton>

                  <SecondaryButton
                    onClick={handleSettings}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings size={20} />
                  </SecondaryButton>

                  <SecondaryButton
                    onClick={handleShare}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share2 size={20} />
                  </SecondaryButton>
                </ActionButtons>
              </ProfileInfo>
            </ProfileHeader>

            {/* Content Grid */}
            <ContentGrid>
              {/* Sidebar */}
              <Sidebar
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <SidebarCard>
                  <SidebarTitle>
                    <Star size={20} />
                    Quick Stats
                  </SidebarTitle>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Workouts</span>
                      <span style={{ fontWeight: 'bold', color: theme.colors?.primary || '#00ffff' }}>
                        {displayStats.workouts}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Level</span>
                      <span style={{ fontWeight: 'bold', color: theme.colors?.primary || '#00ffff' }}>
                        {displayStats.level}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Points</span>
                      <span style={{ fontWeight: 'bold', color: theme.colors?.primary || '#00ffff' }}>
                        {displayStats.points}
                      </span>
                    </div>
                  </div>
                </SidebarCard>
              </Sidebar>

              {/* Main Content */}
              <MainContent
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {/* Tab Navigation */}
                <TabNavigation>
                  {[
                    { id: 'feed', label: 'Feed', icon: Sparkles },
                    { id: 'creative', label: 'Creative', icon: Music2 },
                    { id: 'photos', label: 'Photos', icon: ImageIcon },
                    { id: 'about', label: 'About', icon: Users },
                    { id: 'activity', label: 'Activity', icon: Activity },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <Tab
                        key={tab.id}
                        $active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={18} />
                        {tab.label}
                      </Tab>
                    );
                  })}
                </TabNavigation>

                {/* Tab Content with Suspense */}
                <Suspense fallback={<LoadingContainer><LoadingSpinner /></LoadingContainer>}>
                  {activeTab === 'feed' && <CommunityFeed />}
                  {activeTab === 'creative' && <CreativeGallery />}
                  {activeTab === 'photos' && <PhotoGallery />}
                  {activeTab === 'about' && <AboutSection />}
                  {activeTab === 'activity' && <ActivitySection />}
                </Suspense>
              </MainContent>
            </ContentGrid>

            {/* Hidden File Inputs */}
            <HiddenInput
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'profile')}
            />

            <HiddenInput
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'background')}
            />

            {/* Edit Profile Modal */}
            {showEditModal && (
              <Suspense fallback={null}>
                <EditProfileModal
                  profile={profile}
                  onClose={() => setShowEditModal(false)}
                  onSave={async (data) => {
                    await updateProfile(data);
                    setShowEditModal(false);
                  }}
                />
              </Suspense>
            )}
          </ContentWrapper>
        </MainContentZWrapper>
      </ProfileContainer>
    </ErrorBoundary>
  );
};

export default UserDashboardV3;
