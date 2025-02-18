import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

// Styled container for the sidebar
const SidebarContainer = styled.nav`
  width: 250px;
  background-color: ${({ theme }) => theme.colors.royalPurple};
  padding: 2rem 1rem;

  @media (max-width: 768px) {
    width: 100%;
    position: fixed;
    bottom: 0;
    left: 0;
    padding: 0.5rem;
    display: flex;
    justify-content: space-around;
  }
`;

// Styled button for each navigation item in the sidebar.
const NavItem = styled(motion.button)<{ isActive: boolean }>`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  background-color: ${({ isActive, theme }) => (isActive ? theme.colors.neonBlue : "transparent")};
  color: ${({ isActive, theme }) => (isActive ? theme.colors.royalPurple : theme.colors.text)};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.neonBlue};
    color: ${({ theme }) => theme.colors.royalPurple};
  }

  @media (max-width: 768px) {
    margin-bottom: 0;
    padding: 0.5rem;
    font-size: 0.8rem;
  }
`;

// Props interface for Sidebar
interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

/**
 * Sidebar Component
 * -----------------
 * Renders the sidebar navigation for the dashboard.
 * Provides buttons to switch between sections (Overview, Upload Data, Trainer Data, Progress, and Messages).
 */
const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  return (
    <SidebarContainer>
      <NavItem
        isActive={activeSection === "overview"}
        onClick={() => setActiveSection("overview")}
        whileTap={{ scale: 0.95 }}
      >
        Overview
      </NavItem>
      <NavItem
        isActive={activeSection === "upload"}
        onClick={() => setActiveSection("upload")}
        whileTap={{ scale: 0.95 }}
      >
        Upload Data
      </NavItem>
      <NavItem
        isActive={activeSection === "trainer"}
        onClick={() => setActiveSection("trainer")}
        whileTap={{ scale: 0.95 }}
      >
        Trainer Data
      </NavItem>
      <NavItem
        isActive={activeSection === "progress"}
        onClick={() => setActiveSection("progress")}
        whileTap={{ scale: 0.95 }}
      >
        Progress
      </NavItem>
      <NavItem
        isActive={activeSection === "messages"}
        onClick={() => setActiveSection("messages")}
        whileTap={{ scale: 0.95 }}
      >
        Messages
      </NavItem>
    </SidebarContainer>
  );
};

export default Sidebar;