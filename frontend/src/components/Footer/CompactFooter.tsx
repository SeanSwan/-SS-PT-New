/**
 * CompactFooter.tsx
 * ================
 * 
 * A minimal, compact footer specifically designed for auth pages
 * (login, signup, password reset) to minimize distraction and
 * vertical space consumption.
 */

import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Copyright as CopyrightIcon } from 'lucide-react';
import device from '../../styles/breakpoints';

// Styled components
const CompactFooterContainer = styled.footer`
  width: 100%;
  background: rgba(15, 12, 41, 0.8);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.7);
  padding: 12px 24px;
  font-size: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 5;
  margin-top: auto;
  
  ${device.maxSm} {
    flex-direction: column;
    gap: 8px;
    text-align: center;
    padding: 10px 16px;
  }
`;

const Copyright = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    color: #00ffff;
    font-size: 0.8rem;
  }
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 16px;
  
  ${device.maxSm} {
    gap: 12px;
  }
`;

const FooterLink = styled(Link)`
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s ease;
  font-size: 0.8rem;
  
  &:hover {
    color: #00ffff;
  }
`;

const CompactFooter: React.FC = () => {
  return (
    <CompactFooterContainer className="compact-footer">
      <Copyright>
        <CopyrightIcon /> {new Date().getFullYear()} Swan Studios. All Rights Reserved.
      </Copyright>
      
      <FooterLinks>
        <FooterLink to="/privacy">Privacy</FooterLink>
        <FooterLink to="/terms">Terms</FooterLink>
        <FooterLink to="/help">Help</FooterLink>
      </FooterLinks>
    </CompactFooterContainer>
  );
};

export default CompactFooter;