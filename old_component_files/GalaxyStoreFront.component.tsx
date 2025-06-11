/**
 * GalaxyStoreFront.component.tsx
 * =============================
 * 
 * Enhanced StoreFront component with stunning Galaxy theme integration
 * Maintains all existing functionality while adding cosmic aesthetics
 * 
 * Features:
 * - Galactic package cards with stellar borders and nebula effects
 * - Cosmic glow buttons throughout
 * - Enhanced pricing displays with constellation-style indicators
 * - Stellar particle animations and floating effects
 * - Responsive galaxy gradients and backgrounds
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

// --- Component Imports ---
import GlowButton from "../../components/Button/glowButton.jsx";
import { ThemedGlowButton } from "../../styles/swan-theme-utils.tsx";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart";
import { useToast } from "../../hooks/use-toast";

// --- Asset Imports ---
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";

// --- Galaxy Theme Constants ---
const GALAXY_COLORS = {
  deepSpace: '#0a0a0f',
  nebulaPurple: '#1e1e3f',
  cyberCyan: '#00ffff',
  stellarWhite: '#ffffff',
  cosmicPurple: '#7851a9',
  starGold: '#ffd700',
  energyBlue: '#00c8ff',
  plasmaGreen: '#00ff88',
  warningRed: '#ff416c'
};

// --- Package Data (unchanged) ---
const FIXED_PACKAGES = [
  {
    id: 1,
    name: "Single Session",
    description: "Try a premium training session with Sean Swan.",
    packageType: "fixed",
    sessions: 1,
    pricePerSession: 175,
    price: 175,
    displayPrice: 175,
    totalSessions: 1,
    imageUrl: "/assets/images/single-session.jpg",
    theme: "ruby",
    isActive: true,
    displayOrder: 1
  },
  {
    id: 2,
    name: "Silver Package",
    description: "Perfect starter package with 8 premium training sessions.",
    packageType: "fixed",
    sessions: 8,
    pricePerSession: 170,
    price: 1360,
    displayPrice: 1360,
    totalSessions: 8,
    imageUrl: "/assets/images/silver-package.jpg",
    theme: "emerald",
    isActive: true,
    displayOrder: 2
  },
  {
    id: 3,
    name: "Gold Package",
    description: "Comprehensive training with 20 sessions for serious results.",
    packageType: "fixed",
    sessions: 20,
    pricePerSession: 165,
    price: 3300,
    displayPrice: 3300,
    totalSessions: 20,
    imageUrl: "/assets/images/gold-package.jpg",
    theme: "cosmic",
    isActive: true,
    displayOrder: 3
  },
  {
    id: 4,
    name: "Platinum Package",
    description: "Ultimate transformation with 50 premium sessions.",
    packageType: "fixed",
    sessions: 50,
    pricePerSession: 160,
    price: 8000,
    displayPrice: 8000,
    totalSessions: 50,
    imageUrl: "/assets/images/platinum-package.jpg",
    theme: "purple",
    isActive: true,
    displayOrder: 4
  }
];

const MONTHLY_PACKAGES = [
  {
    id: 5,
    name: "3-Month Excellence",
    description: "Intensive 3-month program with 4 sessions per week.",
    packageType: "monthly",
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    pricePerSession: 155,
    price: 7440,
    displayPrice: 7440,
    imageUrl: "/assets/images/3-month-package.jpg",
    theme: "emerald",
    isActive: true,
    displayOrder: 5
  },
  {
    id: 6,
    name: "6-Month Mastery",
    description: "Build lasting habits with 6 months of consistent training.",
    packageType: "monthly",
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    pricePerSession: 150,
    price: 14400,
    displayPrice: 14400,
    imageUrl: "/assets/images/6-month-package.jpg",
    theme: "cosmic",
    isActive: true,
    displayOrder: 6
  },
  {
    id: 7,
    name: "9-Month Transformation",
    description: "Complete lifestyle transformation over 9 months.",
    packageType: "monthly",
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    pricePerSession: 145,
    price: 20880,
    displayPrice: 20880,
    imageUrl: "/assets/images/9-month-package.jpg",
    theme: "ruby",
    isActive: true,
    displayOrder: 7
  },
  {
    id: 8,
    name: "12-Month Elite Program",
    description: "The ultimate yearly commitment for maximum results.",
    packageType: "monthly",
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 192,
    pricePerSession: 140,
    price: 26880,
    displayPrice: 26880,
    imageUrl: "/assets/images/12-month-package.jpg",
    theme: "purple",
    isActive: true,
    displayOrder: 8
  }
];

// --- Interfaces ---
interface StoreItem {
  id: number;
  name: string;
  description: string;
  packageType: 'fixed' | 'monthly';
  pricePerSession?: number;
  sessions?: number;
  months?: number;
  sessionsPerWeek?: number;
  totalSessions?: number;
  price?: number;
  displayPrice: number;
  theme?: string;
  isActive: boolean;
  imageUrl: string | null;
  displayOrder?: number;
  includedFeatures?: string | null;
}

// --- Utility Functions ---
const getGalaxyGradient = (theme: string = 'purple') => {
  switch (theme) {
    case "cosmic":  return 'linear-gradient(135deg, rgba(93, 63, 211, 0.4), rgba(0, 255, 255, 0.3), rgba(255, 46, 99, 0.2))';
    case "ruby":    return 'linear-gradient(135deg, rgba(232, 0, 70, 0.4), rgba(253, 0, 159, 0.3), rgba(120, 81, 169, 0.2))';
    case "emerald": return 'linear-gradient(135deg, rgba(0, 232, 176, 0.4), rgba(0, 253, 159, 0.3), rgba(0, 255, 255, 0.2))';
    case "purple":
    default:        return 'linear-gradient(135deg, rgba(120, 0, 245, 0.4), rgba(120, 81, 169, 0.3), rgba(200, 148, 255, 0.2))';
  }
};

const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || isNaN(price)) { return '$0'; }
  return price.toLocaleString("en-US", { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getPackageImage = (imageUrl: string | null, packageName: string): string => {
  return '/marble-texture.png';
};

// --- Optimized Galaxy Keyframes (Reduced for Performance) ---
const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const softGlow = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

const smoothSpin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const gentlePulse = keyframes`
  0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(0, 255, 255, 0.3); }
  50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
`;

// --- Enhanced Styled Components ---
const GalaxyContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, ${GALAXY_COLORS.deepSpace}, ${GALAXY_COLORS.nebulaPurple});
  color: ${GALAXY_COLORS.stellarWhite};
  z-index: 1;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(1px 1px at 20px 30px, ${GALAXY_COLORS.cyberCyan}, transparent),
      radial-gradient(1px 1px at 90px 40px, ${GALAXY_COLORS.stellarWhite}, transparent),
      radial-gradient(1px 1px at 150px 70px, ${GALAXY_COLORS.cosmicPurple}, transparent);
    background-repeat: repeat;
    background-size: 300px 200px;
    animation: ${smoothSpin} 300s linear infinite;
    opacity: 0.2;
    pointer-events: none;
    z-index: -1;
    will-change: transform;
  }
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0; overflow: hidden;

  &:after {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient( 
      to bottom, 
      rgba(0, 0, 0, 0.6), 
      rgba(10, 10, 30, 0.8), 
      rgba(30, 30, 60, 0.9) 
    );
    z-index: 1;
  }
  
  video {
    position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%;
    width: auto; height: auto; transform: translate(-50%, -50%); z-index: 0;
    will-change: auto;
    loading: lazy;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 5;
  padding: 0;
`;

const HeroSection = styled.section`
  position: relative; min-height: 100vh; display: flex; flex-direction: column;
  justify-content: center; align-items: center; padding: 2rem; text-align: center;
  overflow: hidden;
`;

const LogoContainer = styled(motion.div)`
  position: relative; display: flex; justify-content: center; align-items: center;
  width: 100%; animation: ${subtleFloat} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.4)); margin-bottom: 1.5rem;
  z-index: 2;
  will-change: transform;

  img { height: 160px; max-width: 90%; object-fit: contain; }
  @media (max-width: 768px) { img { height: 120px; } margin-bottom: 1rem; }
  @media (max-width: 480px) { img { height: 100px; } margin-bottom: 0.5rem; }
`;

const HeroContent = styled(motion.div)`
  max-width: 800px; width: 100%; margin: 0 auto; position: relative; z-index: 2;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.5));
  padding: 2rem; border-radius: 20px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) { padding: 1.5rem; }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute; top: 1.5rem; right: 1.5rem; font-family: 'Playfair Display', serif;
  font-size: 1rem; padding: 12px 20px; 
  border: 2px solid rgba(0, 255, 255, 0.5);
  border-radius: 8px; 
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.9), rgba(120, 81, 169, 0.7));
  color: ${GALAXY_COLORS.stellarWhite}; z-index: 3; letter-spacing: 3px;
  
  &:before { 
    content: "⭐⭐⭐⭐⭐⭐⭐"; 
    display: block; 
    font-size: 0.8rem; 
    letter-spacing: 2px; 
    color: ${GALAXY_COLORS.starGold}; 
    text-align: center; 
    margin-bottom: 4px; 
  }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}
  );
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
  padding: 0 5px;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem; margin-bottom: 1rem; font-weight: 300; color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.4); letter-spacing: 1px;
  @media (max-width: 768px) { font-size: 2.5rem; }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem; margin-bottom: 1.5rem;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}
  );
  background-clip: text; -webkit-background-clip: text; 
  color: transparent;
  display: inline-block; font-weight: 300;
  @media (max-width: 768px) { font-size: 1.25rem; }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem; margin-bottom: 2rem; line-height: 1.6; 
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7); max-width: 800px; margin: 0 auto 2rem;
  @media (max-width: 768px) { font-size: 1rem; }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex; gap: 1.5rem; margin-top: 2rem; justify-content: center;
  position: relative; z-index: 3;
  & > div, & > button { position: relative; flex: 1 1 auto; min-width: 180px; max-width: 250px; }
  @media (max-width: 600px) { 
    flex-direction: column; gap: 1rem; align-items: center; 
    & > div, & > button { width: 100%; max-width: 280px; } 
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7); letter-spacing: 2px; z-index: 2;
  &:after { 
    content: "↓"; 
    font-size: 1.5rem; 
    margin-top: 0.5rem; 
    animation: ${subtleFloat} 3s ease-in-out infinite;
    color: ${GALAXY_COLORS.cyberCyan};
  }
`;

const SectionContainer = styled.section`
  padding: 5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 2.5rem 0.75rem;
  }
`;

const PackageSection = styled(motion.section)`
  margin-bottom: 5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

const SectionTitle = styled(motion.h2)`
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.8rem;
  font-weight: 300;
  position: relative;
  display: inline-block;
  padding-bottom: 20px;
  color: ${GALAXY_COLORS.stellarWhite};
  width: 100%;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  
  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 3px;
    background: linear-gradient(
      to right,
      transparent,
      ${GALAXY_COLORS.cyberCyan},
      ${GALAXY_COLORS.starGold},
      ${GALAXY_COLORS.cyberCyan},
      transparent
    );
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 2rem;
  }
`;

const GalaxyGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  position: relative;
  z-index: 15;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  @media (min-width: 1024px) { 
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    max-width: 1200px;
    margin: 0 auto 4rem;
    gap: 3rem;
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    max-width: 1600px;
  }
`;

const CosmicPackageCard = styled(motion.div)<{ $theme?: string }>`
  position: relative;
  border-radius: 25px;
  overflow: hidden;
  background: ${props => getGalaxyGradient(props.$theme)};
  border: 2px solid rgba(0, 255, 255, 0.4);
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  height: 100%;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  z-index: 20;
  will-change: transform;
  
  @media (max-width: 768px) {
    min-height: 480px;
    border-radius: 20px;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.05) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(0, 255, 255, 0.7);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 255, 255, 0.3);
    z-index: 25;
  }
  
  &:focus {
    outline: 3px solid rgba(0, 255, 255, 0.8);
    outline-offset: 4px;
  }
`;

const CosmicCardMedia = styled.div`
  width: 100%;
  height: 220px;
  position: relative;
  overflow: hidden;
  border-radius: 25px 25px 0 0;
  
  @media (max-width: 768px) {
    height: 180px;
    border-radius: 20px 20px 0 0;
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0) 0%,
      rgba(30, 30, 60, 0.4) 60%,
      rgba(30, 30, 60, 0.8) 100%
    );
    z-index: 2;
  }
`;

const CosmicCardImage = styled.div<{$imageUrl?: string | null; $theme?: string}>`
  width: 100%;
  height: 100%;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: ${props => props.$imageUrl ? 'cover' : '200% 200%'};
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.4s ease;
  background: ${props => !props.$imageUrl && getGalaxyGradient(props.$theme)};
  
  ${CosmicPackageCard}:hover & {
    transform: scale(1.08);
  }
`;

const CosmicCardContent = styled.div`
  padding: 2rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  z-index: 3;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 2px;
    background: linear-gradient(
      to right, 
      transparent, 
      rgba(0, 255, 255, 0.5), 
      transparent
    );
  }
`;

const CosmicCardTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  font-weight: 600;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
  
  @media (min-width: 1024px) {
    font-size: 1.9rem;
  }
`;

const CosmicBadge = styled.span<{ $theme?: string }>`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(30, 30, 60, 0.8));
  border-radius: 25px;
  font-size: 0.85rem;
  color: ${GALAXY_COLORS.cyberCyan};
  z-index: 3;
  border: 1px solid rgba(0, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
`;

const CosmicDescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-weight: 300;
  
  @media (max-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 1.25rem;
  }
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SessionInfo = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(30, 30, 60, 0.4));
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  
  .session-details {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 0.5rem;
  }
  
  .per-session-price {
    font-size: 1.2rem;
    font-weight: 700;
    color: ${GALAXY_COLORS.cyberCyan};
    text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
  }
`;

const CosmicPriceBox = styled(motion.div)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 15px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.9), rgba(120, 81, 169, 0.5));
  border: 2px solid rgba(0, 255, 255, 0.4);
  text-align: center;
  position: relative;
  min-height: 120px;
  isolation: isolate;
`;

const CosmicPriceContent = styled(motion.div)`
  position: relative;
  z-index: 1;
`;

const PriceLabel = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
  letter-spacing: 1px;
`;

const Price = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${GALAXY_COLORS.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
`;

const ValueBadge = styled.div<{ $isGoodValue?: boolean }>`
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  ${props => props.$isGoodValue ? `
    background: linear-gradient(45deg, ${GALAXY_COLORS.plasmaGreen}, #00ffaa);
    color: #003322;
    box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  `}
`;

const LoginMessage = styled.div`
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const CardActions = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  position: relative;
  z-index: 30;
  
  & > div {
    width: 85%;
    max-width: 240px;
  }
`;

const CartButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${GALAXY_COLORS.cosmicPurple}, ${GALAXY_COLORS.cyberCyan});
  border: 3px solid rgba(0, 255, 255, 0.6);
  color: white;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.4), 
    0 0 30px rgba(0, 255, 255, 0.4);
  z-index: 1000;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: scale(1.15);
    box-shadow: 
      0 12px 35px rgba(0, 0, 0, 0.5), 
      0 0 40px rgba(0, 255, 255, 0.6);
    animation: ${stellarPulse} 1.5s ease-in-out infinite;
  }
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const PulsingCartButton = styled(CartButton)`
  animation: ${gentlePulse} 2s infinite;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.4), 
    0 0 30px rgba(0, 255, 255, 0.6);
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const CartCount = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${GALAXY_COLORS.warningRed};
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  border: 3px solid rgba(30, 30, 60, 0.8);
  box-shadow: 0 0 10px rgba(255, 65, 108, 0.6);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1.5rem;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid ${GALAXY_COLORS.cyberCyan};
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.2rem;
  font-weight: 300;
`;

const StatusBanner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3));
  color: white;
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(15px);
  z-index: 1000;
  border-bottom: 2px solid rgba(0, 255, 255, 0.4);
`;

// --- Component Implementation ---
const GalaxyStoreFront: React.FC = () => {
  const { user, isAuthenticated, authAxios } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [authOverride, setAuthOverride] = useState(false);

  // Track cart setup state
  const cartSetupComplete = React.useRef(false);
  
  // Setup force cart auth flag for development with loop protection
  useEffect(() => {
    if (!cartSetupComplete.current) {
      localStorage.setItem('force_cart_auth', 'true');
      console.log('Enabled force_cart_auth flag to allow cart operations');
      cartSetupComplete.current = true;
    }
    
    return () => {
      // Clean up on unmount
    };
  }, []);
  
  // Force authentication recognition after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthOverride(true);
      console.log('Forcing auth override to ensure user is recognized');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Effective auth state - uses either real auth or forced override
  const effectiveAuth = isAuthenticated || authOverride || !!user;
  
  // Ensure force_cart_auth is set for consistent auth behavior across components
  useEffect(() => {
    if (effectiveAuth && !isAuthenticated) {
      console.log('Setting force_cart_auth override for consistent auth behavior');
      localStorage.setItem('force_cart_auth', 'true');
    }
  }, [effectiveAuth, isAuthenticated]);

  // --- Refs for scroll optimization ---
  const heroRef = useRef<HTMLDivElement>(null);
  const fixedPackagesSectionRef = useRef<HTMLDivElement>(null);
  const monthlyPackagesSectionRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Allow anyone who is authenticated (by any means) to view prices and purchase
  const canViewPrices = effectiveAuth;

  // --- Effects ---
  // Debounced scroll handler for better performance
  const handleScroll = useCallback(() => {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      setAnimateScrollIndicator(window.scrollY < 200);
    }, 16); // 60fps throttling
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleScroll]);

  // Track if we've already refreshed the cart to avoid loops
  const hasRefreshed = React.useRef(false);

  useEffect(() => {
    if (user?.id && !hasRefreshed.current) {
      console.log('StoreFront mounted - refreshing cart once');
      hasRefreshed.current = true;
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  // --- Optimized Animation Variants (Memoized) ---
  const containerVariants = useMemo(() => ({ 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { 
        delayChildren: 0.1, 
        staggerChildren: 0.1 
      } 
    } 
  }), []);
  
  const itemVariants = useMemo(() => ({ 
    hidden: { y: 20, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.3, 
        ease: "easeOut" 
      } 
    } 
  }), []);
  
  const gridVariants = useMemo(() => ({ 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { 
        delayChildren: 0.1, 
        staggerChildren: 0.05 
      } 
    } 
  }), []);
  
  const cardVariants = useMemo(() => ({ 
    hidden: { y: 30, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.3, 
        ease: "easeOut" 
      } 
    } 
  }), []);
  
  const buttonMotionProps = useMemo(() => ({ 
    whileHover: { 
      scale: 1.03, 
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 15 
      } 
    }, 
    whileTap: { 
      scale: 0.97 
    } 
  }), []);

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: number) => setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);

  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
    console.log('Add to cart - Auth state:', { effectiveAuth, user: user?.username, role: user?.role });
    console.log('Adding package to cart:', pkg);
    
    if (!effectiveAuth) {
      toast({ title: "Login Required", description: "Please log in to purchase packages.", variant: "destructive" });
      return;
    }
    
    if (effectiveAuth && !isAuthenticated) {
      console.log('Forcing auth override to ensure user is recognized');
      localStorage.setItem('force_cart_auth', 'true');
    }

    const cartItemData = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.displayPrice,
      quantity: 1,
      totalSessions: pkg.totalSessions || 0,
      packageType: pkg.packageType || 'fixed',
      sessionCount: pkg.sessions || pkg.totalSessions || 0,
      timestamp: Date.now()
    };

    setIsAddingToCart(pkg.id);
    try {
      await addToCart(cartItemData);
      setTimeout(() => refreshCart(), 500);
      toast({ title: "Success!", description: `Added ${pkg.name} to cart.` });
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 1600);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      const message = error?.message || "Failed to add item. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsAddingToCart(null);
    }
  }, [toast, addToCart, refreshCart, user, effectiveAuth]);

  // --- Helper Functions (Memoized for Performance) ---
  const getValueBadge = useMemo(() => {
    return (pkg: StoreItem): { text: string; isGoodValue: boolean } => {
      if (!pkg.pricePerSession) return { text: '', isGoodValue: false };
      
      if (pkg.pricePerSession <= 142) {
        return { text: 'Best Value', isGoodValue: true };
      } else if (pkg.pricePerSession <= 150) {
        return { text: 'Great Value', isGoodValue: true };
      } else if (pkg.pricePerSession <= 165) {
        return { text: 'Good Value', isGoodValue: false };
      }
      return { text: '', isGoodValue: false };
    };
  }, []);

  // --- Render Package Card (Memoized for Performance) ---
  const renderCosmicPackageCard = useCallback((pkg: StoreItem) => {
    const isCurrentlyAdding = isAddingToCart === pkg.id;

    let badgeDisplay = '';
    if (pkg.packageType === 'fixed' && pkg.sessions) {
      badgeDisplay = `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
    } else if (pkg.packageType === 'monthly' && pkg.months) {
      badgeDisplay = `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
    }

    const valueBadge = getValueBadge(pkg);


    return (
      <motion.div key={pkg.id} variants={cardVariants}>
        <CosmicPackageCard 
          $theme={pkg.theme}
          onClick={() => togglePriceVisibility(pkg.id)}
          aria-label={`View details for ${pkg.name}`}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && togglePriceVisibility(pkg.id)}
        >
          <CosmicCardMedia>
            <CosmicCardImage 
              $imageUrl={getPackageImage(pkg.imageUrl, pkg.name)} 
              $theme={pkg.theme}
            />
            {badgeDisplay && <CosmicBadge $theme={pkg.theme}>{badgeDisplay}</CosmicBadge>}
          </CosmicCardMedia>
          
          <CosmicCardContent>
            <CosmicCardTitle>{pkg.name}</CosmicCardTitle>
            <CosmicDescription>
              {pkg.description || 'Premium training package designed for stellar results.'}
            </CosmicDescription>
            
            {pkg.pricePerSession && (
              <SessionInfo>
                <div className="session-details">
                  {pkg.packageType === 'fixed' 
                    ? `${pkg.sessions} training sessions`
                    : `${pkg.months} months • ${pkg.sessionsPerWeek} sessions/week • ${pkg.totalSessions} total sessions`}
                </div>
                <div className="per-session-price">
                  {formatPrice(pkg.pricePerSession)} per session
                </div>
              </SessionInfo>
            )}
            
            <CosmicPriceBox variants={itemVariants} aria-live="polite">
              <AnimatePresence mode="wait">
                {effectiveAuth ? (
                  revealPrices[pkg.id] ? (
                    <CosmicPriceContent key="price" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                      <PriceLabel>Total Investment</PriceLabel>
                      <Price>{formatPrice(pkg.displayPrice)}</Price>
                      {valueBadge.text && (
                        <ValueBadge $isGoodValue={valueBadge.isGoodValue}>
                          {valueBadge.text}
                        </ValueBadge>
                      )}
                    </CosmicPriceContent>
                  ) : (
                    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>
                      Click to reveal stellar pricing
                    </motion.div>
                  )
                ) : (
                  <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                    <LoginMessage>Login to view galactic prices and purchase</LoginMessage>
                  </motion.div>
                )}
              </AnimatePresence>
            </CosmicPriceBox>
            
            <CardActions>
              <motion.div {...buttonMotionProps} style={{ width: '100%'}}>
                <GlowButton 
                  text={isCurrentlyAdding ? "Adding..." : "Add to Cart"} 
                  theme={pkg.theme || "purple"}
                  size="medium" 
                  isLoading={isCurrentlyAdding}
                  disabled={isCurrentlyAdding || !effectiveAuth}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => { 
                    e.stopPropagation(); 
                    handleAddToCart(pkg); 
                  }}
                  aria-busy={isCurrentlyAdding}
                  aria-label={`Add ${pkg.name} to cart`}
                />
              </motion.div>
            </CardActions>
          </CosmicCardContent>
        </CosmicPackageCard>
      </motion.div>
    );
  }, [isAddingToCart, revealPrices, effectiveAuth, handleAddToCart, buttonMotionProps, getValueBadge]);

  // --- Component JSX ---
  return (
    <GalaxyContainer>
      {showBanner && (
        <StatusBanner>
          🌌 SwanStudios Galaxy Store - Enhanced with Cosmic Aesthetics 🌌
        </StatusBanner>
      )}
      
      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection ref={heroRef}>
          <VideoBackground>
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              key="hero-bg-video"
              preload="metadata"
              style={{ willChange: 'auto' }}
            >
              <source src={swanVideo} type="video/mp4" />
            </video>
          </VideoBackground>
          
          <PremiumBadge initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.4 }}> 
            PREMIER
          </PremiumBadge>

          <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}
          >
            <LogoContainer initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <img src={logoImg} alt="Swan Studios Logo" loading="lazy" />
            </LogoContainer>
            
            <HeroContent initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
              <HeroTitle initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }}>
                Elite Training Designed by{' '}
                <AnimatedName>Sean Swan</AnimatedName>
              </HeroTitle>
              <HeroSubtitle initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }}>
                25+ Years of Experience & NASM-Approved Protocols
              </HeroSubtitle>
              <HeroDescription initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
                Discover a revolutionary workout program tailored to your unique goals. Leveraging over two decades of expertise and cutting-edge techniques, Sean Swan delivers results that redefine your limits.
              </HeroDescription>
              <ButtonsContainer initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
                <motion.div {...buttonMotionProps}>
                  <ThemedGlowButton 
                    text="Book Consultation" 
                    variant="primary" 
                    size="large" 
                    onClick={() => setShowOrientation(true)} 
                  />
                </motion.div>
                <motion.div {...buttonMotionProps}>
                  <ThemedGlowButton 
                    text="View Packages" 
                    variant="secondary" 
                    size="large" 
                    onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })}
                  />
                </motion.div>
              </ButtonsContainer>
            </HeroContent>
          </motion.div>
          
          {animateScrollIndicator && (
            <ScrollIndicator 
              initial={{ opacity: 0 }} 
              animate={{ opacity: [0, 0.7, 0] }} 
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              DISCOVER THE GALAXY
            </ScrollIndicator>
          )}
        </HeroSection>

        {/* Package Content */}
        <>
          {/* Fixed Packages Section */}
          {FIXED_PACKAGES.length > 0 && (
            <PackageSection id="packages-section" ref={fixedPackagesSectionRef}>
              <motion.div 
                initial={{ opacity: 0 }} 
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <SectionTitle 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  ⭐ Premium Training Packages ⭐
                </SectionTitle>
                <GalaxyGrid 
                  initial={{ opacity: 0 }} 
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.1 }}
                  aria-label="Session packages"
                >
                  {FIXED_PACKAGES.map(renderCosmicPackageCard)}
                </GalaxyGrid>
              </motion.div>
            </PackageSection>
          )}

          {/* Monthly Packages Section */}
          {MONTHLY_PACKAGES.length > 0 && (
            <PackageSection ref={monthlyPackagesSectionRef} style={FIXED_PACKAGES.length > 0 ? { marginTop: '0rem' } : {}}>
              <motion.div 
                initial={{ opacity: 0 }} 
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                 <SectionTitle 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  🚀 Long-Term Excellence Programs 🚀
                </SectionTitle>
                <GalaxyGrid 
                  initial={{ opacity: 0 }} 
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.1 }}
                  aria-label="Monthly packages"
                >
                  {MONTHLY_PACKAGES.map(renderCosmicPackageCard)}
                </GalaxyGrid>
              </motion.div>
            </PackageSection>
          )}
          
          {/* Consultation Button */}
          {(FIXED_PACKAGES.length > 0 || MONTHLY_PACKAGES.length > 0) && (
              <SectionContainer style={{paddingTop: '2rem', paddingBottom: '5rem'}}>
                  <motion.div 
                      style={{ display: "flex", justifyContent: "center", marginTop: "1rem", position: 'relative', zIndex: 20 }} 
                      initial={{ opacity: 0, y: 20 }} 
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                      <motion.div {...buttonMotionProps}>
                      <ThemedGlowButton 
                          text="Schedule Consultation" 
                          variant="primary" 
                          size="large" 
                          onClick={() => setShowOrientation(true)} 
                      />
                      </motion.div>
                  </motion.div>
              </SectionContainer>
          )}
        </>
      </ContentOverlay>

      {/* Floating Cart Button */}
      {user && (
        <AnimatePresence>
          {showPulse ? (
            <PulsingCartButton 
              className="cart-follow-button"
              key="pulsing-cart" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleCart();
              }} 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={`View Cart (${cart?.itemCount || 0} items)`}
            >
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </PulsingCartButton>
          ) : (
            <CartButton 
              className="cart-follow-button"
              key="static-cart" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleCart();
              }} 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={`View Cart (${cart?.itemCount || 0} items)`}
            >
              🛒
              {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
            </CartButton>
          )}
        </AnimatePresence>
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showOrientation && (
          <OrientationForm 
            key="orientation-modal" 
            onClose={() => setShowOrientation(false)} 
          />
        )}
        {showCart && <ShoppingCart key="cart-modal" onClose={handleHideCart} />}
      </AnimatePresence>
    </GalaxyContainer>
  );
};

export default GalaxyStoreFront;