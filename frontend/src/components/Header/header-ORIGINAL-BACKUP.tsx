import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
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

// ===================== Animation Keyframes =====================
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;

// Note: Keyframes will be replaced with dynamic glow in styled components
const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px currentColor); }
  50% { filter: drop-shadow(0 0 15px currentColor); }
  100% { filter: drop-shadow(0 0 5px currentColor); }
`;

// ===================== Styled Components =====================
const HeaderContainer = styled(motion.header)<{ $isScrolled: boolean; $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 20px;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme, $isScrolled }) => 
    $isScrolled 
      ? `${theme.background.primary}dd` 
      : theme.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.borders.subtle};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: ${({ $isScrolled }) => $isScrolled ? 'blur(15px)' : 'blur(8px)'};
  transform: translateY(${({ $isVisible }) => $isVisible ? '0' : '-100%'});
  box-shadow: ${({ $isScrolled }) => 
    $isScrolled 
      ? '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 15px rgba(0, 255, 255, 0.1)' 
      : 'none'};
  
  @media (max-width: 480px) {
    padding: 0 12px;
    height: 56px;
  }
`;

const HeaderContent = styled.div`
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  width: 100%; 
  max-width: 1920px; 
  margin: 0 auto;
`;

const LogoContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.primary};
  position: relative;
  margin-right: 20px;
  cursor: pointer;
`;

const LogoGlow = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, ${({ theme }) => theme.colors.primary}30 0%, transparent 70%);
  filter: blur(8px);
  z-index: -1;
  transition: all 0.3s ease;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  animation: ${float} 6s ease-in-out infinite, ${glow} 4s ease-in-out infinite;
  color: ${({ theme }) => theme.colors.primary};
  
  .logo-text {
    font-size: 1.15rem;
    color: ${({ theme }) => theme.colors.primary};
    position: relative;
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
    text-shadow: 0 0 10px ${({ theme }) => theme.colors.primary}50;
  }
  
  img {
    height: 32px;
    width: 32px;
    transition: all 0.3s ease;
    margin-right: 8px;
    filter: drop-shadow(0 0 8px ${({ theme }) => theme.colors.primary}40);
  }
  
  &:hover {
    .logo-text {
      color: ${({ theme }) => theme.colors.primaryLight || theme.colors.accent};
      text-shadow: 0 0 15px ${({ theme }) => theme.colors.primary}80;
    }
    
    img {
      filter: drop-shadow(0 0 12px ${({ theme }) => theme.colors.primary}60);
      transform: scale(1.05);
    }
  }
  
  @media (max-width: 480px) {
    .logo-text {
      font-size: 1.1rem;
    }
    img {
      height: 28px;
      width: 28px;
    }
  }
`;

const NavLinksContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-start;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const Nav = styled(motion.nav)`
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: nowrap;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ActionsContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
`;

// Navigation links
const StyledNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  color: ${({ theme, $isActive }) => $isActive ? theme.colors.primary : theme.text.primary};
  text-decoration: none;
  margin: 0;
  padding: 0 12px;
  font-weight: 500;
  font-size: 0.95rem;
  position: relative;
  height: 56px;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  letter-spacing: 0.2px;
  border-bottom: 2px solid transparent;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-bottom: 2px solid ${({ theme }) => theme.colors.primary};
    text-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}40;
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    border-bottom: 2px solid ${({ theme }) => theme.colors.primary};
    text-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}60;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text.primary};
  padding: 8px 12px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  border-radius: 6px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}10;
    text-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}40;
  }
`;

const MobileMenuButton = styled(IconButton)`
  display: none;
  color: ${({ theme }) => theme.text.primary};
  padding: 8px;
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}10;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: ${({ theme }) => theme.background.primary};
  backdrop-filter: blur(15px); 
  padding: 80px 24px 24px; 
  display: flex; 
  flex-direction: column; 
  z-index: 1001; 
  overflow-y: auto;
  border-right: 1px solid ${({ theme }) => theme.borders.subtle};
`;

const MobileNavLink = styled(motion(Link))<{ $isActive?: boolean }>`
  margin: 8px 0;
  color: ${({ theme }) => theme.text.primary};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.borders.subtle};
  transition: all 0.2s ease;
  border-radius: 8px;

  &:hover, &.active {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}08;
    padding-left: 12px;
    text-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}40;
  }
`;

const MobileLogoutButton = styled(motion.button)`
  margin: 8px 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.text.primary};
  font-size: 1.1rem;
  font-weight: 500;
  padding: 12px 0;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.borders.subtle};
  transition: all 0.2s ease;
  border-radius: 8px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}08;
    padding-left: 12px;
    text-shadow: 0 0 8px ${({ theme }) => theme.colors.primary}40;
  }
`;

// ===================== Animation Variants =====================
// Simplified animations for better performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  }
};

const mobileMenuVariants = {
  closed: {
    opacity: 0,
    x: "-100%",
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  },
  open: {
    opacity: 1,
    x: "0%",
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

// ===================== Header Component =====================
const EnhancedHeader = () => {
  // State management
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Context hooks
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const { theme } = useUniversalTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Material UI hooks
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  // Refs
  const headerRef = useRef(null);
  
  // Enhanced scroll effect with hide/show behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
      
      // Set scrolled state for styling
      setIsScrolled(currentScrollY > 10);
      
      // Header visibility logic
      if (currentScrollY < 10) {
        // Always show at top
        setIsVisible(true);
      } else if (scrollDirection === 'down' && currentScrollY > lastScrollY + 5) {
        // Hide when scrolling down (with threshold)
        setIsVisible(false);
      } else if (scrollDirection === 'up' && currentScrollY < lastScrollY - 5) {
        // Show when scrolling up (with threshold)
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    // Throttle scroll events for performance
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
  }, [lastScrollY]);
  
  // Handle mobile menu overflow
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Enhanced handleLogout function with comprehensive cleanup
  const handleLogout = () => {
    try {
      // First close mobile menu if open
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      
      // Call the auth context logout function
      logout();
      
      console.log('Successfully logged out, resetting application state');
      
      // For completeness, manually clear all possible auth storage
      try {
        // Clear specific auth entries
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('login_timestamp');
        
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      } catch (storageError) {
        console.warn('Error clearing auth storage:', storageError);
      }
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        console.log('Forcing page reload to ensure clean state');
        window.location.href = '/';
        
        // Backup reload in case the redirect fails
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }, 100);
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Emergency fallback - force reload
      window.location.href = '/';
    }
  };

  // Check if a route is active
  const isActive = (path: string): boolean => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Function to determine if a dashboard option should be enabled based on user role
  const isRoleEnabled = (dashboardType: string) => {
    if (!user || !user.role) return false;
    
    switch (dashboardType) {
      case 'admin':
        return user.role === 'admin';
      case 'trainer':
        return user.role === 'admin' || user.role === 'trainer';
      case 'client':
        return user.role === 'admin' || user.role === 'client';
      case 'user':
        return true; // All authenticated users can access user dashboard
      default:
        return false;
    }
  };

  /**
   * Renders desktop navigation links - CONSOLIDATED STORE LINK
   */
  const renderDesktopLinks = () => {
    if (user) {
      return (
        <>
          {/* SINGLE CONSOLIDATED SWANSTUDIOS STORE LINK */}
          <StyledNavLink 
            to="/store" 
            className={isActive('/store') || isActive('/shop') ? "active" : ""}
            variants={itemVariants}
          >
            SwanStudios Store
          </StyledNavLink>
          
          {/* 🎮 ADVANCED GAMIFICATION HUB - PHASE 4 ENHANCEMENT */}
          <StyledNavLink 
            to="/gamification" 
            className={isActive('/gamification') ? "active" : ""}
            variants={itemVariants}
          >
            Gamification
          </StyledNavLink>
          
          {/* Dashboard Selector - Always show for logged-in users */}
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
            className={isActive('/store') ? "active" : ""}
            variants={itemVariants}
          >
            SwanStudios Store
          </StyledNavLink>
          
          <StyledNavLink 
            to="/login" 
            className={isActive('/login') ? "active" : ""}
            variants={itemVariants}
          >
            Login
          </StyledNavLink>
          
          <StyledNavLink 
            to="/signup" 
            className={isActive('/signup') ? "active" : ""}
            variants={itemVariants}
          >
            Sign Up
          </StyledNavLink>
        </>
      );
    }
  };

  /**
   * Renders mobile navigation links - CONSOLIDATED STORE LINK
   */
  const renderMobileLinks = () => {
    if (user) {
      return (
        <>
          {/* SINGLE CONSOLIDATED SWANSTUDIOS STORE LINK */}
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              to="/store" 
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/store') || isActive('/shop') ? "active" : ""}
            >
              <ShoppingBagIcon fontSize="small" /> SwanStudios Store
            </MobileNavLink>
          </motion.div>
          
          {/* Dashboard Links - Role-based visibility */}
          {isRoleEnabled('admin') && (
            <MobileNavLink
              to="/dashboard/default" 
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/dashboard') ? "active" : ""}
              variants={itemVariants}
            >
              <LayoutDashboard fontSize="small" /> Admin Dashboard
            </MobileNavLink>
          )}
          
          {isRoleEnabled('trainer') && (
            <MobileNavLink
              to="/trainer-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/trainer-dashboard') ? "active" : ""}
              variants={itemVariants}
            >
              <Users fontSize="small" /> Trainer Dashboard
            </MobileNavLink>
          )}
          
          {isRoleEnabled('client') && (
            <MobileNavLink
              to="/client-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/client-dashboard') ? "active" : ""}
              variants={itemVariants}
            >
              <PersonIcon fontSize="small" /> Client Dashboard
            </MobileNavLink>
          )}
          
          {/* User Dashboard - Available to all authenticated users */}
          <MobileNavLink
            to="/user-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/user-dashboard') ? "active" : ""}
            variants={itemVariants}
          >
            <PersonIcon fontSize="small" /> User Dashboard
          </MobileNavLink>
          
          {/* 🎮 ADVANCED GAMIFICATION HUB - PHASE 4 ENHANCEMENT */}
          <MobileNavLink
            to="/gamification"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/gamification') ? "active" : ""}
            variants={itemVariants}
          >
            <Gamepad2 fontSize="small" /> Gamification Hub
          </MobileNavLink>
          
          <MobileNavLink 
            to="/contact" 
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/contact') ? "active" : ""}
            variants={itemVariants}
          >
            Contact
          </MobileNavLink>
          
          <MobileNavLink 
            to="/about" 
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/about') ? "active" : ""}
            variants={itemVariants}
          >
            About Us
          </MobileNavLink>
          
          <MobileLogoutButton
            onClick={() => {
              handleLogout();
            }}
            variants={itemVariants}
          >
            Logout
          </MobileLogoutButton>
        </>
      );
    } else {
      return (
        <>
          <MobileNavLink 
            to="/store" 
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/store') ? "active" : ""}
            variants={itemVariants}
          >
            <ShoppingBagIcon fontSize="small" /> SwanStudios Store
          </MobileNavLink>
          
          <MobileNavLink 
            to="/contact" 
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/contact') ? "active" : ""}
            variants={itemVariants}
          >
            Contact
          </MobileNavLink>
          
          <MobileNavLink 
            to="/about" 
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/about') ? "active" : ""}
            variants={itemVariants}
          >
            About Us
          </MobileNavLink>
          
          <MobileNavLink
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/login') ? "active" : ""}
            variants={itemVariants}
          >
            Login
          </MobileNavLink>
          
          <MobileNavLink
            to="/signup"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/signup') ? "active" : ""}
            variants={itemVariants}
          >
            Sign Up
          </MobileNavLink>
        </>
      );
    }
  };

  return (
    <>
      {/* Main Header */}
      <HeaderContainer
        ref={headerRef}
        $isScrolled={isScrolled}
        $isVisible={isVisible}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <HeaderContent>
          {/* Logo Area with Glow Effect */}
          <LogoContainer
            onClick={() => navigate('/')}
            variants={itemVariants}
          >
            <LogoGlow />
            <Logo>
              <img src={logoImage} alt="SwanStudios Logo" />
              <span className="logo-text">SwanStudios</span>
            </Logo>
          </LogoContainer>
          
          {/* Navigation Area */}
          <NavLinksContainer>
            <Nav variants={containerVariants}>
              <StyledNavLink 
                to="/" 
                className={isActive('/') ? "active" : ""}
                variants={itemVariants}
              >
                Home
              </StyledNavLink>
              
              {renderDesktopLinks()}
              
              {/* Contact and About - Always visible */}
              <StyledNavLink 
                to="/contact" 
                className={isActive('/contact') ? "active" : ""}
                variants={itemVariants}
              >
                Contact
              </StyledNavLink>
              
              <StyledNavLink 
                to="/about" 
                className={isActive('/about') ? "active" : ""}
                variants={itemVariants}
              >
                About Us
              </StyledNavLink>
            </Nav>
          </NavLinksContainer>

          {/* Actions Area */}
          <ActionsContainer variants={containerVariants}>
            {/* Notification Icon - Only for logged in users - TEMPORARILY DISABLED */}
            {/* TODO: Re-enable after fixing React error #306 in production */}
            {false && user && (
              <EnhancedNotificationSectionWrapper />
            )}

            {/* Shopping Cart */}
            <IconButton 
              onClick={() => setCartOpen(true)}
              sx={{ 
                color: theme.text.primary,
                '&:hover': {
                  color: theme.colors.primary,
                  backgroundColor: `${theme.colors.primary}10`
                }
              }}
            >
              <Badge 
                badgeContent={cart?.itemCount || 0} 
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': {
                    backgroundColor: theme.colors.accent || '#ec4899',
                    fontSize: '0.65rem',
                    minWidth: '18px',
                    height: '18px',
                    boxShadow: `0 0 8px ${theme.colors.accent || '#ec4899'}40`
                  }
                }}
              >
                <ShoppingCartIcon fontSize="small" />
              </Badge>
            </IconButton>

            {/* Universal Theme Toggle */}
            <UniversalThemeToggle size="medium" />

            {/* User Profile - Only for logged in users */}
            {user ? (
              <>
                <IconButton
                  sx={{ 
                    bgcolor: theme.colors.primary,
                    width: 36,
                    height: 36,
                    fontSize: '0.9rem',
                    ml: 0.5,
                    color: theme.colors.white || '#ffffff',
                    boxShadow: `0 0 12px ${theme.colors.primary}40`,
                    '&:hover': {
                      bgcolor: theme.colors.primaryDeep || theme.colors.secondary,
                      boxShadow: `0 0 16px ${theme.colors.primary}60`,
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  {user?.firstName?.[0] || 'U'}
                </IconButton>
                
                {!isMobile && (
                  <LogoutButton onClick={handleLogout}>
                    Logout
                  </LogoutButton>
                )}
              </>
            ) : (
              <>
                {isMobile && (
                  <IconButton
                    onClick={() => navigate('/login')}
                    sx={{ 
                      color: theme.text.primary,
                      '&:hover': {
                        color: theme.colors.primary,
                        backgroundColor: `${theme.colors.primary}10`
                      }
                    }}
                  >
                    <PersonIcon fontSize="small" />
                  </IconButton>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <MobileMenuButton
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              size="medium"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </MobileMenuButton>
          </ActionsContainer>
        </HeaderContent>
      </HeaderContainer>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenu
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
          >
            <MobileNavLink 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/') ? "active" : ""}
              variants={itemVariants}
            >
              Home
            </MobileNavLink>
            
            {renderMobileLinks()}
          </MobileMenu>
        )}
      </AnimatePresence>

      {/* Shopping Cart Modal */}
      {cartOpen && <ShoppingCart onClose={() => setCartOpen(false)} />}
      
      {/* Debug Component for Development */}
      <Debug />
      
      {/* User Switcher for Development */}
      <UserSwitcher />
    </>
  );
};

export default EnhancedHeader;