import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled, { keyframes, css } from 'styled-components';
import {
  Menu,
  ChevronLeft,
  LayoutDashboard,
  Users,
  Calendar,
  ShoppingBag,
  Trophy,
  UserCircle,
  BarChart3,
  LogOut,
  Users2,
  Dumbbell,
  Video,
  CalendarDays,
} from 'lucide-react';

import DashboardSelector from '../DashboardSelector/DashboardSelector';
import TrainerDashboardRoutes from './routes/TrainerDashboardRoutes';

// Import contexts
import { useAuth } from '../../context/AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────
const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 65;
const APPBAR_HEIGHT = 64;

// ─── Galaxy-Swan Theme Tokens ────────────────────────────────────────────────
const theme = {
  galaxyCore: '#0a0a1a',
  paper: 'rgba(30, 30, 60, 0.3)',
  swanCyan: '#00ffff',
  cosmicPurple: '#7851a9',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  errorMain: '#ff416c',
  errorBg: 'rgba(255, 65, 108, 0.1)',
  borderRadius: '10px',
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  transition: '225ms cubic-bezier(0.4, 0, 0.6, 1)',
  transitionFast: '195ms cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

// ─── Keyframes ───────────────────────────────────────────────────────────────
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

/** Root layout wrapper */
const LayoutRoot = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${theme.galaxyCore};
  color: ${theme.textPrimary};
  font-family: ${theme.fontFamily};
`;

/** Fixed top app bar */
const AppBarStyled = styled.header<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  height: ${APPBAR_HEIGHT}px;
  padding: 0 24px;
  background: linear-gradient(135deg, rgba(30, 30, 60, 0.95) 0%, rgba(10, 10, 26, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  z-index: 1201;
  transition: width ${theme.transition}, margin-left ${theme.transition};
  margin-left: ${({ $open }) => ($open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH)}px;
  width: ${({ $open }) =>
    $open ? `calc(100% - ${DRAWER_WIDTH}px)` : `calc(100% - ${DRAWER_COLLAPSED_WIDTH}px)`};
`;

/** Toolbar inner flex row */
const ToolbarInner = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
`;

/** Reusable icon button (44px touch target) */
const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${theme.textPrimary};
  cursor: pointer;
  transition: background ${theme.transitionFast};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &:focus-visible {
    outline: 2px solid ${theme.swanCyan};
    outline-offset: 2px;
  }
`;

/** Page title */
const PageTitle = styled.h1`
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${theme.textPrimary};
`;

/** Avatar circle */
const AvatarStyled = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 32}px;
  height: ${({ $size }) => $size || 32}px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, ${theme.cosmicPurple}, ${theme.swanCyan});
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/** Dropdown menu wrapper (profile menu) */
const DropdownMenu = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: rgba(30, 30, 60, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: ${theme.borderRadius};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 1300;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: ${({ $visible }) => ($visible ? 'translateY(0)' : 'translateY(-8px)')};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 150ms ease, transform 150ms ease;
`;

/** Individual menu item inside dropdown */
const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: ${theme.textPrimary};
  font-size: 0.875rem;
  font-family: ${theme.fontFamily};
  cursor: pointer;
  transition: background ${theme.transitionFast};

  &:hover {
    background: rgba(0, 255, 255, 0.08);
  }

  &:focus-visible {
    outline: 2px solid ${theme.swanCyan};
    outline-offset: -2px;
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${theme.textSecondary};
  }
`;

/** Sidebar (replaces MUI Drawer) */
const Sidebar = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${({ $open }) => ($open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH)}px;
  background: linear-gradient(180deg, rgba(30, 30, 60, 0.6) 0%, rgba(10, 10, 26, 0.9) 100%);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(0, 255, 255, 0.08);
  overflow-x: hidden;
  overflow-y: auto;
  white-space: nowrap;
  z-index: 1200;
  transition: width ${theme.transition};

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.2);
    border-radius: 2px;
  }
`;

/** Drawer header area (logo + collapse button) */
const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: ${APPBAR_HEIGHT}px;
  padding: 0 8px;
`;

/** Brand text in drawer */
const BrandText = styled.span`
  flex: 1;
  text-align: center;
  font-size: 1.15rem;
  font-weight: 700;
  background: linear-gradient(90deg, ${theme.swanCyan}, ${theme.cosmicPurple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

/** Horizontal divider */
const StyledDivider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(0, 255, 255, 0.1);
  margin: 0;
`;

/** Navigation list */
const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px 0;
`;

/** Single nav item (li) */
const NavItem = styled.li`
  display: block;
`;

/** Clickable nav button inside li */
const NavButton = styled.button<{ $active: boolean; $open: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: 0 20px;
  border: none;
  background: ${({ $active }) =>
    $active ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  color: ${({ $active }) => ($active ? theme.swanCyan : theme.textPrimary)};
  cursor: pointer;
  font-size: 0.875rem;
  font-family: ${theme.fontFamily};
  text-align: left;
  transition: background ${theme.transitionFast}, color ${theme.transitionFast};
  justify-content: ${({ $open }) => ($open ? 'initial' : 'center')};

  &:hover {
    background: rgba(0, 255, 255, 0.06);
  }

  &:focus-visible {
    outline: 2px solid ${theme.swanCyan};
    outline-offset: -2px;
  }

  ${({ $active }) =>
    $active &&
    css`
      border-left: 3px solid ${theme.swanCyan};
    `}
`;

/** Icon wrapper inside nav button */
const NavIcon = styled.span<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  margin-right: ${({ $open }) => ($open ? '24px' : '0')};
  color: inherit;

  svg {
    width: 22px;
    height: 22px;
  }
`;

/** Text label inside nav button */
const NavText = styled.span<{ $open: boolean }>`
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: opacity ${theme.transitionFast};
  overflow: hidden;
`;

/** Main content area */
const MainContent = styled.main<{ $open: boolean }>`
  flex: 1;
  padding: 24px;
  margin-left: ${({ $open }) => ($open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH)}px;
  transition: margin-left ${theme.transition};
  min-height: 100vh;
`;

/** Spacer to push content below app bar */
const AppBarSpacer = styled.div`
  min-height: ${APPBAR_HEIGHT}px;
`;

/** Container with max-width constraint */
const ContentContainer = styled.div`
  max-width: 1200px;
  margin: 32px auto 32px;
`;

/** CSS spinner (replaces MUI CircularProgress) */
const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 60}px;
  height: ${({ $size }) => $size || 60}px;
  border: 4px solid rgba(120, 81, 169, 0.2);
  border-top-color: ${theme.cosmicPurple};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

/** Full-page centered wrapper (for loading / error states) */
const FullPageCenter = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: rgba(9, 4, 30, 0.95);
  padding: 24px;
  text-align: center;
  font-family: ${theme.fontFamily};
  color: ${theme.textPrimary};
`;

/** Error heading */
const ErrorHeading = styled.h2`
  margin: 0 0 16px;
  font-size: 2rem;
  font-weight: 600;
  color: ${theme.errorMain};
`;

/** Error icon circle */
const ErrorIconCircle = styled.div`
  border-radius: 50%;
  background-color: ${theme.errorBg};
  padding: 16px;
  margin-bottom: 24px;
  font-size: 3rem;
  line-height: 1;
`;

/** Subheading / body text */
const ErrorSubheading = styled.h3`
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 500;
  color: ${theme.textPrimary};
`;

const ErrorBody = styled.p`
  max-width: 600px;
  margin: 16px 0 32px;
  font-size: 1rem;
  line-height: 1.6;
  color: ${theme.textSecondary};
`;

/** Action button for error state */
const ErrorActionBtn = styled.button`
  min-width: 120px;
  min-height: 44px;
  padding: 10px 24px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: ${theme.borderRadius};
  background: rgba(0, 255, 255, 0.08);
  color: ${theme.swanCyan};
  font-size: 0.9rem;
  font-weight: 500;
  font-family: ${theme.fontFamily};
  cursor: pointer;
  transition: background ${theme.transitionFast}, border-color ${theme.transitionFast};

  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: ${theme.swanCyan};
  }

  &:focus-visible {
    outline: 2px solid ${theme.swanCyan};
    outline-offset: 2px;
  }
`;

/** Flex row for error actions */
const ErrorActions = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

/** Loading text */
const LoadingText = styled.h2`
  margin: 24px 0 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: ${theme.textPrimary};
`;

/** Profile button relative wrapper (anchors the dropdown) */
const ProfileButtonWrapper = styled.div`
  position: relative;
`;

/** Dashboard selector wrapper */
const DashboardSelectorWrapper = styled.div`
  margin-right: 16px;
`;

// ─── Type for navigation items ───────────────────────────────────────────────
interface NavItemType {
  text: string;
  icon: React.ReactNode;
  path: string;
  ariaLabel: string;
}

// ─── Error State Component ───────────────────────────────────────────────────
const TrainerDashboardError: React.FC<{
  error: string;
  onRetry: () => void;
  onLogout: () => void;
}> = ({ error, onRetry, onLogout }) => (
  <FullPageCenter>
    <ErrorHeading>Trainer Dashboard Access Error</ErrorHeading>

    <ErrorIconCircle>
      <span role="img" aria-label="Warning">&#x26A0;&#xFE0F;</span>
    </ErrorIconCircle>

    <ErrorSubheading>{error}</ErrorSubheading>

    <ErrorBody>
      This may be due to an expired session, insufficient permissions, or network connectivity issues.
      Please try refreshing your session or contact support if the problem persists.
    </ErrorBody>

    <ErrorActions>
      <ErrorActionBtn onClick={onRetry}>Retry</ErrorActionBtn>
      <ErrorActionBtn onClick={onLogout}>Logout</ErrorActionBtn>
    </ErrorActions>
  </FullPageCenter>
);

// ─── Main Layout Component ───────────────────────────────────────────────────

/**
 * TrainerDashboardLayout Component
 * Main layout for the trainer dashboard with navigation drawer and routes
 * Uses the same structure and navigation categories as AdminDashboard for consistency
 */
const TrainerDashboardLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simplified verification - check for basic initialization errors only
  // (ProtectedRoute component handles actual role verification)
  useEffect(() => {
    console.log('TrainerDashboard: Initializing...');

    const initializeDashboard = async () => {
      try {
        setIsVerifying(true);

        if (!user) {
          console.log('TrainerDashboard: No user found');
          setError('Authentication required. Please log in.');
        } else {
          // User exists - just log and initialize
          console.log(`TrainerDashboard: Initializing for ${user.role} user "${user.email}"`);
          setError(null);
        }
      } catch (err) {
        console.error('TrainerDashboard: Error initializing', err);
        setError('An error occurred while loading the dashboard. Please try again.');
      } finally {
        setIsVerifying(false);
      }
    };

    initializeDashboard();
  }, [user]);

  // Handle drawer open/close
  const toggleDrawer = () => {
    setOpen(!open);
  };

  // Handle profile menu open/close
  const handleMenuOpen = () => {
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  // Handle retry action
  const handleRetry = () => {
    setIsVerifying(true);
    setError(null);

    // Simplified retry logic - just check if user exists
    if (user) {
      console.log('TrainerDashboard: User exists, clearing error state');
      setError(null);
      setIsVerifying(false);
    } else {
      // Force refresh to ensure fresh authentication state
      window.location.reload();
    }
  };

  // Handle logout action
  const handleLogout = () => {
    logout();
    navigate('/login?returnUrl=/trainer/dashboard');
  };

  // Navigation items - Trainer-specific functionality only (no admin features)
  const mainNavItems: NavItemType[] = [
    {
      text: 'Dashboard',
      icon: <LayoutDashboard size={22} />,
      path: '/trainer-dashboard',
      ariaLabel: 'Go to main dashboard',
    },
    {
      text: 'Schedule',
      icon: <CalendarDays size={22} />,
      path: '/trainer-dashboard/schedule',
      ariaLabel: 'View and manage your schedule',
    },
    {
      text: 'My Clients',
      icon: <Users size={22} />,
      path: '/trainer-dashboard/clients',
      ariaLabel: 'View and manage your clients',
    },
    {
      text: 'Workout Plans',
      icon: <Dumbbell size={22} />,
      path: '/trainer-dashboard/workouts',
      ariaLabel: 'Create and manage workout plans for clients',
    },
    {
      text: 'Training Sessions',
      icon: <Calendar size={22} />,
      path: '/trainer-dashboard/sessions',
      ariaLabel: 'Schedule and manage training sessions',
    },
    {
      text: 'Client Progress',
      icon: <BarChart3 size={22} />,
      path: '/trainer-dashboard/client-progress',
      ariaLabel: 'Track client progress and analytics',
    },
    {
      text: 'Content & Form Checks',
      icon: <Video size={22} />,
      path: '/trainer-dashboard/content',
      ariaLabel: 'Manage content and review client form videos',
    },
    {
      text: 'Messages',
      icon: <Users2 size={22} />,
      path: '/trainer-dashboard/messages',
      ariaLabel: 'Client communications and messaging',
    },
  ];

  // Determine the current page title based on the location
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/trainer-dashboard/schedule')) return 'My Schedule';
    if (path.includes('/trainer-dashboard/clients')) return 'My Clients';
    if (path.includes('/trainer-dashboard/workouts')) return 'Workout Plans';
    if (path.includes('/trainer-dashboard/sessions')) return 'Training Sessions';
    if (path.includes('/trainer-dashboard/client-progress')) return 'Client Progress';
    if (path.includes('/trainer-dashboard/content')) return 'Content & Form Checks';
    if (path.includes('/trainer-dashboard/messages')) return 'Messages';
    return 'Trainer Dashboard';
  };

  // Show loading state while verifying trainer access
  if (isVerifying) {
    return (
      <FullPageCenter>
        <Spinner $size={60} />
        <LoadingText>Loading trainer dashboard...</LoadingText>
      </FullPageCenter>
    );
  }

  // Show error state if verification failed
  if (error) {
    return (
      <TrainerDashboardError
        error={error}
        onRetry={handleRetry}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LayoutRoot>
      {/* Top App Bar */}
      <AppBarStyled $open={open}>
        <ToolbarInner>
          <IconBtn
            aria-label={open ? 'Close drawer' : 'Open drawer'}
            onClick={toggleDrawer}
          >
            {open ? <ChevronLeft size={24} /> : <Menu size={24} />}
          </IconBtn>

          <PageTitle>{getCurrentPageTitle()}</PageTitle>

          {/* Dashboard Selector */}
          <DashboardSelectorWrapper>
            <DashboardSelector />
          </DashboardSelectorWrapper>

          {/* Profile Avatar & Dropdown */}
          <ProfileButtonWrapper ref={profileRef}>
            <IconBtn
              onClick={handleMenuOpen}
              title="Account settings"
              aria-controls={menuOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
            >
              <AvatarStyled $size={32}>
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user?.name || 'User'} />
                ) : (
                  (user?.name || 'U').charAt(0).toUpperCase()
                )}
              </AvatarStyled>
            </IconBtn>

            <DropdownMenu $visible={menuOpen} id="account-menu" role="menu">
              <DropdownItem
                role="menuitem"
                onClick={() => {
                  handleMenuClose();
                  navigate('/profile');
                }}
              >
                <UserCircle size={18} />
                My Profile
              </DropdownItem>

              <DropdownItem role="menuitem" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </DropdownItem>
            </DropdownMenu>
          </ProfileButtonWrapper>
        </ToolbarInner>
      </AppBarStyled>

      {/* Side Navigation Drawer */}
      <Sidebar $open={open}>
        <DrawerHeader>
          {open && <BrandText>Swan Studios</BrandText>}
        </DrawerHeader>

        <StyledDivider />

        {/* Main Navigation Links */}
        <NavList>
          {mainNavItems.map((item) => (
            <NavItem key={item.text}>
              <NavButton
                $active={location.pathname === item.path}
                $open={open}
                onClick={() => navigate(item.path)}
                aria-label={item.ariaLabel}
                title={!open ? item.text : undefined}
              >
                <NavIcon $open={open}>{item.icon}</NavIcon>
                <NavText $open={open}>{item.text}</NavText>
              </NavButton>
            </NavItem>
          ))}
        </NavList>
      </Sidebar>

      {/* Main Content Area */}
      <MainContent $open={open}>
        <AppBarSpacer /> {/* Spacer to push content below app bar */}
        <ContentContainer>
          <TrainerDashboardRoutes />
        </ContentContainer>
      </MainContent>
    </LayoutRoot>
  );
};

export default TrainerDashboardLayout;
