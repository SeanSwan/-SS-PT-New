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
  background: var(--surface-obsidian, rgba(20, 20, 25, 0.88));
  backdrop-filter: blur(10px);
  color: var(--text-secondary, #B8C7D9);
  padding: 12px 24px;
  font-size: 0.8rem;
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
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
    color: var(--ice-wing, #60C0F0);
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
  color: var(--text-secondary, #B8C7D9);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: color 200ms ease;
  font-size: 0.8rem;
  
  &:hover {
    color: var(--ice-wing, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8B5CF6);
    outline-offset: 2px;
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
        <FooterLink to="/support">Report a problem</FooterLink>
      </FooterLinks>
    </CompactFooterContainer>
  );
};

export default CompactFooter;