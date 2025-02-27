import { createGlobalStyle } from "styled-components";
import "react-big-calendar/lib/css/react-big-calendar.css";

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: ${({ theme }) =>
      theme?.palette?.background?.default || "#FFFFFF"};
    color: ${({ theme }) =>
      theme?.palette?.text?.primary || "#333333"};
    font-family: ${({ theme }) =>
      theme?.typography?.fontFamily || "Roboto, sans-serif"};
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
    background: ${({ theme }) =>
      theme?.palette?.background?.default || "#FFFFFF"};
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) =>
      theme?.palette?.customColors?.grey || "#808080"};
  }
`;

export default GlobalStyle;
