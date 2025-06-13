// SwanStudios StoreFront with Galaxy Theme + API Integration
// Fixed: Now fetches packages from backend API instead of hardcoded data

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { api } from "../../services/api.service";

// --- Component Imports ---
import GlowButton from "../../components/ui/GlowButton";
import { ThemedGlowButton } from '../../styles/swan-theme-utils.tsx';
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

// --- Type Definition for Package ---
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
  totalCost?: number;
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

const getThemeFromName = (name: string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('silver') || nameLower.includes('wing')) return 'emerald';
  if (nameLower.includes('golden') || nameLower.includes('flight')) return 'ruby';
  if (nameLower.includes('sapphire') || nameLower.includes('soar')) return 'cosmic';
  if (nameLower.includes('platinum') || nameLower.includes('grace')) return 'purple';
  if (nameLower.includes('emerald') || nameLower.includes('evolution')) return 'emerald';
  if (nameLower.includes('diamond') || nameLower.includes('dynasty')) return 'cosmic';
  if (nameLower.includes('ruby') || nameLower.includes('reign')) return 'ruby';
  if (nameLower.includes('rhodium') || nameLower.includes('royalty')) return 'purple';
  return 'purple';
};

// --- Galaxy Theme Keyframes ---
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const starSparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const galacticShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const stellarPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(120, 81, 169, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(120, 81, 169, 0.4);
    transform: scale(1.02);
  }
`;

const spinnerAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const diagonalShimmer = keyframes`
  0%, 20%, 100% {
    background-position: -200% -200%;
    opacity: 0;
  }
  45%, 55% {
    background-position: 0% 0%;
    opacity: 0.5;
  }
  80% {
    background-position: 200% 200%;
    opacity: 0;
  }
`;

// --- Galaxy Styled Components ---
const GalaxyContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: linear-gradient(135deg, ${GALAXY_COLORS.deepSpace}, ${GALAXY_COLORS.nebulaPurple});
  color: ${GALAXY_COLORS.stellarWhite};
  z-index: 1;
  min-height: 100vh;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20px 30px, ${GALAXY_COLORS.cyberCyan}, transparent),
      radial-gradient(1px 1px at 90px 40px, ${GALAXY_COLORS.stellarWhite}, transparent),
      radial-gradient(1px 1px at 130px 80px, ${GALAXY_COLORS.cyberCyan}, transparent);
    background-repeat: repeat;
    background-size: 200px 100px;
    opacity: 0.2;
    pointer-events: none;
    z-index: -1;
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
  width: 100%; animation: ${float} 6s ease-in-out infinite;
  filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.6)); margin-bottom: 1.5rem;
  z-index: 2;
  will-change: transform;

  img { height: 160px; max-width: 90%; object-fit: contain; }
  @media (max-width: 768px) { img { height: 120px; } margin-bottom: 1rem; }
  @media (max-width: 480px) { img { height: 100px; } margin-bottom: 0.5rem; }
`;

const HeroContent = styled(motion.div)`
  max-width: 800px; width: 100%; margin: 0 auto; position: relative; z-index: 2;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.6), rgba(120, 81, 169, 0.3));
  padding: 2rem; border-radius: 20px;
  backdrop-filter: blur(15px); 
  border: 2px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  
  @media (max-width: 768px) { padding: 1.5rem; }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute; top: 1.5rem; right: 1.5rem; font-family: 'Playfair Display', serif;
  font-size: 1rem; padding: 12px 20px; 
  border: 2px solid rgba(0, 255, 255, 0.5);
  border-radius: 8px; 
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.6));
  backdrop-filter: blur(10px);
  color: ${GALAXY_COLORS.stellarWhite}; z-index: 3; letter-spacing: 3px;
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
    filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg);
  }
  
  &:after { 
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
    background: linear-gradient( 45deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100% ); 
    background-size: 200% auto; animation: ${galacticShimmer} 3s linear infinite; 
    border-radius: 8px;
  }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient( 
    to right, 
    ${GALAXY_COLORS.cyberCyan}, 
    ${GALAXY_COLORS.starGold}, 
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}, 
    ${GALAXY_COLORS.cyberCyan}
  );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text;
  color: transparent; animation: ${galacticShimmer} 3s linear infinite;
  padding: 0 5px;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
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
    ${GALAXY_COLORS.cosmicPurple}, 
    ${GALAXY_COLORS.energyBlue}
  );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text; 
  color: transparent; animation: ${galacticShimmer} 4s linear infinite; 
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
    animation: ${float} 3s ease-in-out infinite;
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
    animation: ${starSparkle} 2s ease-in-out infinite;
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
    animation: ${starSparkle} 2s ease-in-out infinite 0.5s;
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.8), rgba(120, 81, 169, 0.4));
  border: 2px solid rgba(0, 255, 255, 0.4);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 120px;
  isolation: isolate;
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
    background-size: 200% 200%;
    animation: ${galacticShimmer} 8s ease-in-out infinite;
    pointer-events: none;
  }
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
    width: 90%;
    max-width: 260px;
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
  animation: ${stellarPulse} 2s infinite;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.4), 
    0 0 30px rgba(0, 255, 255, 0.6);
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

const AuthBanner = styled.div`
  position: fixed;
  top: 56px;
  left: 0;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3));
  color: white;
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(15px);
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
    animation: ${starSparkle} 2s ease-in-out infinite;
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
    animation: ${starSparkle} 2s ease-in-out infinite 0.5s;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(0, 255, 255, 0.1);
    border-left: 4px solid rgba(0, 255, 255, 0.8);
    border-radius: 50%;
    animation: ${spinnerAnimation} 1s linear infinite;
  }
  
  .loading-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  
  .error-title {
    font-size: 1.5rem;
    color: ${GALAXY_COLORS.warningRed};
    margin-bottom: 0.5rem;
  }
  
  .error-message {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    max-width: 600px;
  }
  
  .retry-button {
    margin-top: 1rem;
  }
`;

// --- StoreFront Component with Galaxy Theme and API Integration ---
const GalaxyThemedStoreFront: React.FC = () => {
  const { user, isAuthenticated, authAxios } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const { toast } = useToast();

  // --- State ---
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [animateScrollIndicator, setAnimateScrollIndicator] = useState(true);
  const [revealPrices, setRevealPrices] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  
  // NEW: API-based package state
  const [packages, setPackages] = useState<StoreItem[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);

  // PRODUCTION: Only authenticated users can purchase
  const canViewPrices = isAuthenticated && !!user;
  const canPurchase = canViewPrices;

  // --- Refs and Animation Controls ---
  const heroRef = useRef<HTMLDivElement>(null);
  const fixedPackagesSectionRef = useRef<HTMLDivElement>(null);
  const monthlyPackagesSectionRef = useRef<HTMLDivElement>(null);

  const heroControls = useAnimation();
  const fixedPackagesControls = useAnimation();
  const monthlyPackagesControls = useAnimation();

  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const isFixedPackagesInView = useInView(fixedPackagesSectionRef, { once: true, amount: 0.1 });
  const isMonthlyPackagesInView = useInView(monthlyPackagesSectionRef, { once: true, amount: 0.1 });

  // --- NEW: Fetch packages from API ---
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      setPackagesError(null);
      
      console.log('🔄 Fetching packages from API...');
      const response = await api.get('/storefront');
      
      if (response.data?.success && Array.isArray(response.data.items)) {
        const fetchedPackages = response.data.items.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          packageType: pkg.packageType || 'fixed',
          pricePerSession: pkg.pricePerSession || 0,
          sessions: pkg.sessions,
          months: pkg.months,
          sessionsPerWeek: pkg.sessionsPerWeek,
          totalSessions: pkg.totalSessions,
          price: pkg.price || pkg.totalCost || 0,
          totalCost: pkg.totalCost || pkg.price || 0,
          displayPrice: pkg.totalCost || pkg.price || 0,
          theme: getThemeFromName(pkg.name), // Auto-assign theme based on package name
          isActive: pkg.isActive !== false,
          imageUrl: pkg.imageUrl,
          displayOrder: pkg.displayOrder || 0,
          includedFeatures: pkg.includedFeatures
        }));
        
        // Sort by display order, then by ID
        fetchedPackages.sort((a, b) => {
          if (a.displayOrder !== b.displayOrder) {
            return (a.displayOrder || 0) - (b.displayOrder || 0);
          }
          return a.id - b.id;
        });
        
        setPackages(fetchedPackages);
        console.log(`✅ Loaded ${fetchedPackages.length} packages from API`);
        console.log('📦 Packages:', fetchedPackages.map(p => `${p.id}: ${p.name}`).join(', '));
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch packages:', error);
      setPackagesError(error.message || 'Failed to load packages');
      toast({ 
        title: "Failed to load packages", 
        description: "Using fallback data. Please refresh the page.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingPackages(false);
    }
  }, [toast]);

  // --- Effects ---
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
    if (isFixedPackagesInView) fixedPackagesControls.start("visible");
    if (isMonthlyPackagesInView) monthlyPackagesControls.start("visible");
  }, [
    isHeroInView, isFixedPackagesInView, isMonthlyPackagesInView,
    heroControls, fixedPackagesControls, monthlyPackagesControls
  ]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setAnimateScrollIndicator(window.scrollY < 200);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthenticated, refreshCart]);

  // --- Animation Variants ---
  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { 
        delayChildren: 0.1, 
        staggerChildren: 0.1 
      } 
    } 
  };
  
  const itemVariants = { 
    hidden: { y: 20, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.3, 
        ease: "easeOut" 
      } 
    } 
  };
  
  const gridVariants = { 
    hidden: { opacity: 0 }, 
    visible: { 
      opacity: 1, 
      transition: { 
        delayChildren: 0.1, 
        staggerChildren: 0.05 
      } 
    } 
  };
  
  const cardVariants = { 
    hidden: { y: 40, opacity: 0 }, 
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.4, 
        ease: "easeOut" 
      } 
    } 
  };
  
  const buttonMotionProps = { 
    whileHover: { 
      scale: 1.05, 
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 10 
      } 
    }, 
    whileTap: { 
      scale: 0.95 
    } 
  };

  // --- Event Handlers ---
  const togglePriceVisibility = (packageId: number) => setRevealPrices((prev) => ({ ...prev, [packageId]: !prev[packageId] }));
  const handleToggleCart = () => setShowCart(prev => !prev);
  const handleHideCart = () => setShowCart(false);

  const handleAddToCart = useCallback(async (pkg: StoreItem) => {
    if (!canPurchase) {
      toast({ title: "Login Required", description: "Please log in to purchase packages.", variant: "destructive" });
      return;
    }

    // NOW USING: storefrontItemId instead of hardcoded cart data
    const cartData = {
      storefrontItemId: pkg.id, // This matches the backend expectation
      quantity: 1
    };

    setIsAddingToCart(pkg.id);
    try {
      console.log(`🛒 Adding package to cart:`, { packageId: pkg.id, packageName: pkg.name });
      await addToCart(cartData);
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
  }, [toast, addToCart, refreshCart, canPurchase]);

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

  // --- Filter packages ---
  const fixedPackages = packages.filter(pkg => pkg.packageType === 'fixed');
  const monthlyPackages = packages.filter(pkg => pkg.packageType === 'monthly');

  // --- Render Package Card ---
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
                {canViewPrices ? (
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
                    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>Click to reveal price</motion.div>
                  )
                ) : (
                  <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                    <LoginMessage>Login to view premium prices and purchase</LoginMessage>
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
                  disabled={isCurrentlyAdding || !canPurchase}
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
  }, [isAddingToCart, canViewPrices, canPurchase, handleAddToCart, buttonMotionProps, revealPrices, togglePriceVisibility]);

  // --- Render Loading State ---
  if (isLoadingPackages) {
    return (
      <GalaxyContainer>
        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <SectionContainer>
            <LoadingContainer>
              <div className="spinner"></div>
              <div className="loading-text">Loading your luxury Swan packages...</div>
            </LoadingContainer>
          </SectionContainer>
        </ContentOverlay>
      </GalaxyContainer>
    );
  }

  // --- Render Error State ---
  if (packagesError && packages.length === 0) {
    return (
      <GalaxyContainer>
        {!isAuthenticated && (
          <AuthBanner>
            Please login or register to view pricing and purchase training packages
          </AuthBanner>
        )}
        <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
          <SectionContainer>
            <ErrorContainer>
              <div className="error-title">Failed to Load Packages</div>
              <div className="error-message">
                We couldn't load the training packages. This might be because the luxury Swan packages need to be restored to the database.
              </div>
              <div className="retry-button">
                <ThemedGlowButton 
                  text="Retry Loading" 
                  variant="primary" 
                  size="medium" 
                  onClick={fetchPackages}
                />
              </div>
            </ErrorContainer>
          </SectionContainer>
        </ContentOverlay>
      </GalaxyContainer>
    );
  }

  // --- Component JSX ---
  return (
    <GalaxyContainer>
      {/* Authentication Banner */}
      {!isAuthenticated && (
        <AuthBanner>
          Please login or register to view pricing and purchase training packages
        </AuthBanner>
      )}
      
      <ContentOverlay style={{ paddingTop: !isAuthenticated ? '60px' : '0' }}>
        {/* Hero Section */}
        <HeroSection ref={heroRef}>
          <VideoBackground>
            <video autoPlay loop muted playsInline key="hero-bg-video">
              <source src={swanVideo} type="video/mp4" />
            </video>
          </VideoBackground>
          
          <PremiumBadge initial={{ opacity: 0, x: 20 }} animate={heroControls} variants={itemVariants} transition={{ delay: 0.5 }}> 
            PREMIER
          </PremiumBadge>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={heroControls} 
            variants={containerVariants} 
            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}
          >
            <LogoContainer variants={itemVariants}>
              <img src={logoImg} alt="Swan Studios Logo" loading="lazy" />
            </LogoContainer>
            
            <HeroContent variants={itemVariants}>
              <HeroTitle variants={itemVariants}>
                Elite Training Designed by{' '}
                <AnimatedName>Sean Swan</AnimatedName>
              </HeroTitle>
              <HeroSubtitle variants={itemVariants}>
                25+ Years of Experience & NASM-Approved Protocols
              </HeroSubtitle>
              <HeroDescription variants={itemVariants}>
                Discover a revolutionary workout program tailored to your unique goals. Leveraging over two decades of expertise and cutting-edge techniques, Sean Swan delivers results that redefine your limits.
              </HeroDescription>
              <ButtonsContainer variants={itemVariants}>
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
              DISCOVER SWANSTUDIOS
            </ScrollIndicator>
          )}
        </HeroSection>

        {/* Package Content */}
        <>
          {/* Fixed Packages Section */}
          {fixedPackages.length > 0 && (
            <PackageSection id="packages-section" ref={fixedPackagesSectionRef}>
              <motion.div initial={{ opacity: 0 }} animate={fixedPackagesControls} variants={containerVariants}>
                <SectionTitle initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={itemVariants}>
                  Premium Training Packages
                </SectionTitle>
                <GalaxyGrid initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={gridVariants} aria-label="Session packages">
                  {fixedPackages.map(renderCosmicPackageCard)}
                </GalaxyGrid>
              </motion.div>
            </PackageSection>
          )}

          {/* Monthly Packages Section */}
          {monthlyPackages.length > 0 && (
            <PackageSection ref={monthlyPackagesSectionRef} style={fixedPackages.length > 0 ? { marginTop: '0rem' } : {}}>
              <motion.div initial={{ opacity: 0 }} animate={monthlyPackagesControls} variants={containerVariants}>
                 <SectionTitle initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={itemVariants}>
                  Long-Term Excellence Programs
                </SectionTitle>
                <GalaxyGrid initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={gridVariants} aria-label="Monthly packages">
                  {monthlyPackages.map(renderCosmicPackageCard)}
                </GalaxyGrid>
              </motion.div>
            </PackageSection>
          )}
          
          {/* Consultation Button */}
          {(fixedPackages.length > 0 || monthlyPackages.length > 0) && (
              <SectionContainer style={{paddingTop: '2rem', paddingBottom: '5rem'}}>
                  <motion.div 
                      style={{ display: "flex", justifyContent: "center", marginTop: "1rem", position: 'relative', zIndex: 20 }} 
                      variants={itemVariants} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
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
      {user && isAuthenticated && (
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

export default GalaxyThemedStoreFront;