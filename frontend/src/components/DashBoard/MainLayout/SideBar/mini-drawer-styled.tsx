// src/components/DashBoard/MainLayout/Sidebar/mini-drawer-styled.tsx
import styled, { css } from 'styled-components';
import { Drawer } from '../../../ui/primitives';

const drawerWidth = 260;

interface MiniDrawerStyledProps {
  open?: boolean;
  variant?: 'temporary' | 'persistent' | 'permanent';
}

const MiniDrawerStyled = styled(Drawer)<MiniDrawerStyledProps>`
  flex-shrink: 0;
  white-space: nowrap;
  box-sizing: border-box;
  border-right: 0;

  ${({ open }) =>
    open
      ? css`
          width: ${drawerWidth}px;
          overflow-x: hidden;
          transition: width 0.4s ease;
        `
      : css`
          width: 72px;
          overflow-x: hidden;
          transition: width 0.3s ease;
        `}
`;

export default MiniDrawerStyled;
