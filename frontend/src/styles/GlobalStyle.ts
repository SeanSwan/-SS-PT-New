import { createGlobalStyle } from 'styled-components';

/*
  GlobalStyle
  -----------
  This component sets up global CSS styles and variables for the entire app.
  It defines our brand color variables and resets default browser styles.
*/
const GlobalStyle = createGlobalStyle`
  :root {
    --neon-blue: #00FFFF;
    --royal-purple: #7851A9;
    --grey: #808080;
    --silver: #C0C0C0;
    --blue: #145dbf; /* Slightly darker than Facebook blue */
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', sans-serif;
    color: white;
    overflow-x: hidden;
    background: #000;
  }
`;

export default GlobalStyle;