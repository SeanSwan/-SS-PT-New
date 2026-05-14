/**
 * DesktopMoreMenu
 * ----------------
 * Responsive overflow menu for global header links that do not fit reliably
 * beside dashboard controls and authenticated action icons on compact desktop.
 *
 * PARENT: NavigationLinks
 * PURPOSE: Preserve access to secondary global routes when desktop width is
 * tight enough that inline links would collide with header actions.
 * WIREFRAME:
 *   [More v] -> [Store on compact] [Video Library] [Waiver] [Contact] [Photography] [About]
 * DATA FLOW: props in { isActive, includeCompactStore }; state { isOpen };
 * no API calls. Click More toggles the menu; click link lets React Router
 * navigate to the selected route.
 * ARCHITECTURE:
 *   NavigationLinks -> DesktopMoreMenu -> MoreButton + MoreList -> MoreLink
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';

const LINKS = [
  { to: '/video-library', label: 'Video Library' },
  { to: '/waiver', label: 'Waiver' },
  { to: '/contact', label: 'Contact' },
  { to: '/gallery', label: 'Photography' },
  { to: '/about', label: 'About' },
];

const MoreContainer = styled.div`
  display: none;
  position: relative;
  z-index: var(--z-dropdown, 1260);

  @media (max-width: 1720px) and (min-width: 1025px) {
    display: block;
  }
`;

const MoreButton = styled.button<{ $isOpen: boolean }>`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.15));
  border-radius: 8px;
  padding: 0 12px;
  background: ${({ $isOpen }) =>
    $isOpen
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, var(--bg-elevated, #141419))'
      : 'transparent'};
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: var(--accent-primary, #60C0F0);
    outline: none;
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }
`;

const MoreList = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? 'grid' : 'none')};
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(240px, calc(100vw - 32px));
  padding: 8px;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.15));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 96%, var(--bg-base, #030712));
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.45),
    0 0 28px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
`;

const MoreLink = styled(Link)<{ $isActive?: boolean }>`
  min-height: 44px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 0 12px;
  color: ${({ $isActive }) =>
    $isActive ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;

  &:hover,
  &:focus-visible {
    outline: none;
    color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }
`;

const CompactOnlyLink = styled(MoreLink)`
  display: none;

  @media (max-width: 1180px) {
    display: flex;
  }
`;

interface DesktopMoreMenuProps {
  isActive: (path: string) => boolean;
  includeCompactStore?: boolean;
}

const DesktopMoreMenu: React.FC<DesktopMoreMenuProps> = ({ isActive, includeCompactStore = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [isOpen]);

  return (
    <MoreContainer ref={menuRef}>
      <MoreButton
        type="button"
        $isOpen={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        More <ChevronDown size={16} aria-hidden="true" />
      </MoreButton>
      <MoreList $isOpen={isOpen} role="menu" aria-label="More site navigation">
        {includeCompactStore && (
          <CompactOnlyLink to="/store" $isActive={isActive('/store') || isActive('/shop')} role="menuitem">
            SwanStudios Store
          </CompactOnlyLink>
        )}
        {LINKS.map(({ to, label }) => (
          <MoreLink key={to} to={to} $isActive={isActive(to)} role="menuitem">
            {label}
          </MoreLink>
        ))}
      </MoreList>
    </MoreContainer>
  );
};

export default DesktopMoreMenu;
