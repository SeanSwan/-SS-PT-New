/**
 * BerryApp.tsx
 * Main entry for the Berry Admin (or Client) Dashboard
 */
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store"; // Adjust if needed
// Import MUI ThemeProvider (aliased below)
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
// Import styled-components' ThemeProvider
import { ThemeProvider as SCThemeProvider } from "styled-components";

import GlobalStyle from "../styles/GlobalStyle"; 
import ErrorBoundary from "@/components/ErrorBoundary/error-boundry.component";
import AdminLayout from "./layout/MainLayout"; 
import Header from "../components/Header/header"

// Import your themes
import berryDarkTheme from "./themes/berryDarkTheme";
import berryLightTheme from "./themes/berryLightTheme";
import berryOriginalTheme from "./themes/berryOriginalTheme";

const BerryApp: React.FC = () => {
  // Access the current theme mode from Redux
  const currentMode = useSelector((state: RootState) => state.theme.mode);

  // Decide which theme object to use
  let activeTheme;
  switch (currentMode) {
    case "light":
      activeTheme = berryLightTheme;
      break;
    case "original":
      activeTheme = berryOriginalTheme;
      break;
    default:
      activeTheme = berryDarkTheme;
      break;
  }

  return (
    <MuiThemeProvider theme={activeTheme}>
      <SCThemeProvider theme={activeTheme}>
        <CssBaseline />
        <GlobalStyle />
        <Header />
        <ErrorBoundary>
          
          <AdminLayout />
        </ErrorBoundary>
      </SCThemeProvider>
    </MuiThemeProvider>
  );
};

export default BerryApp;
