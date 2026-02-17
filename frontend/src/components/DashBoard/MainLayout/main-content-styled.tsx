import styled from 'styled-components';

interface MainContentStyledProps {
  $open: boolean;
  $borderRadius: number;
  $withExternalHeader: boolean;
}

/**
 * MainContentStyled Component
 *
 * Styled wrapper for the main content area of the dashboard.
 * Handles the responsiveness and appearance of the content area.
 * Enhanced to utilize full screen width for better widget layout.
 */
const MainContentStyled = styled.main<MainContentStyledProps>`
  flex-grow: 1;
  padding-top: 0;
  width: 100%;
  background-color: #0a0a1a;
  border-radius: ${props => props.$borderRadius}px;
  max-width: 100vw;
  box-sizing: border-box;
  padding-left: ${props => props.$open ? '220px' : '0'};
  padding-right: 0;
  transition: width 0.3s ease-out;

  @media (max-width: 960px) {
    width: 100%;
    margin-left: 0;
  }
`;

export default MainContentStyled;
