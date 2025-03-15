/**
 * menu-types.ts
 * Type definitions for menu items
 */
import { ReactNode, ComponentType } from 'react';

// Type for icons that can be either a ReactNode or a component
export type IconType = ReactNode | ComponentType<any>;

export interface MenuItem {
  id: string;
  title: string;
  type: 'group' | 'collapse' | 'item';
  url?: string;
  icon?: IconType;
  breadcrumbs?: boolean;
  caption?: string;
  target?: boolean;
  external?: boolean;
  children?: MenuItem[];
}

export interface MenuGroup extends MenuItem {
  type: 'group';
  children: MenuItem[];
}