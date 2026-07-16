/**
 * @file menuStateContext.ts
 * @description Context contracts and safe defaults for dashboard menu state.
 */
import { createContext } from 'react';

export interface MenuState {
  isDashboardDrawerOpened: boolean;
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  activeItem: string | null;
}

export interface MenuActions {
  handleDrawerOpen: (state: boolean) => void;
  toggleSearch: () => void;
  toggleNotifications: () => void;
  setActiveItem: (itemId: string | null) => void;
}

export const DEFAULT_MENU_STATE: MenuState = {
  isDashboardDrawerOpened: true,
  isSearchOpen: false,
  isNotificationsOpen: false,
  activeItem: null,
};

export const DEFAULT_MENU_ACTIONS: MenuActions = {
  handleDrawerOpen: () => undefined,
  toggleSearch: () => undefined,
  toggleNotifications: () => undefined,
  setActiveItem: () => undefined,
};

export const MenuStateContext = createContext<MenuState | null>(null);
export const MenuActionsContext = createContext<MenuActions | null>(null);
