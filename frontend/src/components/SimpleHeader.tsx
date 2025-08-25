// SIMPLE HEADER COMPONENT - No complex dependencies
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #334155 100%);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ffff;
  text-decoration: none;
  cursor: pointer;
`;

const Nav = styled.nav`
  display: flex;
  gap: 2rem;
  align-items: center;
  
  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
  }
`;

const SimpleHeader = () => {
  const navigate = useNavigate();
  
  return (
    <HeaderContainer>
      <Logo onClick={() => navigate('/')}>
        🦢 SwanStudios
      </Logo>
      
      <Nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/store">Store</NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/contact">Contact</NavLink>
        <NavLink to="/login" style={{ 
          background: 'linear-gradient(135deg, #00ffff, #7851a9)',
          color: '#0a0a1a',
          fontWeight: 'bold'
        }}>
          Login
        </NavLink>
      </Nav>
    </HeaderContainer>
  );
};

export default SimpleHeader;