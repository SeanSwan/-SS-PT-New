/**
 * MenuStateContext.tsx
 * Context provider for menu state management
 */
import React, { createContext, useState, useContext } from 'react';

// Define menu state interface
interface MenuState {
  isDashboardDrawerOpened: boolean;
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  activeItem: string | null;
}

// Define menu actions interface
interface MenuActions {
  handleDrawerOpen: (state: boolean) => void;
  toggleSearch: () => void;
  toggleNotifications: () => void;
  setActiveItem: (itemId: string | null) => void;
}

// Create contexts with default values
export const MenuStateContext = createContext<MenuState>({
  isDashboardDrawerOpened: true,
  isSearchOpen: false,
  isNotificationsOpen: false,
  activeItem: null
});

export const MenuActionsContext = createContext<MenuActions>({
  handleDrawerOpen: () => {},
  toggleSearch: () => {},
  toggleNotifications: () => {},
  setActiveItem: () => {}
});

interface MenuStateProviderProps {
  children: React.ReactNode;
}

/**
 * Menu State Provider Component
 */
export const MenuStateProvider: React.FC<MenuStateProviderProps> = ({ children }) => {
  // State for dashboard menu elements
  const [isDashboardDrawerOpened, setIsDashboardDrawerOpened] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Handler functions
  const handleDrawerOpen = (state: boolean) => {
    setIsDashboardDrawerOpened(state);
  };

  const toggleSearch = () => {
    setIsSearchOpen(prev => !prev);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  // Context values
  const stateValue: MenuState = {
    isDashboardDrawerOpened,
    isSearchOpen,
    isNotificationsOpen,
    activeItem
  };

  const actionsValue: MenuActions = {
    handleDrawerOpen,
    toggleSearch,
    toggleNotifications,
    setActiveItem
  };

  return (
    <MenuStateContext.Provider value={stateValue}>
      <MenuActionsContext.Provider value={actionsValue}>
        {children}
      </MenuActionsContext.Provider>
    </MenuStateContext.Provider>
  );
};

/**
 * useMenuState Hook
 */
export const useMenuState = (): MenuState => {
  return useContext(MenuStateContext);
};

/**
 * useMenuActions Hook
 */
export const useMenuActions = (): MenuActions => {
  return useContext(MenuActionsContext);
};

export default MenuStateProvider;
