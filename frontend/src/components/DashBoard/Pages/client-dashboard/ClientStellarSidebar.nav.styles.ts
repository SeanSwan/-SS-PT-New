import styled, { keyframes } from 'styled-components';

const surfaceRise = keyframes`
  0% { opacity: 0; transform: translateX(-12px); }
  100% { opacity: 1; transform: translateX(0); }
`;
export const NavScroll = styled.nav`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent) transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-radius: 2px;
  }
`;
export const NavItem = styled.button<{ $active: boolean; $collapsed: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  margin: 4px 8px;
  padding: ${({ $collapsed }) => ($collapsed ? '12px 0' : '10px 12px')};
  min-height: 64px;
  border-radius: 10px;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #4070C0)'};
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(90deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent) 0%, transparent 100%)'
      : 'transparent'};
  border-left: 3px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  transition: all 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
  animation: ${surfaceRise} 400ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  position: relative;
  ${({ $active }) =>
    $active &&
    `box-shadow: inset 4px 0 12px -4px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);`}
  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(90deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent) 0%, transparent 100%)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)'};
    color: var(--text-primary, #E0ECF4);
    border-left-color: var(--accent-primary, #60C0F0);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
  @media (max-width: 375px) {
    padding: 10px 12px;
  }
  svg {
    color: ${({ $active }) =>
      $active ? 'var(--accent-primary, #60C0F0)' : 'inherit'};
    filter: ${({ $active }) =>
      $active ? 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent))' : 'none'};
    transition: all 250ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    svg { transition: none; }
  }
`;
export const NavIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;
export const NavLabel = styled.span<{ $visible: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  width: ${({ $visible }) => ($visible ? 'auto' : '0')};
  transition: opacity 200ms ease;
  @media (max-width: 1024px) {
    font-size: 16px;
  }
  @media (max-width: 375px) {
    font-size: 15px;
  }
`;
export const NavTooltip = styled.div`
  position: absolute;
  left: calc(100% + 16px);
  top: 50%;
  transform: translateY(-50%) scale(0.95);
  z-index: 1100;
  padding: 8px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 85%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--bg-base, #0A0A0F) 80%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  ${NavItem}:hover & {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
`;
export const SidebarFooter = styled.div<{ $collapsed: boolean }>`
  padding: ${({ $collapsed }) => ($collapsed ? '12px 8px' : '12px 16px')};
  border-top: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  flex-shrink: 0;
`;
export const FooterVersion = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, #4070C0);
  text-align: center;
  opacity: 0.6;
  @media (max-width: 1024px) {
    font-size: 12px;
  }
`;
