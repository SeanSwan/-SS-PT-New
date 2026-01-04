import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import UserProfileCard from '../Profile/UserProfileCard';
import OnlineStatusIndicator from '../Messaging/OnlineStatusIndicator';
import NotificationBell from '../Messaging/NotificationBell';

/**
 * MainHeader Component
 * ====================
 *
 * Purpose: Provides a consistent, application-wide header that integrates
 * key user status components.
 *
 * Features:
 * - Displays the application logo.
 * - Integrates the OnlineStatusIndicator to show active friends.
 * - Integrates the NotificationBell for real-time alerts.
 * - Integrates the UserProfileCard for quick user identification.
 */
const MainHeader: React.FC = () => {
  return (
    <HeaderContainer>
      <LeftSection>
        {/* In a real app, you would import and use your Logo component here */}
        <LogoPlaceholder>SwanStudios</LogoPlaceholder>
      </LeftSection>
      <CenterSection>
        <StyledNavLink to="/home">Home</StyledNavLink>
        <StyledNavLink to="/store">Store</StyledNavLink>
        <StyledNavLink to="/about">About</StyledNavLink>
        <StyledNavLink to="/contact">Contact</StyledNavLink>
      </LeftSection>
      <RightSection>
        <OnlineStatusIndicator />
        <NotificationBell />
        <UserProfileCard />
      </RightSection>
    </HeaderContainer>
  );
};

// Styled Components
const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: var(--glass-bg, rgba(10, 14, 26, 0.8));
  border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  height: 80px;
`;

const LeftSection = styled.div`
  /* Styles for logo can go here */
`;

const LogoPlaceholder = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary, #FFFFFF);
  /* This would be replaced with your actual Logo component */
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const CenterSection = styled.nav`
  display: flex;
  align-items: center;
  gap: 32px;

  @media (max-width: 768px) {
    display: none; // Hide on mobile, assuming a mobile menu would handle this
  }
`;

const StyledNavLink = styled(NavLink)`
  color: var(--text-secondary, #B8B8B8);
  text-decoration: none;
  font-weight: 600;
  font-size: 16px;
  position: relative;
  transition: color 0.2s;
  padding: 8px 4px;

  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--primary-cyan, #00CED1);
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 0.3s ease;
  }

  &:hover {
    color: var(--text-primary, #FFFFFF);
  }

  &.active {
    color: var(--primary-cyan, #00CED1);
    &::after {
      transform: scaleX(1);
    }
  }
`;

export default MainHeader;