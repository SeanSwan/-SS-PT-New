/**
 * BerryApp.tsx
 * Main entry for the Berry Admin Dashboard
 */
import React from "react";
import { useSelector } from "react-redux";
import { Routes, Route } from "react-router-dom";
import { CssBaseline, StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

// Berry themes
import themes from "./themes/berryDarkTheme";

// Project imports - Layout components
import NavigationScroll from "./layout/NavigationScroll";
import MainLayout from "./layout/MainLayout";
import MinimalLayout from "./layout/MinimalLayout";

// Routes
import MainRoutes from "./routes/MainRoutes";
import AuthenticationRoutes from "./routes/AuthenticationRoutes";

// Use ErrorBoundary from component
import ErrorBoundary from "../components/ErrorBoundary/error-boundry.component";

// Get the RootState type from your store
import { RootState } from "../store";

/**
 * BerryApp - Main component for the Berry admin dashboard
 * Handles theme selection, routing, and layout
 */
const BerryApp: React.FC = () => {
  // Get customization settings from Redux store
  const customization = useSelector((state: RootState) => state.customization);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themes(customization)}>
        <CssBaseline />
        <NavigationScroll>
          <ErrorBoundary>
            <Routes>
              {/* Auth routes */}
              <Route path="auth/*" element={<MinimalLayout />}>
                {AuthenticationRoutes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
              </Route>

              {/* Main routes */}
              <Route path="/*" element={<MainLayout />}>
                {MainRoutes.children?.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
              </Route>
            </Routes>
          </ErrorBoundary>
        </NavigationScroll>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default BerryApp;