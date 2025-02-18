// src/components/Header/header.tsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import logoImage from "./Logo.png"; // Ensure Logo.png is in the correct path
import { useAuth } from "../../context/AuthContext";

// ===================== Styled Components =====================

// HeaderContainer: fixed at top with blur background.
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

  @media (max-width: 768px) {
    padding: 0 10px;
  }
`;

// Logo styling.
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

// Desktop navigation container.
const Nav = styled.nav`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

// Styled navigation link.
const StyledNavLink = styled(Link)`
  color: #fff;
  text-decoration: none;
  margin: 0 15px;
  transition: color 0.3s ease;

  &:hover {
    color: var(--neon-blue);
  }
`;

// Mobile menu button (hamburger).
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

// Mobile dropdown menu container.
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

// Mobile navigation link styling.
const MobileNavLink = styled(Link)`
  margin: 10px 0;
  color: #fff;
  text-decoration: none;
`;

// -------------------- Shopping Cart Styled Components --------------------

// CartButton: button that opens the shopping cart modal.
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

// CartBadge: displays the number of items in the cart.
const CartBadge = styled.span`
  position: absolute;
  top: -5px;
  right: -10px;
  background: red;
  color: #fff;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 50%;
`;

// CartModalOverlay: full-screen overlay for the cart modal.
const CartModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// CartModalContent: modal content container.
const CartModalContent = styled(motion.div)`
  background: #fff;
  width: 90%;
  max-width: 400px;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

// ModalCloseButton: button to close the modal.
const ModalCloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 1.5rem;
  position: absolute;
  top: 10px;
  right: 15px;
  cursor: pointer;
  color: #333;

  &:hover {
    color: var(--neon-blue);
  }
`;

// CartItem: styling for an individual cart item.
const CartItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
`;

// CheckoutButton: button to trigger checkout.
const CheckoutButton = styled.button`
  width: 100%;
  padding: 10px;
  background: var(--neon-blue);
  border: none;
  border-radius: 5px;
  color: #000;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-top: 20px;

  &:hover {
    background: var(--royal-purple);
  }
`;

// -------------------- ShoppingCartModal Component --------------------

// Define the props interface.
interface ShoppingCartModalProps {
  onClose: () => void;
}

/**
 * ShoppingCartModal displays the shopping cart in a modal overlay.
 * For demonstration, it uses dummy cart data. Replace dummyCartItems with real data.
 */
const ShoppingCartModal: React.FC<ShoppingCartModalProps> = ({ onClose }) => {
  // Dummy cart data for demonstration.
  const dummyCartItems = [
    { id: 1, name: "Gold Glimmer Package", quantity: 1, price: 175 },
    { id: 2, name: "Platinum Pulse Package", quantity: 2, price: 165 },
  ];

  // Calculate total amount.
  const total = dummyCartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-modal-title"
      onClick={onClose}
    >
      <CartModalContent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ModalCloseButton onClick={onClose} aria-label="Close cart">
          &times;
        </ModalCloseButton>
        <h2 id="cart-modal-title" style={{ textAlign: "center" }}>
          Shopping Cart
        </h2>
        {dummyCartItems.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            {dummyCartItems.map((item) => (
              <CartItem key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.quantity} x ${item.price.toFixed(2)}
                  </p>
                </div>
                {/* Placeholder remove button */}
                <button
                  aria-label={`Remove ${item.name}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "red",
                  }}
                >
                  &times;
                </button>
              </CartItem>
            ))}
            <p style={{ textAlign: "right", fontWeight: "bold" }}>
              Total: ${total.toFixed(2)}
            </p>
            <CheckoutButton
              onClick={() => {
                // Replace this with actual checkout integration (e.g., Stripe).
                alert("Proceeding to checkout...");
              }}
            >
              Checkout
            </CheckoutButton>
          </>
        )}
      </CartModalContent>
    </CartModalOverlay>
  );
};

// ===================== Header Component =====================

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // Controls shopping cart modal visibility
  const cartItemCount = 3; // For demo purposes, replace with real cart count from context or state

  const { user } = useAuth();
  const location = useLocation();

  // Close mobile menu and cart modal on window resize or Escape key press.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setCartOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <HeaderContainer>
        {/* Logo Section */}
        <Logo>
          SwanStudios
          <img src={logoImage} alt="SwanStudios Logo" />
        </Logo>

        {/* Desktop Navigation Links */}
        <Nav>
          <StyledNavLink to="/">Home</StyledNavLink>
          <StyledNavLink to="/store">Training & Store</StyledNavLink>
          <StyledNavLink to="/client-dashboard">Client Dashboard</StyledNavLink>
          {user && user.role === "admin" && (
            <StyledNavLink to="/admin-dashboard">Admin Dashboard</StyledNavLink>
          )}
          {user ? (
            <StyledNavLink to="/dashboard">Dashboard</StyledNavLink>
          ) : (
            <>
              <StyledNavLink to="/login" state={{ backgroundLocation: location }}>
                Login
              </StyledNavLink>
              <StyledNavLink to="/signup" state={{ backgroundLocation: location }}>
                Sign Up
              </StyledNavLink>
            </>
          )}
          <StyledNavLink to="/contact">Contact / Support</StyledNavLink>
          <StyledNavLink to="/about">About Us</StyledNavLink>
          {/* Shopping Cart Button */}
          <CartButton onClick={() => setCartOpen(true)} aria-label="Open shopping cart">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.44c-.16.29-.25.62-.25.97 0 1.1.9 2 2 2h12v-2h-12l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.3.12-.48 0-.55-.45-1-1-1h-14zm-1 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm14 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            {cartItemCount > 0 && <CartBadge>{cartItemCount}</CartBadge>}
          </CartButton>
        </Nav>

        {/* Mobile Navigation Button */}
        <MobileMenuButton
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle mobile menu"
        >
          ☰
        </MobileMenuButton>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <MobileMenu
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>
              Home
            </MobileNavLink>
            <MobileNavLink to="/store" onClick={() => setMobileMenuOpen(false)}>
              Training & Store
            </MobileNavLink>
            <MobileNavLink to="/client-dashboard" onClick={() => setMobileMenuOpen(false)}>
              Client Dashboard
            </MobileNavLink>
            {user && user.role === "admin" && (
              <MobileNavLink to="/admin-dashboard" onClick={() => setMobileMenuOpen(false)}>
                Admin Dashboard
              </MobileNavLink>
            )}
            {user ? (
              <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
            ) : (
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
            )}
            <MobileNavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>
              Contact / Support
            </MobileNavLink>
            <MobileNavLink to="/about" onClick={() => setMobileMenuOpen(false)}>
              About Us
            </MobileNavLink>
            {/* Mobile menu: Shopping Cart */}
            <MobileNavLink
              as="button"
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                padding: 0,
                textAlign: "left",
              }}
              onClick={() => {
                setMobileMenuOpen(false);
                setCartOpen(true);
              }}
              aria-label="Open shopping cart"
            >
              Shopping Cart
            </MobileNavLink>
          </MobileMenu>
        )}
      </HeaderContainer>

      {/* Render the ShoppingCartModal if cartOpen is true */}
      {cartOpen && <ShoppingCartModal onClose={() => setCartOpen(false)} />}
    </>
  );
};

export default Header;
