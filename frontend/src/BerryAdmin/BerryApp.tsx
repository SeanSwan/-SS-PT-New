/**
 * BerryApp.tsx
 * Main entry for the Berry Admin Dashboard
 * Simplified to fix layout issues
 */
import React from "react";
import { useSelector } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, StyledEngineProvider, Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

// Berry themes
import berryDarkTheme from "./themes/berryDarkTheme";
import berryLightTheme from "./themes/berryLightTheme";
import berryOriginalTheme from "./themes/berryOriginalTheme";

// Project imports
import NavigationScroll from "./layout/NavigationScroll";
import MainLayout from "./layout/MainLayout";

// Import dashboard views directly
import Dashboard from './views/dashboard/Default';
import ScheduleManagement from './views/ScheduleManagement';
import SamplePage from './views/sample-page';

// Use ErrorBoundary from component
import ErrorBoundary from "../components/ErrorBoundary/error-boundry.component";

// Get the RootState type from your store
import { RootState } from "../store";

/**
 * BerryApp - Main component for the Berry admin dashboard
 */
const BerryApp = () => {
  // Get customization settings from Redux store
  const customization = useSelector((state: RootState) => (state as any).customization || {});
  
  // Choose theme based on customization
  const getTheme = () => {
    const themeType = customization?.themeType || 'dark';
    
    switch(themeType) {
      case 'light':
        return berryLightTheme;
      case 'original':
        return berryOriginalTheme;
      case 'dark':
      default:
        return berryDarkTheme;
    }
  };

  // Get the appropriate theme
  const theme = getTheme();

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NavigationScroll>
          <ErrorBoundary>
            <Box className="berry-admin-container">
              <Routes>
                {/* Main Layout with Dashboard */}
                <Route element={<MainLayout withExternalHeader={true} />}>
                  {/* Default route */}
                  <Route index element={<Dashboard />} />
                  
                  {/* Dashboard route */}
                  <Route path="dashboard" element={<Dashboard />} />
                  
                  {/* Other routes */}
                  <Route path="schedule" element={<ScheduleManagement />} />
                  <Route path="sample-page" element={<SamplePage />} />
                  
                  {/* Fallback route */}
                  <Route path="*" element={<Dashboard />} />
                </Route>
              </Routes>
            </Box>
          </ErrorBoundary>
        </NavigationScroll>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default BerryApp;