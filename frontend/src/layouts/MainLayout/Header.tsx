import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ChevronDown, 
  LayoutDashboard, 
  Users, 
  Shield, 
  User, 
  Dumbbell,
  ShoppingCart,
  LogOut,
  LogIn
} from 'lucide-react';

// Assets
import logo from '../../assets/Logo.png'; 

// Hooks (Assumed paths based on project structure)
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../context/CartContext';

// --- Styled Components ---

const HeaderContainer = styled.header<{ $scrolled: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  z-index: 1200; /* Increased z-index to ensure it sits above everything */
  transition: all 0.3s ease;
  background: ${({ $scrolled }) => 
    $scrolled ? 'rgba(10, 10, 20, 0.95)' : 'transparent'};
  backdrop-filter: ${({ $scrolled }) => 
    $scrolled ? 'blur(16px)' : 'none'};
  border-bottom: 1px solid ${({ $scrolled }) => 
    $scrolled ? 'rgba(255, 255, 255, 0.08)' : 'transparent'};
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    padding: 0 1.5rem;
    height: 70px;
    background: ${({ $scrolled }) => 
      $scrolled ? 'rgba(5, 5, 10, 0.98)' : 'transparent'};
  }
`;

const LogoSection = styled(Link)`
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  z-index: 1001;
`;

const LogoImage = styled.img`
  height: 45px;
  width: auto;
  
  @media (max-width: 768px) {
    height: 35px;
  }
`;

const LogoText = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
  
  span {
    color: #00ffff;
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

// --- Desktop Navigation ---

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 968px) {
    display: none;
  }
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  color: ${({ $active }) => $active ? '#00ffff' : 'rgba(255, 255, 255, 0.8)'};
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  transition: color 0.3s ease;
  position: relative;

  &:hover {
    color: #00ffff;
  }

  ${({ $active }) => $active && css`
    &::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 0;
      width: 100%;
      height: 2px;
      background: #00ffff;
      box-shadow: 0 0 10px #00ffff;
    }
  `}
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;

  @media (max-width: 968px) {
    margin-right: 3rem; /* Make space for mobile menu button */
  }
`;

const IconButton = styled(Link)`
  position: relative;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #00ffff;
    transform: scale(1.1);
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff2e63;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(10, 10, 20, 0.95);
`;

const AuthButton = styled.button`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #00ffff;
  padding: 0.5rem 1.2rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #00ffff;
    color: #000;
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  }
`;

// --- Dropdown Components ---

const DropdownContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
`;

const DropdownTrigger = styled.button<{ $isOpen: boolean }>`
  background: transparent;
  border: none;
  color: ${({ $isOpen }) => $isOpen ? '#00ffff' : 'rgba(255, 255, 255, 0.8)'};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: ${({ $isOpen }) => $isOpen ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};

  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.05);
  }

  svg {
    transition: transform 0.3s ease;
    transform: ${({ $isOpen }) => $isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  }
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 1rem;
  width: 280px;
  background: rgba(15, 15, 25, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 100;
`;

const DropdownItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  color: white;
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    transform: translateX(5px);
  }

  .icon-box {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #00ffff;
  }

  .text-content {
    display: flex;
    flex-direction: column;
    
    span.title {
      font-weight: 600;
      font-size: 0.95rem;
    }
    
    span.desc {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }
  }
`;

// --- Mobile Navigation ---

const MobileMenuBtn = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  z-index: 1002;
  padding: 0;

  @media (max-width: 968px) {
    display: block;
  }
`;

const MobileMenuOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh; /* Dynamic viewport height for mobile browsers */
  background: rgba(5, 5, 10, 0.98);
  backdrop-filter: blur(20px);
  z-index: 1300; /* Higher than header */
  padding: 6rem 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  
  /* Hide scrollbar */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const MobileNavLink = styled(Link)`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  text-decoration: none;
  padding: 1.2rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    color: #00ffff;
  }
`;

const MobileSectionTitle = styled.div`
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const MobilePortalCard = styled(Link)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  color: white;
  text-decoration: none;
  margin-bottom: 1rem;
  transition: all 0.2s ease;

  &:hover, &:active {
    background: rgba(0, 255, 255, 0.08);
    border-color: rgba(0, 255, 255, 0.3);
    transform: translateX(5px);
  }

  .icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(0, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #00ffff;
    flex-shrink: 0;
  }

  .text-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    span.title {
      font-weight: 600;
      font-size: 1.1rem;
      color: white;
    }
    
    span.desc {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
    }
  }

  svg {
    margin-left: auto;
    color: rgba(255, 255, 255, 0.3);
  }
`;

// --- Component ---

// Define props to match what MainLayout passes
interface HeaderProps {
  drawerOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ drawerOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Hooks for functionality
  const { user, logout, isAuthenticated } = useAuth();
  const { cartItems } = useCart();
  
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  const portals = [
    { 
      title: 'Trainer Portal', 
      desc: 'Manage clients & workouts', 
      path: '/dashboard/trainer', 
      icon: <Dumbbell size={24} /> 
    },
    { 
      title: 'Client Dashboard', 
      desc: 'View your progress', 
      path: '/dashboard/client', 
      icon: <User size={24} /> 
    },
    { 
      title: 'Admin Console', 
      desc: 'System management', 
      path: '/dashboard/admin', 
      icon: <Shield size={24} /> 
    },
    { 
      title: 'User Profile', 
      desc: 'Settings & Preferences', 
      path: '/profile', 
      icon: <Users size={24} /> 
    },
    // Gamification removed as requested
  ];

  return (
    <HeaderContainer $scrolled={scrolled}>
      <LogoSection to="/">
        <LogoImage src={logo} alt="SwanStudios" />
        <LogoText>SWAN<span>STUDIOS</span></LogoText>
      </LogoSection>

      {/* Desktop Navigation */}
      <DesktopNav>
        <NavLink to="/" $active={location.pathname === '/'}>Home</NavLink>
        <NavLink to="/shop" $active={location.pathname === '/shop'}>Training</NavLink>
        <NavLink to="/about" $active={location.pathname === '/about'}>About</NavLink>
        
        {/* Portals Dropdown */}
        <DropdownContainer 
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <DropdownTrigger 
            $isOpen={dropdownOpen} 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <LayoutDashboard size={18} />
            Portals
            <ChevronDown size={16} />
          </DropdownTrigger>
          
          <AnimatePresence>
            {dropdownOpen && (
              <DropdownMenu
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {portals.map((item) => (
                  <DropdownItem key={item.path} to={item.path}>
                    <div className="icon-box">{item.icon}</div>
                    <div className="text-content">
                      <span className="title">{item.title}</span>
                      <span className="desc">{item.desc}</span>
                    </div>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            )}
          </AnimatePresence>
        </DropdownContainer>

        <NavLink to="/contact">Contact</NavLink>
      </DesktopNav>

      {/* Mobile Menu Button */}
      <MobileMenuBtn onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </MobileMenuBtn>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenuOverlay
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>Home</MobileNavLink>
            <MobileNavLink to="/shop" onClick={() => setMobileMenuOpen(false)}>Training Packages</MobileNavLink>
            <MobileNavLink to="/about" onClick={() => setMobileMenuOpen(false)}>About Us</MobileNavLink>
            <MobileNavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</MobileNavLink>
            
            {/* Mobile Auth Links */}
            {!isAuthenticated ? (
               <MobileNavLink to="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: '#00ffff' }}>
                 Login / Sign Up
               </MobileNavLink>
            ) : (
               <MobileNavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>My Profile</MobileNavLink>
            )}
            
            <MobileSectionTitle>Dashboards & Portals</MobileSectionTitle>
            
            {/* Mobile Cards for Portals - No "Scroll Wheel" feel */}
            <div>
              {portals.map((item) => (
                <MobilePortalCard key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                  <div className="icon-box">{item.icon}</div>
                  <div className="text-content">
                    <span className="title">{item.title}</span>
                    <span className="desc">{item.desc}</span>
                  </div>
                  <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={20} />
                </MobilePortalCard>
              ))}
            </div>
            
            {isAuthenticated && (
              <div style={{ marginTop: '2rem' }}>
                <AuthButton onClick={() => { logout(); setMobileMenuOpen(false); }} style={{ width: '100%', justifyContent: 'center' }}>
                  <LogOut size={18} /> Logout
                </AuthButton>
              </div>
            )}
            
            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
               <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', textAlign: 'center' }}>
                 © 2025 SwanStudios
               </p>
            </div>
          </MobileMenuOverlay>
        )}
      </AnimatePresence>
    </HeaderContainer>
  );
};

export default Header;