import React, { useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSection } from "./ClientLayout";

// Import icons for navigation items
import {
  LayoutDashboard,
  Dumbbell,
  LineChart,
  Trophy,
  Music,
  Users,
  UserCircle,
  Settings,
  ChevronRight,
  X,
  MusicIcon,
  Palette,
  Video,
  HeartPulse,
  Dance,
  MessageSquare
} from "lucide-react";

// Styled components for the sidebar
const SidebarContainer = styled(motion.aside)<{ isMobileOpen: boolean }>`
  width: 260px;
  height: 100%;
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.sidebarBg} 0%, ${({ theme }) => theme.colors.dark} 100%);
  box-shadow: ${({ theme }) => theme.shadows.md};
  position: sticky;
  top: 0;
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.colors.textLight};
  transition: ${({ theme }) => theme.transitions.medium};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    position: fixed;
    top: 0;
    left: ${({ isMobileOpen }) => (isMobileOpen ? "0" : "-100%")};
    width: 280px;
    height: 100vh;
    z-index: 1000;
  }
`;

const SidebarHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const LogoText = styled.h1`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textLight};
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.textLight};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.round};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  
  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const UserProfile = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.round};
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.dark};
  overflow: hidden;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const UserName = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.primary};
  background-color: rgba(0, 255, 255, 0.1);
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: inline-block;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.md} 0;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const SidebarFooter = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const NavSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const NavSectionTitle = styled.h3`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
  margin: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.md};
`;

const NavItem = styled.button<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.md};
  background: ${({ isActive, theme }) => 
    isActive ? `linear-gradient(90deg, ${theme.colors.primary}22 0%, transparent 100%)` : "transparent"};
  border: none;
  border-left: 3px solid ${({ isActive, theme }) => 
    isActive ? theme.colors.primary : "transparent"};
  color: ${({ isActive, theme }) => 
    isActive ? theme.colors.primary : theme.colors.textLight};
  cursor: pointer;
  text-align: left;
  transition: ${({ theme }) => theme.transitions.short};
  
  &:hover, &:focus {
    background: rgba(255, 255, 255, 0.1);
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`;

const NavItemIcon = styled.div<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }) => theme.spacing.md};
  color: ${({ isActive, theme }) => 
    isActive ? theme.colors.primary : theme.colors.textLight};
`;

const NavItemText = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
`;

const SubNavToggle = styled.div`
  margin-left: auto;
  transition: transform 0.2s;
  
  &.expanded {
    transform: rotate(90deg);
  }
`;

const SubNavContainer = styled(motion.div)`
  overflow: hidden;
`;

const SubNavItem = styled(NavItem)<{ isActive: boolean }>`
  padding-left: calc(${({ theme }) => theme.spacing.md} * 3);
`;

// Nav item interface for type safety
interface NavItemProps {
  icon: React.FC<{ size?: number }>;
  label: string;
  section: DashboardSection;
  isActive: boolean;
  onClick: () => void;
  subItems?: Array<{
    label: string;
    section: DashboardSection;
    onClick: () => void;
    isActive: boolean;
  }>;
}

// Individual navigation item component
const NavigationItem: React.FC<NavItemProps> = ({
  icon: Icon,
  label,
  section,
  isActive,
  onClick,
  subItems
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleClick = () => {
    if (subItems && subItems.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      onClick();
    }
  };

  return (
    <>
      <NavItem 
        isActive={isActive} 
        onClick={handleClick}
        aria-expanded={subItems && subItems.length > 0 ? isExpanded : undefined}
        aria-controls={subItems && subItems.length > 0 ? `subnav-${section}` : undefined}
      >
        <NavItemIcon isActive={isActive}>
          <Icon size={20} />
        </NavItemIcon>
        <NavItemText>{label}</NavItemText>
        {subItems && subItems.length > 0 && (
          <SubNavToggle className={isExpanded ? "expanded" : ""}>
            <ChevronRight size={16} />
          </SubNavToggle>
        )}
      </NavItem>
      
      {/* Subnav items with animation */}
      {subItems && subItems.length > 0 && (
        <AnimatePresence>
          {isExpanded && (
            <SubNavContainer
              id={`subnav-${section}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {subItems.map((item) => (
                <SubNavItem
                  key={item.label}
                  isActive={item.isActive}
                  onClick={item.onClick}
                >
                  <NavItemText>{item.label}</NavItemText>
                </SubNavItem>
              ))}
            </SubNavContainer>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

// Backdrop for mobile
const MobileBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: block;
  }
`;

// Props for the ClientSidebar component
interface ClientSidebarProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
}

// Main ClientSidebar component
const ClientSidebar: React.FC<ClientSidebarProps> = ({
  activeSection,
  onSectionChange,
  isMobileOpen,
  closeMobileSidebar
}) => {
  // Mock user data
  const user = {
    name: "John Doe",
    role: "Client",
    avatar: null
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <MobileBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <SidebarContainer
        isMobileOpen={isMobileOpen}
        initial={false}
        animate={{ x: isMobileOpen ? 0 : -100 }}
      >
        <SidebarHeader>
          <Logo>
            <LogoText>Swan Studios</LogoText>
          </Logo>
          <CloseButton 
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </CloseButton>
        </SidebarHeader>
        
        <UserProfile>
          <Avatar>
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              user.name.charAt(0)
            )}
          </Avatar>
          <UserInfo>
            <UserName>{user.name}</UserName>
            <UserRole>{user.role}</UserRole>
          </UserInfo>
        </UserProfile>
        
        <SidebarContent>
          <NavSection>
            <NavSectionTitle>Dashboard</NavSectionTitle>
            
            <NavigationItem
              icon={LayoutDashboard}
              label="Overview"
              section={DashboardSection.OVERVIEW}
              isActive={activeSection === DashboardSection.OVERVIEW}
              onClick={() => onSectionChange(DashboardSection.OVERVIEW)}
            />
            
            <NavigationItem
              icon={LineChart}
              label="Progress"
              section={DashboardSection.PROGRESS}
              isActive={activeSection === DashboardSection.PROGRESS}
              onClick={() => onSectionChange(DashboardSection.PROGRESS)}
            />
            
            <NavigationItem
              icon={Dumbbell}
              label="Workouts"
              section={DashboardSection.WORKOUTS}
              isActive={activeSection === DashboardSection.WORKOUTS}
              onClick={() => onSectionChange(DashboardSection.WORKOUTS)}
              subItems={[
                {
                  label: "Fitness Plans",
                  section: DashboardSection.WORKOUTS,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.WORKOUTS)
                },
                {
                  label: "Session History",
                  section: DashboardSection.WORKOUTS,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.WORKOUTS)
                },
                {
                  label: "Exercise Library",
                  section: DashboardSection.WORKOUTS,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.WORKOUTS)
                }
              ]}
            />
            
            <NavigationItem
              icon={CalendarIcon}
              label="Sessions"
              section={DashboardSection.SESSIONS}
              isActive={activeSection === DashboardSection.SESSIONS}
              onClick={() => onSectionChange(DashboardSection.SESSIONS)}
            />
            
            <NavigationItem
              icon={Trophy}
              label="Gamification"
              section={DashboardSection.GAMIFICATION}
              isActive={activeSection === DashboardSection.GAMIFICATION}
              onClick={() => onSectionChange(DashboardSection.GAMIFICATION)}
            />
          </NavSection>
          
          <NavSection>
            <NavSectionTitle>Creative Expression</NavSectionTitle>
            
            <NavigationItem
              icon={Palette}
              label="Creative Hub"
              section={DashboardSection.CREATIVE}
              isActive={activeSection === DashboardSection.CREATIVE}
              onClick={() => onSectionChange(DashboardSection.CREATIVE)}
              subItems={[
                {
                  label: "My Artwork",
                  section: DashboardSection.CREATIVE,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.CREATIVE)
                },
                {
                  label: "Dance Videos",
                  section: DashboardSection.CREATIVE,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.CREATIVE)
                },
                {
                  label: "Music & Singing",
                  section: DashboardSection.CREATIVE,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.CREATIVE)
                }
              ]}
            />
          </NavSection>
          
          <NavSection>
            <NavSectionTitle>Community</NavSectionTitle>
            
            <NavigationItem
              icon={Users}
              label="Community"
              section={DashboardSection.COMMUNITY}
              isActive={activeSection === DashboardSection.COMMUNITY}
              onClick={() => onSectionChange(DashboardSection.COMMUNITY)}
              subItems={[
                {
                  label: "Meetups",
                  section: DashboardSection.COMMUNITY,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.COMMUNITY)
                },
                {
                  label: "Social Feed",
                  section: DashboardSection.COMMUNITY,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.COMMUNITY)
                },
                {
                  label: "Messages",
                  section: DashboardSection.COMMUNITY,
                  isActive: false,
                  onClick: () => onSectionChange(DashboardSection.COMMUNITY)
                }
              ]}
            />
          </NavSection>
          
          <NavSection>
            <NavSectionTitle>My Account</NavSectionTitle>
            
            <NavigationItem
              icon={UserCircle}
              label="Profile"
              section={DashboardSection.PROFILE}
              isActive={activeSection === DashboardSection.PROFILE}
              onClick={() => onSectionChange(DashboardSection.PROFILE)}
            />
            
            <NavigationItem
              icon={Settings}
              label="Settings"
              section={DashboardSection.SETTINGS}
              isActive={activeSection === DashboardSection.SETTINGS}
              onClick={() => onSectionChange(DashboardSection.SETTINGS)}
            />
          </NavSection>
        </SidebarContent>
        
        <SidebarFooter>
          <UserRole>Version 2.0</UserRole>
        </SidebarFooter>
      </SidebarContainer>
    </>
  );
};

export default ClientSidebar;