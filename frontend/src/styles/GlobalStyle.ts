// src/styles/GlobalStyle.ts
import { createGlobalStyle } from "styled-components";
import "react-big-calendar/lib/css/react-big-calendar.css";

/**
 * GlobalStyle
 * -----------
 * Global CSS resets and variable definitions using your original color scheme:
 * - Neon Blue, Purple, Blue, Silver, Grey, and White.
 */
const GlobalStyle = createGlobalStyle`
  :root {
    --primary-color: #00FFFF;    /* Neon Blue */
    --secondary-color: #7851A9;  /* Purple */
    --accent-blue: #145dbf;      /* Blue */
    --grey: #808080;
    --silver: #C0C0C0;
    --background: #FFFFFF;       /* White background for main content */
    --sidebar-bg: #7851A9;       /* Using Purple for the sidebar background */
    --text: #333333;            /* Dark text for readability */
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Roboto', sans-serif;
    background: var(--background);
    color: var(--text);
    overflow-x: hidden;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  /* Optional scrollbar styling */
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    background: var(--background);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--grey);
  }
`;

export default GlobalStyle;
