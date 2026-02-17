/**
 * main-content-styled.ts
 * Styled component for main content area
 * Enhanced to support external header and application themes
 */
import styled from 'styled-components';

interface MainContentProps {
  $open?: boolean;
  $borderRadius?: number;
  $withExternalHeader?: boolean;
}

const MainContentStyled = styled.main<MainContentProps>`
  background-color: #0a0a1a;
  width: 100%;
  min-height: calc(100vh - 88px);
  flex-grow: 1;
  padding: 20px;
  margin-top: ${props => props.$withExternalHeader ? '60px' : '88px'};
  margin-right: 20px;
  border-radius: ${props => props.$borderRadius || 8}px;
  transition: margin 0.3s ease, width 0.3s ease;

  @media (max-width: 960px) {
    margin-left: 20px;
    padding: 16px;
    margin-right: 20px;
  }

  @media (max-width: 600px) {
    margin-left: 10px;
    margin-right: 10px;
    padding: 12px;
  }
`;

export default MainContentStyled;
