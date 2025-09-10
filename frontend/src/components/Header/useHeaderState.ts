/**
 * useHeaderState.ts - Centralized Header Logic Hook
 * The "brain" of the header component containing all state, effects, and business logic
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUniversalTheme } from '../../context/ThemeContext';

// Galaxy Theme Colors for safe theme access
const GALAXY_THEME_COLORS = {
  primary: '#00d9ff',
  primaryLight: '#4de6ff',
  accent: '#ff4081',
  textPrimary: '#ffffff',
};

// Theme safety utility
const getThemeValue = (theme: any, path: string, fallback: string) => {
  try {
    const value = path.split('.').reduce((obj, key) => obj?.[key], theme);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
};

/**
 * Custom hook that manages all header state and business logic
 */
export const useHeaderState = () => {
  // ===================== STATE MANAGEMENT =====================
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // ===================== CONTEXT HOOKS =====================
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const { theme: contextTheme } = useUniversalTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // ===================== MATERIAL UI HOOKS =====================
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('lg'));
  
  // ===================== REFS =====================
  const headerRef = useRef<HTMLElement>(null);
  
  // ===================== SAFE THEME ACCESS =====================
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
  
  // ===================== SCROLL HANDLER =====================
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
  
  // ===================== LOGOUT HANDLER =====================
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

  // ===================== ROUTE CHECKING =====================
  const isActive = useCallback((path: string): boolean => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  }, [location.pathname]);

  // ===================== ROLE CHECKING =====================
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

  // ===================== HANDLER FUNCTIONS =====================
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const openCart = useCallback(() => {
    setCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setCartOpen(false);
  }, []);

  const navigateToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // ===================== EFFECTS =====================
  
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

  // ===================== ANIMATION VARIANTS =====================
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

  // ===================== RETURN HEADER STATE OBJECT =====================
  return {
    // State
    mobileMenuOpen,
    cartOpen,
    isScrolled,
    isVisible,
    
    // Context data
    user,
    cart,
    theme,
    
    // Device/screen info
    isMobile,
    isTablet,
    
    // Route info
    location,
    
    // Refs
    headerRef,
    
    // Handler functions
    toggleMobileMenu,
    openCart,
    closeCart,
    handleLogout,
    navigateToHome,
    isActive,
    isRoleEnabled,
    
    // Animation variants
    containerVariants,
    itemVariants,
    
    // Navigation
    navigate
  };
};