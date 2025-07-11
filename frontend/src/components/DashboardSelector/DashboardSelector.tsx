import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown, LayoutDashboard, Users, User, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SelectorContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SelectorButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 30, 60, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const DropdownMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOpen'].includes(prop),
})<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  width: 250px;
  background: #1A1A2E;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  margin-top: 0.5rem;
  display: ${({ isOpen }) => isOpen ? 'block' : 'none'};
  overflow: hidden;
`;

const DropdownItem = styled.button.withConfig({
  shouldForwardProp: (prop) => !['active', 'disabled'].includes(prop),
})<{ active?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: ${({ active }) => active ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  border: none;
  color: ${({ disabled }) => disabled ? 'rgba(255, 255, 255, 0.4)' : '#fff'};
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ disabled }) => disabled ? 'transparent' : 'rgba(0, 255, 255, 0.05)'};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const ItemIcon = styled.div<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
`;

const ItemContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const ItemTitle = styled.div`
  font-weight: 500;
  font-size: 0.9rem;
`;

const ItemDescription = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
`;

const RoleBadge = styled.span`
  background: rgba(0, 255, 255, 0.2);
  color: #00ffff;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
  font-weight: bold;
`;

/**
 * DashboardSelector Component
 * 
 * A dropdown component that allows users to switch between different dashboard types
 * based on their roles (admin, trainer, client, user).
 */
const DashboardSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const currentPath = location.pathname;
  
  // Determine which dashboard is currently active
  const isAdminDashboard = currentPath.includes('/dashboard');
  const isTrainerDashboard = currentPath.includes('/trainer');
  const isClientDashboard = currentPath.includes('/client-dashboard');
  const isUserDashboard = currentPath.includes('/user-dashboard');
  
  // Function to determine if a dashboard option should be enabled based on user role
  const isEnabled = (dashboardType: string) => {
    if (!user || !user.role) return false;
    
    switch (dashboardType) {
      case 'admin':
        return user.role === 'admin';
      case 'trainer':
        return user.role === 'admin' || user.role === 'trainer';
      case 'client':
        return user.role === 'admin' || user.role === 'client';
      case 'user':
        return true; // All authenticated users can access user dashboard
      default:
        return false;
    }
  };
  
  // Toggle the dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Close the dropdown
  const closeDropdown = () => {
    setIsOpen(false);
  };
  
  // Handle dashboard selection
  const handleSelectDashboard = (path: string) => {
    navigate(path);
    closeDropdown();
  };
  
  // Get the current dashboard name
  const getCurrentDashboardName = () => {
    if (isAdminDashboard) return 'Admin Dashboard';
    if (isTrainerDashboard) return 'Trainer Dashboard';
    if (isClientDashboard) return 'Client Dashboard';
    if (isUserDashboard) return 'User Dashboard';
    return 'Dashboard';
  };
  
  // Check if user has access to multiple dashboards (to determine if selector should be shown)
  const hasMultipleDashboards = () => {
    const dashboards = ['admin', 'trainer', 'client', 'user'];
    const accessibleDashboards = dashboards.filter(dashboard => isEnabled(dashboard));
    return accessibleDashboards.length > 1;
  };
  
  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!document.querySelector('* [data-dashboard-selector="true"]')?.contains(target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);
  
  // Don't render the selector if user is not logged in
  if (!user) {
    return null;
  }
  
  // If user only has access to one dashboard, show a direct link instead of dropdown
  if (!hasMultipleDashboards()) {
    const accessibleDashboards = ['admin', 'trainer', 'client', 'user'].filter(dashboard => isEnabled(dashboard));
    const singleDashboard = accessibleDashboards[0];
    
    let dashboardPath = '/user-dashboard';
    let dashboardName = 'My Dashboard';
    let dashboardIcon = <UserCircle size={16} />;
    
    switch (singleDashboard) {
      case 'admin':
        dashboardPath = '/dashboard/default';
        dashboardName = 'Admin Dashboard';
        dashboardIcon = <LayoutDashboard size={16} />;
        break;
      case 'trainer':
        dashboardPath = '/trainer-dashboard';
        dashboardName = 'Trainer Dashboard';
        dashboardIcon = <Users size={16} />;
        break;
      case 'client':
        dashboardPath = '/client-dashboard';
        dashboardName = 'Client Dashboard';
        dashboardIcon = <User size={16} />;
        break;
      case 'user':
      default:
        dashboardPath = '/user-dashboard';
        dashboardName = 'My Dashboard';
        dashboardIcon = <UserCircle size={16} />;
        break;
    }
    
    return (
      <SelectorContainer>
        <SelectorButton 
          onClick={() => navigate(dashboardPath)}
          style={{ cursor: 'pointer' }}
        >
          {dashboardIcon}
          {dashboardName}
        </SelectorButton>
      </SelectorContainer>
    );
  }
  
  return (
    <SelectorContainer data-dashboard-selector="true">
      <SelectorButton onClick={toggleDropdown}>
        <LayoutDashboard size={16} />
        {getCurrentDashboardName()}
        <ChevronDown size={16} />
      </SelectorButton>
      
      <DropdownMenu isOpen={isOpen}>
        {/* Admin Dashboard - Only for Admin */}
        {isEnabled('admin') && (
          <DropdownItem
            active={isAdminDashboard}
            onClick={() => handleSelectDashboard('/dashboard/default')}
          >
            <ItemIcon>
              <LayoutDashboard size={16} color="#00ffff" />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>Admin Dashboard</ItemTitle>
              <ItemDescription>Manage all aspects of the platform</ItemDescription>
            </ItemContent>
            <RoleBadge>ADMIN</RoleBadge>
          </DropdownItem>
        )}
        
        {/* Trainer Dashboard - For Admin and Trainer */}
        {isEnabled('trainer') && (
          <DropdownItem
            active={isTrainerDashboard}
            onClick={() => handleSelectDashboard('/trainer-dashboard')}
          >
            <ItemIcon>
              <Users size={16} color="#7851a9" />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>Trainer Dashboard</ItemTitle>
              <ItemDescription>Manage clients and training programs</ItemDescription>
            </ItemContent>
            <RoleBadge>TRAINER</RoleBadge>
          </DropdownItem>
        )}
        
        {/* Client Dashboard - For Admin and Client */}
        {isEnabled('client') && (
          <DropdownItem
            active={isClientDashboard}
            onClick={() => handleSelectDashboard('/client-dashboard')}
          >
            <ItemIcon>
              <User size={16} color="#FF6B6B" />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>Client Dashboard</ItemTitle>
              <ItemDescription>Training progress and sessions</ItemDescription>
            </ItemContent>
            <RoleBadge>CLIENT</RoleBadge>
          </DropdownItem>
        )}
        
        {/* User Dashboard - Available to all authenticated users */}
        <DropdownItem
          active={isUserDashboard}
          onClick={() => handleSelectDashboard('/user-dashboard')}
        >
          <ItemIcon>
            <UserCircle size={16} color="#32CD32" />
          </ItemIcon>
          <ItemContent>
            <ItemTitle>User Dashboard</ItemTitle>
            <ItemDescription>Social profile and community features</ItemDescription>
          </ItemContent>
          <RoleBadge>SOCIAL</RoleBadge>
        </DropdownItem>
      </DropdownMenu>
    </SelectorContainer>
  );
};

export default DashboardSelector;