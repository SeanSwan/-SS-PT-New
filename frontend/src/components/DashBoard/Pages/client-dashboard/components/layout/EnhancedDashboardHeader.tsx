import React, { useState, MouseEvent, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  ShoppingCart,
  Menu as MenuIcon,
  ChevronDown,
  Bell,
  Dumbbell
} from 'lucide-react';

interface EnhancedDashboardHeaderProps {
  points?: number;
  streak?: number;
  onViewChallenges?: () => void;
  onViewRewards?: () => void;
  onOpenMobileDrawer?: () => void;
}

/* ─── styled-components ─── */

const HeaderWrapper = styled.div<{ $scrolled: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: ${({ $scrolled }) => ($scrolled ? 'rgba(10, 10, 26, 0.98)' : '#0a0a1a')};
  transition: background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: ${({ $scrolled }) => ($scrolled ? '0 5px 20px rgba(0, 0, 0, 0.3)' : 'none')};
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transform: translateZ(0);
  will-change: background, box-shadow;
`;

const HeaderContainer = styled.div`
  width: 100%;
  padding: 0 16px;

  @media (min-width: 600px) {
    padding: 0 24px;
  }
  @media (min-width: 960px) {
    padding: 0 32px;
  }
`;

const HeaderInner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover .logo-text {
    color: #10b5f0;
  }
`;

const LogoIcon = styled.div<{ $active: boolean }>`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => ($active ? 'rgba(0, 160, 227, 0.1)' : 'transparent')};
  border-radius: 50%;
  padding: 4px;
`;

const LogoText = styled.span`
  font-weight: 500;
  font-size: 1.15rem;
  color: #00a0e3;
  letter-spacing: 0.5px;
`;

const NavArea = styled.div`
  display: flex;
  height: 100%;
  align-items: center;
`;

const NavButton = styled.button<{ $active: boolean }>`
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#00a0e3' : 'transparent')};
  color: ${({ $active }) => ($active ? '#00a0e3' : 'white')};
  text-transform: none;
  padding: 0 9.6px;
  min-width: auto;
  min-height: 44px;
  height: 56px;
  border-radius: 0;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: 0.2px;
  margin: 0 2.4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;

  &:hover {
    background-color: transparent;
    color: #00a0e3;
    border-bottom: 2px solid #00a0e3;
  }
`;

const ActionsArea = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;

  @media (min-width: 960px) {
    gap: 8px;
  }
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  position: relative;

  &:hover {
    color: #00a0e3;
    background-color: rgba(0, 160, 227, 0.05);
  }
`;

const BadgeWrapper = styled.span`
  position: relative;
  display: inline-flex;
`;

const BadgeDot = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: #ec4899;
  font-size: 0.65rem;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  line-height: 1;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  background-color: #00a0e3;
  cursor: pointer;
  font-size: 0.9rem;
  margin-left: 4px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;

  &:hover {
    box-shadow: 0 0 0 2px rgba(0, 160, 227, 0.3);
  }
`;

/* ── Dropdown menu ── */

const DropdownOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
`;

const DropdownMenu = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  z-index: 1200;
  background: #0a0a1a;
  color: white;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  width: 180px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 4px 0;
`;

const DropdownItem = styled.button<{ $bordered?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  border-bottom: ${({ $bordered }) => ($bordered ? '1px solid rgba(255, 255, 255, 0.05)' : 'none')};
  color: white;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  font-family: inherit;
  min-height: 44px;
  text-align: left;

  &:hover {
    background-color: rgba(0, 160, 227, 0.05);
  }
`;

const DropdownItemIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  color: white;
`;

const NewBadge = styled.span`
  margin-left: 8px;
  font-size: 0.65rem;
  padding: 1px 5px;
  background-color: #ec4899;
  border-radius: 4px;
  white-space: nowrap;
  color: white;
  font-weight: 600;
`;

/* ─── Hook: simple mobile breakpoint ─── */

function useIsMobile(breakpoint = 960) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

/**
 * EnhancedDashboardHeader - Pixel-perfect implementation for SwanStudios
 *
 * This header component is designed to match exactly with the SwanStudios
 * brand design as seen in the screenshots and existing styling patterns.
 * It includes responsive behavior, dropdown menus, and proper active state
 * styling for navigation items.
 */
const EnhancedDashboardHeader: React.FC<EnhancedDashboardHeaderProps> = ({
  onOpenMobileDrawer
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [storeMenuAnchor, setStoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle navigation to different pages
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Handle store menu
  const handleStoreMenuOpen = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2 - 90
    });
    setStoreMenuAnchor(event.currentTarget);
  };

  const handleStoreMenuClose = useCallback(() => {
    setStoreMenuAnchor(null);
  }, []);

  // Handle navigation to store submenu items
  const handleStoreNavigate = (path: string) => {
    navigate(path);
    handleStoreMenuClose();
  };

  // Check if a path is active
  const isActive = (path: string): boolean => {
    if (path === '/home' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <HeaderWrapper $scrolled={scrolled}>
      <HeaderContainer>
        <HeaderInner>
          {/* Logo Area */}
          <LogoArea onClick={() => handleNavigation('/')}>
            <LogoIcon $active={isActive('/home')}>
              <img
                src="/swan-icon.svg"
                alt="Swan Studios"
                style={{
                  width: '100%',
                  height: '100%'
                }}
              />
            </LogoIcon>
            <LogoText className="logo-text">
              SwanStudios
            </LogoText>
          </LogoArea>

          {/* Navigation Area */}
          {!isMobile && (
            <NavArea>
              <NavButton
                $active={isActive('/home')}
                onClick={() => handleNavigation('/')}
              >
                Home
              </NavButton>

              <NavButton
                $active={isActive('/store')}
                onClick={handleStoreMenuOpen}
              >
                Store
                <ChevronDown size={14} />
              </NavButton>

              <NavButton
                $active={isActive('/client-dashboard')}
                onClick={() => handleNavigation('/client-dashboard')}
              >
                Client Dashboard
              </NavButton>

              <NavButton
                $active={isActive('/workout-tracker')}
                onClick={() => handleNavigation('/workout-tracker')}
              >
                Workout Tracker
              </NavButton>

              <NavButton
                $active={isActive('/schedule')}
                onClick={() => handleNavigation('/schedule')}
              >
                Schedule
              </NavButton>

              <NavButton
                $active={isActive('/food-scanner')}
                onClick={() => handleNavigation('/food-scanner')}
              >
                Food Scanner
              </NavButton>

              <NavButton
                $active={isActive('/contact')}
                onClick={() => handleNavigation('/contact')}
              >
                Contact
              </NavButton>

              <NavButton
                $active={isActive('/about')}
                onClick={() => handleNavigation('/about-us')}
              >
                About Us
              </NavButton>
            </NavArea>
          )}

          {/* User Actions Area */}
          <ActionsArea>
            {isMobile ? (
              <ActionButton onClick={onOpenMobileDrawer}>
                <MenuIcon size={22} />
              </ActionButton>
            ) : (
              <>
                <ActionButton>
                  <BadgeWrapper>
                    <Bell size={20} />
                    <BadgeDot>1</BadgeDot>
                  </BadgeWrapper>
                </ActionButton>

                <ActionButton>
                  <ShoppingCart size={20} />
                </ActionButton>

                <UserAvatar>
                  {user?.firstName?.[0] || 'U'}
                </UserAvatar>
              </>
            )}
          </ActionsArea>
        </HeaderInner>
      </HeaderContainer>

      {/* Store Menu Dropdown */}
      {Boolean(storeMenuAnchor) && (
        <>
          <DropdownOverlay onClick={handleStoreMenuClose} />
          <DropdownMenu $top={menuPos.top} $left={menuPos.left}>
            <DropdownItem
              $bordered
              onClick={() => handleStoreNavigate('/store')}
            >
              <DropdownItemIcon>
                <ShoppingCart size={16} />
              </DropdownItemIcon>
              All Products
            </DropdownItem>
            <DropdownItem onClick={() => handleStoreNavigate('/training-packages')}>
              <DropdownItemIcon>
                <Dumbbell size={16} />
              </DropdownItemIcon>
              Training Packages
            </DropdownItem>
            <DropdownItem onClick={() => handleStoreNavigate('/apparel')}>
              <DropdownItemIcon>
                <ShoppingCart size={16} />
              </DropdownItemIcon>
              Apparel
            </DropdownItem>
            <DropdownItem onClick={() => handleStoreNavigate('/supplements')}>
              <DropdownItemIcon>
                <ShoppingCart size={16} />
              </DropdownItemIcon>
              Supplements
              <NewBadge>NEW</NewBadge>
            </DropdownItem>
          </DropdownMenu>
        </>
      )}
    </HeaderWrapper>
  );
};

export default EnhancedDashboardHeader;
