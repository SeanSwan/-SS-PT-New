import styled from 'styled-components';
export const Overlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 300ms ease;
  @media (min-width: 1025px) {
    display: none;
  }
`;
export const MobileMenuBtn = styled.button`
  position: fixed;
  top: 60px;
  left: 10px;
  z-index: 1002;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  background: var(--bg-surface, #141419);
  color: var(--accent-secondary, #8B5CF6);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 200ms ease, border-color 200ms ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  &:hover {
    background: var(--bg-elevated, #1A1A24);
    border-color: var(--accent-secondary, #8B5CF6);
  }
  @media (max-width: 1024px) {
    display: flex;
  }
  @media (max-width: 375px) {
    top: 58px;
    left: 8px;
  }
`;
export const SidebarWrap = styled.aside<{ $collapsed: boolean; $mobileOpen: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  background: var(--bg-base, #0A0A0F);
  border-right: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  width: ${({ $collapsed }) => ($collapsed ? '64px' : '280px')};
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
              visibility 0s linear ${({ $mobileOpen }) => ($mobileOpen ? '0s' : '300ms')};
  overflow: hidden;
  overflow-y: ${({ $collapsed }) => ($collapsed ? 'visible' : 'hidden')};
  @media (max-width: 1024px) {
    top: 0;
    width: 85vw;
    max-width: 360px;
    border-right: none;
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5);
    border-radius: 0 16px 16px 0;
    transform: translateX(${({ $mobileOpen }) => ($mobileOpen ? '0' : '-100%')});
    pointer-events: ${({ $mobileOpen }) => ($mobileOpen ? 'auto' : 'none')};
    visibility: ${({ $mobileOpen }) => ($mobileOpen ? 'visible' : 'hidden')};
  }
  @media (max-width: 375px) {
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
  }
`;
export const SidebarHeader = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'space-between')};
  padding: 16px;
  min-height: 56px;
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  flex-shrink: 0;
  @media (max-width: 375px) {
    padding: 12px;
    min-height: 48px;
  }
`;
export const LogoBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
`;
export const LogoMark = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  background: var(--bg-primary, #002060);
  border: 1px solid rgba(96, 192, 240, 0.3);
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  font-weight: 700;
  font-size: 14px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  text-shadow: 0 0 6px rgba(96, 192, 240, 0.6);
  @media (max-width: 375px) {
    width: 32px;
    height: 32px;
    min-width: 32px;
    font-size: 12px;
  }
`;
export const LogoLabel = styled.span<{ $visible: boolean }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateX(${({ $visible }) => ($visible ? '0' : '-8px')});
  transition: opacity 200ms ease, transform 200ms ease;
`;
export const CollapseBtn = styled.button<{ $collapsed: boolean }>`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ $collapsed }) =>
    $collapsed
      ? 'rgba(96, 192, 240, 0.3)'
      : 'rgba(224, 236, 244, 0.06)'};
  background: ${({ $collapsed }) =>
    $collapsed
      ? 'var(--bg-elevated, #1A1A24)'
      : 'transparent'};
  color: ${({ $collapsed }) =>
    $collapsed
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, #4070C0)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: ${({ $collapsed }) => ($collapsed ? 'absolute' : 'static')};
  ${({ $collapsed }) =>
    $collapsed
      ? `
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(10, 10, 15, 0.5);
  `
      : ''}
  &:hover {
    background: var(--bg-elevated, #1A1A24);
    color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.25);
    transform: ${({ $collapsed }) => ($collapsed ? 'translateX(-50%) scale(1.05)' : 'scale(1.05)')};
  }
  @media (max-width: 1024px) {
    display: none;
  }
`;
export const MobileCloseBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid var(--danger-border, rgba(201, 42, 84, 0.2));
  background: var(--danger-soft, rgba(201, 42, 84, 0.08));
  color: var(--danger, #C92A54);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  &:hover {
    background: var(--danger-soft-strong, rgba(201, 42, 84, 0.15));
    box-shadow: 0 0 12px var(--danger-border, rgba(201, 42, 84, 0.2));
  }
  @media (max-width: 1024px) {
    display: flex;
  }
`;
export const SectionLabel = styled.div<{ $visible: boolean }>`
  padding: 0 20px;
  margin-top: 24px;
  margin-bottom: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-tertiary, #4070C0);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  height: ${({ $visible }) => ($visible ? 'auto' : '0')};
  overflow: hidden;
  transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1);
`;
export {
  NavScroll,
  NavItem,
  NavIcon,
  NavLabel,
  NavTooltip,
  SidebarFooter,
  FooterVersion,
} from './TrainerStellarSidebar.nav.styles';
