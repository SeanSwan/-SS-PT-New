import { createTheme } from "@mui/material/styles";

// The module augmentation is defined in berryDarkTheme.tsx
// We don't need to repeat it here

const berryOriginalTheme = createTheme({
  palette: {
    mode: "light",
    primary: { 
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
      200: "#90caf9" // Adding the 200 value needed by the chart
    },
    secondary: { 
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2" 
    },
    background: {
      default: "#F8F8F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#2D2D2D",
      secondary: "#555555",
    },
    dark: {
      light: "#E0E0E0", // Adding this for the chart component
      main: "#BDBDBD",
      dark: "#9E9E9E"
    },
    grey: {
      50: "#FAFAFA",
      100: "#F5F5F5",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#BDBDBD",
      500: "#9E9E9E", // Adding 500 for the chart
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
    divider: "rgba(0, 0, 0, 0.12)"
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
  applyStyles: (mode, styles) => styles, // Add the applyStyles function
});

export default berryOriginalTheme;