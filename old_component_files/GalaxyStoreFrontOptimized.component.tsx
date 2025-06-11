/**
 * GalaxyStoreFrontOptimized.component.tsx
 * ========================================
 * 
 * Performance-optimized version of Galaxy StoreFront
 * Fixes: Slow loading, scroll blocking, animation performance issues
 * 
 * Optimizations:
 * - Reduced animation complexity
 * - Lazy loading for heavy elements
 * - Simplified background effects
 * - Immediate scroll availability
 * - Optimized styled-components
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

// --- Component Imports ---
import { SwanGalaxyLuxuryButton } from "../../components/ui";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart";
import { useToast } from "../../hooks/use-toast";

// --- Asset Imports ---
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";
const swanIcon = "/Logo.png";

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

// --- Package Data ---
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

// --- Optimized Keyframes (Reduced complexity) ---
const gentleFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const subtleGlow = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const lightShimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 100% 0; }
`;

// --- Optimized Styled Components ---
const OptimizedContainer = styled.div`
  position: relative;
  background: linear-gradient(135deg, ${GALAXY_COLORS.deepSpace}, ${GALAXY_COLORS.nebulaPurple});
  color: ${GALAXY_COLORS.stellarWhite};
  min-height: 100vh;
  overflow-x: hidden;
  
  /* Simple star background - no animation to improve performance */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(2px 2px at 20px 30px, ${GALAXY_COLORS.cyberCyan}, transparent),
      radial-gradient(1px 1px at 40px 70px, ${GALAXY_COLORS.starGold}, transparent),
      radial-gradient(1px 1px at 90px 40px, ${GALAXY_COLORS.stellarWhite}, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    opacity: 0.3;
    pointer-events: none;
    z-index: -1;
  }
`;

const VideoBackground = styled.div<{ $isLoaded: boolean }>`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0; overflow: hidden;
  opacity: ${props => props.$isLoaded ? 1 : 0};
  transition: opacity 1s ease-in-out;

  &:after {
    content: "";
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient( 
      to bottom, 
      rgba(0, 0, 0, 0.6), 
      rgba(10, 10, 30, 0.8), 
      rgba(30, 30, 60, 0.9) 
    );
    z-index: 1;
  }
  
  video {
    position: absolute;
    top: 50%; left: 50%;
    min-width: 100%; min-height: 100%;
    width: auto; height: auto;
    transform: translate(-50%, -50%);
    z-index: 0;
  }
`;

const ContentOverlay = styled.div`
  position: relative;
  z-index: 5;
`;

const HeroSection = styled.section`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
`;

const LogoContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 1.5rem;
  z-index: 2;
  animation: ${gentleFloat} 4s ease-in-out infinite;

  img { 
    height: 160px; 
    max-width: 90%; 
    object-fit: contain;
    filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.4));
  }
  
  @media (max-width: 768px) { 
    img { height: 120px; } 
    margin-bottom: 1rem; 
  }
  
  @media (max-width: 480px) { 
    img { height: 100px; } 
    margin-bottom: 0.5rem; 
  }
`;

const HeroContent = styled.div`
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.6), rgba(120, 81, 169, 0.3));
  padding: 2rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 768px) { 
    padding: 1.5rem; 
  }
`;

const PremiumBadge = styled.div`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-size: 1rem;
  padding: 12px 20px;
  border: 2px solid rgba(0, 255, 255, 0.5);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.6));
  backdrop-filter: blur(8px);
  color: ${GALAXY_COLORS.stellarWhite};
  z-index: 3;
  letter-spacing: 3px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:before { 
    content: ""; 
    width: 24px;
    height: 24px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    display: inline-block;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${subtleGlow} 3s ease-in-out infinite;
  }
`;

const AnimatedName = styled.span`
  display: inline-block;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}, 
    ${GALAXY_COLORS.cyberCyan}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${lightShimmer} 4s linear infinite;
  padding: 0 5px;
`;

const HeroTitle = styled.h1`
  font-size: 3.2rem;
  margin-bottom: 1rem;
  font-weight: 300;
  color: ${GALAXY_COLORS.stellarWhite};
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  letter-spacing: 1px;
  
  @media (max-width: 768px) { 
    font-size: 2.5rem; 
  }
`;

const HeroSubtitle = styled.h2`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: ${lightShimmer} 5s linear infinite;
  display: inline-block;
  font-weight: 300;
  
  @media (max-width: 768px) { 
    font-size: 1.25rem; 
  }
`;

const HeroDescription = styled.p`
  font-size: 1.125rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
  max-width: 800px;
  margin: 0 auto 2rem;
  
  @media (max-width: 768px) { 
    font-size: 1rem; 
  }
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  justify-content: center;
  position: relative;
  z-index: 3;
  
  & > div {
    flex: 1 1 auto;
    min-width: 180px;
    max-width: 250px;
  }
  
  @media (max-width: 600px) { 
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    
    & > div {
      width: 100%;
      max-width: 280px;
    }
  }
`;

const ScrollIndicator = styled.div<{ $show: boolean }>`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
  z-index: 2;
  opacity: ${props => props.$show ? 1 : 0};
  transition: opacity 0.5s ease;
  
  &:after { 
    content: "↓"; 
    font-size: 1.5rem; 
    margin-top: 0.5rem; 
    animation: ${gentleFloat} 2s ease-in-out infinite;
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

const PackageSection = styled.section`
  margin-bottom: 5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 3rem;
  }
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.8rem;
  font-weight: 300;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-bottom: 20px;
  color: ${GALAXY_COLORS.stellarWhite};
  width: 100%;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  
  &:before {
    content: "";
    width: 32px;
    height: 32px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${subtleGlow} 3s ease-in-out infinite;
  }
  
  &:after {
    content: "";
    width: 32px;
    height: 32px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${subtleGlow} 3s ease-in-out infinite 1s;
  }
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
    margin-bottom: 2rem;
    
    &:before,
    &:after {
      width: 24px;
      height: 24px;
    }
  }
`;

const OptimizedGrid = styled.div`
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

const OptimizedPackageCard = styled.div<{ $theme?: string }>`
  position: relative;
  border-radius: 25px;
  overflow: hidden;
  background: ${props => getGalaxyGradient(props.$theme)};
  backdrop-filter: blur(15px);
  border: 2px solid rgba(0, 255, 255, 0.4);
  transition: all 0.3s ease;
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(0, 255, 255, 0.2);
  cursor: pointer;
  height: 100%;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    min-height: 480px;
    border-radius: 20px;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(0, 255, 255, 0.8);
    box-shadow: 
      0 25px 50px rgba(0, 0, 0, 0.5),
      0 0 40px rgba(0, 255, 255, 0.4);
  }
  
  &:focus {
    outline: 3px solid rgba(0, 255, 255, 0.8);
    outline-offset: 4px;
  }
`;

const CardMedia = styled.div`
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

const CardImage = styled.div<{$imageUrl?: string | null; $theme?: string}>`
  width: 100%;
  height: 100%;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: ${props => props.$imageUrl ? 'cover' : '200% 200%'};
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.3s ease;
  background: ${props => !props.$imageUrl && getGalaxyGradient(props.$theme)};
  
  ${OptimizedPackageCard}:hover & {
    transform: scale(1.05);
  }
`;

const CardContent = styled.div`
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

const CardTitle = styled.h3`
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

const CardBadge = styled.span<{ $theme?: string }>`
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
  backdrop-filter: blur(8px);
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
`;

const CardDescription = styled.p`
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
  backdrop-filter: blur(8px);
  
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

const PriceBox = styled.div`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 15px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.4));
  border: 2px solid rgba(0, 255, 255, 0.4);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  backdrop-filter: blur(10px);
`;

const PriceContent = styled.div`
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
    width: 90%;
    max-width: 260px;
  }
`;

const FloatingCartButton = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
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

const StatusBanner = styled.div`
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3));
  color: white;
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  z-index: 999;
  border-bottom: 2px solid rgba(0, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  
  &:before {
    content: "";
    width: 24px;
    height: 24px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${subtleGlow} 2s ease-in-out infinite;
  }
  
  &:after {
    content: "";
    width: 24px;
    height: 24px;
    background-image: url(${swanIcon});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
    animation: ${subtleGlow} 2s ease-in-out infinite 1s;
  }
`;

const LoadingSpinner = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 3px solid ${GALAXY_COLORS.cyberCyan};
  animation: spin 1s linear infinite;
  z-index: 2000;
  
  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

// --- Component Implementation ---
const GalaxyStoreFrontOptimized: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State ---
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Effects ---
  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setAnimateScrollIndicator(window.scrollY < 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user?.id) {
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: number) => setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please log in to purchase packages.", variant: "destructive" });
      return;
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
  }, [toast, addToCart, refreshCart, isAuthenticated]);

  // --- Helper Functions ---
  const getValueBadge = (pkg: StoreItem): { text: string; isGoodValue: boolean } => {
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

  // --- Render Package Card ---
  const renderOptimizedPackageCard = (pkg: StoreItem) => {
    const isCurrentlyAdding = isAddingToCart === pkg.id;

    let badgeDisplay = '';
    if (pkg.packageType === 'fixed' && pkg.sessions) {
      badgeDisplay = `${pkg.sessions} Session${pkg.sessions > 1 ? 's' : ''}`;
    } else if (pkg.packageType === 'monthly' && pkg.months) {
      badgeDisplay = `${pkg.months} Month${pkg.months > 1 ? 's' : ''}`;
    }

    const valueBadge = getValueBadge(pkg);

    const glowVariant = pkg.theme === 'cosmic' ? 'info' : 
                      pkg.theme === 'ruby' ? 'warning' : 
                      pkg.theme === 'emerald' ? 'success' : 'primary';

    return (
      <OptimizedPackageCard 
        key={pkg.id}
        $theme={pkg.theme}
        onClick={() => togglePriceVisibility(pkg.id)}
        aria-label={`View details for ${pkg.name}`}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && togglePriceVisibility(pkg.id)}
      >
        <CardMedia>
          <CardImage 
            $imageUrl={getPackageImage(pkg.imageUrl, pkg.name)} 
            $theme={pkg.theme}
          />
          {badgeDisplay && <CardBadge $theme={pkg.theme}>{badgeDisplay}</CardBadge>}
        </CardMedia>
        
        <CardContent>
          <CardTitle>{pkg.name}</CardTitle>
          <CardDescription>
            {pkg.description || 'Premium training package designed for stellar results.'}
          </CardDescription>
          
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
          
          <PriceBox aria-live="polite">
            <AnimatePresence mode="wait">
              {isAuthenticated ? (
                revealPrices[pkg.id] ? (
                  <PriceContent key="price">
                    <PriceLabel>Total Investment</PriceLabel>
                    <Price>{formatPrice(pkg.displayPrice)}</Price>
                    {valueBadge.text && (
                      <ValueBadge $isGoodValue={valueBadge.isGoodValue}>
                        {valueBadge.text}
                      </ValueBadge>
                    )}
                  </PriceContent>
                ) : (
                  <motion.div key="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>
                    Click to reveal stellar pricing
                  </motion.div>
                )
              ) : (
                <motion.div key="login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                  <LoginMessage>Login to view galactic prices and purchase</LoginMessage>
                </motion.div>
              )}
            </AnimatePresence>
          </PriceBox>
          
          <CardActions>
            <div style={{ width: '100%'}}>
              <SwanGalaxyLuxuryButton 
                variant={glowVariant}
                size="medium"
                glowIntensity="high"
                disabled={isCurrentlyAdding || !isAuthenticated}
                loading={isCurrentlyAdding}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { 
                  e.stopPropagation(); 
                  handleAddToCart(pkg); 
                }}
                aria-busy={isCurrentlyAdding}
                aria-label={`Add ${pkg.name} to cart`}
                style={{
                  width: '100%',
                  borderRadius: '25px'
                }}
              >
                {isCurrentlyAdding ? "Adding..." : "Add to Cart"}
              </SwanGalaxyLuxuryButton>
            </div>
          </CardActions>
        </CardContent>
      </OptimizedPackageCard>
    );
  };

  // --- Component JSX ---
  return (
    <OptimizedContainer>
      {isLoading && <LoadingSpinner />}
      
      {showBanner && (
        <StatusBanner>
          SwanStudios Galaxy Store - Optimized Performance
        </StatusBanner>
      )}
      
      <ContentOverlay>
        {/* Hero Section */}
        <HeroSection>
          <VideoBackground $isLoaded={videoLoaded}>
            <video 
              ref={videoRef}
              autoPlay 
              loop 
              muted 
              playsInline 
              onLoadedData={handleVideoLoad}
              key="hero-bg-video"
            >
              <source src={swanVideo} type="video/mp4" />
            </video>
          </VideoBackground>
          
          <PremiumBadge> 
            PREMIER
          </PremiumBadge>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
            <LogoContainer>
              <img src={logoImg} alt="Swan Studios Logo" loading="lazy" />
            </LogoContainer>
            
            <HeroContent>
              <HeroTitle>
                Elite Training Designed by{' '}
                <AnimatedName>Sean Swan</AnimatedName>
              </HeroTitle>
              <HeroSubtitle>
                25+ Years of Experience & NASM-Approved Protocols
              </HeroSubtitle>
              <HeroDescription>
                Discover a revolutionary workout program tailored to your unique goals. Leveraging over two decades of expertise and cutting-edge techniques, Sean Swan delivers results that redefine your limits.
              </HeroDescription>
              <ButtonsContainer>
                <div>
                  <SwanGalaxyLuxuryButton 
                    variant="info"
                    size="large"
                    glowIntensity="ultra"
                    onClick={() => setShowOrientation(true)}
                    style={{
                      width: '100%',
                      borderRadius: '25px'
                    }}
                  >
                    Book Consultation
                  </SwanGalaxyLuxuryButton>
                </div>
                <div>
                  <SwanGalaxyLuxuryButton 
                    variant="secondary"
                    size="large"
                    glowIntensity="high"
                    onClick={() => document.getElementById("packages-section")?.scrollIntoView({ behavior: "smooth" })}
                    style={{
                      width: '100%',
                      borderRadius: '25px'
                    }}
                  >
                    View Packages
                  </SwanGalaxyLuxuryButton>
                </div>
              </ButtonsContainer>
            </HeroContent>
          </div>
          
          <ScrollIndicator $show={animateScrollIndicator}>
            DISCOVER THE GALAXY
          </ScrollIndicator>
        </HeroSection>

        {/* Package Content */}
        <>
          {/* Fixed Packages Section */}
          {FIXED_PACKAGES.length > 0 && (
            <PackageSection id="packages-section">
              <SectionContainer>
                <SectionTitle>
                  Premium Training Packages
                </SectionTitle>
                <OptimizedGrid aria-label="Session packages">
                  {FIXED_PACKAGES.map(renderOptimizedPackageCard)}
                </OptimizedGrid>
              </SectionContainer>
            </PackageSection>
          )}

          {/* Monthly Packages Section */}
          {MONTHLY_PACKAGES.length > 0 && (
            <PackageSection>
              <SectionContainer>
                <SectionTitle>
                  Long-Term Excellence Programs
                </SectionTitle>
                <OptimizedGrid aria-label="Monthly packages">
                  {MONTHLY_PACKAGES.map(renderOptimizedPackageCard)}
                </OptimizedGrid>
              </SectionContainer>
            </PackageSection>
          )}
          
          {/* Consultation Button */}
          {(FIXED_PACKAGES.length > 0 || MONTHLY_PACKAGES.length > 0) && (
            <SectionContainer style={{paddingTop: '2rem', paddingBottom: '5rem'}}>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem", position: 'relative', zIndex: 20 }}>
                <div>
                  <SwanGalaxyLuxuryButton 
                    variant="warning"
                    size="xlarge"
                    glowIntensity="ultra"
                    onClick={() => setShowOrientation(true)}
                    style={{
                      borderRadius: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    Schedule Consultation
                  </SwanGalaxyLuxuryButton>
                </div>
              </div>
            </SectionContainer>
          )}
        </>
      </ContentOverlay>

      {/* Floating Cart Button */}
      {user && (
        <FloatingCartButton>
          <SwanGalaxyLuxuryButton
            variant={showPulse ? "warning" : "info"}
            size="medium"
            glowIntensity={showPulse ? "ultra" : "high"}
            onClick={handleToggleCart}
            aria-label={`View Cart (${cart?.itemCount || 0} items)`}
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              fontSize: '1.8rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0'
            }}
          >
            🛒
            {cart && cart.itemCount > 0 && <CartCount>{cart.itemCount}</CartCount>}
          </SwanGalaxyLuxuryButton>
        </FloatingCartButton>
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
    </OptimizedContainer>
  );
};

export default GalaxyStoreFrontOptimized;