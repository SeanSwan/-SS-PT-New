// src/styles/GlobalStyle.ts
import { createGlobalStyle } from "styled-components";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-perfect-scrollbar/dist/css/styles.css";

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent !important;
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

  /* ApexCharts styling */
  .apexcharts-legend-series .apexcharts-legend-marker {
    left: -4px !important;
    right: -4px !important;
  }

  .apexcharts-legend.apx-legend-position-bottom .apexcharts-legend-series,
  .apexcharts-legend.apx-legend-position-top .apexcharts-legend-series {
    gap: 8px;
  }

  .apexcharts-canvas {
    .apexcharts-tooltip-series-group.apexcharts-active,
    .apexcharts-tooltip-series-group:last-child {
      padding-bottom: 0;
    }
  }

  .apexcharts-legend-series {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  /* Perfect Scrollbar styling */
  .scrollbar-container {
    .ps__rail-y {
      &:hover > .ps__thumb-y,
      &:focus > .ps__thumb-y,
      &.ps--clicking .ps__thumb-y {
        background-color: ${({ theme }) => 
          theme?.palette?.customColors?.grey || "#697586"};
        width: 5px;
      }
    }
    .ps__thumb-y {
      background-color: ${({ theme }) => 
          theme?.palette?.customColors?.grey || "#697586"};
      border-radius: 6px;
      width: 5px;
      right: 0;
    }
  }

  .scrollbar-container.ps,
  .scrollbar-container > .ps {
    &.ps--active-y > .ps__rail-y {
      width: 5px;
      background-color: transparent !important;
      z-index: 999;
      &:hover,
      &.ps--clicking {
        width: 5px;
        background-color: transparent;
      }
    }
    &.ps--scrolling-y > .ps__rail-y,
    &.ps--scrolling-x > .ps__rail-x {
      opacity: 0.4;
      background-color: transparent;
    }
  }

  /* Animation keyframes */
  @keyframes wings {
    50% {
      transform: translateY(-40px);
    }
    100% {
      transform: translateY(0px);
    }
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes bounce {
    0%,
    20%,
    53%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      transform: translateZ(0);
    }
    40%,
    43% {
      animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
      transform: translate3d(0, -5px, 0);
    }
    70% {
      animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
      transform: translate3d(0, -7px, 0);
    }
    80% {
      transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      transform: translateZ(0);
    }
    90% {
      transform: translate3d(0, -2px, 0);
    }
  }

  @keyframes slideY {
    0%,
    50%,
    100% {
      transform: translateY(0px);
    }
    25% {
      transform: translateY(-10px);
    }
    75% {
      transform: translateY(10px);
    }
  }

  @keyframes slideX {
    0%,
    50%,
    100% {
      transform: translateX(0px);
    }
    25% {
      transform: translateX(-10px);
    }
    75% {
      transform: translateX(10px);
    }
  }
`;

export default GlobalStyle;