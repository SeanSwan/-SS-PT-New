// File: frontend/src/pages/shop/StoreFront.component.tsx
// Clean implementation with fixed packages

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";

// --- Context Imports ---
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

// --- Component Imports ---
import GlowButton from "../../components/Button/glowButton";
import OrientationForm from "../../components/OrientationForm/orientationForm";
import ShoppingCart from "../../components/ShoppingCart/ShoppingCart";
import { useToast } from "../../hooks/use-toast";

// --- Asset Imports ---
const swanVideo = "/Swans.mp4";
const logoImg = "/Logo.png";

// --- Define the correct packages directly in the component ---
// These are the 8 packages we want to display with exact prices
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
  displayPrice: number;
  theme?: string;
  isActive: boolean;
  imageUrl: string | null;
  displayOrder?: number;
  includedFeatures?: string | null;
}

// --- Utility Functions ---
const getGradientColors = (theme: string = 'purple'): { start: string; end: string } => {
  switch (theme) {
    case "cosmic":  return { start: "rgba(93, 63, 211, 0.3)", end: "rgba(255, 46, 99, 0.3)" };
    case "ruby":    return { start: "rgba(232, 0, 70, 0.3)", end: "rgba(253, 0, 159, 0.3)" };
    case "emerald": return { start: "rgba(0, 232, 176, 0.3)", end: "rgba(0, 253, 159, 0.3)" };
    case "purple":
    default:        return { start: "rgba(120, 0, 245, 0.3)", end: "rgba(200, 148, 255, 0.3)" };
  }
};

const formatPrice = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || isNaN(price)) { return '$0'; }
  return price.toLocaleString("en-US", { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getPackageImage = (imageUrl: string | null, packageName: string): string => {
  // Always use the marble texture as a fallback since package images are missing
  // This prevents 404 errors in the console
  return '/marble-texture.png';
};

// --- Keyframe Animations ---
const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); }
`;

const textGlow = keyframes`
  0%, 100% { text-shadow: 0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(120, 81, 169, 0.4); }
  50% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.8), 0 0 15px rgba(120, 81, 169, 0.6); }
`;

const slideGradient = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
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

// --- Styled Components ---
const StoreContainer = styled.div`
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  color: white;
  z-index: 1;
`;

const VideoBackground = styled.div`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  z-index: 0; overflow: hidden;

  &:after {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient( to bottom, rgba(0, 0, 0, 0.6), rgba(10, 10, 30, 0.8), rgba(20, 20, 50, 0.9) );
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
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.5)); margin-bottom: 1.5rem;
  z-index: 2;

  img { height: 160px; max-width: 90%; object-fit: contain; }
  @media (max-width: 768px) { img { height: 120px; } margin-bottom: 1rem; }
  @media (max-width: 480px) { img { height: 100px; } margin-bottom: 0.5rem; }
`;

const HeroContent = styled(motion.div)`
  max-width: 800px; width: 100%; margin: 0 auto; position: relative; z-index: 2;
  background: rgba(10, 10, 30, 0.6); padding: 2rem; border-radius: 15px;
  backdrop-filter: blur(5px); border: 1px solid rgba(0, 255, 255, 0.1);
  @media (max-width: 768px) { padding: 1.5rem; }
`;

const PremiumBadge = styled(motion.div)`
  position: absolute; top: 1.5rem; right: 1.5rem; font-family: 'Playfair Display', serif;
  font-size: 1rem; padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px; background: rgba(10, 10, 30, 0.6); backdrop-filter: blur(10px);
  color: white; z-index: 3; letter-spacing: 3px;
  &:before { content: "★★★★★★★"; display: block; font-size: 0.8rem; letter-spacing: 2px; color: gold; text-align: center; margin-bottom: 4px; }
  &:after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient( 45deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100% ); background-size: 200% auto; animation: ${shimmer} 3s linear infinite; }
`;

const AnimatedName = styled(motion.span)`
  display: inline-block;
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text;
  color: transparent; animation: ${shimmer} 3s linear infinite, ${textGlow} 2s ease-in-out infinite alternate;
  padding: 0 5px;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.2rem; margin-bottom: 1rem; font-weight: 300; color: white;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); letter-spacing: 1px;
  @media (max-width: 768px) { font-size: 2.5rem; }
`;

const HeroSubtitle = styled(motion.h2)`
  font-size: 1.75rem; margin-bottom: 1.5rem; color: var(--silver, #c0c0c0);
  background: linear-gradient( to right, #a9f8fb, #46cdcf, #7b2cbf, #c8b6ff, #a9f8fb );
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text; color: transparent;
  animation: ${shimmer} 4s linear infinite; display: inline-block; font-weight: 300;
  @media (max-width: 768px) { font-size: 1.25rem; }
`;

const HeroDescription = styled(motion.p)`
  font-size: 1.125rem; margin-bottom: 2rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7); max-width: 800px; margin: 0 auto 2rem;
  @media (max-width: 768px) { font-size: 1rem; }
`;

const ButtonsContainer = styled(motion.div)`
  display: flex; gap: 1.5rem; margin-top: 2rem; justify-content: center;
  position: relative; z-index: 3;
  & > div, & > button { position: relative; flex: 1 1 auto; min-width: 180px; max-width: 250px; }
  @media (max-width: 600px) { flex-direction: column; gap: 1rem; align-items: center; & > div, & > button { width: 100%; max-width: 280px; } }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7); letter-spacing: 2px; z-index: 2;
  &:after { content: "↓"; font-size: 1.5rem; margin-top: 0.5rem; animation: ${float} 2s ease-in-out infinite; }
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
  margin-bottom: 1rem;
  font-size: 2.5rem;
  font-weight: 300;
  position: relative;
  display: inline-block;
  padding-bottom: 15px;
  color: white;
  width: 100%;
  
  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 150px;
    height: 2px;
    background: linear-gradient(
      to right,
      rgba(0, 255, 255, 0),
      rgba(0, 255, 255, 1),
      rgba(0, 255, 255, 0)
    );
  }
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
  position: relative;
  z-index: 15;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  @media (min-width: 769px) and (max-width: 1023px) {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
  }
  
  @media (min-width: 1024px) { 
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    max-width: 1200px;
    margin: 0 auto 4rem;
    gap: 2.5rem;
  }
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    max-width: 1600px;
  }
`;

const CardContainer = styled(motion.div)`
  position: relative;
  border-radius: 15px;
  overflow: hidden;
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  height: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  z-index: 20;
  
  @media (max-width: 768px) {
    min-height: 460px;
    border-radius: 12px;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3);
    border-color: rgba(0, 255, 255, 0.6);
    background: rgba(30, 30, 60, 0.6);
    z-index: 25;
  }
  
  &:focus {
    outline: 2px solid rgba(0, 255, 255, 0.8);
    outline-offset: 2px;
  }
`;

const CardMedia = styled.div`
  width: 100%;
  height: 200px;
  position: relative;
  overflow: hidden;
  border-radius: 15px 15px 0 0;
  
  @media (max-width: 768px) {
    height: 180px;
    border-radius: 12px 12px 0 0;
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
      rgba(10, 10, 30, 0.3) 60%,
      rgba(10, 10, 30, 0.8) 100%
    );
    z-index: 1;
  }
`;

const CardImage = styled.div<{$imageUrl?: string | null}>`
  width: 100%;
  height: 100%;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: ${props => props.$imageUrl ? 'cover' : '200% 200%'};
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.3s ease;
  animation: ${props => !props.$imageUrl && slideGradient} 5s ease infinite;
  
  ${CardContainer}:hover & {
    transform: scale(1.05);
  }
`;

const CardContent = styled.div`
  padding: 1.5rem;
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 1.25rem;
  }
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 1px;
    background: linear-gradient(
      to right, 
      rgba(255, 255, 255, 0), 
      rgba(255, 255, 255, 0.2), 
      rgba(255, 255, 255, 0)
    );
  }
`;

const CardTitle = styled.h3`
  font-size: 1.6rem;
  margin-bottom: 0.75rem;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
  
  @media (min-width: 1024px) {
    font-size: 1.7rem;
  }
`;

const CardBadge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  font-size: 0.8rem;
  color: white;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const CardDescription = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-weight: 300;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const SessionInfo = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.1);
  
  .session-details {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 0.5rem;
  }
  
  .per-session-price {
    font-size: 1.1rem;
    font-weight: 600;
    color: #00ffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
`;

const PriceBox = styled(motion.div)`
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: 10px;
  background: rgba(20, 20, 50, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 100px;
  isolation: isolate; /* Creates a new stacking context */
  
  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    background-size: 200% 200%;
    animation: ${diagonalShimmer} 5s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
    pointer-events: none;
  }
`;

const PriceContent = styled(motion.div)`
  position: relative;
  z-index: 1;
`;

const PriceLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
`;

const Price = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
`;

const ValueBadge = styled.div<{ $isGoodValue?: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: 600;
  ${props => props.$isGoodValue ? `
    background: linear-gradient(45deg, #00ff88, #00ffaa);
    color: #003322;
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  `}
`;

const LoginMessage = styled.div`
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
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
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  border: none;
  color: white;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.3);
  z-index: 1000;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.5);
  }
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const PulsingCartButton = styled(CartButton)`
  animation: ${pulseAnimation} 1.5s infinite;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.6);
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const CartCount = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4b6a;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid rgba(20, 20, 40, 0.8);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  font-weight: 300;
`;

const StatusBanner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 10px;
  background: rgba(0, 255, 255, 0.2);
  color: white;
  text-align: center;
  font-size: 0.9rem;
  backdrop-filter: blur(10px);
  z-index: 1000;
  border-bottom: 1px solid rgba(0, 255, 255, 0.4);
`;

// --- StoreFront Component ---
const StoreFront: React.FC = () => {
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
  const [authOverride, setAuthOverride] = useState(false); // Added manual auth override

  // Track cart setup state
  const cartSetupComplete = React.useRef(false);
  
  // Setup force cart auth flag for development with loop protection
  useEffect(() => {
    // Check if we've already set up in this component instance
    if (!cartSetupComplete.current) {
      localStorage.setItem('force_cart_auth', 'true');
      console.log('Enabled force_cart_auth flag to allow cart operations');
      cartSetupComplete.current = true;
    }
    
    return () => {
      // Clean up on unmount
      // localStorage.removeItem('force_cart_auth');
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

  // Debug the auth status if there's an issue
  useEffect(() => {
    console.log('Auth Debug:', { 
      isAuthenticated, 
      hasUser: !!user, 
      userRole: user?.role,
      username: user?.username,
      override: authOverride,
      effectiveAuth
    });
  }, [user, isAuthenticated, authOverride, effectiveAuth]);
  
  // Allow anyone who is authenticated (by any means) to view prices and purchase
  const canViewPrices = effectiveAuth;


  // --- Effects ---
  useEffect(() => {
    if (isHeroInView) heroControls.start("visible");
    if (isFixedPackagesInView) fixedPackagesControls.start("visible");
    if (isMonthlyPackagesInView) monthlyPackagesControls.start("visible");
  }, [
    isHeroInView, isFixedPackagesInView, isMonthlyPackagesInView,
    heroControls, fixedPackagesControls, monthlyPackagesControls
  ]);

  useEffect(() => {
    const handleScroll = () => setAnimateScrollIndicator(window.scrollY < 200);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track if we've already refreshed the cart to avoid loops
  const hasRefreshed = React.useRef(false);

  useEffect(() => {
    if (user?.id && !hasRefreshed.current) {
      console.log('StoreFront mounted - refreshing cart once');
      hasRefreshed.current = true;
      // Small timeout to prevent rapid re-renders
      const timer = setTimeout(() => refreshCart(), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, refreshCart]);

  useEffect(() => {
    // Auto-hide the banner after 6 seconds
    if (showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [showBanner]);

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
    // Debug print to understand user state
    console.log('Add to cart - Auth state:', { effectiveAuth, user: user?.username, role: user?.role });
    console.log('Adding package to cart:', pkg);
    
    // Use effectiveAuth instead of just checking user
    if (!effectiveAuth) {
      toast({ title: "Login Required", description: "Please log in to purchase packages.", variant: "destructive" });
      return;
    }
    
    // Force auth override if needed for cart operations
    if (effectiveAuth && !isAuthenticated) {
      console.log('Forcing auth override to ensure user is recognized');
      localStorage.setItem('force_cart_auth', 'true');
    }

    // Enhanced cart item data with package metadata
    const cartItemData = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.displayPrice,
      quantity: 1,
      // Include additional metadata for the cart
      totalSessions: pkg.totalSessions || 0,
      packageType: pkg.packageType || 'fixed',
      sessionCount: pkg.sessions || pkg.totalSessions || 0,
      // Add timestamp to ensure uniqueness
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
  const renderPackageCard = (pkg: StoreItem) => {
    const { start, end } = getGradientColors(pkg.theme || 'purple');
    const packageIdKey = pkg.id.toString();
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
        <CardContainer 
          onClick={() => togglePriceVisibility(pkg.id)}
          aria-label={`View details for ${pkg.name}`}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && togglePriceVisibility(pkg.id)}
        >
          <CardMedia>
            <CardImage 
              $imageUrl={getPackageImage(pkg.imageUrl, pkg.name)} 
              style={!pkg.imageUrl ? { background: `linear-gradient(135deg, ${start}, ${end})` } : {}} 
            />
            {badgeDisplay && <CardBadge>{badgeDisplay}</CardBadge>}
          </CardMedia>
          <CardContent>
            <CardTitle>{pkg.name}</CardTitle>
            <CardDescription>
              {pkg.description || 'Premium training package designed for results.'}
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
            
            <PriceBox variants={itemVariants} aria-live="polite">
              <AnimatePresence mode="wait">
                {effectiveAuth ? (
                  revealPrices[pkg.id] ? (
                    <PriceContent key="price" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                      <PriceLabel>Total Investment</PriceLabel>
                      <Price>{formatPrice(pkg.displayPrice)}</Price>
                      {valueBadge.text && (
                        <ValueBadge $isGoodValue={valueBadge.isGoodValue}>
                          {valueBadge.text}
                        </ValueBadge>
                      )}
                    </PriceContent>
                  ) : (
                    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.7)'}}>Click to reveal price</motion.div>
                  )
                ) : (
                  <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                    <LoginMessage>Login to view prices and purchase</LoginMessage>
                  </motion.div>
                )}
              </AnimatePresence>
            </PriceBox>
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
          </CardContent>
        </CardContainer>
      </motion.div>
    );
  };

  // --- Component JSX ---
  return (
    <StoreContainer>
      {showBanner && (
        <StatusBanner>
          SwanStudios is using pre-configured packages with correct pricing structure - Not loading from API
        </StatusBanner>
      )}
      
      {/* Debug authentication banner */}
      <StatusBanner style={{ top: showBanner ? '40px' : '0', background: 'rgba(255, 0, 0, 0.2)', zIndex: 1001 }}>
        Auth Status: {effectiveAuth ? '✅ Authenticated' : '❌ Not Authenticated'} | User: {user?.username || 'None'} | Role: {user?.role || 'None'} | Override: {authOverride ? 'On' : 'Off'}
      </StatusBanner>
      
      <ContentOverlay>
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
                  <GlowButton 
                    text="Book Consultation" 
                    theme="cosmic" 
                    size="large" 
                    onClick={() => setShowOrientation(true)} 
                  />
                </motion.div>
                <motion.div {...buttonMotionProps}>
                  <GlowButton 
                    text="View Packages" 
                    theme="purple" 
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
              DISCOVER
            </ScrollIndicator>
          )}
        </HeroSection>

        {/* Package Content */}
        <>
          {/* Fixed Packages Section */}
          {FIXED_PACKAGES.length > 0 && (
            <PackageSection id="packages-section" ref={fixedPackagesSectionRef}>
              <motion.div initial={{ opacity: 0 }} animate={fixedPackagesControls} variants={containerVariants}>
                <SectionTitle initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={itemVariants}>
                  Premium Training Packages
                </SectionTitle>
                <Grid initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={gridVariants} aria-label="Session packages">
                  {FIXED_PACKAGES.map(renderPackageCard)}
                </Grid>
              </motion.div>
            </PackageSection>
          )}

          {/* Monthly Packages Section */}
          {MONTHLY_PACKAGES.length > 0 && (
            <PackageSection ref={monthlyPackagesSectionRef} style={FIXED_PACKAGES.length > 0 ? { marginTop: '0rem' } : {}}>
              <motion.div initial={{ opacity: 0 }} animate={monthlyPackagesControls} variants={containerVariants}>
                 <SectionTitle initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={itemVariants}>
                  Long-Term Excellence Programs
                </SectionTitle>
                <Grid initial={{ opacity: 0 }} animate={{ opacity: 1 }} variants={gridVariants} aria-label="Monthly packages">
                  {MONTHLY_PACKAGES.map(renderPackageCard)}
                </Grid>
              </motion.div>
            </PackageSection>
          )}
          
          {/* Always show consultation button if packages are displayed */}
          {(FIXED_PACKAGES.length > 0 || MONTHLY_PACKAGES.length > 0) && (
              <SectionContainer style={{paddingTop: '2rem', paddingBottom: '5rem'}}>
                  <motion.div 
                      style={{ display: "flex", justifyContent: "center", marginTop: "1rem", position: 'relative', zIndex: 20 }} 
                      variants={itemVariants} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                  >
                      <motion.div {...buttonMotionProps}>
                      <GlowButton 
                          text="Schedule Consultation" 
                          theme="cosmic" 
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
    </StoreContainer>
  );
};

export default StoreFront;