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
  Menu, 
  MenuItem, 
  Tooltip,
  IconButton,
  Badge,
  Box
} from "@mui/material";

// Import icons
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { LayoutDashboard, Users } from 'lucide-react';

// Import custom components
import EnhancedNotificationSectionWrapper from './EnhancedNotificationSectionWrapper';
import Debug from '../Debug/Debug';
import { UserSwitcher } from '../UserSwitcher';
import UniversalThemeToggle from '../../context/ThemeContext/UniversalThemeToggle';

// ===================== Animation Keyframes =====================
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;

const glow = keyframes`
  0% { filter: drop-shadow(0 0 5px rgba(0,160,227,0.3)); }
  50% { filter: drop-shadow(0 0 15px rgba(0,160,227,0.6)); }
  100% { filter: drop-shadow(0 0 5px rgba(0,160,227,0.3)); }
`;

// ===================== Styled Components =====================
const HeaderContainer = styled(motion.header)`
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
  background: #0a0a1a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  
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
  color: #00a0e3;
  position: relative;
  margin-right: 20px;
  cursor: pointer;
`;

const LogoGlow = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(0, 160, 227, 0.3) 0%, transparent 70%);
  filter: blur(8px);
  z-index: -1;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  animation: ${float} 6s ease-in-out infinite, ${glow} 4s ease-in-out infinite;
  
  .logo-text {
    font-size: 1.15rem;
    color: #00a0e3;
    position: relative;
    letter-spacing: 0.5px;
    transition: color 0.3s ease;
  }
  
  img {
    height: 32px;
    width: 32px;
    transition: all 0.3s ease;
    margin-right: 8px;
  }
  
  &:hover .logo-text {
    color: #10b5f0;
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
const StyledNavLink = styled(motion.create(Link))`
  color: white;
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
    color: #00a0e3;
    border-bottom: 2px solid #00a0e3;
  }
  
  &.active {
    color: #00a0e3;
    border-bottom: 2px solid #00a0e3;
  }
`;

const StyledNavLinkWithDropdown = styled(StyledNavLink)`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const StyledDropdownIcon = styled(KeyboardArrowDownIcon)`
  font-size: 14px;
  transition: transform 0.3s ease;
  margin-left: 2px;
`;

const StyledMenuItem = styled(MenuItem)`
  padding: 12px 16px;
  min-width: 180px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: rgba(0, 160, 227, 0.05);
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  padding: 8px 12px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: #00a0e3;
  }
`;

const MobileMenuButton = styled(IconButton)`
  display: none;
  color: white;
  padding: 8px;
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &:hover {
    color: #00a0e3;
    background: rgba(0, 160, 227, 0.05);
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: #0a0a1a;
  backdrop-filter: blur(10px); 
  padding: 80px 24px 24px; 
  display: flex; 
  flex-direction: column; 
  z-index: 9; 
  overflow-y: auto;
`;

const MobileNavLink = styled(motion.create(Link))`
  margin: 8px 0;
  color: white;
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: color 0.2s ease;
  
  &:hover, &.active {
    color: #00a0e3;
  }
`;

const MobileSubMenu = styled(motion.div)`
  margin-left: 20px;
  display: flex;
  flex-direction: column;
`;

const MobileLogoutButton = styled(motion.button)`
  margin: 8px 0;
  background: none;
  border: none;
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 12px 0;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: color 0.2s ease;
  
  &:hover {
    color: #00a0e3;
  }
`;

const NewBadge = styled.span`
  background: #ec4899;
  color: white;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 5px;
  font-weight: bold;
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
  const [mobileStoreExpanded, setMobileStoreExpanded] = useState(false);
  const [storeAnchorEl, setStoreAnchorEl] = useState<null | HTMLElement>(null);
  
  // Context hooks
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Material UI hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Refs
  const headerRef = useRef(null);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
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

  // Handle store dropdown
  const handleStoreClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setStoreAnchorEl(event.currentTarget);
  };

  const handleStoreClose = () => {
    setStoreAnchorEl(null);
  };

  // Handle mobile store toggle
  const toggleMobileStore = () => {
    setMobileStoreExpanded(!mobileStoreExpanded);
  };

  // Navigate to store section
  const handleStoreNavigate = (path: string) => {
    navigate(path);
    handleStoreClose();
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

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

  /**
   * Renders desktop navigation links
   */
  const renderDesktopLinks = () => {
    if (user) {
      return (
        <>
          {/* Store Dropdown */}
          <StyledNavLinkWithDropdown 
            as="div"
            onClick={handleStoreClick}
            className={isActive('/store') ? "active" : ""}
            variants={itemVariants}
          >
            Store <StyledDropdownIcon />
          </StyledNavLinkWithDropdown>
          
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
            Store
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
   * Renders mobile navigation links
   */
  const renderMobileLinks = () => {
    if (user) {
      return (
        <>
          {/* Mobile Store Links */}
          <motion.div variants={itemVariants}>
            <MobileNavLink 
              as="div"
              onClick={toggleMobileStore}
              className={isActive('/store') ? "active" : ""}
            >
              Store 
              <KeyboardArrowDownIcon 
                style={{ 
                  marginLeft: 'auto', 
                  transform: mobileStoreExpanded ? 'rotate(180deg)' : 'none', 
                  transition: 'transform 0.3s ease'
                }} 
              />
            </MobileNavLink>
            
            {mobileStoreExpanded && (
              <MobileSubMenu
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MobileNavLink 
                  to="/store" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={isActive('/store') && !location.pathname.includes('/shop') ? "active" : ""}
                >
                  <ShoppingBagIcon fontSize="small" /> All Products
                </MobileNavLink>
                <MobileNavLink 
                  to="/shop/training-packages" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={location.pathname.includes('/training-packages') ? "active" : ""}
                >
                  <FitnessCenterIcon fontSize="small" /> Training Packages
                </MobileNavLink>
                <MobileNavLink 
                  to="/shop/apparel" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={location.pathname.includes('/apparel') ? "active" : ""}
                >
                  <LocalMallIcon fontSize="small" /> Apparel
                </MobileNavLink>
                <MobileNavLink 
                  to="/shop/supplements" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={location.pathname.includes('/supplements') ? "active" : ""}
                >
                  <EventNoteIcon fontSize="small" /> 
                  Supplements <NewBadge>NEW</NewBadge>
                </MobileNavLink>
              </MobileSubMenu>
            )}
          </motion.div>
          
          {/* Dashboard Links */}
          <MobileNavLink
            to="/dashboard/default" 
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/dashboard') ? "active" : ""}
            variants={itemVariants}
            style={{ opacity: user?.role === 'admin' ? 1 : 0.5 }}
          >
            <LayoutDashboard fontSize="small" /> Admin Dashboard
          </MobileNavLink>
          
          <MobileNavLink
            to="/trainer-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/trainer-dashboard') ? "active" : ""}
            variants={itemVariants}
            style={{ opacity: user?.role === 'admin' || user?.role === 'trainer' ? 1 : 0.5 }}
          >
            <Users fontSize="small" /> Trainer Dashboard
          </MobileNavLink>
          
          <MobileNavLink
            to="/client-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/client-dashboard') ? "active" : ""}
            variants={itemVariants}
          >
            <PersonIcon fontSize="small" /> Client Dashboard
          </MobileNavLink>
          
          <MobileNavLink
            to="/user-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={isActive('/user-dashboard') ? "active" : ""}
            variants={itemVariants}
          >
            <PersonIcon fontSize="small" /> User Dashboard
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
            Store
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
        style={{
          boxShadow: isScrolled ? '0 5px 20px rgba(0, 0, 0, 0.3)' : 'none',
          backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        }}
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
            {/* Notification Icon - Only for logged in users */}
            {user && (
              <EnhancedNotificationSectionWrapper />
            )}

            {/* Shopping Cart */}
            <IconButton 
              onClick={() => setCartOpen(true)}
              sx={{ 
                color: 'white',
                '&:hover': {
                  color: '#00a0e3',
                  backgroundColor: 'rgba(0, 160, 227, 0.05)'
                }
              }}
            >
              <Badge 
                badgeContent={cart?.itemCount || 0} 
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ec4899',
                    fontSize: '0.65rem',
                    minWidth: '18px',
                    height: '18px'
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
                    bgcolor: '#00a0e3',
                    width: 36,
                    height: 36,
                    fontSize: '0.9rem',
                    ml: 0.5,
                    '&:hover': {
                      bgcolor: '#0090d0',
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
                      color: 'white',
                      '&:hover': {
                        color: '#00a0e3',
                        backgroundColor: 'rgba(0, 160, 227, 0.05)'
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
        
        {/* Store Dropdown Menu */}
        <Menu
          anchorEl={storeAnchorEl}
          open={Boolean(storeAnchorEl)}
          onClose={handleStoreClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          PaperProps={{
            sx: {
              mt: 0.5,
              ml: -1,
              bgcolor: '#0a0a1a',
              color: 'white',
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '4px',
              '& .MuiMenuItem-root': {
                px: 2,
                py: 1.5,
                '&:hover': {
                  bgcolor: 'rgba(0, 160, 227, 0.05)'
                }
              }
            }
          }}
          MenuListProps={{
            sx: {
              py: 0.5
            }
          }}
        >
          <StyledMenuItem onClick={() => handleStoreNavigate('/store')}>
            <ShoppingBagIcon fontSize="small" /> All Products
          </StyledMenuItem>
          <StyledMenuItem onClick={() => handleStoreNavigate('/shop/training-packages')}>
            <FitnessCenterIcon fontSize="small" /> Training Packages
          </StyledMenuItem>
          <StyledMenuItem onClick={() => handleStoreNavigate('/shop/apparel')}>
            <LocalMallIcon fontSize="small" /> Apparel
          </StyledMenuItem>
          <StyledMenuItem 
            onClick={() => handleStoreNavigate('/shop/supplements')}
            sx={{
              '& .MuiListItemText-primary': {
                display: 'flex',
                alignItems: 'center'
              }
            }}
          >
            <EventNoteIcon fontSize="small" />
            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
              Supplements <NewBadge>NEW</NewBadge>
            </Box>
          </StyledMenuItem>
        </Menu>
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