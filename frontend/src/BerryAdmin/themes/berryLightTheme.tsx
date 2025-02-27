// berryLightTheme.ts
import { createTheme } from "@mui/material/styles";

const berryLightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#7851A9" },
    secondary: { main: "#00FFFF" },
    background: {
      default: "#FFFFFF",
      paper: "#F5F5F5",
    },
    text: {
      primary: "#333333",
      secondary: "#808080",
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
});

export default berryLightTheme;
