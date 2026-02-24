/**
 * CinematicNavbar.tsx — Floating island navbar shared by all cinematic variants.
 *
 * Reuses `useHeaderState` for auth/cart/role behavior parity with the global header.
 * Visual-only changes: floating island, morph-on-scroll, preset typography.
 * Dev-only tools (Debug, UserSwitcher) are excluded from this public navbar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ShoppingCart as CartIcon,
  User,
  LogOut,
  Search,
  ChevronRight,
} from 'lucide-react';

import { useHeaderState } from '../../../../components/Header/useHeaderState';
import ShoppingCart from '../../../../components/ShoppingCart/ShoppingCart';
import logoImage from '../../../../assets/Logo.png';
import type { CinematicTokens } from '../cinematic-tokens';
import type { NavLink } from '../HomepageContent';

// ─── Types ───────────────────────────────────────────────────────────

interface CinematicNavbarProps {
  tokens: CinematicTokens;
  marketingLinks: NavLink[];
  ctaLabel: string;
  ctaPath: string;
}

// ─── Styled Components ───────────────────────────────────────────────

interface TokenProps {
  $tokens: CinematicTokens;
}

const NavContainer = styled(motion.nav)<TokenProps & { $isScrolled: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: ${({ $isScrolled }) => ($isScrolled ? '0.5rem 1.5rem' : '1rem 1.5rem')};
  transition: padding 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const NavInner = styled.div<TokenProps & { $isScrolled: boolean }>`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  border-radius: ${({ $isScrolled }) => ($isScrolled ? '2rem' : '0')};
  background: ${({ $tokens, $isScrolled }) =>
    $isScrolled ? $tokens.palette.glass : 'transparent'};
  backdrop-filter: ${({ $isScrolled }) => ($isScrolled ? 'blur(20px)' : 'none')};
  -webkit-backdrop-filter: ${({ $isScrolled }) => ($isScrolled ? 'blur(20px)' : 'none')};
  border: 1px solid ${({ $tokens, $isScrolled }) =>
    $isScrolled ? $tokens.palette.glassBorder : 'transparent'};
  box-shadow: ${({ $isScrolled }) =>
    $isScrolled ? '0 4px 30px rgba(0, 0, 0, 0.2)' : 'none'};
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const LogoLink = styled(Link)<TokenProps>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  min-height: 44px;
`;

const LogoImg = styled.img`
  height: 36px;
  width: auto;
`;

const LogoText = styled.span<TokenProps>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    display: none;
  }
`;

const DesktopLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const NavLinkStyled = styled(Link)<TokenProps>`
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  text-decoration: none;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-weight: 500;
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  transition: color 0.2s ease, background 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({ $tokens }) => $tokens.palette.textPrimary};
    background: rgba(255, 255, 255, 0.05);
  }
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const IconButton = styled.button<TokenProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: ${({ $tokens }) => $tokens.palette.textPrimary};
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CtaButton = styled(Link)<TokenProps>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  min-height: 44px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

const HamburgerButton = styled(IconButton)`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
  }
`;

// ─── Mobile Menu ─────────────────────────────────────────────────────

const MobileMenuOverlay = styled(motion.div)<TokenProps>`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: ${({ $tokens }) => $tokens.palette.bg};
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow-y: auto;
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const MobileNavLink = styled(Link)<TokenProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  text-decoration: none;
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.25rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  border-bottom: 1px solid ${({ $tokens }) => $tokens.palette.border};
  min-height: 44px;
`;

const MobileCtaButton = styled(Link)<TokenProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  min-height: 44px;
`;

// ─── Component ───────────────────────────────────────────────────────

const CinematicNavbar: React.FC<CinematicNavbarProps> = ({
  tokens,
  marketingLinks,
  ctaLabel,
  ctaPath,
}) => {
  const {
    user,
    cartOpen,
    openCart,
    closeCart,
    handleLogout,
  } = useHeaderState();

  const isAuthenticated = !!user;

  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  const handleMobileNavClick = useCallback(
    (path: string) => {
      closeMobileMenu();
      navigate(path);
    },
    [closeMobileMenu, navigate]
  );

  return (
    <>
      <NavContainer
        $tokens={tokens}
        $isScrolled={isScrolled}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <NavInner $tokens={tokens} $isScrolled={isScrolled}>
          {/* Logo */}
          <LogoLink to="/" $tokens={tokens}>
            <LogoImg src={logoImage} alt="SwanStudios Logo" />
            <LogoText $tokens={tokens}>SwanStudios</LogoText>
          </LogoLink>

          {/* Desktop Nav Links */}
          <DesktopLinks>
            {marketingLinks.map((link) => (
              <NavLinkStyled key={link.path} to={link.path} $tokens={tokens}>
                {link.label}
              </NavLinkStyled>
            ))}
          </DesktopLinks>

          {/* Actions */}
          <ActionBar>
            {/* Cart */}
            <IconButton
              $tokens={tokens}
              onClick={() => (cartOpen ? closeCart() : openCart())}
              aria-label="Open shopping cart"
            >
              <CartIcon size={20} />
            </IconButton>

            {/* Auth */}
            {isAuthenticated ? (
              <>
                <IconButton
                  $tokens={tokens}
                  onClick={() => {
                    const role = user?.role;
                    if (role === 'admin' || role === 'trainer') {
                      navigate('/dashboard');
                    } else {
                      navigate('/client-dashboard');
                    }
                  }}
                  aria-label="Go to dashboard"
                >
                  <User size={20} />
                </IconButton>
                <IconButton
                  $tokens={tokens}
                  onClick={handleLogout}
                  aria-label="Sign out"
                >
                  <LogOut size={20} />
                </IconButton>
              </>
            ) : (
              <IconButton
                $tokens={tokens}
                onClick={() => navigate('/login')}
                aria-label="Sign in"
              >
                <User size={20} />
              </IconButton>
            )}

            {/* Desktop CTA */}
            <CtaButton to={ctaPath} $tokens={tokens}>
              {ctaLabel}
            </CtaButton>

            {/* Hamburger */}
            <HamburgerButton
              $tokens={tokens}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </HamburgerButton>
          </ActionBar>
        </NavInner>
      </NavContainer>

      {/* Shopping Cart Modal */}
      {cartOpen && <ShoppingCart onClose={closeCart} />}

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenuOverlay
            $tokens={tokens}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <MobileMenuHeader>
              <LogoLink to="/" $tokens={tokens} onClick={closeMobileMenu}>
                <LogoImg src={logoImage} alt="SwanStudios Logo" />
              </LogoLink>
              <IconButton $tokens={tokens} onClick={closeMobileMenu} aria-label="Close menu">
                <X size={24} />
              </IconButton>
            </MobileMenuHeader>

            {marketingLinks.map((link) => (
              <MobileNavLink
                key={link.path}
                to={link.path}
                $tokens={tokens}
                onClick={closeMobileMenu}
              >
                {link.label}
                <ChevronRight size={20} />
              </MobileNavLink>
            ))}

            {isAuthenticated ? (
              <>
                <MobileNavLink
                  to={
                    user?.role === 'admin' || user?.role === 'trainer'
                      ? '/dashboard'
                      : '/client-dashboard'
                  }
                  $tokens={tokens}
                  onClick={closeMobileMenu}
                >
                  Dashboard
                  <ChevronRight size={20} />
                </MobileNavLink>
                <MobileNavLink
                  to="#"
                  $tokens={tokens}
                  onClick={(e) => {
                    e.preventDefault();
                    closeMobileMenu();
                    handleLogout();
                  }}
                >
                  Sign Out
                  <LogOut size={20} />
                </MobileNavLink>
              </>
            ) : (
              <>
                <MobileNavLink to="/login" $tokens={tokens} onClick={closeMobileMenu}>
                  Sign In
                  <ChevronRight size={20} />
                </MobileNavLink>
                <MobileNavLink to="/register" $tokens={tokens} onClick={closeMobileMenu}>
                  Sign Up
                  <ChevronRight size={20} />
                </MobileNavLink>
              </>
            )}

            <MobileCtaButton to={ctaPath} $tokens={tokens} onClick={closeMobileMenu}>
              {ctaLabel}
            </MobileCtaButton>
          </MobileMenuOverlay>
        )}
      </AnimatePresence>
    </>
  );
};

export default CinematicNavbar;
