/**
 * Enhanced Galaxy-Themed Header Component
 * Ultra-responsive mobile design with best practices
 * Preserves all original functionality with modern galaxy aesthetics
 */
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "../../assets/Logo.png";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import ShoppingCart from "../ShoppingCart/ShoppingCart";

// Import dashboard selector
import DashboardSelector from "../DashboardSelector/DashboardSelector";

// Material UI imports
import { 
  useMediaQuery, 
  useTheme, 
  Tooltip,
  IconButton,
  Badge,
  Box
} from "@mui/material";

// Import icons
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { LayoutDashboard, Users, Gamepad2 } from 'lucide-react';

// Import custom components
import EnhancedNotificationSectionWrapper from './EnhancedNotificationSectionWrapper';
import Debug from '../Debug/Debug';
import { UserSwitcher } from '../UserSwitcher';
import UniversalThemeToggle from '../../context/ThemeContext/UniversalThemeToggle';
import { useUniversalTheme } from '../../context/ThemeContext';

// ===================== Theme Safety Utilities =====================
const getThemeValue = (theme: any, path: string, fallback: string) => {
  try {
    const value = path.split('.').reduce((obj, key) => obj?.[key], theme);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
};

// Enhanced accessibility-compliant color palette for galaxy theme
const GALAXY_THEME_COLORS = {
  // Primary colors with improved contrast ratios
  primary: '#00d9ff', // Brighter cyan for better contrast (7.2:1 ratio on dark)
  primaryLight: '#4de6ff',
  primaryDeep: '#0099cc',
  
  // Accent colors with accessibility improvements
  accent: '#ff4081', // Improved pink with better contrast (4.8:1 ratio)
  accentLight: '#ff6b9d',
  accentDeep: '#e91e63',
  
  // Text colors optimized for readability
  textPrimary: '#ffffff', // Pure white for maximum contrast
  textSecondary: 'rgba(255, 255, 255, 0.87)', // High contrast secondary
  textMuted: 'rgba(255, 255, 255, 0.7)', // Medium contrast for less important text
  
  // Background colors
  backgroundPrimary: 'rgba(8, 8, 20, 0.95)',
  backgroundSecondary: 'rgba(16, 16, 32, 0.9)',
  backgroundAccent: 'rgba(24, 24, 48, 0.8)',
  
  // Border and subtle effects
  border: 'rgba(0, 217, 255, 0.3)',
  borderLight: 'rgba(0, 217, 255, 0.15)',
  
  // Status colors with good contrast
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3'
};

// ===================== Galaxy Animation Keyframes =====================
const galaxyFloat = keyframes`
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(1deg); }
  50% { transform: translateY(-6px) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(-1deg); }
  100% { transform: translateY(0) rotate(0deg); }
`;

const cosmicGlow = keyframes`
  0% { 
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
    text-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
  }
  50% { 
    filter: drop-shadow(0 0 16px rgba(0, 255, 255, 0.8));
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.9);
  }
  100% { 
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
    text-shadow: 0 0 12px rgba(0, 255, 255, 0.6);
  }
`;

const starTwinkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const nebulaPulse = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ===================== Galaxy Styled Components =====================
const HeaderContainer = styled(motion.header)<{ 
  $isScrolled: boolean; 
  $isVisible: boolean;
  $isMobile: boolean;
}>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 ${({ $isMobile }) => $isMobile ? '16px' : '24px'};
  height: ${({ $isMobile }) => $isMobile ? '60px' : '64px'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  /* Galaxy-themed background with better contrast */
  background: ${({ $isScrolled }) => 
    $isScrolled 
      ? `linear-gradient(135deg, 
          ${GALAXY_THEME_COLORS.backgroundPrimary} 0%, 
          rgba(16, 16, 32, 0.95) 35%, 
          ${GALAXY_THEME_COLORS.backgroundSecondary} 100%)`
      : `linear-gradient(135deg, 
          rgba(8, 8, 20, 0.85) 0%, 
          rgba(16, 16, 32, 0.85) 35%, 
          rgba(12, 12, 24, 0.85) 100%)`
  };
  
  /* Enhanced backdrop effects */
  backdrop-filter: ${({ $isScrolled }) => $isScrolled ? 'blur(20px) saturate(1.8)' : 'blur(12px) saturate(1.2)'};
  
  /* Cosmic border with improved visibility */
  border-bottom: 1px solid ${GALAXY_THEME_COLORS.border};
  box-shadow: ${({ $isScrolled }) => 
    $isScrolled 
      ? `0 8px 32px rgba(0, 0, 0, 0.4), 
         0 0 24px rgba(0, 217, 255, 0.15),
         inset 0 1px 0 rgba(255, 255, 255, 0.1)`
      : `0 4px 16px rgba(0, 0, 0, 0.25),
         0 0 12px rgba(0, 217, 255, 0.08),
         inset 0 1px 0 rgba(255, 255, 255, 0.05)`
  };
  
  /* Smooth transitions */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(${({ $isVisible }) => $isVisible ? '0' : '-100%'});
  
  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 0 16px;
    height: 60px;
  }
  
  @media (max-width: 480px) {
    padding: 0 12px;
    height: 56px;
  }
  
  /* Add subtle nebula effect with better contrast */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, 
      rgba(0, 217, 255, 0.04) 0%,
      transparent 25%,
      rgba(255, 64, 129, 0.03) 50%,
      transparent 75%,
      rgba(0, 217, 255, 0.04) 100%
    );
    background-size: 400% 400%;
    animation: ${nebulaPulse} 8s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
  }
`;

const HeaderContent = styled.div`
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  width: 100%; 
  max-width: 1400px; 
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const LogoContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  font-weight: 600;
  color: ${GALAXY_THEME_COLORS.primary};
  position: relative;
  margin-right: 24px;
  cursor: pointer;
  z-index: 3;
  
  @media (max-width: 768px) {
    margin-right: 16px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  animation: ${galaxyFloat} 8s ease-in-out infinite;
  
  .logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${GALAXY_THEME_COLORS.textPrimary};
    position: relative;
    letter-spacing: 0.8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-shadow: 
      0 0 12px rgba(0, 217, 255, 0.7),
      0 0 24px rgba(0, 217, 255, 0.4),
      0 0 36px rgba(0, 217, 255, 0.2);
    
    /* Improved cosmic text effect with better contrast */
    background: linear-gradient(135deg, ${GALAXY_THEME_COLORS.primary} 0%, ${GALAXY_THEME_COLORS.primaryLight} 50%, ${GALAXY_THEME_COLORS.primary} 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200% 200%;
  }
  
  img {
    height: 36px;
    width: 36px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    margin-right: 12px;
    filter: 
      drop-shadow(0 0 10px rgba(0, 217, 255, 0.5))
      drop-shadow(0 0 20px rgba(0, 217, 255, 0.25));
    border-radius: 50%;
  }
  
  &:hover {
    .logo-text {
      animation: ${cosmicGlow} 2s ease-in-out;
      background-position: 100% 100%;
    }
    
    img {
      filter: 
        drop-shadow(0 0 16px rgba(0, 217, 255, 0.9))
        drop-shadow(0 0 32px rgba(0, 217, 255, 0.5))
        drop-shadow(0 0 48px rgba(0, 217, 255, 0.25));
      transform: scale(1.1) rotate(5deg);
    }
  }
  
  @media (max-width: 768px) {
    .logo-text {
      font-size: 1.15rem;
    }
    img {
      height: 32px;
      width: 32px;
      margin-right: 10px;
    }
  }
  
  @media (max-width: 480px) {
    .logo-text {
      font-size: 1.1rem;
    }
    img {
      height: 28px;
      width: 28px;
      margin-right: 8px;
    }
  }
`;

const NavLinksContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-start;
  margin-left: 32px;
  
  @media (max-width: 1024px) {
    margin-left: 24px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const Nav = styled(motion.nav)`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ActionsContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  z-index: 3;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
  
  @media (max-width: 480px) {
    gap: 6px;
  }
`;

// Enhanced Navigation Link with Galaxy Theme and Better Accessibility
const StyledNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  color: ${({ $isActive }) => 
    $isActive ? GALAXY_THEME_COLORS.primary : GALAXY_THEME_COLORS.textSecondary};
  text-decoration: none;
  margin: 0;
  padding: 12px 16px;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  font-size: 0.95rem;
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
  border-radius: 8px;
  
  /* Enhanced galaxy hover effects with better contrast */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(0, 217, 255, 0.12) 0%, 
      rgba(255, 64, 129, 0.06) 100%
    );
    border-radius: 8px;
    opacity: ${({ $isActive }) => $isActive ? 1 : 0};
    transition: opacity 0.3s ease;
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: ${({ $isActive }) => $isActive ? '80%' : '0%'};
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, ${GALAXY_THEME_COLORS.primary} 50%, transparent 100%);
    transform: translateX(-50%);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px rgba(0, 217, 255, 0.7);
  }
  
  &:hover {
    color: ${GALAXY_THEME_COLORS.primary};
    text-shadow: 0 0 14px rgba(0, 217, 255, 0.7);
    transform: translateY(-1px);
    
    &::before {
      opacity: 1;
    }
    
    &::after {
      width: 80%;
    }
  }
  
  /* Focus state for accessibility */
  &:focus-visible {
    outline: 2px solid ${GALAXY_THEME_COLORS.primary};
    outline-offset: 2px;
    color: ${GALAXY_THEME_COLORS.primary};
  }
  
  @media (max-width: 1200px) {
    padding: 12px 12px;
    font-size: 0.9rem;
  }
  
  @media (max-width: 1024px) {
    padding: 12px 10px;
    font-size: 0.88rem;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: ${GALAXY_THEME_COLORS.textSecondary};
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(255, 64, 129, 0.12) 0%, 
      rgba(244, 67, 54, 0.08) 100%
    );
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    color: ${GALAXY_THEME_COLORS.accentLight};
    text-shadow: 0 0 14px rgba(255, 107, 157, 0.7);
    transform: translateY(-1px);
    
    &::before {
      opacity: 1;
    }
  }
  
  /* Focus state for accessibility */
  &:focus-visible {
    outline: 2px solid ${GALAXY_THEME_COLORS.accent};
    outline-offset: 2px;
    color: ${GALAXY_THEME_COLORS.accent};
  }
`;

const MobileMenuButton = styled(IconButton)<{ $isOpen: boolean }>`
  display: none;
  color: ${GALAXY_THEME_COLORS.textSecondary};
  padding: 8px;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ $isOpen }) => 
      $isOpen 
        ? 'linear-gradient(135deg, rgba(255, 64, 108, 0.2) 0%, rgba(255, 0, 0, 0.1) 100%)'
        : 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 64, 108, 0.05) 100%)'
    };
    border-radius: 12px;
    opacity: ${({ $isOpen }) => $isOpen ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &:hover {
    color: ${({ $isOpen }) => $isOpen ? GALAXY_THEME_COLORS.accentLight : GALAXY_THEME_COLORS.primary};
    background: none;
    transform: scale(1.05);
    
    &::before {
      opacity: 1;
    }
  }
  
  /* Focus state for accessibility */
  &:focus-visible {
    outline: 2px solid ${GALAXY_THEME_COLORS.primary};
    outline-offset: 2px;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: linear-gradient(135deg, 
    ${GALAXY_THEME_COLORS.backgroundPrimary} 0%, 
    rgba(16, 16, 32, 0.98) 35%, 
    ${GALAXY_THEME_COLORS.backgroundSecondary} 100%
  );
  backdrop-filter: blur(20px) saturate(1.8);
  padding: 80px 24px 24px; 
  display: flex; 
  flex-direction: column; 
  z-index: 1001; 
  overflow-y: auto;
  
  /* Add star field effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 80% 70%, rgba(255, 64, 108, 0.1) 1px, transparent 1px),
                radial-gradient(circle at 40% 80%, rgba(0, 255, 255, 0.08) 1px, transparent 1px);
    background-size: 50px 50px, 80px 80px, 60px 60px;
    animation: ${starTwinkle} 4s ease-in-out infinite alternate;
    pointer-events: none;
  }
  
  @media (max-width: 480px) {
    padding: 70px 20px 20px;
  }
`;

const MobileNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  margin: 6px 0;
  color: ${({ $isActive }) => $isActive ? GALAXY_THEME_COLORS.primary : GALAXY_THEME_COLORS.textSecondary};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: ${({ $isActive }) => $isActive ? 600 : 500};
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  
  /* Galaxy mobile link background */
  background: ${({ $isActive }) => 
    $isActive 
      ? `linear-gradient(135deg, rgba(0, 217, 255, 0.12) 0%, rgba(255, 64, 129, 0.06) 100%)`
      : 'transparent'
  };
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: ${({ $isActive }) => $isActive ? '4px' : '0px'};
    height: 60%;
    background: linear-gradient(180deg, ${GALAXY_THEME_COLORS.primary} 0%, ${GALAXY_THEME_COLORS.accentLight} 100%);
    transform: translateY(-50%);
    border-radius: 2px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.8);
  }
  
  &:hover {
    color: ${GALAXY_THEME_COLORS.primary};
    background: linear-gradient(135deg, rgba(0, 217, 255, 0.18) 0%, rgba(255, 64, 129, 0.09) 100%);
    text-shadow: 0 0 14px rgba(0, 217, 255, 0.7);
    transform: translateX(8px);
    
    &::after {
      width: 4px;
    }
  }
  
  /* Icon styling */
  svg {
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    padding: 14px 16px;
    margin: 4px 0;
  }
`;

const MobileLogoutButton = styled(motion.button)`
  margin: 8px 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 500;
  padding: 16px 20px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  
  &:hover {
    color: ${GALAXY_THEME_COLORS.accentLight};
    background: linear-gradient(135deg, rgba(255, 64, 129, 0.18) 0%, rgba(244, 67, 54, 0.09) 100%);
    text-shadow: 0 0 14px rgba(255, 107, 157, 0.7);
    transform: translateX(8px);
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    padding: 14px 16px;
    margin: 4px 0;
  }
`;

// ===================== Enhanced Animation Variants =====================
const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const mobileMenuVariants = {
  closed: {
    opacity: 0,
    x: "-100%",
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  },
  open: {
    opacity: 1,
    x: "0%",
    transition: {
      duration: 0.4,
      ease: "easeInOut",
      when: "beforeChildren",
      staggerChildren: 0.05
    }
  }
};

// ===================== Enhanced Header Component =====================
const EnhancedGalaxyHeader: React.FC = memo(() => {
  // State management
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Context hooks
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const { theme: contextTheme } = useUniversalTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Safe theme access with fallbacks
  const theme = {
    colors: {
      primary: getThemeValue(contextTheme, 'colors.primary', GALAXY_THEME_COLORS.primary),
      accent: getThemeValue(contextTheme, 'colors.accent', GALAXY_THEME_COLORS.accent),
      primaryLight: getThemeValue(contextTheme, 'colors.primaryLight', GALAXY_THEME_COLORS.primaryLight)
    },
    text: {
      primary: getThemeValue(contextTheme, 'text.primary', GALAXY_THEME_COLORS.textPrimary)
    }
  };
  
  // Material UI hooks
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('lg'));
  
  // Refs
  const headerRef = useRef<HTMLElement>(null);
  
  // Enhanced scroll handler with performance optimization
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
    
    // Set scrolled state for styling
    setIsScrolled(currentScrollY > 10);
    
    // Header visibility logic with improved UX
    if (currentScrollY < 10) {
      // Always show at top
      setIsVisible(true);
    } else if (scrollDirection === 'down' && currentScrollY > lastScrollY + 10) {
      // Hide when scrolling down (with threshold)
      setIsVisible(false);
    } else if (scrollDirection === 'up' && currentScrollY < lastScrollY - 5) {
      // Show when scrolling up (with threshold)
      setIsVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);
  
  // Throttled scroll effect
  useEffect(() => {
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [handleScroll]);
  
  // Handle mobile menu overflow and escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Enhanced logout handler with better UX
  const handleLogout = useCallback(() => {
    try {
      // Close mobile menu if open
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      
      // Call the auth context logout function
      logout();
      
      console.log('Successfully logged out, resetting application state');
      
      // Clear auth storage
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('login_timestamp');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      } catch (storageError) {
        console.warn('Error clearing auth storage:', storageError);
      }
      
      // Navigate to home with clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/';
    }
  }, [mobileMenuOpen, logout]);

  // Check if a route is active
  const isActive = useCallback((path: string): boolean => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  }, [location.pathname]);

  // Role-based dashboard access
  const isRoleEnabled = useCallback((dashboardType: string) => {
    if (!user || !user.role) return false;
    
    switch (dashboardType) {
      case 'admin':
        return user.role === 'admin';
      case 'trainer':
        return user.role === 'admin' || user.role === 'trainer';
      case 'client':
        return user.role === 'admin' || user.role === 'client';
      case 'user':
        return true;
      default:
        return false;
    }
  }, [user]);

  /**
   * Desktop navigation links with consolidated store
   */
  const renderDesktopLinks = useCallback(() => {
    if (user) {
      return (
        <>
          <StyledNavLink 
            to="/store" 
            $isActive={isActive('/store') || isActive('/shop')}
            variants={itemVariants}
          >
            SwanStudios Store
          </StyledNavLink>
          
          <StyledNavLink 
            to="/gamification" 
            $isActive={isActive('/gamification')}
            variants={itemVariants}
          >
            Gamification
          </StyledNavLink>
          
          <Box sx={{ ml: 1, mr: 1 }}>
            <DashboardSelector />
          </Box>
        </>
      );
    } else {
      return (
        <>
          <StyledNavLink 
            to="/store" 
            $isActive={isActive('/store')}
            variants={itemVariants}
          >
            SwanStudios Store
          </StyledNavLink>
          
          <StyledNavLink 
            to="/login" 
            $isActive={isActive('/login')}
            variants={itemVariants}
          >
            Login
          </StyledNavLink>
          
          <StyledNavLink 
            to="/signup" 
            $isActive={isActive('/signup')}
            variants={itemVariants}
          >
            Sign Up
          </StyledNavLink>
        </>
      );
    }
  }, [user, isActive]);

  /**
   * Mobile navigation links with enhanced UX
   */
  const renderMobileLinks = useCallback(() => {
    const closeMobileMenu = () => setMobileMenuOpen(false);
    
    if (user) {
      return (
        <>
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/store" 
              onClick={closeMobileMenu}
              $isActive={isActive('/store') || isActive('/shop')}
            >
              <ShoppingBagIcon fontSize="small" /> SwanStudios Store
            </MobileNavLink>
          </motion.div>
          
          {/* Role-based dashboard links */}
          {isRoleEnabled('admin') && (
            <motion.div variants={itemVariants}>
              <MobileNavLink
                to="/dashboard/default" 
                onClick={closeMobileMenu}
                $isActive={isActive('/dashboard')}
              >
                <LayoutDashboard size={20} /> Admin Dashboard
              </MobileNavLink>
            </motion.div>
          )}
          
          {isRoleEnabled('trainer') && (
            <motion.div variants={itemVariants}>
              <MobileNavLink
                to="/trainer-dashboard"
                onClick={closeMobileMenu}
                $isActive={isActive('/trainer-dashboard')}
              >
                <Users size={20} /> Trainer Dashboard
              </MobileNavLink>
            </motion.div>
          )}
          
          {isRoleEnabled('client') && (
            <motion.div variants={itemVariants}>
              <MobileNavLink
                to="/client-dashboard"
                onClick={closeMobileMenu}
                $isActive={isActive('/client-dashboard')}
              >
                <PersonIcon fontSize="small" /> Client Dashboard
              </MobileNavLink>
            </motion.div>
          )}
          
          <motion.div variants={itemVariants}>
            <MobileNavLink
              to="/user-dashboard"
              onClick={closeMobileMenu}
              $isActive={isActive('/user-dashboard')}
            >
              <PersonIcon fontSize="small" /> User Dashboard
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink
              to="/gamification"
              onClick={closeMobileMenu}
              $isActive={isActive('/gamification')}
            >
              <Gamepad2 size={20} /> Gamification Hub
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/contact" 
              onClick={closeMobileMenu}
              $isActive={isActive('/contact')}
            >
              Contact
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/about" 
              onClick={closeMobileMenu}
              $isActive={isActive('/about')}
            >
              About Us
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileLogoutButton
              onClick={handleLogout}
            >
              Logout
            </MobileLogoutButton>
          </motion.div>
        </>
      );
    } else {
      return (
        <>
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/store" 
              onClick={closeMobileMenu}
              $isActive={isActive('/store')}
            >
              <ShoppingBagIcon fontSize="small" /> SwanStudios Store
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/contact" 
              onClick={closeMobileMenu}
              $isActive={isActive('/contact')}
            >
              Contact
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/about" 
              onClick={closeMobileMenu}
              $isActive={isActive('/about')}
            >
              About Us
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink
              to="/login"
              onClick={closeMobileMenu}
              $isActive={isActive('/login')}
            >
              Login
            </MobileNavLink>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MobileNavLink
              to="/signup"
              onClick={closeMobileMenu}
              $isActive={isActive('/signup')}
            >
              Sign Up
            </MobileNavLink>
          </motion.div>
        </>
      );
    }
  }, [user, isActive, isRoleEnabled, handleLogout]);

  return (
    <>
      {/* Main Galaxy Header */}
      <HeaderContainer
        ref={headerRef}
        $isScrolled={isScrolled}
        $isVisible={isVisible}
        $isMobile={isMobile}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        role="banner"
        aria-label="Main navigation"
      >
        <HeaderContent>
          {/* Logo with Galaxy Enhancement */}
          <LogoContainer
            onClick={() => navigate('/')}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            role="button"
            aria-label="Go to homepage"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/');
              }
            }}
          >
            <Logo>
              <img src={logoImage} alt="SwanStudios Logo" />
              <span className="logo-text">SwanStudios</span>
            </Logo>
          </LogoContainer>
          
          {/* Desktop Navigation */}
          <NavLinksContainer>
            <Nav variants={containerVariants}>
              <StyledNavLink 
                to="/" 
                $isActive={isActive('/')}
                variants={itemVariants}
              >
                Home
              </StyledNavLink>
              
              {renderDesktopLinks()}
              
              <StyledNavLink 
                to="/contact" 
                $isActive={isActive('/contact')}
                variants={itemVariants}
              >
                Contact
              </StyledNavLink>
              
              <StyledNavLink 
                to="/about" 
                $isActive={isActive('/about')}
                variants={itemVariants}
              >
                About Us
              </StyledNavLink>
            </Nav>
          </NavLinksContainer>

          {/* Actions Area */}
          <ActionsContainer variants={containerVariants}>
            {/* Notifications for authenticated users */}
            {user && (
              <motion.div variants={itemVariants}>
                <EnhancedNotificationSectionWrapper />
              </motion.div>
            )}

            {/* Shopping Cart */}
            <motion.div variants={itemVariants}>
              <Tooltip title="Shopping Cart" arrow>
                <IconButton 
                  onClick={() => setCartOpen(true)}
                  sx={{ 
                  color: GALAXY_THEME_COLORS.textSecondary,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                  color: GALAXY_THEME_COLORS.primary,
                  backgroundColor: `rgba(0, 217, 255, 0.12)`,
                  transform: 'scale(1.05)',
                  },
                    '&:focus-visible': {
                  outline: `2px solid ${GALAXY_THEME_COLORS.primary}`,
                  outlineOffset: '2px'
                }
              }}
                  aria-label="Open shopping cart"
                >
                  <Badge 
                    badgeContent={cart?.itemCount || 0} 
                    color="error"
                    sx={{ 
                      '& .MuiBadge-badge': {
                        backgroundColor: GALAXY_THEME_COLORS.accent,
                        fontSize: '0.65rem',
                        minWidth: '18px',
                        height: '18px',
                        boxShadow: `0 0 10px rgba(255, 64, 129, 0.7)`,
                        fontWeight: 600,
                  color: GALAXY_THEME_COLORS.textPrimary
                      }
                    }}
                  >
                    <ShoppingCartIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
            </motion.div>

            {/* Universal Theme Toggle */}
            <motion.div variants={itemVariants}>
              <UniversalThemeToggle size="medium" />
            </motion.div>

            {/* User Profile or Login */}
            {user ? (
              <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tooltip title={`${user?.firstName || 'User'} Profile`} arrow>
                  <IconButton
                    sx={{ 
                      bgcolor: GALAXY_THEME_COLORS.primary,
                      width: 36,
                      height: 36,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: GALAXY_THEME_COLORS.backgroundPrimary,
                      boxShadow: `0 0 18px rgba(0, 217, 255, 0.5)`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: GALAXY_THEME_COLORS.primaryLight,
                        boxShadow: `0 0 28px rgba(0, 217, 255, 0.7)`,
                        transform: 'scale(1.1) rotate(5deg)'
                      },
                      '&:focus-visible': {
                        outline: `3px solid ${GALAXY_THEME_COLORS.accent}`,
                        outlineOffset: '2px'
                      }
                    }}
                    aria-label="User profile"
                  >
                    {user?.firstName?.[0]?.toUpperCase() || 'U'}
                  </IconButton>
                </Tooltip>
                
                {!isMobile && (
                  <LogoutButton onClick={handleLogout}>
                    Logout
                  </LogoutButton>
                )}
              </motion.div>
            ) : (
              <>
                {isMobile && (
                  <motion.div variants={itemVariants}>
                    <Tooltip title="Sign In" arrow>
                      <IconButton
                        onClick={() => navigate('/login')}
                        sx={{ 
                          color: GALAXY_THEME_COLORS.textSecondary,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            color: GALAXY_THEME_COLORS.primary,
                            backgroundColor: `rgba(0, 217, 255, 0.12)`,
                            transform: 'scale(1.05)'
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${GALAXY_THEME_COLORS.primary}`,
                            outlineOffset: '2px'
                          }
                        }}
                        aria-label="Sign in"
                      >
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </motion.div>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <MobileMenuButton
              $isOpen={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              size="medium"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              sx={{
                '&:focus-visible': {
                  outline: `2px solid ${GALAXY_THEME_COLORS.primary}`,
                  outlineOffset: '2px'
                }
              }}
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </MobileMenuButton>
          </ActionsContainer>
        </HeaderContent>
      </HeaderContainer>

      {/* Enhanced Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenu
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
            role="navigation"
            aria-label="Mobile navigation menu"
          >
            <motion.div variants={itemVariants}>
              <MobileNavLink 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                $isActive={isActive('/')}
              >
                Home
              </MobileNavLink>
            </motion.div>
            
            {renderMobileLinks()}
          </MobileMenu>
        )}
      </AnimatePresence>

      {/* Shopping Cart Modal */}
      {cartOpen && <ShoppingCart onClose={() => setCartOpen(false)} />}
      
      {/* Development Tools */}
      <Debug />
      <UserSwitcher />
    </>
  );
});

// Set display name for debugging
EnhancedGalaxyHeader.displayName = 'EnhancedGalaxyHeader';

export default EnhancedGalaxyHeader;
