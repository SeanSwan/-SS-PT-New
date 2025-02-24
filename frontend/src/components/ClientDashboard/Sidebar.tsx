import React, { useState } from "react";
import styled, { css } from "styled-components";
import { motion } from "framer-motion";

// Styled container for the sidebar
const SidebarContainer = styled.nav`
  width: 250px;
  background-color: ${({ theme }) => theme.colors.royalPurple};
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    width: 100%;
    position: fixed;
    bottom: 0;
    left: 0;
    padding: 0.5rem;
    flex-direction: row;
    justify-content: space-around;
    z-index: 3000; /* Ensure the sidebar is above other elements on mobile */
  }
`;

// Optional: Tooltip container
const Tooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.silver};
  color: ${({ theme }) => theme.colors.text};
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
`;

// Wrapper for each nav item (so we can position a tooltip)
const NavItemWrapper = styled.div`
  position: relative;
  margin-bottom: 0.5rem;
  &:hover ${Tooltip} {
    opacity: 1;
  }

  @media (max-width: 768px) {
    margin-bottom: 0;
  }
`;

// Styled button for each navigation item in the sidebar.
const NavItem = styled(motion.button)<{ isActive: boolean }>`
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${({ isActive, theme }) =>
    isActive ? theme.colors.neonBlue : "transparent"};
  color: ${({ isActive, theme }) =>
    isActive ? theme.colors.royalPurple : theme.colors.text};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
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
  onOpenOrientation?: () => void;  // Optional callback to open orientation modal
  onNavigateSchedule?: () => void; // Optional callback to navigate to schedule
}

/**
 * Sidebar Component
 * -----------------
 * Renders the sidebar navigation for the dashboard.
 * Provides buttons to switch between sections (Overview, Upload Data,
 * Trainer Data, Progress, and Messages).
 * Also includes optional "Orientation" and "Schedule" items to showcase
 * how you can expand features without removing anything.
 */
const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  setActiveSection,
  onOpenOrientation,
  onNavigateSchedule,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  /**
   * handleNavClick:
   * A small helper to handle navigation changes. If you add more sections,
   * do so without removing existing ones.
   */
  const handleNavClick = (section: string) => {
    setActiveSection(section);
  };

  return (
    <SidebarContainer>
      {/* Original sections: Overview, Upload, Trainer, Progress, Messages */}
      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("overview")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "overview"}
          onClick={() => handleNavClick("overview")}
          whileTap={{ scale: 0.95 }}
        >
          Overview
        </NavItem>
        {hoveredItem === "overview" && <Tooltip>View your main dashboard</Tooltip>}
      </NavItemWrapper>

      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("upload")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "upload"}
          onClick={() => handleNavClick("upload")}
          whileTap={{ scale: 0.95 }}
        >
          Upload Data
        </NavItem>
        {hoveredItem === "upload" && <Tooltip>Upload workout logs or progress photos</Tooltip>}
      </NavItemWrapper>

      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("trainer")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "trainer"}
          onClick={() => handleNavClick("trainer")}
          whileTap={{ scale: 0.95 }}
        >
          Trainer Data
        </NavItem>
        {hoveredItem === "trainer" && <Tooltip>View trainer-provided resources</Tooltip>}
      </NavItemWrapper>

      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("progress")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "progress"}
          onClick={() => handleNavClick("progress")}
          whileTap={{ scale: 0.95 }}
        >
          Progress
        </NavItem>
        {hoveredItem === "progress" && <Tooltip>Check your performance charts</Tooltip>}
      </NavItemWrapper>

      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("messages")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "messages"}
          onClick={() => handleNavClick("messages")}
          whileTap={{ scale: 0.95 }}
        >
          Messages
        </NavItem>
        {hoveredItem === "messages" && <Tooltip>Communicate with your trainer</Tooltip>}
      </NavItemWrapper>

      {/* 
        Optional: Orientation 
        If you'd like an "Orientation" item in the sidebar, you can call 
        a callback that opens the orientation modal. 
      */}
      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("orientation")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "orientation"}
          onClick={() => {
            // We won't change the active section here, or we can do so if you want:
            setActiveSection("orientation");
            // If a callback is provided, call it:
            onOpenOrientation && onOpenOrientation();
          }}
          whileTap={{ scale: 0.95 }}
        >
          Orientation
        </NavItem>
        {hoveredItem === "orientation" && (
          <Tooltip>Sign up for your orientation session</Tooltip>
        )}
      </NavItemWrapper>

      {/* 
        Optional: Schedule 
        If you'd like a direct link to your schedule page from the sidebar, 
        you can call a callback that navigates to /schedule.
      */}
      <NavItemWrapper
        onMouseEnter={() => setHoveredItem("schedule")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavItem
          isActive={activeSection === "schedule"}
          onClick={() => {
            setActiveSection("schedule");
            onNavigateSchedule && onNavigateSchedule();
          }}
          whileTap={{ scale: 0.95 }}
        >
          Schedule
        </NavItem>
        {hoveredItem === "schedule" && <Tooltip>View or book your sessions</Tooltip>}
      </NavItemWrapper>
    </SidebarContainer>
  );
};

export default Sidebar;
