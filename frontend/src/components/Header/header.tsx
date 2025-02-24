/**
 * Header.tsx
 * Navigation header component with desktop and mobile layouts.
 * Includes shopping cart access and authentication-based links.
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import logoImage from "./Logo.png";
import { useAuth } from "../../context/AuthContext";
import ShoppingCart from "../ShoppingCart/ShoppingCart";

// ===================== Styled Components =====================

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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--neon-blue);

  img {
    margin-left: 8px;
    height: 40px;
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledNavLink = styled(Link)`
  color: #fff;
  text-decoration: none;
  margin: 0 15px;
  transition: color 0.3s ease;

  &:hover {
    color: var(--neon-blue);
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  margin: 0 15px;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    color: var(--neon-blue);
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  background-color: #1a1a1a;
  padding: 20px;
  display: flex;
  flex-direction: column;
  z-index: 1001;
`;

const MobileNavLink = styled(Link)`
  margin: 10px 0;
  color: #fff;
  text-decoration: none;
  font-size: 1rem;
`;

const MobileLogoutButton = styled.button`
  margin: 10px 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    color: var(--neon-blue);
  }
`;

const CartButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  position: relative;
  cursor: pointer;
  font-size: 1.5rem;
  margin-right: 15px;

  &:hover {
    color: var(--neon-blue);
  }
`;

// ===================== Header Component =====================
const Header: React.FC = () => {
  // State to control mobile menu and shopping cart modal visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Authentication and navigation hooks
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Handles user logout and redirects to home.
   */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /**
   * Renders the desktop navigation links.
   */
  const renderDesktopLinks = () => {
    if (user) {
      return (
        <>
          <StyledNavLink to="/store">Training &amp; Store</StyledNavLink>
          <StyledNavLink to="/client-dashboard">Client Dashboard</StyledNavLink>

          {/* Visible to all logged-in users */}
          <StyledNavLink to="/schedule">Schedule</StyledNavLink>

          {/* Admin-only link */}
          {user.role === "admin" && (
            <StyledNavLink to="/admin-dashboard">Admin Dashboard</StyledNavLink>
          )}

          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </>
      );
    } else {
      return (
        <>
          <StyledNavLink to="/login" state={{ backgroundLocation: location }}>
            Login
          </StyledNavLink>
          <StyledNavLink to="/signup" state={{ backgroundLocation: location }}>
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
    if (user) {
      return (
        <>
          <MobileNavLink to="/store" onClick={() => setMobileMenuOpen(false)}>
            Training &amp; Store
          </MobileNavLink>
          <MobileNavLink
            to="/client-dashboard"
            onClick={() => setMobileMenuOpen(false)}
          >
            Client Dashboard
          </MobileNavLink>
          <MobileNavLink to="/schedule" onClick={() => setMobileMenuOpen(false)}>
            Schedule
          </MobileNavLink>
          {user.role === "admin" && (
            <MobileNavLink
              to="/admin-dashboard"
              onClick={() => setMobileMenuOpen(false)}
            >
              Admin Dashboard
            </MobileNavLink>
          )}
          <MobileLogoutButton
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
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
          >
            Login
          </MobileNavLink>
          <MobileNavLink
            to="/signup"
            state={{ backgroundLocation: location }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign Up
          </MobileNavLink>
        </>
      );
    }
  };

  return (
    <>
      <HeaderContainer>
        <Logo>
          SwanStudios
          <img src={logoImage} alt="SwanStudios Logo" />
        </Logo>

        {/* Desktop Navigation */}
        <Nav>
          <StyledNavLink to="/">Home</StyledNavLink>
          {renderDesktopLinks()}
          <StyledNavLink to="/contact">Contact / Support</StyledNavLink>
          <StyledNavLink to="/about">About Us</StyledNavLink>

          {/* Shopping Cart Button */}
          <CartButton onClick={() => setCartOpen(true)} aria-label="Open shopping cart">
            🛒
          </CartButton>
        </Nav>

        {/* Mobile Navigation Button */}
        <MobileMenuButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </MobileMenuButton>
      </HeaderContainer>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <MobileMenu
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          exit={{ x: 300 }}
        >
          <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>
            Home
          </MobileNavLink>
          {renderMobileLinks()}
          <MobileNavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>
            Contact / Support
          </MobileNavLink>
          <MobileNavLink to="/about" onClick={() => setMobileMenuOpen(false)}>
            About Us
          </MobileNavLink>
        </MobileMenu>
      )}

      {/* Render Shopping Cart Modal when open */}
      {cartOpen && <ShoppingCart onClose={() => setCartOpen(false)} />}
    </>
  );
};

export default Header;
