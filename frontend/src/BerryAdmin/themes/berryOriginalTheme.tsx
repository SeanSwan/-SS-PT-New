// berryOriginalTheme.ts
import { createTheme } from "@mui/material/styles";

const berryOriginalTheme = createTheme({
  // This can be Berry’s original color palette or any custom scheme you like
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
    background: {
      default: "#F8F8F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#2D2D2D",
      secondary: "#555555",
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
});

export default berryOriginalTheme;
