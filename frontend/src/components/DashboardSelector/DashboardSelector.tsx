import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronDown, LayoutDashboard, Users, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type DashboardType = 'admin' | 'trainer' | 'client';

const dashboardTypes: DashboardType[] = ['admin', 'trainer', 'client'];

const dashboardMeta = {
  admin: {
    title: 'Admin Dashboard',
    description: 'Manage all aspects of the platform',
    path: '/dashboard/admin/coach-assistant',
    badge: 'ADMIN',
    Icon: LayoutDashboard,
    iconColor: 'var(--accent-primary, #60C0F0)'
  },
  trainer: {
    title: 'Trainer Dashboard',
    description: 'Manage clients and training programs',
    path: '/dashboard/trainer/overview',
    badge: 'TRAINER',
    Icon: Users,
    iconColor: 'var(--accent-secondary, #8B5CF6)'
  },
  client: {
    title: 'Client Dashboard',
    description: 'Training progress and sessions',
    path: '/dashboard/client/overview',
    badge: 'CLIENT',
    Icon: User,
    iconColor: 'var(--gilded-fern, #C6A84B)'
  }
};

const SelectorContainer = styled.div`
  position: relative;
  display: inline-block;
  z-index: var(--z-dropdown, 1260);
`;

const SelectorButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.15));
  color: var(--text-primary, #E0ECF4);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  
  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, var(--bg-elevated, #141419));
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const DropdownMenu = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isOpen'].includes(prop),
})<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  width: min(280px, calc(100vw - 32px));
  background: color-mix(in srgb, var(--bg-elevated, #141419) 96%, var(--bg-base, #030712));
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.15));
  border-radius: 8px;
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.45),
    0 0 28px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  z-index: var(--z-dropdown, 1260);
  margin-top: 0.5rem;
  display: ${({ isOpen }) => isOpen ? 'block' : 'none'};
  max-height: min(70vh, 420px);
  overflow-x: hidden;
  overflow-y: auto;
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
  background: ${({ active }) => active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent)' : 'transparent'};
  border: none;
  color: ${({ disabled }) => disabled ? 'var(--text-disabled, rgba(224, 236, 244, 0.6))' : 'var(--text-primary, #E0ECF4)'};
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ disabled }) => disabled ? 'transparent' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid color-mix(in srgb, var(--border-soft, rgba(224, 236, 244, 0.12)) 100%, transparent);
  }
`;

const ItemIcon = styled.div<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
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
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin-top: 0.25rem;
`;

const RoleBadge = styled.span`
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  color: var(--accent-primary, #60C0F0);
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
  
  const activeDashboardByType: Record<DashboardType, boolean> = {
    admin: currentPath.includes('/dashboard/admin'),
    trainer: currentPath.includes('/dashboard/trainer'),
    client: currentPath.includes('/dashboard/client') || currentPath.includes('/social')
  };

  const isEnabled = (dashboardType: DashboardType) => {
    if (!user || !user.role) return false;

    switch (dashboardType) {
      case 'admin':
        return user.role === 'admin';
      case 'trainer':
        return user.role === 'admin' || user.role === 'trainer';
      case 'client':
        return user.role === 'admin' || user.role === 'client' || user.role === 'user';
      default:
        return false;
    }
  };

  const accessibleDashboards = dashboardTypes.filter(isEnabled);
  const dashboardOptions = accessibleDashboards.map((type) => ({
    ...dashboardMeta[type],
    type,
    active: activeDashboardByType[type]
  }));

  const toggleDropdown = () => {
    setIsOpen((open) => !open);
  };

  const handleSelectDashboard = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const getCurrentDashboardName = () =>
    dashboardOptions.find((option) => option.active)?.title ?? 'Dashboard';
  
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
  if (accessibleDashboards.length <= 1) {
    const singleDashboard = accessibleDashboards[0];
    const dashboard = dashboardMeta[singleDashboard ?? 'client'];
    const DashboardIcon = dashboard.Icon;
    
    return (
      <SelectorContainer>
        <SelectorButton 
          type="button"
          onClick={() => navigate(dashboard.path)}
          style={{ cursor: 'pointer' }}
        >
          <DashboardIcon size={16} />
          {dashboard.title}
        </SelectorButton>
      </SelectorContainer>
    );
  }
  
  return (
    <SelectorContainer data-dashboard-selector="true">
      <SelectorButton
        type="button"
        onClick={toggleDropdown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <LayoutDashboard size={16} />
        {getCurrentDashboardName()}
        <ChevronDown size={16} />
      </SelectorButton>
      
      <DropdownMenu isOpen={isOpen} role="menu" aria-label="Dashboard navigation">
        {dashboardOptions.map(({ type, title, description, path, badge, Icon, iconColor, active }) => (
          <DropdownItem
            key={type}
            type="button"
            role="menuitem"
            active={active}
            onClick={() => handleSelectDashboard(path)}
          >
            <ItemIcon>
              <Icon size={16} color={iconColor} />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>{description}</ItemDescription>
            </ItemContent>
            <RoleBadge>{badge}</RoleBadge>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </SelectorContainer>
  );
};

export default DashboardSelector;
