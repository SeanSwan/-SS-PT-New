/**
 * Header.tsx
 * Navigation header component with desktop and mobile layouts.
 * Includes shopping cart access, notifications, search, and authentication-based links.
 */

import React, { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import logoImage from "./Logo.png";
import { useAuth } from "../../context/AuthContext";
import ShoppingCart from "../ShoppingCart/ShoppingCart";

// Material UI imports for notification and search components
import { Avatar, Badge, InputBase, Popper, Paper, Divider, List, ListItem, Typography, ClickAwayListener, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CloseIcon from "@mui/icons-material/Close";

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
  background: rgba(0, 0, 0, 0.8);
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

// New styled components for search and notifications
const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 5px 10px;
  margin-right: 15px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const SearchInput = styled(InputBase)`
  color: white;
  margin-left: 5px;
  width: 120px;
  transition: width 0.3s;
  
  &:focus {
    width: 180px;
  }
  
  & input {
    color: white;
  }
`;

const NotificationButton = styled.button`
  background: transparent;
  border: none;
  padding: 0;
  color: white;
  margin-right: 15px;
  cursor: pointer;
  
  &:hover {
    color: var(--neon-blue);
  }
`;

const NotificationPopperContainer = styled(Paper)`
  background-color: #222;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 255, 0.2);
  width: 320px;
  max-height: 400px;
  overflow: hidden;
  color: white;
`;

const NotificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const NotificationItem = styled(ListItem)`
  padding: 10px 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s;
  
  &:hover {
    background-color: rgba(0, 255, 255, 0.1);
  }
  
  &.unread {
    background-color: rgba(0, 255, 255, 0.05);
  }
`;

const NotificationTitle = styled(Typography)`
  font-weight: 500;
  color: #fff;
`;

const NotificationTime = styled(Typography)`
  font-size: 0.8rem;
  color: #aaa;
  margin-top: 5px;
`;

const ViewAllButton = styled(Button)`
  text-transform: none;
  color: var(--neon-blue);
  width: 100%;
  padding: 10px;
  
  &:hover {
    background-color: rgba(0, 255, 255, 0.1);
  }
`;

// ===================== Header Component =====================
const Header: React.FC = () => {
  // State to control mobile menu and shopping cart modal visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Refs for popper positioning
  const notificationRef = useRef(null);

  // Authentication and navigation hooks
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sample notifications - in a real app, these would come from your API
  const notifications = [
    { id: 1, title: "New session booked", time: "2 hours ago", isUnread: true },
    { id: 2, title: "Your profile has been updated", time: "Yesterday", isUnread: true },
    { id: 3, title: "Payment confirmation", time: "2 days ago", isUnread: false }
  ];

  /**
   * Handles user logout and redirects to home.
   */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /**
   * Handles search submission
   */
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      console.log(`Searching for: ${searchValue}`);
      // Implement your search logic here
      // navigate(`/search?q=${encodeURIComponent(searchValue)}`);
    }
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

          {/* Search Component */}
          <SearchContainer>
            <SearchIcon style={{ color: 'white', fontSize: 20 }} />
            <form onSubmit={handleSearch}>
              <SearchInput 
                placeholder="Search..." 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </form>
          </SearchContainer>

          {/* Notifications Button */}
          {user && (
            <NotificationButton 
              ref={notificationRef}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Badge 
                badgeContent={notifications.filter(n => n.isUnread).length} 
                color="secondary"
              >
                <NotificationsIcon style={{ fontSize: 24 }} />
              </Badge>
            </NotificationButton>
          )}

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

      {/* Notifications Popper */}
      <Popper
        open={notificationsOpen}
        anchorEl={notificationRef.current}
        placement="bottom-end"
        style={{ zIndex: 1200 }}
      >
        <ClickAwayListener onClickAway={() => setNotificationsOpen(false)}>
          <NotificationPopperContainer>
            <NotificationHeader>
              <Typography variant="h6">Notifications</Typography>
              <Button 
                size="small" 
                onClick={() => setNotificationsOpen(false)}
                style={{ color: 'white', minWidth: 'auto' }}
              >
                <CloseIcon />
              </Button>
            </NotificationHeader>
            <Divider />
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id}
                    className={notification.isUnread ? 'unread' : ''}
                  >
                    <div>
                      <NotificationTitle variant="body1">
                        {notification.title}
                      </NotificationTitle>
                      <NotificationTime variant="caption">
                        {notification.time}
                      </NotificationTime>
                    </div>
                  </NotificationItem>
                ))
              ) : (
                <ListItem>
                  <Typography variant="body2">No notifications</Typography>
                </ListItem>
              )}
            </List>
            <Divider />
            <ViewAllButton>
              View all notifications
            </ViewAllButton>
          </NotificationPopperContainer>
        </ClickAwayListener>
      </Popper>

      {/* Render Shopping Cart Modal when open */}
      {cartOpen && <ShoppingCart onClose={() => setCartOpen(false)} />}
    </>
  );
};

export default Header;