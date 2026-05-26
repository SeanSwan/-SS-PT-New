/**
 * COMPONENT: AdminStellarSidebar.nav.styles
 * PURPOSE: Navigation-specific styled-components for the admin sidebar.
 */

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
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  appearance: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  margin: 4px 8px;
  padding: ${({ $collapsed }) => ($collapsed ? '12px 0' : '10px 12px')};
  /* DESIGN-4: 64px item height for touch targets */
  min-height: 64px;
  border-radius: 10px;
  justify-content: ${({ $collapsed }) => ($collapsed ? 'center' : 'flex-start')};

  /* Kirin Active State (Phase B — Solid Wing Purple fill per Gemini CD spec) */
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active }) =>
    $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.6)'};
  background: ${({ $active }) =>
    $active ? '#8B5CF6' : 'transparent'};
  border-left: 3px solid transparent;
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
  animation: ${surfaceRise} 400ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  position: relative;

  ${({ $active }) =>
    $active &&
    `box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);`}

  &:hover {
    background: ${({ $active }) =>
      $active ? '#8B5CF6' : '#1A1A24'};
    color: ${({ $active }) =>
      $active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.88)'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }

  @media (max-width: 375px) {
    padding: 10px 12px;
  }

  /* Kirin icons: Frost White on active (against purple bg), inherit on resting */
  svg {
    color: ${({ $active }) =>
      $active ? '#E0ECF4' : 'inherit'};
    filter: none;
    transition: all 250ms ease;
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

  /* Deep-Ocean Glassmorphism */
  background: rgba(26, 26, 36, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  box-shadow: 0 8px 24px rgba(10, 10, 15, 0.8);

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

export const Divider = styled.div<{ $collapsed: boolean }>`
  height: 1px;
  margin: 8px ${({ $collapsed }) => ($collapsed ? '12px' : '16px')};
  background: var(--border-soft, rgba(224, 236, 244, 0.06));
`;

/* Kirin section header — Plus Jakarta Sans 11px uppercase, Swan Lavender 60% */
export const SectionHeader = styled.div`
  padding: 20px 20px 8px 20px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(64, 112, 192, 0.6);
  user-select: none;
  pointer-events: none;

  &:first-of-type {
    padding-top: 8px;
  }
`;

/* Collapsed-state section rule — hairline divider, no label */
export const SectionRule = styled.div`
  height: 1px;
  margin: 16px 12px 8px 12px;
  background: rgba(224, 236, 244, 0.06);

  &:first-of-type {
    margin-top: 4px;
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
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  text-align: center;

  @media (max-width: 1024px) {
    font-size: 12px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
