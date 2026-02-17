import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../../../context/AuthContext';

import {
  BarChart2,
  Dumbbell,
  Trophy,
  Gift,
  Calendar,
  MessageCircle,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Home,
  ShoppingCart,
  Utensils,
  Phone
} from 'lucide-react';

import {
  PageContainer,
  ContentContainer,
  DashboardGrid,
  containerVariants,
  itemVariants
} from '../styled-components';

import EnhancedDashboardHeader from './EnhancedDashboardHeader';

// ─── Styled Components (MUI replacements) ──────────────────────────────────

/**
 * Extends PageContainer with background image pseudo-element.
 * Replaces the sx={{ bgcolor, '&::before': {...} }} that was on PageContainer.
 */
const PageWrapper = styled(PageContainer)`
  background-color: #0a0a1a;
  position: relative;
  min-height: 100vh;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('/swan-bg.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: -1;
    /* GPU acceleration for the background layer */
    transform: translateZ(0);
    will-change: transform;
  }
`;

/**
 * Extends ContentContainer with responsive margin/padding.
 * Replaces sx={{ mt: '56px', pt: { xs: 3, md: 5 }, px: { xs: 2, md: 4 } }}.
 */
const StyledContentContainer = styled(ContentContainer)`
  margin-top: 56px;
  padding-top: 40px;
  padding-left: 32px;
  padding-right: 32px;

  @media (max-width: 899px) {
    padding-top: 24px;
    padding-left: 16px;
    padding-right: 16px;
  }
`;

/**
 * Replaces MUI Container with maxWidth="xl" and disableGutters.
 * xl = 1536px in MUI's default breakpoints.
 */
const MainContainer = styled.div`
  max-width: 1536px;
  margin: 0 auto;
  width: 100%;

  @media (min-width: 600px) and (max-width: 899px) {
    padding-left: 16px;
    padding-right: 16px;
  }
`;

/** Replaces the outer Box wrapping the desktop welcome section. */
const WelcomeSection = styled.div`
  margin-bottom: 40px;
  padding-bottom: 16px;
`;

/** Replaces Typography variant="h3" for the greeting. */
const WelcomeHeading = styled(motion.h3)`
  color: white;
  font-size: 2.5rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;

  @media (max-width: 899px) {
    font-size: 2rem;
  }
`;

/** Replaces Typography variant="h6" for the subtitle. */
const WelcomeSubtitle = styled(motion.p)`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.25rem;
  font-weight: 400;
  max-width: 800px;
  margin: 0;
  line-height: 1.6;
`;

// ─── Drawer Components ──────────────────────────────────────────────────────

const DrawerBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1200;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transition: opacity 0.3s;
`;

const DrawerPanel = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 80%;
  max-width: 320px;
  background: #0a0a1a;
  color: white;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  z-index: 1201;
  transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
  transition: transform 0.3s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/** User info area at the top of the drawer. */
const DrawerUserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 8px;
  background-color: #111133;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

/** Replaces MUI Avatar. */
const UserAvatar = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-color: #00a0e3;
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: white;
  flex-shrink: 0;
`;

const UserName = styled.span`
  font-weight: 500;
  font-size: 1.1rem;
  letter-spacing: 0.3px;
  color: white;
  display: block;
`;

const UserStatsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
`;

const UserStatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const UserStatText = styled.span<{ $color?: string }>`
  font-size: 0.8rem;
  color: ${({ $color }) => $color || 'rgba(255, 255, 255, 0.8)'};
`;

/** Replaces MUI List — scrollable menu area. */
const MenuList = styled.ul`
  flex: 1;
  padding: 0 12px;
  margin: 0;
  list-style: none;
  overflow: auto;
`;

/** Replaces MUI List — fixed account section. */
const AccountList = styled.ul`
  padding: 12px;
  margin: 0;
  list-style: none;
`;

/** Replaces MUI ListItem with button prop. 44px min touch target. */
const MenuItemButton = styled.li<{ $color?: string }>`
  display: flex;
  align-items: center;
  border-radius: 4px;
  margin-bottom: 4px;
  padding: 9.6px 16px;
  min-height: 44px;
  cursor: pointer;
  color: ${({ $color }) => $color || 'white'};
  background: transparent;
  border: none;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background-color: ${({ $color }) =>
      $color ? 'rgba(248, 113, 113, 0.1)' : 'rgba(0, 160, 227, 0.1)'};
  }

  &:active {
    background-color: ${({ $color }) =>
      $color ? 'rgba(248, 113, 113, 0.15)' : 'rgba(0, 160, 227, 0.15)'};
  }
`;

/** Replaces MUI ListItemIcon. */
const MenuItemIcon = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || 'white'};
  min-width: 36px;
  display: flex;
  align-items: center;
  flex-shrink: 0;

  & svg {
    stroke-width: 2;
  }
`;

/** Replaces MUI ListItemText. */
const MenuItemLabel = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
`;

/** Replaces MUI Divider. */
const DrawerDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0 16px;
`;

/** Footer area in the drawer. */
const DrawerFooter = styled.div`
  padding: 16px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background-color: rgba(0, 0, 0, 0.2);
`;

const FooterText = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

// ─── Custom Hook: useIsMobile ───────────────────────────────────────────────

function useIsMobile(breakpoint = 900): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  points: number;
  streak: number;
  onViewChallenges?: () => void;
  onViewRewards?: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  onClick?: () => void;
  color?: string;
}

// ─── Swipe Threshold ────────────────────────────────────────────────────────

const SWIPE_CLOSE_THRESHOLD = 100;

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Enhanced Dashboard Layout Component
 * Pixel-perfect implementation matching SwanStudios branding.
 * Fully styled-components — zero MUI dependencies.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  points,
  streak,
  onViewChallenges,
  onViewRewards
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // ── Touch swipe state ──
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const drawerPanelRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current !== null && touchCurrentX.current !== null) {
      const deltaX = touchStartX.current - touchCurrentX.current;
      if (deltaX > SWIPE_CLOSE_THRESHOLD) {
        setMobileDrawerOpen(false);
      }
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
  }, []);

  // Menu items for the drawer — matching existing navigation system
  const menuItems: MenuItem[] = [
    { text: 'Home', icon: <Home size={20} />, path: '/' },
    { text: 'Dashboard', icon: <BarChart2 size={20} />, path: '/client-dashboard' },
    { text: 'My Workouts', icon: <Dumbbell size={20} />, path: '/workout-tracker' },
    { text: 'Challenges', icon: <Trophy size={20} />, path: '/challenges', onClick: onViewChallenges },
    { text: 'Rewards', icon: <Gift size={20} />, path: '/rewards', onClick: onViewRewards },
    { text: 'Schedule', icon: <Calendar size={20} />, path: '/schedule' },
    { text: 'Store', icon: <ShoppingCart size={20} />, path: '/store' },
    { text: 'Food Scanner', icon: <Utensils size={20} />, path: '/food-scanner' },
    { text: 'Messages', icon: <MessageCircle size={20} />, path: '/messages' },
    { text: 'Contact', icon: <Phone size={20} />, path: '/contact' },
  ];

  const accountItems: MenuItem[] = [
    { text: 'My Profile', icon: <User size={20} />, path: '/profile' },
    { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
    { text: 'Help Center', icon: <HelpCircle size={20} />, path: '/help' },
    { text: 'Sign Out', icon: <LogOut size={20} />, path: '/logout', color: '#f87171' }
  ];

  return (
    <PageWrapper>
      {/* Enhanced SwanStudios Header */}
      <EnhancedDashboardHeader
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
      />

      <StyledContentContainer>
        {/* Main content container */}
        <MainContainer>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Welcome Header section for desktop */}
            {!isMobile && (
              <WelcomeSection>
                <div>
                  <WelcomeHeading variants={itemVariants}>
                    Hi, {user?.firstName || 'Athlete'}!
                  </WelcomeHeading>
                  <WelcomeSubtitle variants={itemVariants}>
                    Track your fitness progress and unlock achievements on your wellness journey
                  </WelcomeSubtitle>
                </div>
              </WelcomeSection>
            )}

            {/* Main Dashboard Layout */}
            <DashboardGrid>
              {children}
            </DashboardGrid>
          </motion.div>
        </MainContainer>
      </StyledContentContainer>

      {/* Mobile Navigation Drawer — custom implementation, no MUI */}
      <DrawerBackdrop
        $open={mobileDrawerOpen}
        onClick={() => setMobileDrawerOpen(false)}
      />
      <DrawerPanel
        $open={mobileDrawerOpen}
        ref={drawerPanelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* User info area */}
        <DrawerUserInfo>
          <UserAvatar>
            {user?.firstName?.[0] || 'U'}
          </UserAvatar>
          <div>
            <UserName>
              {user?.firstName || 'User'} {user?.lastName || ''}
            </UserName>
            <UserStatsRow>
              <UserStatItem>
                <Trophy size={14} color="#00a0e3" />
                <UserStatText>
                  {points} Pts
                </UserStatText>
              </UserStatItem>
              <UserStatItem>
                <Gift size={14} color={streak > 0 ? '#ffb700' : 'rgba(255, 255, 255, 0.5)'} />
                <UserStatText $color={streak > 0 ? '#ffb700' : 'rgba(255, 255, 255, 0.5)'}>
                  {streak} Day Streak
                </UserStatText>
              </UserStatItem>
            </UserStatsRow>
          </div>
        </DrawerUserInfo>

        {/* Menu items */}
        <MenuList>
          {menuItems.map((item, index) => (
            <MenuItemButton
              key={index}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  navigate(item.path);
                }
                setMobileDrawerOpen(false);
              }}
            >
              <MenuItemIcon>
                {item.icon}
              </MenuItemIcon>
              <MenuItemLabel>{item.text}</MenuItemLabel>
            </MenuItemButton>
          ))}
        </MenuList>

        <DrawerDivider />

        {/* Account items */}
        <AccountList>
          {accountItems.map((item, index) => (
            <MenuItemButton
              key={index}
              $color={item.color}
              onClick={() => {
                navigate(item.path);
                setMobileDrawerOpen(false);
              }}
            >
              <MenuItemIcon $color={item.color}>
                {item.icon}
              </MenuItemIcon>
              <MenuItemLabel>{item.text}</MenuItemLabel>
            </MenuItemButton>
          ))}
        </AccountList>

        {/* Footer */}
        <DrawerFooter>
          <FooterText>
            SwanStudios &copy; {new Date().getFullYear()}
          </FooterText>
        </DrawerFooter>
      </DrawerPanel>
    </PageWrapper>
  );
};

// Navigation helper for drawer
const navigate = (path: string) => {
  window.location.href = path;
};

export default DashboardLayout;
