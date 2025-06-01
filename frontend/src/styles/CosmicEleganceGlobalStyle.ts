/**
 * ✨ SERAPHINA'S COSMIC ELEGANCE SYSTEM ✨
 * ========================================
 * 
 * Ultra Mobile Responsive Luxury Styling with Performance Optimization
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Award-winning luxury aesthetics with cosmic elegance
 * - Ultra mobile responsive with desktop space utilization
 * - Performance-optimized animations with weak device fallbacks
 * - Swan Galaxy theme integration with premium polish
 * - WCAG AAA accessibility compliance
 * 
 * Master Prompt v28 Alignment:
 * - Sensational design that makes clients say "whoa"
 * - Expensive and elegant feel throughout
 * - Effortless navigation with cosmic beauty
 */

import { createGlobalStyle, css, keyframes } from 'styled-components';

// === PERFORMANCE DETECTION ===
const detectDeviceCapability = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'minimal';
  }
  
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return 'weak';
  
  // Check hardware concurrency
  const cores = navigator.hardwareConcurrency;
  if (cores && cores < 4) return 'weak';
  
  // Check connection speed
  const connection = (navigator as any).connection;
  if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
    return 'weak';
  }
  
  // Default to powerful for modern browsers
  return 'powerful';
};

// === LUXURY ANIMATION KEYFRAMES ===

// Cosmic elegance animations for powerful devices
const cosmicFloat = keyframes`
  0%, 100% { 
    transform: translateY(0px) rotate(0deg); 
    filter: brightness(1) saturate(1);
  }
  33% { 
    transform: translateY(-8px) rotate(1deg); 
    filter: brightness(1.05) saturate(1.1);
  }
  66% { 
    transform: translateY(-4px) rotate(-0.5deg); 
    filter: brightness(1.02) saturate(1.05);
  }
`;

const stellarPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(120, 81, 169, 0.1);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(120, 81, 169, 0.2);
    transform: scale(1.02);
  }
`;

const galaxyShimmer = keyframes`
  0% { 
    background-position: -200% center; 
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  100% { 
    background-position: 200% center; 
    opacity: 0.8;
  }
`;

const luxuryGlow = keyframes`
  0%, 100% { 
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3)) 
            drop-shadow(0 0 20px rgba(0, 255, 255, 0.2));
  }
  50% { 
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.5)) 
            drop-shadow(0 0 30px rgba(0, 255, 255, 0.3));
  }
`;

// Minimal animations for weak devices
const subtleFloat = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
`;

const gentlePulse = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

// === RESPONSIVE BREAKPOINTS ===
const breakpoints = {
  xs: '320px',   // Ultra small phones
  sm: '480px',   // Small phones
  md: '768px',   // Tablets
  lg: '1024px',  // Laptops
  xl: '1440px',  // Desktops
  xxl: '1920px'  // Large screens
};

const media = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  xxl: `@media (min-width: ${breakpoints.xxl})`,
  mobile: `@media (max-width: 767px)`,
  tablet: `@media (min-width: 768px) and (max-width: 1023px)`,
  desktop: `@media (min-width: 1024px)`,
  retina: `@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)`,
  landscape: `@media (orientation: landscape)`,
  portrait: `@media (orientation: portrait)`,
  touch: `@media (hover: none) and (pointer: coarse)`,
  mouse: `@media (hover: hover) and (pointer: fine)`
};

// === PERFORMANCE-OPTIMIZED ANIMATION MIXINS ===
const powerfulAnimations = css`
  /* Cosmic elegance for powerful devices */
  .cosmic-float {
    animation: ${cosmicFloat} 6s ease-in-out infinite;
    will-change: transform, filter;
  }
  
  .stellar-pulse {
    animation: ${stellarPulse} 3s ease-in-out infinite;
    will-change: transform, box-shadow;
  }
  
  .galaxy-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 25%,
      rgba(0, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.1) 75%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: ${galaxyShimmer} 3s linear infinite;
  }
  
  .luxury-glow {
    animation: ${luxuryGlow} 4s ease-in-out infinite;
    will-change: filter;
  }
  
  /* Advanced hover effects */
  .cosmic-hover {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    
    &:hover {
      transform: translateY(-8px) scale(1.02);
      box-shadow: 
        0 20px 40px rgba(0, 0, 0, 0.3),
        0 0 60px rgba(0, 255, 255, 0.4),
        0 0 100px rgba(120, 81, 169, 0.2);
      filter: brightness(1.1) saturate(1.2);
    }
  }
`;

const weakDeviceAnimations = css`
  /* Minimal animations for weak devices */
  .cosmic-float {
    animation: ${subtleFloat} 4s ease-in-out infinite;
  }
  
  .stellar-pulse {
    animation: ${gentlePulse} 2s ease-in-out infinite;
  }
  
  .galaxy-shimmer {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .luxury-glow {
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.2));
  }
  
  .cosmic-hover {
    transition: transform 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
`;

// === ULTRA RESPONSIVE SPACING SYSTEM ===
const fluidSpacing = css`
  /* Dynamic spacing that scales with viewport */
  .spacing-xs { margin: clamp(4px, 1vw, 8px); }
  .spacing-sm { margin: clamp(8px, 2vw, 16px); }
  .spacing-md { margin: clamp(16px, 3vw, 24px); }
  .spacing-lg { margin: clamp(24px, 4vw, 32px); }
  .spacing-xl { margin: clamp(32px, 5vw, 48px); }
  
  .padding-xs { padding: clamp(4px, 1vw, 8px); }
  .padding-sm { padding: clamp(8px, 2vw, 16px); }
  .padding-md { padding: clamp(16px, 3vw, 24px); }
  .padding-lg { padding: clamp(24px, 4vw, 32px); }
  .padding-xl { padding: clamp(32px, 5vw, 48px); }
  
  /* Responsive gaps for flex/grid */
  .gap-responsive { gap: clamp(12px, 3vw, 24px); }
  .gap-tight { gap: clamp(8px, 2vw, 16px); }
  .gap-loose { gap: clamp(20px, 4vw, 40px); }
`;

// === LUXURY TYPOGRAPHY SYSTEM ===
const luxuryTypography = css`
  /* Premium font stack with proper fallbacks */
  .font-luxury {
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 
                 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    font-optical-sizing: auto;
    font-feature-settings: 'liga' 1, 'kern' 1;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Fluid typography that scales beautifully */
  .text-cosmic-xl {
    font-size: clamp(2rem, 5vw + 1rem, 4rem);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #00FFFF, #7851A9, #FFD700);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200% 200%;
  }
  
  .text-cosmic-lg {
    font-size: clamp(1.5rem, 3vw + 0.5rem, 2.5rem);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  
  .text-cosmic-md {
    font-size: clamp(1.125rem, 2vw + 0.25rem, 1.5rem);
    font-weight: 500;
    line-height: 1.4;
  }
  
  .text-cosmic-sm {
    font-size: clamp(0.875rem, 1.5vw, 1.125rem);
    font-weight: 400;
    line-height: 1.5;
  }
  
  /* Luxury text effects */
  .text-glow {
    text-shadow: 
      0 0 10px rgba(0, 255, 255, 0.5),
      0 0 20px rgba(0, 255, 255, 0.3),
      0 0 30px rgba(0, 255, 255, 0.1);
  }
  
  .text-elegant {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    color: rgba(255, 255, 255, 0.95);
  }
`;

// === COSMIC GLASS MORPHISM SYSTEM ===
const cosmicGlass = css`
  .glass-cosmic {
    background: rgba(30, 30, 60, 0.4);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .glass-luxury {
    background: rgba(20, 20, 40, 0.6);
    backdrop-filter: blur(30px) saturate(1.8) brightness(1.1);
    -webkit-backdrop-filter: blur(30px) saturate(1.8) brightness(1.1);
    border: 1px solid rgba(255, 215, 0, 0.2);
    border-radius: 20px;
    box-shadow: 
      0 12px 48px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 215, 0, 0.1),
      0 0 60px rgba(0, 255, 255, 0.1);
  }
  
  .glass-minimal {
    background: rgba(40, 40, 80, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }
`;

// === ULTRA RESPONSIVE GRID SYSTEM ===
const responsiveGrid = css`
  .grid-cosmic {
    display: grid;
    gap: clamp(16px, 3vw, 32px);
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    
    ${media.md} {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }
    
    ${media.lg} {
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    }
    
    ${media.xl} {
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    }
  }
  
  .grid-dashboard {
    display: grid;
    gap: clamp(12px, 2vw, 24px);
    
    /* Mobile: Stack everything */
    grid-template-columns: 1fr;
    
    /* Tablet: 2 columns */
    ${media.md} {
      grid-template-columns: repeat(2, 1fr);
    }
    
    /* Desktop: Utilize full space with smart columns */
    ${media.lg} {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    
    ${media.xl} {
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    }
    
    ${media.xxl} {
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    }
  }
`;

// === LUXURY COMPONENT STYLES ===
const luxuryComponents = css`
  /* Premium button styling */
  .btn-cosmic {
    position: relative;
    padding: clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px);
    background: linear-gradient(135deg, 
      rgba(0, 255, 255, 0.1), 
      rgba(120, 81, 169, 0.2)
    );
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 12px;
    color: white;
    font-weight: 500;
    font-size: clamp(14px, 2vw, 16px);
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.1), 
        transparent
      );
      transition: left 0.5s ease;
    }
    
    &:hover::before {
      left: 100%;
    }
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 
        0 8px 25px rgba(0, 0, 0, 0.3),
        0 0 30px rgba(0, 255, 255, 0.3);
      border-color: rgba(0, 255, 255, 0.5);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  /* Premium card styling */
  .card-cosmic {
    background: rgba(30, 30, 60, 0.4);
    backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: clamp(12px, 2vw, 20px);
    padding: clamp(16px, 4vw, 24px);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    
    &:hover {
      transform: translateY(-4px);
      border-color: rgba(0, 255, 255, 0.3);
      box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.3),
        0 0 60px rgba(0, 255, 255, 0.2);
    }
  }
  
  /* Premium input styling */
  .input-cosmic {
    width: 100%;
    padding: clamp(10px, 2vw, 14px) clamp(12px, 3vw, 16px);
    background: rgba(40, 40, 80, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    color: white;
    font-size: clamp(14px, 2vw, 16px);
    transition: all 0.3s ease;
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
    
    &:focus {
      outline: none;
      border-color: rgba(0, 255, 255, 0.6);
      box-shadow: 
        0 0 0 3px rgba(0, 255, 255, 0.2),
        0 4px 20px rgba(0, 0, 0, 0.2);
      background: rgba(40, 40, 80, 0.6);
    }
  }
`;

// === MAIN GLOBAL STYLES ===
const CosmicEleganceGlobalStyle = createGlobalStyle<{ deviceCapability?: string }>`
  /* === FOUNDATION RESET === */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  /* === ROOT VARIABLES === */
  :root {
    /* Color System */
    --cosmic-primary: #00FFFF;
    --cosmic-secondary: #7851A9;
    --cosmic-accent: #FFD700;
    --cosmic-background: #0a0a1a;
    --cosmic-surface: rgba(30, 30, 60, 0.4);
    
    /* Spacing System */
    --space-xs: clamp(4px, 1vw, 8px);
    --space-sm: clamp(8px, 2vw, 16px);
    --space-md: clamp(16px, 3vw, 24px);
    --space-lg: clamp(24px, 4vw, 32px);
    --space-xl: clamp(32px, 5vw, 48px);
    
    /* Border Radius */
    --radius-sm: clamp(4px, 1vw, 8px);
    --radius-md: clamp(8px, 2vw, 12px);
    --radius-lg: clamp(12px, 2vw, 20px);
    
    /* Shadows */
    --shadow-cosmic: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.2);
    --shadow-luxury: 0 12px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(0, 255, 255, 0.1);
  }
  
  /* === BASE STYLES === */
  html {
    font-size: 16px;
    scroll-behavior: smooth;
    height: 100%;
    
    ${media.mobile} {
      font-size: 14px;
    }
    
    ${media.xl} {
      font-size: 18px;
    }
  }
  
  body {
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 
                 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    background: radial-gradient(ellipse at center, #1e1e3f 0%, #0a0a1a 70%);
    color: white;
    min-height: 100vh;
    line-height: 1.6;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    
    /* Enhanced mobile experience */
    ${media.mobile} {
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
    }
  }
  
  #root {
    min-height: 100vh;
    width: 100%;
    isolation: isolate;
    position: relative;
  }
  
  /* === PERFORMANCE-BASED ANIMATIONS === */
  ${({ deviceCapability }) => {
    if (deviceCapability === 'weak' || deviceCapability === 'minimal') {
      return weakDeviceAnimations;
    }
    return powerfulAnimations;
  }}
  
  /* === RESPONSIVE SYSTEMS === */
  ${fluidSpacing}
  ${luxuryTypography}
  ${cosmicGlass}
  ${responsiveGrid}
  ${luxuryComponents}
  
  /* === ULTRA MOBILE OPTIMIZATIONS === */
  ${media.mobile} {
    /* Enhanced touch targets */
    button, .btn-cosmic, a, input, select, textarea {
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Prevent zoom on input focus */
    input, select, textarea {
      font-size: 16px !important;
    }
    
    /* Optimize scrolling */
    body {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    
    /* Reduce motion on mobile if needed */
    .cosmic-float, .stellar-pulse {
      animation-duration: 4s;
    }
  }
  
  /* === DESKTOP SPACE UTILIZATION === */
  ${media.desktop} {
    /* Larger containers on desktop */
    .container {
      max-width: min(1400px, 90vw);
      margin: 0 auto;
      padding: 0 clamp(20px, 3vw, 40px);
    }
    
    /* Enhanced spacing for desktop */
    .grid-cosmic, .grid-dashboard {
      gap: clamp(20px, 3vw, 32px);
    }
    
    /* Better hover states on desktop */
    .cosmic-hover:hover {
      transform: translateY(-8px) scale(1.02);
    }
  }
  
  /* === ACCESSIBILITY ENHANCEMENTS === */
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :root {
      --cosmic-primary: #00ccff;
      --cosmic-accent: #ffff00;
    }
    
    .text-cosmic-xl {
      -webkit-text-fill-color: #00ccff;
    }
    
    .glass-cosmic, .glass-luxury {
      border-width: 2px;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
    
    .cosmic-float, .stellar-pulse, .galaxy-shimmer, .luxury-glow {
      animation: none !important;
    }
  }
  
  /* Focus styles for keyboard navigation */
  :focus-visible {
    outline: 3px solid var(--cosmic-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
  
  /* === LUXURY SCROLLBAR === */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--cosmic-primary), var(--cosmic-secondary));
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, var(--cosmic-accent), var(--cosmic-primary));
  }
  
  /* === PRINT OPTIMIZATION === */
  @media print {
    * {
      background: white !important;
      color: black !important;
      box-shadow: none !important;
    }
    
    .cosmic-float, .stellar-pulse, .galaxy-shimmer {
      animation: none !important;
    }
  }
`;

export default CosmicEleganceGlobalStyle;
export { detectDeviceCapability, media, breakpoints };