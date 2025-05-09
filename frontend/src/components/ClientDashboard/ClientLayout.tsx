import React, { useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { AnimatePresence, motion } from "framer-motion";

// Import components
import Header from "../Header/header";
import ClientSidebar from "./ClientSidebar";
import ClientMainContent from "./ClientMainContent";
import DevTools from "../DevTools/DevTools";

// Import section components
// Import all sections directly from their component files
import OverviewSection from "./OverviewSection";
import MyWorkoutsSection from "./sections/MyWorkoutsSection";
import ProgressSection from "./ProgressSection";
import GamificationSection from "./sections/GamificationSection";
import CreativeHubSection from "./sections/CreativeHubSection";
import CommunitySection from "./sections/CommunitySection";
import ProfileSection from "./sections/ProfileSection";
import SettingsSection from "./sections/SettingsSection";

// Theme definition
const theme = {
  colors: {
    primary: "#00FFFF",        // Neon Blue
    secondary: "#7851A9",      // Purple
    accent: "#FF6B6B",         // Coral for attention
    success: "#4CAF50",        // Green for success
    warning: "#FFC107",        // Amber for warnings
    error: "#F44336",          // Red for errors
    dark: "#212121",           // Dark background
    light: "#F5F5F5",          // Light background
    grey: "#808080",           // Grey
    silver: "#C0C0C0",         // Silver
    background: "#FFFFFF",     // White background for main content
    sidebarBg: "#7851A9",      // Purple for sidebar background
    text: "#333333",           // Main text color
    textLight: "#FFFFFF",      // Light text color
    textMuted: "#757575",      // Muted text color
    border: "#E0E0E0",         // Border color
  },
  fonts: {
    main: "'Roboto', sans-serif",
    heading: "'Montserrat', sans-serif",
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    round: '50%',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
  },
  transitions: {
    short: 'all 0.2s ease',
    medium: 'all 0.3s ease',
    long: 'all 0.5s ease',
  },
  breakpoints: {
    xs: '320px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
  }
};

// Styled container
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.main};
`;

const MainContainer = styled.div`
  display: flex;
  flex: 1;
  position: relative;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column-reverse;
  }
`;

const MainContent = styled(motion.main)`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.background};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

// Modal container for overlays
const ModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

// Available sections enum for type safety
export enum DashboardSection {
  OVERVIEW = "overview",
  WORKOUTS = "workouts",
  PROGRESS = "progress",
  GAMIFICATION = "gamification",
  CREATIVE = "creative",
  COMMUNITY = "community",
  PROFILE = "profile",
  SETTINGS = "settings",
}

// Main ClientLayout component
const ClientLayout: React.FC = () => {
  // State for active section
  const [activeSection, setActiveSection] = useState<DashboardSection>(DashboardSection.OVERVIEW);
  
  // State for mobile sidebar visibility
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Handle section change
  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
    // Close mobile sidebar when changing sections
    setIsMobileSidebarOpen(false);
  };
  
  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Render the active section
  const renderActiveSection = () => {
    switch (activeSection) {
      case DashboardSection.OVERVIEW:
        return (
          <OverviewSection 
            currentLevel={5}
            currentPoints={450}
            nextLevelPoints={1000}
            badges={[]}
            trophies={[]} 
          />
        );
      case DashboardSection.WORKOUTS:
        return <MyWorkoutsSection />;
      case DashboardSection.PROGRESS:
        return <ProgressSection data={{}} />;
      case DashboardSection.GAMIFICATION:
        return <GamificationSection />;
      case DashboardSection.CREATIVE:
        return <CreativeHubSection />;
      case DashboardSection.COMMUNITY:
        return <CommunitySection />;
      case DashboardSection.PROFILE:
        return <ProfileSection />;
      case DashboardSection.SETTINGS:
        return <SettingsSection />;
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <AppContainer>
        <Header onMobileMenuToggle={toggleMobileSidebar} />
        
        <MainContainer>
          {/* Sidebar component with navigation */}
          <ClientSidebar 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            isMobileOpen={isMobileSidebarOpen}
            closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
          />
          
          {/* Main content area with AnimatePresence for transitions */}
          <MainContent
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              {renderActiveSection()}
            </AnimatePresence>
          </MainContent>
        </MainContainer>
        {/* Add DevTools accessible for debugging */}
        <DevTools />
      </AppContainer>
    </ThemeProvider>
  );
};

export default ClientLayout;