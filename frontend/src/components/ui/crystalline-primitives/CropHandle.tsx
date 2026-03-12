/**
 * CropHandle — Photo crop corner handles for Print-on-Demand
 * 16px visible handle + 44px invisible touch target (WCAG 2.1 AA 2.5.5)
 */
import styled from 'styled-components';

export const CropHandle = styled.div<{ $corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }>`
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid #60C0F0; /* Ice Wing */
  background: transparent;

  /* 44px invisible touch target for mobile */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    background: transparent;
    cursor: crosshair;
  }

  /* Corner positioning + selective borders */
  ${({ $corner }) => {
    switch ($corner) {
      case 'top-left':
        return `top: 0; left: 0; border-right: none; border-bottom: none;`;
      case 'top-right':
        return `top: 0; right: 0; border-left: none; border-bottom: none;`;
      case 'bottom-left':
        return `bottom: 0; left: 0; border-right: none; border-top: none;`;
      case 'bottom-right':
        return `bottom: 0; right: 0; border-left: none; border-top: none;`;
    }
  }}
`;
