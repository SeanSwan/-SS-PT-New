import React, { useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { 
  Menu as MenuIcon, 
  ChevronLeft, 
  LayoutDashboard, 
  Dumbbell, 
  Calendar, 
  BarChart3, 
  Trophy, 
  UserCircle, 
  MessageCircle, 
  LogOut, 
  Settings, 
  Users, 
  Image as ImageIcon,
  Music,
  CalendarDays
} from 'lucide-react';

// Import context and user-related hooks
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Import sync notification for toast messages
import SyncNotification from '../../FitnessStats/SyncNotification';

// Import ClientDashboardContent component
import ClientDashboardContent from './ClientDashboardContent';

// Constants
const drawerWidth = 240;
const drawerWidthClosed = 65;

// Theme object
const dashboardTheme = {
  colors: {
    primary: '#00ffff',
    primaryLight: '#7efbfb',
    primaryDark: '#00b8b8',
    secondary: '#7851a9',
    secondaryLight: '#a67dd4',
    secondaryDark: '#5e3d90',
    error: '#ff416c',
    warning: '#ffb700',
    success: '#00bf8f',
    background: '#0a0a1a',
    backgroundPaper: 'rgba(30, 30, 60, 0.3)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
  },
  borderRadius: '10px',
  transitions: {
    duration: '0.3s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Styled Components
const DashboardContainer = styled.div`
  display: flex;
  /* Use 100dvh for mobile Safari dynamic viewport, with 100vh fallback */
  min-height: 100vh;
  min-height: 100dvh;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.textPrimary};
`;

const AppBar = styled.header<{ $drawerOpen: boolean }>`
  position: fixed;
  top: 0;
  left: ${props => props.$drawerOpen ? `${drawerWidth}px` : `${drawerWidthClosed}px`};
  right: 0;
  height: 64px;
  background-color: ${props => props.theme.colors.backgroundPaper};
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1200;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  transition: left ${props => props.theme.transitions.duration} ${props => props.theme.transitions.easing};
  /* GPU layer promotion for smoother scrolling */
  will-change: left;
  transform: translateZ(0);

  @media (max-width: 768px) {
    left: 0;
    /* Reduce blur on mobile for better scroll performance */
    backdrop-filter: blur(10px);
  }
`;

const ToolbarContent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  gap: 1rem;
`;

const MenuButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.textPrimary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const PageTitle = styled.h1`
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: ${props => props.theme.colors.textPrimary};
`;

const UserMenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: auto;
  position: relative;
`;

const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.theme.colors.secondary}, ${props => props.theme.colors.primary});
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  border: 2px solid ${props => props.theme.colors.primary};
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const DropdownMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: rgba(30, 30, 60, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  min-width: 200px;
  opacity: ${props => props.$open ? 1 : 0};
  visibility: ${props => props.$open ? 'visible' : 'hidden'};
  transform: ${props => props.$open ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease;
  z-index: 1300;
`;

const DropdownMenuItem = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: ${props => props.theme.colors.textPrimary};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.938rem;
  transition: background-color 0.2s ease;
  
  &:first-child {
    border-radius: 8px 8px 0 0;
  }
  
  &:last-child {
    border-radius: 0 0 8px 8px;
  }
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const Drawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${props => props.$open ? `${drawerWidth}px` : `${drawerWidthClosed}px`};
  background-color: ${props => props.theme.colors.backgroundPaper};
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  transition: width ${props => props.theme.transitions.duration} ${props => props.theme.transitions.easing};
  z-index: 1250;
  /* GPU layer promotion for smoother animations */
  will-change: width, transform;
  transform: translateZ(0);

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 255, 255, 0.5);
    }
  }

  @media (max-width: 768px) {
    transform: ${props => props.$open ? 'translateX(0)' : `translateX(-${drawerWidth}px)`};
    width: ${drawerWidth}px;
    /* Reduce blur on mobile for better scroll performance */
    backdrop-filter: blur(10px);
  }
`;

const DrawerHeader = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const BrandName = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: ${props => props.theme.colors.primary};
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const NavList = styled.nav`
  padding: 1rem 0;
`;

const NavItem = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: ${props => props.$active ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: 0.938rem;
  font-weight: 500;
  text-align: left;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover {
    background: rgba(0, 255, 255, 0.05);
    color: ${props => props.theme.colors.primary};
  }
  
  svg {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
  }
  
  span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const NavDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 1rem 0;
`;

const MainContent = styled.main<{ $drawerOpen: boolean }>`
  flex: 1;
  margin-left: ${props => props.$drawerOpen ? `${drawerWidth}px` : `${drawerWidthClosed}px`};
  margin-top: 64px;
  padding: 2rem;
  transition: margin-left ${props => props.theme.transitions.duration} ${props => props.theme.transitions.easing};
  /* Use 100dvh for mobile Safari dynamic viewport, with 100vh fallback */
  min-height: calc(100vh - 64px);
  min-height: calc(100dvh - 64px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    margin-left: 0;
    padding: 1rem;
    min-height: auto;
  }
`;

const ContentContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

// Type for navigation items
interface NavItem {
  text: string;
  icon: React.ReactNode;
  section: string;
  ariaLabel: string;
}

/**
 * ClientDashboardLayout Component
 * Main layout for the client dashboard with navigation drawer
 */
const ClientDashboardLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Handle drawer toggle
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Handle profile menu
  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen);
  };
  
  const closeMenu = () => {
    setMenuOpen(false);
  };
  
  // Handle logout
  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/login');
  };

  // Handle section change
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    closeMenu();
  };
  
  // Navigation items
  const mainNavItems: NavItem[] = [
    {
      text: 'Dashboard',
      icon: <LayoutDashboard />,
      section: 'overview',
      ariaLabel: 'Go to overview dashboard'
    },
    {
      text: 'Schedule',
      icon: <CalendarDays />,
      section: 'schedule',
      ariaLabel: 'View and book training sessions'
    },
    {
      text: 'My Workouts',
      icon: <Dumbbell />,
      section: 'workouts',
      ariaLabel: 'View your workout plans'
    },
    {
      text: 'Progress',
      icon: <BarChart3 />,
      section: 'progress',
      ariaLabel: 'View your progress'
    },
    {
      text: 'Achievements',
      icon: <Trophy />,
      section: 'gamification',
      ariaLabel: 'View your achievements and rewards'
    },
    {
      text: 'Creative Hub',
      icon: <ImageIcon />,
      section: 'creative',
      ariaLabel: 'Access creative expression hub'
    },
    {
      text: 'Community',
      icon: <Users />,
      section: 'community',
      ariaLabel: 'Connect with community'
    },
    {
      text: 'Messaging',
      icon: <MessageCircle />,
      section: 'messages',
      ariaLabel: 'View and send messages'
    }
  ];

  const secondaryNavItems: NavItem[] = [
    {
      text: 'Profile',
      icon: <UserCircle />,
      section: 'profile',
      ariaLabel: 'Manage your profile'
    },
    {
      text: 'Settings',
      icon: <Settings />,
      section: 'settings',
      ariaLabel: 'Adjust your settings'
    }
  ];
  
  // Get current page title
  const getCurrentPageTitle = () => {
    switch(activeSection) {
      case 'overview': return 'Dashboard';
      case 'schedule': return 'My Schedule';
      case 'workouts': return 'My Workouts';
      case 'progress': return 'Progress Tracking';
      case 'gamification': return 'Achievements';
      case 'creative': return 'Creative Expression Hub';
      case 'community': return 'Community';
      case 'messages': return 'Messaging';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      default: return 'Client Dashboard';
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  return (
    <ThemeProvider theme={dashboardTheme}>
      <DashboardContainer>
        {/* Top App Bar */}
        <AppBar $drawerOpen={drawerOpen}>
          <ToolbarContent>
            <MenuButton onClick={toggleDrawer} aria-label="Toggle navigation menu">
              {drawerOpen ? <ChevronLeft /> : <MenuIcon />}
            </MenuButton>
            
            <PageTitle>{getCurrentPageTitle()}</PageTitle>
            
            {/* User Menu */}
            <UserMenuButton onClick={handleMenuToggle} aria-label="User menu">
              <UserAvatar>
                {getUserInitials()}
              </UserAvatar>
              
              <DropdownMenu $open={menuOpen}>
                <DropdownMenuItem onClick={() => handleSectionChange('profile')}>
                  <UserCircle />
                  My Profile
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Logout
                </DropdownMenuItem>
              </DropdownMenu>
            </UserMenuButton>
          </ToolbarContent>
        </AppBar>
        
        {/* Side Navigation Drawer */}
        <Drawer $open={drawerOpen}>
          <DrawerHeader>
            <BrandName>Swan Studios</BrandName>
          </DrawerHeader>
          
          {/* Main Navigation */}
          <NavList>
            {mainNavItems.map((item) => (
              <NavItem 
                key={item.section}
                $active={activeSection === item.section}
                onClick={() => handleSectionChange(item.section)}
                aria-label={item.ariaLabel}
              >
                {item.icon}
                <span>{item.text}</span>
              </NavItem>
            ))}
          </NavList>
          
          <NavDivider />
          
          {/* Secondary Navigation */}
          <NavList>
            {secondaryNavItems.map((item) => (
              <NavItem 
                key={item.section}
                $active={activeSection === item.section}
                onClick={() => handleSectionChange(item.section)}
                aria-label={item.ariaLabel}
              >
                {item.icon}
                <span>{item.text}</span>
              </NavItem>
            ))}
          </NavList>
        </Drawer>
        
        {/* Main Content Area */}
        <MainContent $drawerOpen={drawerOpen}>
          <ContentContainer>
            <ClientDashboardContent activeSection={activeSection} />
          </ContentContainer>
        </MainContent>
        
        {/* Global notification system */}
        <SyncNotification />
      </DashboardContainer>
    </ThemeProvider>
  );
};

export default ClientDashboardLayout;
