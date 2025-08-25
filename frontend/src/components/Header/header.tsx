// SIMPLIFIED HEADER - Remove problematic imports first, then add features back
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "../../assets/Logo.png";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

// Material UI imports - simplified
import { 
  useMediaQuery, 
  useTheme, 
  IconButton,
  Badge
} from "@mui/material";

// Import icons
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';

// Import theme context
import { useUniversalTheme } from '../../context/ThemeContext';

// ===================== Animation Keyframes =====================
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;

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

// Navigation links - SIMPLIFIED VERSION
const StyledNavLink = styled(Link)`
  color: ${({ theme }) => theme.text.primary};
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

const MobileNavLink = styled(Link)`
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

// ===================== Animation Variants =====================
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

// ===================== SIMPLIFIED Header Component =====================
const SimplifiedHeader = () => {
  // State management
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Context hooks - BASIC ONES ONLY
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const { theme } = useUniversalTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Material UI hooks
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  // Basic scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);
      setIsVisible(currentScrollY < 100 || currentScrollY < window.lastScrollY);
      window.lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
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

  // Simple handleLogout
  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  // Check if a route is active
  const isActive = (path: string): boolean => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  console.log('🎯 SimplifiedHeader rendering with user:', user ? user.firstName : 'no user');

  return (
    <>
      {/* Main Header */}
      <HeaderContainer
        $isScrolled={isScrolled}
        $isVisible={isVisible}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <HeaderContent>
          {/* Logo Area */}
          <LogoContainer onClick={() => navigate('/')}>
            <Logo>
              <img src={logoImage} alt="SwanStudios Logo" />
              <span className="logo-text">SwanStudios</span>
            </Logo>
          </LogoContainer>
          
          {/* Navigation Area - Desktop */}
          <Nav variants={containerVariants}>
            <StyledNavLink 
              to="/" 
              className={isActive('/') ? "active" : ""}
            >
              Home
            </StyledNavLink>
            
            <StyledNavLink 
              to="/store" 
              className={isActive('/store') ? "active" : ""}
            >
              Store
            </StyledNavLink>
            
            <StyledNavLink 
              to="/contact" 
              className={isActive('/contact') ? "active" : ""}
            >
              Contact
            </StyledNavLink>
            
            <StyledNavLink 
              to="/about" 
              className={isActive('/about') ? "active" : ""}
            >
              About
            </StyledNavLink>
            
            {user ? (
              <LogoutButton onClick={handleLogout}>
                Logout
              </LogoutButton>
            ) : (
              <StyledNavLink 
                to="/login" 
                className={isActive('/login') ? "active" : ""}
              >
                Login
              </StyledNavLink>
            )}
          </Nav>

          {/* Actions Area */}
          <ActionsContainer variants={containerVariants}>
            {/* Shopping Cart */}
            <IconButton 
              onClick={() => console.log('Cart clicked')}
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
                    height: '18px'
                  }
                }}
              >
                <ShoppingCartIcon fontSize="small" />
              </Badge>
            </IconButton>

            {/* User Profile */}
            {user && (
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
            >
              Home
            </MobileNavLink>
            
            <MobileNavLink 
              to="/store" 
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/store') ? "active" : ""}
            >
              Store
            </MobileNavLink>
            
            <MobileNavLink 
              to="/contact" 
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/contact') ? "active" : ""}
            >
              Contact
            </MobileNavLink>
            
            <MobileNavLink 
              to="/about" 
              onClick={() => setMobileMenuOpen(false)}
              className={isActive('/about') ? "active" : ""}
            >
              About
            </MobileNavLink>
            
            {user ? (
              <MobileNavLink 
                to="/" 
                onClick={handleLogout}
              >
                Logout
              </MobileNavLink>
            ) : (
              <MobileNavLink 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className={isActive('/login') ? "active" : ""}
              >
                Login
              </MobileNavLink>
            )}
          </MobileMenu>
        )}
      </AnimatePresence>
    </>
  );
};

export default SimplifiedHeader;