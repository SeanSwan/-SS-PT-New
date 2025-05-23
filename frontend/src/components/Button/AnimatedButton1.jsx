import React from 'react';
import styled, { css } from 'styled-components';

const buttonStyles = css`
  position: relative;
  display: inline-block;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-size: 1rem;
  overflow: hidden;
  outline: none;
  border-radius: 25px;
  padding: 8px 20px;
  transition: all 0.3s ease;
  margin-bottom: 5px;
`;

const buttonType2 = css`
  background: linear-gradient(135deg, rgba(247, 150, 192, 1) 0%, rgba(118, 174, 241, 1) 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.1);

  &:hover {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(118, 174, 241, 1) 0%, rgba(247, 150, 192, 1) 100%);
  }

  &::before {
    position: absolute;
    content: '';
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(247, 150, 192, 1) 0%, rgba(118, 174, 241, 1) 100%);
    border-radius: 25px;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: -1;
  }

  &:hover::before {
    opacity: 1;
    transform: scale(1.1);
  }
`;

const StyledButton = styled.button`
  ${buttonStyles}
  ${({ type }) => (type === 2 ? buttonType2 : '')}
`;

const AnimatedButton1 = ({ label, type, onClick }) => (
  <StyledButton type={type} onClick={onClick}>
    {label}
  </StyledButton>
);

export default AnimatedButton1;