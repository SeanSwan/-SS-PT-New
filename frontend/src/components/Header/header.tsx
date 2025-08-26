// ULTRA-SIMPLE HEADER - No motion.create, no complex styled components
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import logoImage from "../../assets/Logo.png";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

// Material UI imports - minimal
import { IconButton, Badge } from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

// Import theme context - TEMPORARILY COMMENTED
// import { useUniversalTheme } from '../../context/ThemeContext';

// ===================== ULTRA-SIMPLE Styled Components =====================
// NO motion.create - just regular styled components

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 20px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #334155 100%);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 480px) {
    padding: 0 12px;
    height: 60px;
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

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-right: 20px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  color: #00ffff;
  
  .logo-text {
    font-size: 1.15rem;
    color: #00ffff;
    letter-spacing: 0.5px;
    font-weight: 600;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }
  
  img {
    height: 32px;
    width: 32px;
    margin-right: 8px;
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.4));
  }
  
  &:hover {
    .logo-text {
      color: #ffffff;
    }
    
    img {
      filter: drop-shadow(0 0 12px rgba(0, 255, 255, 0.6));
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

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 0;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
`;

// Navigation links - SIMPLE VERSION, NO motion.create
const StyledNavLink = styled(Link)`
  color: #ffffff;
  text-decoration: none;
  margin: 0;
  padding: 0 16px;
  font-weight: 500;
  font-size: 0.95rem;
  position: relative;
  height: 60px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  letter-spacing: 0.2px;
  border-bottom: 2px solid transparent;
  
  &:hover {
    color: #00ffff;
    border-bottom: 2px solid #00ffff;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  }
  
  &.active {
    color: #00ffff;
    border-bottom: 2px solid #00ffff;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: #ffffff;
  padding: 8px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  border-radius: 6px;
  
  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: #ffffff;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
  }
`;

const MobileMenu = styled.div`
  position: fixed; 
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0; 
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #334155 100%);
  backdrop-filter: blur(15px); 
  padding: 80px 24px 24px; 
  display: ${props => props.isOpen ? 'flex' : 'none'};
  flex-direction: column; 
  z-index: 1001; 
  overflow-y: auto;
  border-right: 1px solid rgba(0, 255, 255, 0.2);
  
  transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease;
`;

const MobileNavLink = styled(Link)`
  margin: 8px 0;
  color: #ffffff;
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  border-radius: 8px;
  
  &:hover, &.active {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.05);
    padding-left: 12px;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  }
`;

const MobileLogoutButton = styled.button`
  margin: 8px 0;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 12px 0;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  border-radius: 8px;
  
  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.05);
    padding-left: 12px;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.4);
  }
`;

// ===================== ULTRA-SIMPLE Header Component =====================
const Header = () => {
  // State management - basic only
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Context hooks - BASIC ONES ONLY
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
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
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  console.log('🎯 Ultra-Simple Header rendering successfully - No React.create issues!');

  return (
    <>
      {/* Main Header */}
      <HeaderContainer>
        <HeaderContent>
          {/* Logo Area */}
          <LogoContainer onClick={() => navigate('/')}>
            <Logo>
              <img src={logoImage} alt="SwanStudios Logo" />
              <span className="logo-text">SwanStudios</span>
            </Logo>
          </LogoContainer>
          
          {/* Navigation Area - Desktop */}
          <Nav>
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
          <ActionsContainer>
            {/* Shopping Cart */}
            <IconButton 
              onClick={() => console.log('Cart clicked')}
              style={{ 
                color: '#ffffff',
                padding: '8px'
              }}
            >
              <Badge 
                badgeContent={cart?.itemCount || 0} 
                color="error"
                style={{ 
                  fontSize: '0.7rem'
                }}
              >
                <ShoppingCartIcon fontSize="small" />
              </Badge>
            </IconButton>

            {/* User Profile */}
            {user && (
              <div
                style={{
                  backgroundColor: '#00ffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#0a0a1a',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(0, 255, 255, 0.4)',
                  transition: 'all 0.3s ease',
                  marginLeft: '8px'
                }}
              >
                {user?.firstName?.[0] || 'U'}
              </div>
            )}

            {/* Mobile Menu Button */}
            <MobileMenuButton
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? 
                <CloseIcon fontSize="small" /> : 
                <MenuIcon fontSize="small" />
              }
            </MobileMenuButton>
          </ActionsContainer>
        </HeaderContent>
      </HeaderContainer>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen}>
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
          <MobileLogoutButton onClick={handleLogout}>
            Logout
          </MobileLogoutButton>
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
    </>
  );
};

export default Header;