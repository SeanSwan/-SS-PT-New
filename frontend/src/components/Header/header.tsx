import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import logoImage from "../../assets/Logo.png";
import { useAuth } from "../../context/AuthContext";
import ShoppingCart from "../ShoppingCart/ShoppingCart";
// Material UI imports
import { useMediaQuery, useTheme } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CloseIcon from "@mui/icons-material/Close";
// Import BerryAdmin components
import NotificationSection from "./NotificationSection";
import ProfileSection from "./ProfileSection";
// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ===================== Styled Components =====================
const HeaderContainer = styled(motion.header)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 20px;
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(9, 4, 30, 0.85);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease-in-out; /* Reduced animation time for better performance */
  @media (max-width: 480px) {
    padding: 0 12px;
    height: 70px;
  }
  @media (min-width: 2560px) {
    height: 100px;
    padding: 0 40px;
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

const Logo = styled(motion.div)`
  display: flex;
  align-items: center;
  font-weight: bold;
  color: var(--neon-blue, #00ffff);
  position: relative;
  margin-right: 40px; /* Added space between logo and navigation */
  .logo-text {
    font-size: 1.5rem;
    background: linear-gradient(to right, #00ffff, #7851a9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    position: relative;
    margin-right: 10px;
  }
  img {
    height: 50px;
    margin-left: 8px;
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.5));
    transition: all 0.3s ease;
  }
  &:hover img {
    filter: drop-shadow(0 0 12px rgba(0, 255, 255, 0.8));
  }
  @media (max-width: 480px) {
    .logo-text {
      font-size: 1.2rem;
    }
    img {
      height: 40px;
    }
  }
  @media (min-width: 2560px) {
    .logo-text {
      font-size: 2rem;
    }
    img {
      height: 70px;
    }
  }
`;

const LogoGlow = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.2) 0%, transparent 70%);
  filter: blur(15px);
  opacity: 0;
  transition: opacity 0.3s ease; /* Reduced animation time */
  ${Logo}:hover & {
    opacity: 0.8;
  }
`;

const NavLinksContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-start; /* Align links to the left */
  margin-left: 20px; /* Add space after logo */
  @media (max-width: 768px) {
    display: none;
  }
`;

const Nav = styled(motion.nav)`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: visible; /* Changed from hidden to ensure all links are visible */
  @media (max-width: 768px) {
    display: none;
  }
  @media (min-width: 1200px) {
    gap: 15px;
  }
  @media (min-width: 2560px) {
    gap: 30px;
  }
`;

const ActionsContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto; /* Push to right */
  @media (min-width: 2560px) {
    gap: 20px;
  }
`;

// Fix for deprecated motion() usage - using motion.create instead
const StyledNavLink = styled(motion(Link))`
  color: #fff;
  text-decoration: none;
  margin: 0 5px;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 500;
  position: relative;
  overflow: visible; /* Changed from hidden to ensure visibility */
  transition: all 0.3s ease; /* Reduced animation time */
  white-space: nowrap; /* Prevent text wrapping */
  &:hover {
    color: var(--neon-blue, #00ffff);
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
  }
  &.active {
    color: var(--neon-blue, #00ffff);
    background: rgba(0, 255, 255, 0.15);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background: var(--neon-blue, #00ffff);
    transition: all 0.3s ease; /* Reduced animation time */
    transform: translateX(-50%);
  }
  &:hover::after, &.active::after {
    width: 80%;
  }
  @media (min-width: 1200px) {
    margin: 0 10px;
    padding: 10px 15px;
    font-size: 1.05rem;
  }
  @media (min-width: 2560px) {
    margin: 0 15px;
    padding: 15px 20px;
    font-size: 1.3rem;
  }
`;

const LogoutButton = styled(motion.button)`
  background: transparent;
  border: none;
  color: #fff;
  margin: 0 5px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  overflow: visible; /* Changed from hidden to ensure visibility */
  transition: all 0.3s ease; /* Reduced animation time */
  white-space: nowrap; /* Prevent text wrapping */
  display: flex; /* Ensure it's always visible */
  align-items: center;
  justify-content: center;
  &:hover {
    color: var(--neon-blue, #00ffff);
    background: rgba(0, 255, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background: var(--neon-blue, #00ffff);
    transition: all 0.3s ease; /* Reduced animation time */
    transform: translateX(-50%);
  }
  &:hover::after {
    width: 80%;
  }
  @media (min-width: 1200px) {
    margin: 0 10px;
    padding: 10px 15px;
    font-size: 1.05rem;
  }
  @media (min-width: 2560px) {
    margin: 0 15px;
    padding: 15px 20px;
    font-size: 1.3rem;
  }
`;

const MobileMenuButton = styled(motion.button)`
  display: none;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: visible; /* Changed from hidden to ensure visibility */
  z-index: 10;
  @media (max-width: 768px) {
    display: flex;
  }
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(0, 255, 255, 0.2) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease; /* Reduced animation time */
  }
  &:hover::before {
    opacity: 1;
  }
  @media (max-width: 480px) {
    width: 40px;
    height: 40px;
    font-size: 1.3rem;
  }
`;

const HamburgerIcon = styled.div`
  width: 24px;
  height: 18px;
  position: relative;
  transform: rotate(0deg);
  transition: 0.3s ease-in-out; /* Reduced animation time */
  span {
    display: block;
    position: absolute;
    height: 2px;
    width: 100%;
    background: #fff;
    border-radius: 9px;
    opacity: 1;
    left: 0;
    transform: rotate(0deg);
    transition: 0.2s ease-in-out; /* Reduced animation time */
    &:nth-child(1) {
      top: 0px;
    }
    &:nth-child(2), &:nth-child(3) {
      top: 8px;
    }
    &:nth-child(4) {
      top: 16px;
    }
  }
  &.open {
    span {
      &:nth-child(1) {
        top: 18px;
        width: 0%;
        left: 50%;
      }
      &:nth-child(2) {
        transform: rotate(45deg);
      }
      &:nth-child(3) {
        transform: rotate(-45deg);
      }
      &:nth-child(4) {
        top: 18px;
        width: 0%;
        left: 50%;
      }
    }
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: rgba(9, 4, 30, 0.98); 
  backdrop-filter: blur(10px); 
  padding: 100px 40px 40px; 
  display: flex; 
  flex-direction: column; 
  z-index: 9; 
  overflow-y: auto;
`;

// Fix for deprecated motion() usage
const MotionLink = motion(Link);

const MobileNavLink = styled(MotionLink)`
  margin: 15px 0;
  color: #fff;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: 500;
  position: relative;
  padding: 10px 0;
  transition: color 0.3s ease; /* Reduced animation time */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--neon-blue, #00ffff);
    transition: all 0.3s ease; /* Reduced animation time */
  }
  &:hover {
    color: var(--neon-blue, #00ffff);
  }
  &:hover::after {
    width: 100%;
  }
  &.active {
    color: var(--neon-blue, #00ffff);
  }
  &.active::after {
    width: 100%;
  }
`;

const MobileLogoutButton = styled(motion.button)`
  margin: 15px 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 500;
  cursor: pointer;
  padding: 10px 0;
  text-align: left;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--neon-blue, #00ffff);
    transition: all 0.3s ease; /* Reduced animation time */
  }
  &:hover {
    color: var(--neon-blue, #00ffff);
  }
  &:hover::after {
    width: 100%;
  }
`;

// Mobile footer styles removed to avoid duplication with dashboard footer

const CartButton = styled(motion.button)`
  background: transparent;
  border: none;
  color: #fff;
  position: relative;
  cursor: pointer;
  font-size: 1.5rem;
  margin-right: 5px;
  padding: 10px;
  border-radius: 50%;
  transition: all 0.3s ease; /* Reduced animation time */
  &:hover {
    color: var(--neon-blue, #00ffff);
    background: rgba(0, 255, 255, 0.1);
  }
  @media (min-width: 2560px) {
    font-size: 1.8rem;
  }
`;

const CartBadge = styled.span`
  position: absolute; 
  top: 0; 
  right: 0; 
  background: var(--neon-blue, #00ffff); 
  color: #000; 
  font-size: 0.7rem; 
  width: 18px; 
  height: 18px; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: bold; 
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
`;

// ===================== Animation Variants =====================
// Simplified animations for better performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05, // Reduced stagger time
      duration: 0.3 // Reduced duration
    }
  }
};

const itemVariants = {
  hidden: { y: -10, opacity: 0 }, // Reduced movement distance
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.3 } // Optimized spring physics
  }
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.9, y: -10 }, // Reduced movement
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 15, duration: 0.3 } // Optimized spring physics
  }
};

const mobileMenuVariants = {
  closed: {
    opacity: 0,
    y: "-100%",
    transition: {
      duration: 0.3, // Reduced duration
      ease: [0.76, 0, 0.24, 1],
      staggerChildren: 0.05, // Reduced stagger time
      staggerDirection: -1
    }
  },
  open: {
    opacity: 1,
    y: "0%",
    transition: {
      duration: 0.3, // Reduced duration
      ease: [0.76, 0, 0.24, 1],
      when: "beforeChildren",
      staggerChildren: 0.05, // Reduced stagger time
    }
  }
};

const mobileLinkVariants = {
  closed: {
    opacity: 0,
    x: -20, // Reduced movement distance
  },
  open: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 200, // Optimized spring physics
      damping: 20
    }
  }
};

// ===================== Header Component =====================
const EnhancedHeader = () => {
  // State to control mobile menu and shopping cart modal visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartItems, setCartItems] = useState(3); // Sample cart items count
  
  // Refs
  const headerRef = useRef(null);
  const hamburgerRef = useRef(null);
  
  // MUI theme and media query
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Authentication and navigation hooks
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Handle scroll effect - optimized
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true }); // Added passive for better performance
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // GSAP animations - simplified for better performance
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -50, opacity: 0 }, // Reduced distance
        {
          y: 0,
          opacity: 1,
          duration: 0.5, // Reduced duration
          ease: "power2.out", // Changed to simpler ease
          delay: 0.1 // Reduced delay
        }
      );
    }
  }, []);
  
  // Handle mobile menu animation
  useEffect(() => {
    if (hamburgerRef.current) {
      if (mobileMenuOpen) {
        hamburgerRef.current.classList.add('open');
        document.body.style.overflow = 'hidden';
      } else {
        hamburgerRef.current.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  }, [mobileMenuOpen]);

  /**
   * Handles user logout and redirects to home.
   */
  const handleLogout = () => {
    logout();
    navigate("/");
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  /**
   * Renders the desktop navigation links.
   */
  const renderDesktopLinks = () => {
    const currentPath = location.pathname;
    if (user) {
      return (
        <>
          <StyledNavLink 
            to="/store" 
            className={currentPath === "/store" ? "active" : ""}
            variants={itemVariants}
          >
            Training & Store
          </StyledNavLink>
          <StyledNavLink 
            to="/client-dashboard" 
            className={currentPath.includes("/client-dashboard") ? "active" : ""}
            variants={itemVariants}
          >
            Client Dashboard
          </StyledNavLink>

          {/* Visible to all logged-in users */}
          <StyledNavLink 
            to="/schedule" 
            className={currentPath === "/schedule" ? "active" : ""}
            variants={itemVariants}
          >
            Schedule
          </StyledNavLink>

          {/* Admin-only link - Updated to point to enhanced dashboard */}
          {user.role === "admin" && (
            <StyledNavLink 
              to="/dashboard/default" 
              className={currentPath.includes("/dashboard") ? "active" : ""}
              variants={itemVariants}
            >
              Admin Dashboard
            </StyledNavLink>
          )}
        </>
      );
    } else {
      return (
        <>
          <StyledNavLink 
            to="/login" 
            state={{ backgroundLocation: location }}
            className={currentPath === "/login" ? "active" : ""}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Login
          </StyledNavLink>
          <StyledNavLink 
            to="/signup" 
            state={{ backgroundLocation: location }}
            className={currentPath === "/signup" ? "active" : ""}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up
          </StyledNavLink>
        </>
      );
    }
  };

  /**
   * Renders the mobile navigation links (mirroring the desktop).
   */
  const renderMobileLinks = () => {
    const currentPath = location.pathname;
    if (user) {
      return (
        <>
          <MobileNavLink 
            to="/store" 
            onClick={() => setMobileMenuOpen(false)}
            className={currentPath === "/store" ? "active" : ""}
            variants={mobileLinkVariants}
          >
            Training & Store
          </MobileNavLink>
          <MobileNavLink
            to="/client-dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={currentPath.includes("/client-dashboard") ? "active" : ""}
            variants={mobileLinkVariants}
          >
            Client Dashboard
          </MobileNavLink>
          <MobileNavLink 
            to="/schedule" 
            onClick={() => setMobileMenuOpen(false)}
            className={currentPath === "/schedule" ? "active" : ""}
            variants={mobileLinkVariants}
          >
            Schedule
          </MobileNavLink>
          {user.role === "admin" && (
            <MobileNavLink
              to="/dashboard/default"
              onClick={() => setMobileMenuOpen(false)}
              className={currentPath.includes("/dashboard") ? "active" : ""}
              variants={mobileLinkVariants}
            >
              Admin Dashboard
            </MobileNavLink>
          )}
          <MobileLogoutButton
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            variants={mobileLinkVariants}
          >
            Logout
          </MobileLogoutButton>
        </>
      );
    } else {
      return (
        <>
          <MobileNavLink
            to="/login"
            state={{ backgroundLocation: location }}
            onClick={() => setMobileMenuOpen(false)}
            className={currentPath === "/login" ? "active" : ""}
            variants={mobileLinkVariants}
          >
            Login
          </MobileNavLink>
          <MobileNavLink
            to="/signup"
            state={{ backgroundLocation: location }}
            onClick={() => setMobileMenuOpen(false)}
            className={currentPath === "/signup" ? "active" : ""}
            variants={mobileLinkVariants}
          >
            Sign Up
          </MobileNavLink>
        </>
      );
    }
  };

  return (
    <>
      <HeaderContainer
        ref={headerRef}
        style={{
          height: isScrolled ? '70px' : '80px',
          background: isScrolled ? 'rgba(9, 4, 30, 0.95)' : 'rgba(9, 4, 30, 0.85)'
        }}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <HeaderContent>
          <Logo
            variants={logoVariants}
            whileHover={{ scale: 1.03 }} // Reduced scale effect
            whileTap={{ scale: 0.97 }} // Reduced scale effect
          >
            <LogoGlow />
            <Link to="/" className="logo-text">SwanStudios</Link>
            <img src={logoImage} alt="SwanStudios Logo" />
          </Logo>
          
          {/* Reorganized Navigation Layout */}
          <NavLinksContainer>
            <Nav variants={containerVariants}>
              <StyledNavLink 
                to="/" 
                className={location.pathname === "/" ? "active" : ""}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }} // Reduced scale effect
                whileTap={{ scale: 0.97 }} // Reduced scale effect
              >
                Home
              </StyledNavLink>
              {renderDesktopLinks()}
              <StyledNavLink 
                to="/contact" 
                className={location.pathname === "/contact" ? "active" : ""}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }} // Reduced scale effect
                whileTap={{ scale: 0.97 }} // Reduced scale effect
              >
                Contact
              </StyledNavLink>
              <StyledNavLink 
                to="/about" 
                className={location.pathname === "/about" ? "active" : ""}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }} // Reduced scale effect
                whileTap={{ scale: 0.97 }} // Reduced scale effect
              >
                About Us
              </StyledNavLink>
            </Nav>
          </NavLinksContainer>

          {/* Right Side Actions - Desktop */}
          <ActionsContainer variants={containerVariants}>
            {/* Search Section removed as requested */}

            {/* Berry Admin Notification Component - Only for logged in users */}
            {user && <NotificationSection />}

            {/* Shopping Cart Button */}
            <CartButton 
              onClick={() => setCartOpen(true)} 
              aria-label="Open shopping cart"
              variants={itemVariants}
              whileHover={{ scale: 1.05, rotate: 3 }} // Reduced effects
              whileTap={{ scale: 0.95 }}
            >
              🛒
              {cartItems > 0 && <CartBadge>{cartItems}</CartBadge>}
            </CartButton>

            {/* Berry Admin Profile Component - Only for logged in users */}
            {user && <ProfileSection />}
            
            {/* Logout Button - Only for logged-in users, now always visible */}
            {user && (
              <LogoutButton 
                onClick={handleLogout}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }} // Reduced scale effect
                whileTap={{ scale: 0.97 }} // Reduced scale effect
              >
                Logout
              </LogoutButton>
            )}

            {/* Mobile Navigation Button */}
            <MobileMenuButton 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileHover={{ scale: 1.05 }} // Reduced scale effect
              whileTap={{ scale: 0.95 }}
            >
              <HamburgerIcon ref={hamburgerRef}>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </HamburgerIcon>
            </MobileMenuButton>
          </ActionsContainer>
        </HeaderContent>
      </HeaderContainer>

      {/* Mobile Dropdown Menu */}
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
              className={location.pathname === "/" ? "active" : ""}
              variants={mobileLinkVariants}
            >
              Home
            </MobileNavLink>
            {renderMobileLinks()}
            <MobileNavLink 
              to="/contact" 
              onClick={() => setMobileMenuOpen(false)}
              className={location.pathname === "/contact" ? "active" : ""}
              variants={mobileLinkVariants}
            >
              Contact
            </MobileNavLink>
            <MobileNavLink 
              to="/about" 
              onClick={() => setMobileMenuOpen(false)}
              className={location.pathname === "/about" ? "active" : ""}
              variants={mobileLinkVariants}
            >
              About Us
            </MobileNavLink>
            
            {/* Mobile footer removed to avoid duplication with dashboard footer */}
          </MobileMenu>
        )}
      </AnimatePresence>

      {/* Render Shopping Cart Modal when open */}
      {cartOpen && <ShoppingCart onClose={() => setCartOpen(false)} />}
    </>
  );
};

export default EnhancedHeader;