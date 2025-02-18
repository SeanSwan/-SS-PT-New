// src/components/Title/Title.component.jsx

import React from 'react';
import styled from 'styled-components';

const TitleContainer = styled.div`
  display: grid; // Using CSS Grid for positioning
  place-items: center; // Centers the title both horizontally and vertically
  width: 100%;
  padding: 1rem; // Padding for smaller screens
  box-sizing: border-box; // Ensures padding is included in width calculation

  h1 {
    font-size: 2.5rem; // Size for mobile devices
    color: #fff; // White color for the text
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); // Subtle text shadow for depth
    margin: 0; // Reset default margin

    @media (min-width: 768px) {
      font-size: 3.5rem; // Larger size for bigger screens
    }

    @media (min-width: 1024px) {
      font-size: 4rem; // Even larger size for desktops
    }

    @media (min-width: 2560px) {
      font-size: 5rem; // Large size for 4k displays
    }
  }
`;

const Title = ({ title }) => {
  return (
    <TitleContainer>
      <h1>{title}</h1>
    </TitleContainer>
  );
};

export default Title;