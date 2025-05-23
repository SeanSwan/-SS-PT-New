import { ElementType } from 'react';

// Types for menu items in the dashboard navigation
export interface MenuItem {
  id: string;
  title: string;
  type: 'item' | 'group' | 'collapse';
  url?: string;
  icon?: ElementType;
  breadcrumbs?: boolean;
  external?: boolean;
  target?: boolean;
  children?: MenuItem[];
  disabled?: boolean;
  chip?: {
    color: 'default' | 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';
    label: string;
    size?: 'small' | 'medium';
    variant?: 'outlined' | 'filled';
  };
}

export interface MenuGroup {
  id: string;
  title: string;
  type: 'group';
  children: MenuItem[];
}