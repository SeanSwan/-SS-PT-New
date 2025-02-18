import React from 'react';
import styled from 'styled-components';

/*
  Footer Component
  ----------------
  Displays the footer with copyright information.
*/

// Container for the footer
const FooterContainer = styled.footer`
  padding: 2rem;
  background: #000;
  text-align: center;
  color: var(--silver);
`;

// Text styling for the footer
const FooterText = styled.p`
  margin: 0;
`;

// Footer component definition
const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <FooterText>&copy; {new Date().getFullYear()} SwanStudios. All rights reserved.</FooterText>
    </FooterContainer>
  );
};

export default Footer;
