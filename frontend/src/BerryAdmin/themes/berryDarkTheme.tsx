// berryDarkTheme.ts
import { createTheme } from "@mui/material/styles";

const berryDarkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#00FFFF" },
    secondary: { main: "#7851A9" },
    background: {
      default: "#1A1A1A",
      paper: "#2A2A2A",
    },
    text: {
      primary: "#C0C0C0",
      secondary: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
});

export default berryDarkTheme;
