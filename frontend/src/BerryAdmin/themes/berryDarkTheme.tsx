import { createTheme } from "@mui/material/styles";

const berryDarkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { 
      main: "#00FFFF",
      light: "#33FFFF",
      dark: "#00CCCC",
      200: "#66FFFF" // Adding the 200 value needed by the chart
    },
    secondary: { 
      main: "#7851A9",
      light: "#9B7BC0",
      dark: "#563D7C" 
    },
    background: {
      default: "#1A1A1A",
      paper: "#2A2A2A",
    },
    text: {
      primary: "#C0C0C0",
      secondary: "#FFFFFF",
    },
    dark: {
      light: "#3B3B3B", // Adding this for the chart component
      main: "#1A1A1A",
      dark: "#0A0A0A"
    },
    grey: {
      50: "#F9FAFB",
      100: "#F4F5F7",
      200: "#E5E7EB",
      300: "#D2D6DC",
      400: "#9FA6B2",
      500: "#6B7280", // Adding 500 for the chart
      600: "#4B5563",
      700: "#374151",
      800: "#252F3F",
      900: "#161E2E",
    },
    divider: "rgba(145, 158, 171, 0.24)"
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
  applyStyles: (mode, styles) => styles, // Add the applyStyles function
});

export default berryDarkTheme;