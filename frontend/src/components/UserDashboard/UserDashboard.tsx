/**
 * Revolutionary Cosmic Community Profile - SwanStudios Platform
 * ============================================================
 * 
 * Motivational Social Wellness Platform - "Meetup & Nextdoor but Better"
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Vision: A platform of positivity, support, creativity, and cosmic wellness
 * - Fitness, dancing, singing, health, personal growth for EVERYONE
 * - Trainer recruitment and community building
 * - Family-friendly with professional opportunities
 * - Cosmic metaphors: orbital progress, stellar transformations, constellation achievements
 * 
 * Features:
 * - Intelligent performance adaptation (luxurious on powerful devices, functional on weak)
 * - Cosmic wellness metaphors and gamification
 * - Community meetup and social features
 * - Creative expression showcase (dance, music, fitness)
 * - Motivational achievement constellation system
 * - Stellar transformation progress tracking
 * - Trainer recruitment and networking tools
 * 
 * Master Prompt v28 Alignment:
 * - Content-first positive community experience
 * - Heavy gamification with cosmic metaphors
 * - Adaptive luxury with device-appropriate fallbacks
 * - Mobile-first with premium desktop enhancement
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Settings, 
  Heart,
  MessageCircle,
  Share2,
  Upload,
  Edit3,
  Users,
  Target,
  Activity,
  Zap,
  Image as ImageIcon,
  Star,
  Award,
  Crown,
  Sparkles,
  Plus,
  Check,
  X,
  MapPin,
  Calendar,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Instagram,
  Twitter,
  Facebook,
  // Community & Meetup Icons
  Users2,
  MapPin as LocationIcon,
  Calendar as EventIcon,
  Coffee,
  Handshake,
  MessageSquare,
  // Creative Expression Icons
  Music,
  Mic,
  Music2,
  Palette,
  Video,
  Camera as VideoCamera,
  // Cosmic Fitness Metaphors
  Orbit,
  Rocket,
  Telescope,
  Compass,
  TrendingUp,
  BarChart3,
  // Wellness & Positive Energy
  Smile,
  Sun,
  Rainbow,
  Flame,
  Mountain,
  Waves,
  // Trainer & Professional
  GraduationCap,
  Certificate,
  BadgeCheck,
  Briefcase,
  Network
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useUniversalTheme } from '../../context/ThemeContext/UniversalThemeContext';
import { useProfile } from '../../hooks/profile/useProfile';
import productionApiService from '../../services/api.service';
import profileService from '../../services/profileService';
import cosmicPerformanceOptimizer from '../../utils/cosmicPerformanceOptimizer';

// ===================== PERFORMANCE-AWARE GLOBAL STYLES =====================
const injectPerformanceStyles = () => {
  if (typeof document === 'undefined') return;
  
  const styleId = 'cosmic-performance-styles';
  if (document.getElementById(styleId)) return; // Already injected
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Global performance optimizations */
    body.perf-weak * {
      animation-duration: 0.1s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.1s !important;
    }
    
    body.perf-weak .cosmic-animation,
    body.perf-weak .stellar-animation,
    body.perf-weak .galaxy-animation {
      animation: none !important;
    }
    
    body.perf-medium * {
      animation-duration: 0.3s !important;
      transition-duration: 0.2s !important;
    }
    
    /* Cosmic glow animation */
    .cosmic-glow-animation {
      animation: cosmic-glow 4s ease-in-out infinite;
    }
    
    @keyframes cosmic-glow {
      0%, 100% { 
        filter: drop-shadow(0 0 20px currentColor) brightness(1);
        transform: scale(1);
      }
      50% { 
        filter: drop-shadow(0 0 40px currentColor) brightness(1.2);
        transform: scale(1.02);
      }
    }
    
    /* Respect reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .cosmic-glow-animation {
        animation: none !important;
      }
    }
    
    /* Tab hidden optimizations */
    body.tab-hidden * {
      animation-play-state: paused !important;
    }
  `;
  document.head.appendChild(style);
};

// ===================== COSMIC ANIMATIONS WITH PERFORMANCE FALLBACKS =====================
const stellarFloat = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-10px) rotate(2deg); }
  66% { transform: translateY(5px) rotate(-1deg); }
`;

const cosmicGlow = keyframes`
  0%, 100% { 
    filter: drop-shadow(0 0 20px currentColor) brightness(1);
    transform: scale(1);
  }
  50% { 
    filter: drop-shadow(0 0 40px currentColor) brightness(1.2);
    transform: scale(1.02);
  }
`;

const galaxySwirl = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
`;

const starTwinkle = keyframes`
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
`;

const nebulaPulse = keyframes`
  0%, 100% { 
    background-position: 0% 0%;
    opacity: 0.8;
  }
  50% { 
    background-position: 100% 100%;
    opacity: 1;
  }
`;

// Simplified animations for weak devices
const simpleFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
`;

const simpleFade = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

// ===================== MOTION COMPONENTS WITH PROPER PROP FILTERING =====================

// Create properly filtered div components for non-motion elements
const FilteredDiv = styled.div`
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  /* Disable hover effects on weak devices */
  body.perf-weak &:hover {
    transform: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

// Motion div for animated elements
const FilteredMotionDiv = styled(motion.div)`
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  /* Disable hover effects on weak devices */
  body.perf-weak &:hover {
    transform: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const FilteredButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
`;

// Additional filtered motion component for any other elements
const FilteredMotionSpan = styled(motion.span)``;


// Additional styled components for sidebar stats
const AnimatedStatValue = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
  animation: ${({ $performanceLevel }) => {
    if ($performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFade} 4s ease-in-out infinite`;
    return css`${cosmicGlow} 4s ease-in-out infinite`;
  }};
  
  /* Performance-based overrides */
  body.perf-weak & {
    animation: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const AnimatedAchievementIcon = styled.div`
  color: ${({ theme }) => theme.colors.accent};
  animation: ${({ $performanceLevel }) => {
    if ($performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFade} 3s ease-in-out infinite`;
    return css`${starTwinkle} 3s ease-in-out infinite`;
  }};
  
  /* Performance-based overrides */
  body.perf-weak & {
    animation: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// ===================== COSMIC STYLED COMPONENTS =====================

const ProfileContainer = styled(motion.div)`
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  position: relative;
  overflow: hidden;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  
  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
  }
`;

const ProfileHeader = styled(motion.div)`
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 2rem;
  background: ${({ theme }) => theme.gradients.card};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  box-shadow: ${({ theme }) => theme.shadows.cosmic};
`;

const BackgroundImageContainer = styled.div`
  height: 300px;
  position: relative;
  background: ${({ $backgroundImage, theme }) => 
    $backgroundImage 
      ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1)), url(${$backgroundImage})`
      : theme.gradients.hero
  };
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: 768px) {
    height: 200px;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100px;
    background: linear-gradient(transparent, ${({ theme }) => theme.background.primary});
  }
`;

const BackgroundUploadOverlay = styled(motion.div)`
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
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
`;

const ProfileImageSection = styled.div`
  position: absolute;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
`;

const ProfileImageContainer = styled(motion.div)`
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto;

  @media (max-width: 768px) {
    width: 120px;
    height: 120px;
  }
`;

const ProfileImage = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid ${({ theme }) => theme.colors.primary};
  background: ${({ $image, theme }) => 
    $image 
      ? `url(${$image})` 
      : theme.gradients.primary
  };
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.cosmic};
  animation: ${({ $enableLuxury, $performanceLevel }) => {
    if (!$enableLuxury || $performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFade} 4s ease-in-out infinite`;
    return css`${cosmicGlow} 4s ease-in-out infinite`;
  }};

  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.text.primary};
  font-size: 3rem;
  font-weight: bold;
  
  /* Respect system preferences */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  
  /* Performance-based overrides */
  body.perf-weak & {
    animation: none;
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ImageUploadButton = styled(motion.button)`
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.gradients.primary};
  border: 2px solid ${({ theme }) => theme.background.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${({ theme }) => theme.shadows.primary};

  &:hover {
    transform: scale(1.1);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    bottom: 2px;
    right: 2px;
  }
`;

const ProfileInfo = styled(motion.div)`
  text-align: center;
  padding: 80px 2rem 2rem;
  
  @media (max-width: 768px) {
    padding: 70px 1rem 1.5rem;
  }
`;

const DisplayName = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  background: ${({ theme }) => theme.gradients.stellar};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  animation: ${({ $performanceLevel }) => {
    if ($performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFloat} 6s ease-in-out infinite`;
    return css`${stellarFloat} 6s ease-in-out infinite`;
  }};
  
  /* Respect system preferences */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  
  /* Performance-based overrides */
  body.perf-weak & {
    animation: none;
  }

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Username = styled.p`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const UserRole = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: white;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.shadows.primary};
  animation: ${({ $performanceLevel }) => {
    if ($performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFade} 3s ease-in-out infinite`;
    return css`${starTwinkle} 3s ease-in-out infinite`;
  }};
  
  /* Performance-based overrides */
  body.perf-weak & {
    animation: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin: 2rem 0;

  @media (max-width: 768px) {
    gap: 1.5rem;
    margin: 1.5rem 0;
  }
`;

const StatItem = styled(motion.div)`
  text-align: center;
  cursor: pointer;
  transition: ${({ $enableAnimations }) => 
    $enableAnimations ? 'transform 0.3s ease' : 'none'
  };

  &:hover {
    transform: ${({ $enableAnimations }) => 
      $enableAnimations ? 'translateY(-5px)' : 'none'
    };
  }
  
  /* Disable hover effects on weak devices */
  body.perf-weak &:hover {
    transform: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  animation: ${({ $performanceLevel }) => {
    if ($performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFade} 4s ease-in-out infinite`;
    return css`${cosmicGlow} 4s ease-in-out infinite`;
  }};
  
  /* Performance-based overrides */
  body.perf-weak & {
    animation: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 0.9rem;
  margin-top: 0.25rem;
`;

const Bio = styled.p`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 1rem;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto 2rem;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PrimaryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${({ theme }) => theme.shadows.primary};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.cosmic};
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
`;

const SecondaryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${({ theme }) => theme.background.elevated};
  color: ${({ theme }) => theme.text.primary};
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.gradients.card};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
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
`;

const Sidebar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SidebarCard = styled(motion.div)`
  background: ${({ theme }) => theme.gradients.card};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.elevation};
`;

const SidebarTitle = styled.h3`
  color: ${({ theme }) => theme.text.primary};
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MainContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const TabNavigation = styled.div`
  display: flex;
  background: ${({ theme }) => theme.gradients.card};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 0.5rem;
  overflow-x: auto;
`;

const Tab = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 12px;
  background: ${({ $active, theme }) => 
    $active ? theme.gradients.primary : 'transparent'
  };
  color: ${({ $active, theme }) => 
    $active ? 'white' : theme.text.secondary
  };
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  font-weight: ${({ $active }) => $active ? '600' : '500'};

  &:hover {
    background: ${({ $active, theme }) => 
      $active ? theme.gradients.primary : theme.background.elevated
    };
    color: ${({ $active, theme }) => 
      $active ? 'white' : theme.text.primary
    };
  }
`;

const ContentCard = styled(motion.div)`
  background: ${({ theme }) => theme.gradients.card};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: ${({ theme }) => theme.shadows.elevation};
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
`;

const PhotoItem = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 12px;
  background: ${({ theme }) => theme.gradients.card};
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: scale(1.05);
    box-shadow: ${({ theme }) => theme.shadows.primary};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UploadPlaceholder = styled(motion.div)`
  aspect-ratio: 1;
  border-radius: 12px;
  background: ${({ theme }) => theme.background.elevated};
  border: 2px dashed ${({ theme }) => theme.borders.elegant};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: ${({ theme }) => theme.text.secondary};

  &:hover {
    background: ${({ theme }) => theme.gradients.card};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const LoadingOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const LoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 3px solid transparent;
  border-top: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${galaxySwirl} 1s linear infinite;
  margin-bottom: 1rem;
`;

const LoadingText = styled.p`
  color: ${({ theme }) => theme.text.primary};
  font-size: 1.1rem;
  font-weight: 500;
`;

// ===================== SWAN GALAXY RADIANCE LIVE MESSAGE BOARD COMPONENTS =====================

// Webb-inspired nebula animations
const nebulaFlow = keyframes`
  0% {
    background-position: 0% 0%;
    opacity: 0.6;
  }
  50% {
    background-position: 100% 100%;
    opacity: 0.8;
  }
  100% {
    background-position: 0% 0%;
    opacity: 0.6;
  }
`;

const swanGlide = keyframes`
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-8px) rotate(1deg);
  }
  75% {
    transform: translateY(4px) rotate(-0.5deg);
  }
`;

const stellarRadiance = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 69, 19, 0.3);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 40px rgba(139, 69, 19, 0.6), 0 0 80px rgba(65, 105, 225, 0.2);
    transform: scale(1.01);
  }
`;

// Main Feed Container with Webb-inspired nebula background
const LiveFeedContainer = styled(motion.div)`
  position: relative;
  background: ${({ theme }) => theme.gradients.card};
  backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 20px;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      rgba(15, 23, 42, 0.8) 0%,
      rgba(30, 58, 138, 0.6) 25%,
      rgba(139, 69, 19, 0.4) 50%,
      rgba(249, 115, 22, 0.3) 75%,
      rgba(15, 23, 42, 0.8) 100%
    );
    background-size: 400% 400%;
    animation: ${({ $enableAnimations }) => 
      $enableAnimations ? css`${nebulaFlow} 20s ease-in-out infinite` : 'none'
    };
    pointer-events: none;
    z-index: 0;
  }
  
  /* Performance optimizations */
  body.perf-weak &::before {
    animation: none;
    background: ${({ theme }) => theme.background.elevated};
  }
  
  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

const FeedContent = styled.div`
  position: relative;
  z-index: 1;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const FeedTitle = styled.h2`
  color: ${({ theme }) => theme.text.primary};
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #F59E0B, #3B82F6, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${({ $performanceLevel }) => {
    if ($performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFloat} 6s ease-in-out infinite`;
    return css`${swanGlide} 8s ease-in-out infinite`;
  }};
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
    text-align: center;
  }
  
  /* Performance overrides */
  body.perf-weak & {
    animation: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const CreatePostContainer = styled(motion.div)`
  background: ${({ theme }) => theme.background.elevated};
  backdrop-filter: blur(15px);
  border: 2px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
  
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
      rgba(139, 69, 19, 0.05) 50%,
      rgba(249, 115, 22, 0.1) 100%
    );
    border-radius: 16px;
    pointer-events: none;
  }
`;

const PostComposer = styled.div`
  position: relative;
  z-index: 1;
`;

const PostInput = styled.textarea`
  width: 100%;
  min-height: 120px;
  background: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  border-radius: 12px;
  padding: 1rem;
  color: ${({ theme }) => theme.text.primary};
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: ${({ theme }) => theme.text.secondary};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary + '20'};
  }
`;

const PostActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const PostOptions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  
  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const PostOptionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.background.elevated};
  border: 1px solid ${({ theme }) => theme.borders.subtle};
  border-radius: 8px;
  color: ${({ theme }) => theme.text.secondary};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary + '20'};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
`;

const PostButton = styled(motion.button)`
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostsStream = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PostCard = styled(motion.div)`
  background: ${({ theme }) => theme.background.elevated};
  backdrop-filter: blur(15px);
  border: 1px solid ${({ theme }) => theme.borders.elegant};
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  animation: ${({ $enableAnimations, $performanceLevel }) => {
    if (!$enableAnimations || $performanceLevel === 'weak') return 'none';
    if ($performanceLevel === 'medium') return css`${simpleFade} 6s ease-in-out infinite`;
    return css`${stellarRadiance} 8s ease-in-out infinite`;
  }};
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.colors.primary + '60'};
  }
  
  /* Performance overrides */
  body.perf-weak & {
    animation: none;
    &:hover {
      transform: translateY(-1px);
    }
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover {
      transform: none;
    }
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
`;

const PostAuthorImage = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $image, theme }) => 
    $image ? `url(${$image})` : theme.gradients.primary
  };
  background-size: cover;
  background-position: center;
  border: 2px solid ${({ theme }) => theme.colors.primary + '40'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  animation: ${({ $enableAnimations, $performanceLevel }) => {
    if (!$enableAnimations || $performanceLevel === 'weak') return 'none';
    return css`${cosmicGlow} 6s ease-in-out infinite`;
  }};
  
  body.perf-weak & {
    animation: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const PostAuthorInfo = styled.div`
  flex: 1;
`;

const PostAuthorName = styled.h4`
  color: ${({ theme }) => theme.text.primary};
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
`;

const PostTimestamp = styled.p`
  color: ${({ theme }) => theme.text.secondary};
  font-size: 0.9rem;
  margin: 0;
`;

const PostContent = styled.div`
  padding: 1rem 1.5rem;
`;

const PostText = styled.p`
  color: ${({ theme }) => theme.text.primary};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1rem;
  word-wrap: break-word;
`;

const PostMediaContainer = styled.div`
  margin: 1rem 0;
  border-radius: 12px;
  overflow: hidden;
  
  img, video {
    width: 100%;
    height: auto;
    display: block;
  }
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.borders.subtle};
  margin-top: 1rem;
  padding-top: 1rem;
`;

const PostInteractions = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

const InteractionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${({ $active, theme }) => 
    $active ? theme.colors.primary : theme.text.secondary
  };
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary + '10'};
    color: ${({ theme }) => theme.colors.primary};
    transform: scale(1.05);
  }
  
  body.perf-weak &:hover {
    transform: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

const JourneyWeaveButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #F59E0B, #DC2626);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
  }
  
  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
`;

// ===================== ERROR BOUNDARY =====================
class UserDashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UserDashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a1a 70%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <h2>🌟 Cosmic Dashboard Loading Error</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
            We're experiencing some stellar interference. Please refresh to reconnect to the cosmic network.
          </p>
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
            🚀 Reconnect to Cosmos
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===================== MAIN COMPONENT =====================

interface UserDashboardProps {}

const UserDashboard: React.FC<UserDashboardProps> = () => {
  // ===================== HOOKS & CONTEXT =====================
  const { user } = useAuth();
  const { theme } = useUniversalTheme();
  
  // Profile management hook with real database connection
  const {
    profile,
    stats,
    posts,
    achievements,
    followStats,
    isLoading,
    isLoadingStats,
    isLoadingPosts,
    isUploading,
    error,
    refreshProfile,
    updateProfile,
    uploadProfilePhoto,
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials
  } = useProfile();
  
  // Core UI State
  const [activeTab, setActiveTab] = useState('feed');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<'profile' | 'background' | 'photo' | null>(null);
  
  // Community & Content State
  const [photos, setPhotos] = useState<string[]>([]);
  const [creativeVideos, setCreativeVideos] = useState<string[]>([]);
  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [workoutGoals, setWorkoutGoals] = useState<any[]>([]);
  
  // Performance & Device Detection
  const [devicePerformance, setDevicePerformance] = useState<'powerful' | 'medium' | 'weak'>('medium');
  const [enableLuxuryAnimations, setEnableLuxuryAnimations] = useState(true);
  const [performanceProfile, setPerformanceProfile] = useState<any>(null);
  
  // Social & Community Features
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    facebook: '',
    tiktok: '',
    youtube: ''
  });
  const [communityInterests, setCommunityInterests] = useState<string[]>([]);
  const [trainerStatus, setTrainerStatus] = useState<'interested' | 'applied' | 'certified' | null>(null);
  
  // Cosmic Progress Tracking
  const [stellarTransformation, setStellarTransformation] = useState({
    level: 5,
    orbitalProgress: 78,
    constellationPoints: 1247,
    cosmicEnergy: 85
  });

  // ===================== REFS =====================
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // ===================== PERFORMANCE DETECTION & EFFECTS =====================
  useEffect(() => {
    // Inject performance styles immediately
    injectPerformanceStyles();
    
    const detectPerformance = async () => {
      try {
        const capabilities = cosmicPerformanceOptimizer.detectDeviceCapabilities();
        const profile = cosmicPerformanceOptimizer.generatePerformanceProfile(capabilities);
        
        // Apply performance optimizations immediately
        cosmicPerformanceOptimizer.applyPerformanceOptimizations(profile);
        
        setPerformanceProfile(profile);
        setDevicePerformance(capabilities.performance);
        setEnableLuxuryAnimations(capabilities.performance === 'powerful' && profile.animations === 'full');
        
        console.log('🌌 Device Performance Detected:', {
          tier: capabilities.performance,
          profile: profile,
          luxuryAnimations: capabilities.performance === 'powerful' && profile.animations === 'full',
          deviceSpecs: {
            memory: capabilities.memory,
            cores: capabilities.cores,
            connection: capabilities.connectionType,
            reducedMotion: capabilities.preferReducedMotion
          }
        });
        
        // Start performance monitoring for dynamic adjustments
        const cleanup = cosmicPerformanceOptimizer.startPerformanceMonitoring();
        
        // Return cleanup function
        return cleanup;
      } catch (error) {
        console.warn('Performance detection failed, using safe defaults:', error);
        setDevicePerformance('medium');
        setEnableLuxuryAnimations(false);
        setPerformanceProfile({
          animations: 'reduced',
          blurEffects: 'simple',
          particleEffects: false,
          shadowComplexity: 'standard',
          transitionDuration: 'normal',
          imageQuality: 'standard'
        });
      }
    };
    
    const performanceCleanup = detectPerformance();
    
    // Cleanup on unmount
    return () => {
      if (typeof performanceCleanup === 'function') {
        performanceCleanup();
      }
    };
  }, []);
  
  // Initialize Community Data
  useEffect(() => {
    // Mock local community events
    setLocalEvents([
      {
        id: 1,
        title: 'Cosmic Yoga Sunset Session',
        type: 'yoga',
        date: '2024-06-15',
        time: '7:00 PM',
        location: 'Griffith Observatory',
        attendees: 24,
        maxAttendees: 30,
        host: 'Luna Starlight',
        description: 'Join us for a magical yoga session under the stars!'
      },
      {
        id: 2,
        title: 'SwanStudios Dance Battle',
        type: 'dancing',
        date: '2024-06-18',
        time: '6:00 PM',
        location: 'Venice Beach',
        attendees: 18,
        maxAttendees: 25,
        host: 'DJ Cosmic Beats',
        description: 'Show off your moves and win cosmic prizes!'
      },
      {
        id: 3,
        title: 'Stellar Strength Training',
        type: 'strength',
        date: '2024-06-20',
        time: '8:00 AM',
        location: 'Santa Monica Pier',
        attendees: 12,
        maxAttendees: 15,
        host: 'Captain Cosmos',
        description: 'Build strength with our certified SwanStudios trainer!'
      }
    ]);
    
    // Mock community interests
    setCommunityInterests(['Yoga', 'Dancing', 'Strength Training', 'Nutrition', 'Meditation']);
    
    // Mock workout goals with cosmic metaphors
    setWorkoutGoals([
      {
        id: 1,
        title: 'Orbital Cardio Mission',
        description: 'Complete 30 cardio sessions this month',
        progress: 18,
        target: 30,
        type: 'cardio',
        cosmicReward: 'Stellar Runner Badge'
      },
      {
        id: 2,
        title: 'Constellation Flexibility',
        description: 'Achieve full flexibility constellation',
        progress: 7,
        target: 12,
        type: 'flexibility',
        cosmicReward: 'Cosmic Flexibility Crown'
      },
      {
        id: 3,
        title: 'Galactic Strength Quest',
        description: 'Reach new personal records in 5 exercises',
        progress: 3,
        target: 5,
        type: 'strength',
        cosmicReward: 'Cosmic Warrior Title'
      }
    ]);
  }, []);

  // Note: Utility functions (getDisplayName, getUsernameForDisplay, getUserInitials)
  // are now provided by the useProfile hook

  // ===================== FILE UPLOAD FUNCTIONS =====================
  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background' | 'photo') => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingType(type);

    try {
      switch (type) {
        case 'profile':
          await uploadProfilePhoto(file);
          break;
        case 'background':
          const backgroundUrl = await profileService.uploadImage(file, 'background');
          setBackgroundImage(backgroundUrl);
          break;
        case 'photo':
          const photoUrl = await profileService.uploadImage(file, 'post');
          setPhotos(prev => [...prev, photoUrl]);
          break;
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload ${type}: ${error}`);
    } finally {
      setUploadingType(null);
    }
  }, [uploadProfilePhoto]);

  // ===================== BUTTON HANDLERS =====================
  const handleProfileImageClick = useCallback(() => {
    profileInputRef.current?.click();
  }, []);

  const handleBackgroundImageClick = useCallback(() => {
    backgroundInputRef.current?.click();
  }, []);

  const handlePhotoUploadClick = useCallback(() => {
    photoInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'background' | 'photo') => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);

  const handleEditProfile = useCallback(() => {
    console.log('✨ Edit Profile clicked');
    // TODO: Implement edit profile modal/page
  }, []);

  const handleSettings = useCallback(() => {
    console.log('⚙️ Settings clicked');
    // TODO: Implement settings page
  }, []);

  const handleShare = useCallback(() => {
    console.log('🔗 Share profile clicked');
    // TODO: Implement share functionality
  }, []);

  const handleCreateEvent = useCallback(() => {
    console.log('🎯 Create Event clicked');
    // TODO: Implement create event functionality
  }, []);

  const handleJoinEvent = useCallback((eventId: number) => {
    console.log('💖 Join Event clicked for event:', eventId);
    // TODO: Implement join event functionality
  }, []);

  const handleShareVideo = useCallback(() => {
    console.log('📹 Share Video clicked');
    // TODO: Implement video upload functionality
  }, []);

  // ===================== REAL DATA FROM DATABASE =====================
  // Stats are now loaded from the database via useProfile hook
  // Default values for loading states
  const displayStats = stats || {
    posts: 0,
    followers: 0,
    following: 0,
    workouts: 0,
    streak: 0,
    points: 0,
    level: 1,
    tier: 'bronze'
  };

  // Real fitness stats from database
  const fitnessStats = [
    { icon: Orbit, label: 'Orbital Progress', value: `${Math.min(100, ((displayStats.points || 0) % 1000) / 10).toFixed(0)}%`, color: theme.colors.primary },
    { icon: Rocket, label: 'Cosmic Energy', value: `${Math.min(100, (displayStats.streak || 0) * 5)}%`, color: theme.colors.accent },
    { icon: Star, label: 'Constellation Points', value: (displayStats.points || 0).toLocaleString(), color: theme.colors.secondary },
    { icon: Crown, label: 'Stellar Level', value: (displayStats.level || 1).toString(), color: theme.colors.primaryBlue }
  ];

  // Real achievements from database or fallback mock data
  const displayAchievements = achievements.length > 0 ? achievements.map(achievement => ({
    icon: Crown, // Default icon, could be mapped from achievement.iconUrl
    title: achievement.name,
    description: achievement.description,
    rarity: achievement.rarity
  })) : [
    { icon: Crown, title: 'Welcome to SwanStudios!', description: 'Started your cosmic fitness journey', rarity: 'common' },
    { icon: Star, title: 'First Steps', description: 'Completed your profile setup', rarity: 'common' },
    { icon: Rocket, title: 'Ready to Shine', description: 'Ready for stellar transformation', rarity: 'common' }
  ];

  // ===================== SWAN GALAXY RADIANCE LIVE FEED FUNCTIONS =====================
  
  // Mock posts data with positive, inspiring content
  const [feedPosts, setFeedPosts] = useState([
    {
      id: 1,
      author: {
        name: 'Luna Starlight',
        username: 'luna_cosmic',
        image: null,
        initials: 'LS'
      },
      content: '🌟 Just completed my morning yoga flow watching the sunrise! There\'s something magical about starting the day with gratitude and movement. The way the light danced through the clouds reminded me that every new day is a gift. Who else loves morning workouts? ✨',
      media: {
        type: 'image',
        url: 'https://picsum.photos/600/400?random=1'
      },
      timestamp: '2 hours ago',
      interactions: {
        inspires: 24,
        resonates: 18,
        uplifts: 31,
        comments: 7
      },
      userInteractions: {
        inspired: false,
        resonated: false,
        uplifted: false
      }
    },
    {
      id: 2,
      author: {
        name: 'Marcus Wellness',
        username: 'marcus_strong',
        image: null,
        initials: 'MW'
      },
      content: '💪 Breakthrough moment at the gym today! Finally deadlifted my bodyweight for the first time. Six months ago, I could barely lift the bar. Progress isn\'t always linear, but consistency pays off. To everyone on their fitness journey - keep going, you\'re stronger than you think! 🚀',
      media: null,
      timestamp: '4 hours ago',
      interactions: {
        inspires: 42,
        resonates: 28,
        uplifts: 35,
        comments: 12
      },
      userInteractions: {
        inspired: true,
        resonated: false,
        uplifted: false
      }
    },
    {
      id: 3,
      author: {
        name: 'Sophia Dance',
        username: 'sophia_moves',
        image: null,
        initials: 'SD'
      },
      content: '💃 Dance class tonight was pure magic! We learned a routine to \"What a Wonderful World\" and I couldn\'t help but smile the entire time. Dance isn\'t just movement - it\'s expression, joy, and connection. Feeling grateful for this amazing community where we lift each other up! 🎵',
      media: {
        type: 'video',
        url: 'https://picsum.photos/600/400?random=2'
      },
      timestamp: '6 hours ago',
      interactions: {
        inspires: 38,
        resonates: 31,
        uplifts: 44,
        comments: 15
      },
      userInteractions: {
        inspired: false,
        resonated: true,
        uplifted: true
      }
    },
    {
      id: 4,
      author: {
        name: 'Chef Gabriel',
        username: 'chef_gabriel',
        image: null,
        initials: 'CG'
      },
      content: '🥗 Made this rainbow Buddha bowl for lunch and it tasted as beautiful as it looks! Roasted sweet potato, quinoa, fresh greens, and tahini dressing. Nourishing our bodies is an act of self-love. What\'s your favorite healthy meal that makes you feel amazing? Share the love! 🌈',
      media: {
        type: 'image',
        url: 'https://picsum.photos/600/400?random=3'
      },
      timestamp: '8 hours ago',
      interactions: {
        inspires: 29,
        resonates: 33,
        uplifts: 26,
        comments: 9
      },
      userInteractions: {
        inspired: false,
        resonated: false,
        uplifted: false
      }
    },
    {
      id: 5,
      author: {
        name: 'Trainer Alex',
        username: 'alex_trainer',
        image: null,
        initials: 'TA'
      },
      content: '🎯 Reminder: Your worth isn\'t measured by the number on the scale, your speed on the treadmill, or how much you can lift. It\'s measured by your kindness, your effort, your resilience, and the positive energy you bring to the world. You are enough, exactly as you are. 💛',
      media: null,
      timestamp: '1 day ago',
      interactions: {
        inspires: 67,
        resonates: 89,
        uplifts: 102,
        comments: 23
      },
      userInteractions: {
        inspired: true,
        resonated: true,
        uplifted: true
      }
    }
  ]);
  
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Handle post creation
  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() || isPosting) return;
    
    setIsPosting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPost = {
        id: Date.now(),
        author: {
          name: getDisplayName(),
          username: getUsernameForDisplay(),
          image: profile?.photo,
          initials: getUserInitials()
        },
        content: newPostContent,
        media: null,
        timestamp: 'Just now',
        interactions: {
          inspires: 0,
          resonates: 0,
          uplifts: 0,
          comments: 0
        },
        userInteractions: {
          inspired: false,
          resonated: false,
          uplifted: false
        }
      };
      
      setFeedPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  }, [newPostContent, isPosting, getDisplayName, getUsernameForDisplay, getUserInitials, profile?.photo]);
  
  // Handle post interactions
  const handlePostInteraction = useCallback((postId: number, type: 'inspires' | 'resonates' | 'uplifts') => {
    setFeedPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const wasActive = post.userInteractions[type === 'inspires' ? 'inspired' : type === 'resonates' ? 'resonated' : 'uplifted'];
        return {
          ...post,
          interactions: {
            ...post.interactions,
            [type]: wasActive ? post.interactions[type] - 1 : post.interactions[type] + 1
          },
          userInteractions: {
            ...post.userInteractions,
            [type === 'inspires' ? 'inspired' : type === 'resonates' ? 'resonated' : 'uplifted']: !wasActive
          }
        };
      }
      return post;
    }));
  }, []);
  
  // Handle Journey Weave feature
  const handleJourneyWeave = useCallback(() => {
    console.log('🌟 Opening Journey Weave visualization...');
    // TODO: Implement Journey Weave modal/page
  }, []);
  
  // ===================== SWAN GALAXY RADIANCE LIVE FEED COMPONENT =====================
  
  const SwanGalaxyRadianceFeed = () => (
    <LiveFeedContainer
      $enableAnimations={enableLuxuryAnimations}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <FeedContent>
        <FeedHeader>
          <FeedTitle $performanceLevel={devicePerformance}>
            <Sparkles size={32} />
            Swan Galaxy Community
          </FeedTitle>
          <JourneyWeaveButton
            onClick={handleJourneyWeave}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Telescope size={20} />
            Journey Weave
          </JourneyWeaveButton>
        </FeedHeader>
        
        {/* Create New Post */}
        <CreatePostContainer
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PostComposer>
            <PostInput
              placeholder="Share your positive energy with the SwanStudios community... ✨"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              maxLength={500}
            />
            <PostActions>
              <PostOptions>
                <PostOptionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ImageIcon size={18} />
                  Photo
                </PostOptionButton>
                <PostOptionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <VideoCamera size={18} />
                  Video
                </PostOptionButton>
                <PostOptionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Smile size={18} />
                  Feeling
                </PostOptionButton>
              </PostOptions>
              <PostButton
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || isPosting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPosting ? (
                  <LoadingSpinner style={{ width: '20px', height: '20px', margin: 0 }} />
                ) : (
                  <>Share Light</>  
                )}
              </PostButton>
            </PostActions>
          </PostComposer>
        </CreatePostContainer>
        
        {/* Posts Stream */}
        <PostsStream>
          {feedPosts.map((post, index) => (
            <PostCard
              key={post.id}
              $enableAnimations={enableLuxuryAnimations}
              $performanceLevel={devicePerformance}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
            >
              <PostHeader>
                <PostAuthorImage
                  $image={post.author.image}
                  $enableAnimations={enableLuxuryAnimations}
                  $performanceLevel={devicePerformance}
                >
                  {!post.author.image && post.author.initials}
                </PostAuthorImage>
                <PostAuthorInfo>
                  <PostAuthorName>{post.author.name}</PostAuthorName>
                  <PostTimestamp>@{post.author.username} • {post.timestamp}</PostTimestamp>
                </PostAuthorInfo>
              </PostHeader>
              
              <PostContent>
                <PostText>{post.content}</PostText>
                {post.media && (
                  <PostMediaContainer>
                    {post.media.type === 'image' ? (
                      <img src={post.media.url} alt="Post content" />
                    ) : (
                      <video 
                        src={post.media.url} 
                        controls 
                        style={{ 
                          background: `url(${post.media.url}) center/cover`,
                          minHeight: '200px'
                        }}
                      />
                    )}
                  </PostMediaContainer>
                )}
              </PostContent>
              
              <PostFooter>
                <PostInteractions>
                  <InteractionButton
                    $active={post.userInteractions.inspired}
                    onClick={() => handlePostInteraction(post.id, 'inspires')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Star size={18} />
                    {post.interactions.inspires} Inspires
                  </InteractionButton>
                  <InteractionButton
                    $active={post.userInteractions.resonated}
                    onClick={() => handlePostInteraction(post.id, 'resonates')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Heart size={18} />
                    {post.interactions.resonates} Resonates
                  </InteractionButton>
                  <InteractionButton
                    $active={post.userInteractions.uplifted}
                    onClick={() => handlePostInteraction(post.id, 'uplifts')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Sun size={18} />
                    {post.interactions.uplifts} Uplifts
                  </InteractionButton>
                  <InteractionButton
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <MessageCircle size={18} />
                    {post.interactions.comments} Comments
                  </InteractionButton>
                </PostInteractions>
                <InteractionButton
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Share2 size={18} />
                </InteractionButton>
              </PostFooter>
            </PostCard>
          ))}
        </PostsStream>
      </FeedContent>
    </LiveFeedContainer>
  );
  
  // ===================== TAB CONTENT COMPONENTS =====================
  
  const CommunityContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Local Events Section */}
      <ContentCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: theme.text.primary, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users2 size={24} />
            Local Community Events
          </h3>
          <PrimaryButton onClick={handleCreateEvent} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
            <Plus size={16} />
            Create Event
          </PrimaryButton>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {localEvents.map((event, index) => (
            <FilteredMotionDiv
              key={event.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              style={{
                padding: '1.5rem',
                background: theme.background.elevated,
                borderRadius: '12px',
                border: `1px solid ${theme.borders.subtle}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                if (enableLuxuryAnimations) {
                  e.currentTarget.style.boxShadow = theme.shadows.primary;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  padding: '0.5rem',
                  background: theme.colors.primary + '20',
                  borderRadius: '8px',
                  color: theme.colors.primary
                }}>
                  {event.type === 'yoga' && <Mountain size={20} />}
                  {event.type === 'dancing' && <Music size={20} />}
                  {event.type === 'strength' && <Zap size={20} />}
                </div>
                <div>
                  <h4 style={{ color: theme.text.primary, margin: 0, fontSize: '1.1rem' }}>
                    {event.title}
                  </h4>
                  <p style={{ color: theme.text.secondary, margin: 0, fontSize: '0.9rem' }}>
                    by {event.host}
                  </p>
                </div>
              </div>
              
              <p style={{ color: theme.text.secondary, marginBottom: '1rem', fontSize: '0.9rem' }}>
                {event.description}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.text.secondary, fontSize: '0.8rem' }}>
                  <Calendar size={16} />
                  {event.date} at {event.time}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.text.secondary, fontSize: '0.8rem' }}>
                  <LocationIcon size={16} />
                  {event.location}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: theme.text.secondary, fontSize: '0.9rem' }}>
                  {event.attendees}/{event.maxAttendees} attending
                </span>
                <PrimaryButton 
                  onClick={() => handleJoinEvent(event.id)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  <Heart size={14} />
                  Join Event
                </PrimaryButton>
              </div>
            </FilteredMotionDiv>
          ))}
        </div>
      </ContentCard>
      
      {/* Cosmic Goals Section */}
      <ContentCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 style={{ color: theme.text.primary, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Telescope size={24} />
          Cosmic Fitness Missions
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {workoutGoals.map((goal, index) => {
            const progressPercent = (goal.progress / goal.target) * 100;
            return (
              <FilteredMotionDiv
                key={goal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                style={{
                  padding: '1.5rem',
                  background: theme.background.elevated,
                  borderRadius: '12px',
                  border: `1px solid ${theme.borders.subtle}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ color: theme.text.primary, margin: 0, fontSize: '1.1rem' }}>
                      {goal.title}
                    </h4>
                    <p style={{ color: theme.text.secondary, margin: 0, fontSize: '0.9rem' }}>
                      {goal.description}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: theme.colors.primary, fontWeight: '600', fontSize: '1.1rem' }}>
                      {goal.progress}/{goal.target}
                    </span>
                    <p style={{ color: theme.text.secondary, margin: 0, fontSize: '0.8rem' }}>
                      {Math.round(progressPercent)}% complete
                    </p>
                  </div>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: theme.background.primary,
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '1rem'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                    style={{
                      height: '100%',
                      background: theme.gradients.primary,
                      borderRadius: '4px'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme.colors.accent, fontSize: '0.9rem', fontWeight: '500' }}>
                    🏆 Reward: {goal.cosmicReward}
                  </span>
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    background: theme.colors.primary + '20',
                    borderRadius: '12px',
                    color: theme.colors.primary,
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    {goal.type}
                  </div>
                </div>
              </FilteredMotionDiv>
            );
          })}
        </div>
      </ContentCard>
      
      {/* Trainer Interest Section */}
      <ContentCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div 
            className={enableLuxuryAnimations ? 'cosmic-glow-animation' : ''}
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              background: theme.gradients.primary,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <GraduationCap size={40} color="white" />
          </div>
          
          <h3 style={{ color: theme.text.primary, marginBottom: '1rem' }}>
            ✨ Become a SwanStudios Cosmic Trainer!
          </h3>
          
          <p style={{ color: theme.text.secondary, marginBottom: '2rem', lineHeight: 1.6 }}>
            Share your passion for fitness, dance, wellness & positive energy! 
            Join our family of certified trainers and help others reach for the stars.
            🌟 Work for SwanStudios and spread cosmic wellness across the galaxy!
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {trainerStatus === null && (
              <PrimaryButton
                onClick={() => setTrainerStatus('interested')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Star size={20} />
                I'm Interested!
              </PrimaryButton>
            )}
            
            {trainerStatus === 'interested' && (
              <PrimaryButton
                onClick={() => setTrainerStatus('applied')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Rocket size={20} />
                Apply Now
              </PrimaryButton>
            )}
            
            {trainerStatus === 'applied' && (
              <div style={{
                padding: '1rem',
                background: theme.colors.accent + '20',
                borderRadius: '12px',
                color: theme.colors.accent
              }}>
                <Crown size={24} style={{ marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontWeight: '500' }}>Application Submitted! 🎉</p>
                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>We'll be in touch soon!</p>
              </div>
            )}
            
            <SecondaryButton>
              <MessageSquare size={20} />
            </SecondaryButton>
          </div>
        </div>
      </ContentCard>
    </div>
  );

  const CreativeExpressionContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Creative Videos Gallery */}
      <ContentCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ color: theme.text.primary, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Music2 size={24} />
            Creative Expression Gallery
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <SecondaryButton style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
              <VideoCamera size={16} />
            </SecondaryButton>
            <PrimaryButton onClick={handleShareVideo} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <Upload size={16} />
              Share Video
            </PrimaryButton>
          </div>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: theme.text.secondary, marginBottom: '1rem' }}>
            ✨ Share your dance moves, singing, workout creativity & positive energy with the SwanStudios community!
          </p>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['Dancing', 'Singing', 'Workouts', 'Yoga Flow', 'Motivation', 'Transformation'].map((tag, index) => (
              <div
                key={tag}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: theme.colors.primary + '20',
                  borderRadius: '12px',
                  color: theme.colors.primary,
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                #{tag}
              </div>
            ))}
          </div>
        </div>
        
        <PhotoGrid>
          <UploadPlaceholder onClick={handleShareVideo}>
            <VideoCamera size={32} />
            <span style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Share Creative Video</span>
          </UploadPlaceholder>
          
          {/* Mock creative videos */}
          {Array.from({ length: 6 }, (_, index) => (
            <PhotoItem
              key={`creative-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              style={{ position: 'relative' }}
            >
              <img 
                src={`https://picsum.photos/300/300?random=${index + 20}`} 
                alt={`Creative video ${index + 1}`}
              />
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '4px',
                padding: '0.25rem',
                color: 'white',
                fontSize: '0.7rem'
              }}>
                {['Dancing', 'Singing', 'Workout', 'Yoga', 'Motivation', 'Transform'][index]}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '0.5rem',
                left: '0.5rem',
                background: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '50%',
                padding: '0.25rem',
                color: 'white'
              }}>
                <Video size={16} />
              </div>
            </PhotoItem>
          ))}
        </PhotoGrid>
      </ContentCard>
      
      {/* Inspiration & Motivation Board */}
      <ContentCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 style={{ color: theme.text.primary, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={24} />
          Daily Inspiration & Positive Energy
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {[
            {
              icon: Sun,
              title: 'Morning Motivation',
              content: 'Today is a new day to shine your light and inspire others! ☀️',
              author: 'SwanStudios Team',
              time: '8:00 AM',
              likes: 127,
              color: theme.colors.accent
            },
            {
              icon: Rainbow,
              title: 'Transformation Tuesday',
              content: 'Every small step forward is progress. Celebrate your cosmic journey! 🌈',
              author: 'Luna Starlight',
              time: '2 hours ago',
              likes: 89,
              color: theme.colors.secondary
            },
            {
              icon: Heart,
              title: 'Positive Vibes',
              content: 'You are capable of amazing things. Keep spreading love and light! 💕',
              author: 'Cosmic Community',
              time: '5 hours ago',
              likes: 156,
              color: theme.colors.primary
            }
          ].map((post, index) => {
            const Icon = post.icon;
            return (
              <div
                key={index}
                style={{
                  padding: '1.5rem',
                  background: theme.background.elevated,
                  borderRadius: '12px',
                  border: `1px solid ${theme.borders.subtle}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    background: post.color + '20',
                    borderRadius: '50%',
                    color: post.color
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 style={{ color: theme.text.primary, margin: 0, fontSize: '1rem' }}>
                      {post.title}
                    </h4>
                    <p style={{ color: theme.text.secondary, margin: 0, fontSize: '0.8rem' }}>
                      by {post.author} • {post.time}
                    </p>
                  </div>
                </div>
                
                <p style={{ color: theme.text.primary, marginBottom: '1rem', lineHeight: 1.5 }}>
                  {post.content}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.primary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.9rem'
                  }}
                  >
                  <Heart size={16} />
                  {post.likes}
                  </motion.button>
                  
                  <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                  background: 'none',
                  border: 'none',
                  color: theme.text.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.9rem'
                  }}
                  >
                  <MessageCircle size={16} />
                  Share
                  </motion.button>
                  
                  <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                  background: 'none',
                  border: 'none',
                  color: theme.text.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.9rem'
                  }}
                  >
                  <Sparkles size={16} />
                  Inspire
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </ContentCard>
    </div>
  );

  const PhotosContent = () => (
    <ContentCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: theme.text.primary, margin: 0 }}>Photo Gallery</h3>
        <PrimaryButton onClick={handlePhotoUploadClick} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <Upload size={16} />
          Upload Photo
        </PrimaryButton>
      </div>
      
      <PhotoGrid>
        <UploadPlaceholder onClick={handlePhotoUploadClick}>
          <Plus size={32} />
          <span style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Add Photo</span>
        </UploadPlaceholder>
        
        {photos.map((photo, index) => (
          <PhotoItem
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <img src={photo} alt={`Gallery photo ${index + 1}`} />
          </PhotoItem>
        ))}
        
        {/* Mock photos for demonstration */}
        {Array.from({ length: 8 }, (_, index) => (
          <PhotoItem
            key={`mock-${index}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: (photos.length + index) * 0.1 }}
          >
            <img 
              src={`https://picsum.photos/300/300?random=${index + 1}`} 
              alt={`Fitness photo ${index + 1}`}
            />
          </PhotoItem>
        ))}
      </PhotoGrid>
      
      <HiddenInput
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'photo')}
      />
    </ContentCard>
  );

  const AboutContent = () => (
    <ContentCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 style={{ color: theme.text.primary, marginBottom: '1.5rem' }}>About Me</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ 
          padding: '1.5rem', 
          background: theme.background.elevated, 
          borderRadius: '12px',
          border: `1px solid ${theme.borders.subtle}`
        }}>
          <h4 style={{ color: theme.text.primary, marginBottom: '1rem' }}>Personal Info</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.text.secondary }}>Joined:</span>
              <span style={{ color: theme.text.primary }}>March 2024</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.text.secondary }}>Location:</span>
              <span style={{ color: theme.text.primary }}>Los Angeles, CA</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.text.secondary }}>Member Type:</span>
              <span style={{ color: theme.text.primary }}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ 
          padding: '1.5rem', 
          background: theme.background.elevated, 
          borderRadius: '12px',
          border: `1px solid ${theme.borders.subtle}`
        }}>
          <h4 style={{ color: theme.text.primary, marginBottom: '1rem' }}>Fitness Goals</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.text.secondary }}>Primary Goal:</span>
              <span style={{ color: theme.text.primary }}>Build Muscle</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.text.secondary }}>Experience:</span>
              <span style={{ color: theme.text.primary }}>Intermediate</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: theme.text.secondary }}>Favorite Activity:</span>
              <span style={{ color: theme.text.primary }}>Weight Training</span>
            </div>
          </div>
        </div>
      </div>
    </ContentCard>
  );

  const ActivityContent = () => (
    <ContentCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 style={{ color: theme.text.primary, marginBottom: '1.5rem' }}>Recent Activity</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          { action: 'Completed a workout', time: '2 hours ago', icon: '💪' },
          { action: 'Shared a post about nutrition', time: '1 day ago', icon: '📝' },
          { action: 'Achieved "Week Warrior" badge', time: '3 days ago', icon: '🏆' },
          { action: 'Joined SwanStudios community', time: '1 week ago', icon: '🎉' }
        ].map((activity, index) => (
          <FilteredMotionDiv
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: theme.background.elevated,
              borderRadius: '12px',
              border: `1px solid ${theme.borders.subtle}`
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{activity.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: theme.text.primary, margin: 0, fontWeight: '500' }}>
                {activity.action}
              </p>
              <p style={{ color: theme.text.secondary, margin: 0, fontSize: '0.9rem' }}>
                {activity.time}
              </p>
            </div>
          </FilteredMotionDiv>
        ))}
      </div>
    </ContentCard>
  );

  // ===================== RENDER =====================
  
  // Show loading state while profile data loads
  if (isLoading && !profile) {
    return (
      <ProfileContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <LoadingOverlay>
          <LoadingSpinner />
          <LoadingText>Loading your cosmic profile...</LoadingText>
        </LoadingOverlay>
      </ProfileContainer>
    );
  }
  
  // Show error state if there's an error
  if (error && !profile) {
    return (
      <ProfileContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <ContentWrapper>
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            color: theme.text.primary 
          }}>
            <h2>⚠️ Error Loading Profile</h2>
            <p style={{ color: theme.text.secondary, marginBottom: '2rem' }}>
              {error}
            </p>
            <PrimaryButton onClick={() => window.location.reload()}>
              <Rocket size={20} />
              Retry
            </PrimaryButton>
          </div>
        </ContentWrapper>
      </ProfileContainer>
    );
  }
  
  return (
    <ProfileContainer
      $performanceLevel={devicePerformance}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: (performanceProfile?.transitionDuration === 'fast' || devicePerformance === 'weak') ? 0.2 : 0.8 }}
    >
      <ContentWrapper>
        {/* Profile Header with Background Image */}
        <ProfileHeader
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <BackgroundImageContainer $backgroundImage={backgroundImage}>
            <BackgroundUploadOverlay
              onClick={handleBackgroundImageClick}
              whileHover={enableLuxuryAnimations ? { opacity: 1 } : undefined}
              whileTap={enableLuxuryAnimations ? { scale: 0.98 } : undefined}
            >
              <Camera size={48} color="white" />
              <p style={{ color: 'white', marginTop: '1rem', fontSize: '1.1rem', fontWeight: '500' }}>
                {backgroundImage ? 'Change Cover Photo' : 'Add Cover Photo'}
              </p>
            </BackgroundUploadOverlay>
          </BackgroundImageContainer>

          <ProfileImageSection>
            <ProfileImageContainer
              whileHover={enableLuxuryAnimations ? { scale: 1.05 } : undefined}
              whileTap={enableLuxuryAnimations ? { scale: 0.95 } : undefined}
              transition={enableLuxuryAnimations ? { duration: 0.3 } : undefined}
            >
              <ProfileImage 
                $image={profile?.photo} 
                $enableLuxury={enableLuxuryAnimations}
                $performanceLevel={devicePerformance}
              >
              {!profile?.photo && getUserInitials()}
            </ProfileImage>
              
              <ImageUploadButton
                onClick={handleProfileImageClick}
                whileHover={enableLuxuryAnimations ? { scale: 1.1 } : undefined}
                whileTap={enableLuxuryAnimations ? { scale: 0.9 } : undefined}
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
            <DisplayName $performanceLevel={devicePerformance}>{getDisplayName()}</DisplayName>
            <Username>@{getUsernameForDisplay()}</Username>
            
            <UserRole
              $performanceLevel={devicePerformance}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: performanceProfile?.transitionDuration === 'fast' ? 0.2 : 0.5, delay: performanceProfile?.transitionDuration === 'fast' ? 0.1 : 0.4 }}
            >
              <Crown size={16} />
              {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || 'User'}
            </UserRole>

            <StatsContainer>
              <StatItem 
                $enableAnimations={enableLuxuryAnimations}
                whileHover={enableLuxuryAnimations ? { scale: 1.1 } : undefined}
              >
                <StatValue $performanceLevel={devicePerformance}>
                  {isLoadingStats ? '...' : displayStats.posts}
                </StatValue>
                <StatLabel>Posts</StatLabel>
              </StatItem>
              <StatItem 
                $enableAnimations={enableLuxuryAnimations}
                whileHover={enableLuxuryAnimations ? { scale: 1.1 } : undefined}
              >
                <StatValue $performanceLevel={devicePerformance}>
                  {isLoadingStats ? '...' : displayStats.followers.toLocaleString()}
                </StatValue>
                <StatLabel>Followers</StatLabel>
              </StatItem>
              <StatItem 
                $enableAnimations={enableLuxuryAnimations}
                whileHover={enableLuxuryAnimations ? { scale: 1.1 } : undefined}
              >
                <StatValue $performanceLevel={devicePerformance}>
                  {isLoadingStats ? '...' : displayStats.following}
                </StatValue>
                <StatLabel>Following</StatLabel>
              </StatItem>
            </StatsContainer>

            <Bio>
              {profile?.bio || (
                `✨ Spreading positive energy through fitness, dance & wellness • 🌟 SwanStudios cosmic community member
                💃 Love dancing, singing & helping others shine • 🚀 Join me on this stellar transformation journey!
                ${trainerStatus === 'interested' ? ' • 🎯 Interested in becoming a SwanStudios trainer!' : ''}
                ${trainerStatus === 'certified' ? ' • 👑 Certified SwanStudios Trainer - Let\'s reach the stars together!' : ''}`
              )}
            </Bio>

            <ActionButtons>
              <PrimaryButton
                onClick={handleEditProfile}
                whileHover={enableLuxuryAnimations ? { scale: 1.05 } : undefined}
                whileTap={enableLuxuryAnimations ? { scale: 0.95 } : undefined}
              >
                <Edit3 size={20} />
                Edit Profile
              </PrimaryButton>
              
              <SecondaryButton
                onClick={handleSettings}
                whileHover={enableLuxuryAnimations ? { scale: 1.05 } : undefined}
                whileTap={enableLuxuryAnimations ? { scale: 0.95 } : undefined}
              >
                <Settings size={20} />
              </SecondaryButton>
              
              <SecondaryButton
                onClick={handleShare}
                whileHover={enableLuxuryAnimations ? { scale: 1.05 } : undefined}
                whileTap={enableLuxuryAnimations ? { scale: 0.95 } : undefined}
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
            {/* Cosmic Progress Tracking */}
            <SidebarCard>
              <SidebarTitle>
                <Orbit size={20} />
                Stellar Transformation Journey
              </SidebarTitle>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fitnessStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <FilteredMotionDiv
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          padding: '0.5rem',
                          background: `${stat.color}20`,
                          borderRadius: '8px',
                          color: stat.color
                        }}>
                          <Icon size={20} />
                        </div>
                        <span style={{ color: theme.text.primary }}>{stat.label}</span>
                      </div>
                      <AnimatedStatValue $performanceLevel={devicePerformance}>
                        {stat.value}
                      </AnimatedStatValue>
                    </FilteredMotionDiv>
                  );
                })}
              </div>
            </SidebarCard>

            {/* Community Achievements */}
            <SidebarCard>
              <SidebarTitle>
                <Crown size={20} />
                Cosmic Community Achievements
              </SidebarTitle>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {displayAchievements.slice(0, 3).map((achievement, index) => {
                  const Icon = achievement.icon;
                  return (
                    <FilteredMotionDiv
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: theme.background.elevated,
                        borderRadius: '8px',
                        border: `1px solid ${theme.borders.subtle}`
                      }}
                    >
                      <AnimatedAchievementIcon $performanceLevel={devicePerformance}>
                        <Icon size={20} />
                      </AnimatedAchievementIcon>
                      <div>
                        <p style={{ 
                          color: theme.text.primary, 
                          margin: 0, 
                          fontWeight: '500',
                          fontSize: '0.9rem'
                        }}>
                          {achievement.title}
                        </p>
                        <p style={{ 
                          color: theme.text.secondary, 
                          margin: 0, 
                          fontSize: '0.8rem'
                        }}>
                          {achievement.description}
                        </p>
                      </div>
                    </FilteredMotionDiv>
                  );
                })}
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
                { id: 'feed', label: 'Live Feed', icon: Sparkles },
                { id: 'community', label: 'Community', icon: Users2 },
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

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'feed' && <SwanGalaxyRadianceFeed key="feed" />}
              {activeTab === 'community' && <CommunityContent key="community" />}
              {activeTab === 'creative' && <CreativeExpressionContent key="creative" />}
              {activeTab === 'photos' && <PhotosContent key="photos" />}
              {activeTab === 'about' && <AboutContent key="about" />}
              {activeTab === 'activity' && <ActivityContent key="activity" />}
            </AnimatePresence>
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
      </ContentWrapper>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isUploading && (
          <LoadingOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSpinner />
            <LoadingText>
              {uploadingType === 'profile' && 'Uploading profile image...'}
              {uploadingType === 'background' && 'Uploading cover photo...'}
              {uploadingType === 'photo' && 'Uploading photo...'}
            </LoadingText>
          </LoadingOverlay>
        )}
      </AnimatePresence>
    </ProfileContainer>
  );
};

// Wrap the component in error boundary
const UserDashboardWithErrorBoundary: React.FC<UserDashboardProps> = () => {
  return (
    <UserDashboardErrorBoundary>
      <UserDashboard />
    </UserDashboardErrorBoundary>
  );
};

export default UserDashboardWithErrorBoundary;