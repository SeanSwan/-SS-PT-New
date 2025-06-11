/**
 * ClientDashboardLayout Component
 * ==============================
 * Main layout structure for the client dashboard.
 * Implements responsive design with sidebar and main content area.
 */

import React, { useState } from 'react';
import styled from 'styled-components';

interface ClientDashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #16213e 100%);
  color: white;
  overflow: hidden;
`;

const SidebarContainer = styled.aside<{ isOpen: boolean }>`
  width: ${props => props.isOpen ? '280px' : '80px'};
  transition: width 0.3s ease;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 10;
  
  @media (max-width: 768px) {
    position: fixed;
    left: ${props => props.isOpen ? '0' : '-280px'};
    width: 280px;
    height: 100vh;
    z-index: 1000;
  }
`;

const MainContent = styled.main<{ sidebarOpen: boolean }>`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
  }
`;

const MobileOverlay = styled.div<{ isVisible: boolean }>`
  display: none;
  
  @media (max-width: 768px) {
    display: ${props => props.isVisible ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
`;

const MenuToggle = styled.button`
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1001;
  background: rgba(30, 30, 60, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #00ffff;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(30, 30, 60, 1);
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const ClientDashboardLayout: React.FC<ClientDashboardLayoutProps> = ({
  sidebar,
  children,
  className
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <LayoutContainer className={className}>
      <MenuToggle onClick={toggleSidebar}>
        ☰
      </MenuToggle>
      
      <MobileOverlay 
        isVisible={mobileMenuOpen} 
        onClick={closeMobileMenu}
      />
      
      <SidebarContainer isOpen={window.innerWidth <= 768 ? mobileMenuOpen : sidebarOpen}>
        {sidebar}
      </SidebarContainer>
      
      <MainContent sidebarOpen={sidebarOpen}>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

export default ClientDashboardLayout;
