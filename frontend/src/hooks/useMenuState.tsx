import React, { useState, createContext, useContext } from 'react';

// Create a context for dashboard menu/drawer state
interface MenuStateContextType {
  isDashboardDrawerOpened: boolean;
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  activeItem: string | null;
}

// Create a context for menu actions
interface MenuActionsContextType {
  handleDrawerOpen: (state: boolean) => void;
  toggleSearch: () => void;
  toggleNotifications: () => void;
  setActiveItem: (itemId: string | null) => void;
}

// Create contexts with default values
export const MenuStateContext = createContext<MenuStateContextType | null>(null);
export const MenuActionsContext = createContext<MenuActionsContextType | null>(null);

// Menu state provider props interface
interface MenuStateProviderProps {
  children: React.ReactNode;
}

/**
 * MenuStateProvider Component
 * 
 * Provides global state management for dashboard menu and navigation elements.
 * This component centralizes the state for drawer, search panel, notifications, 
 * and active menu items.
 */
export const MenuStateProvider: React.FC<MenuStateProviderProps> = ({ children }) => {
  // State for dashboard menu elements
  const [isDashboardDrawerOpened, setIsDashboardDrawerOpened] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Handle drawer open/close
  const handleDrawerOpen = (state: boolean) => {
    setIsDashboardDrawerOpened(state);
  };

  // Toggle search panel
  const toggleSearch = () => {
    setIsSearchOpen(prev => !prev);
  };

  // Toggle notifications panel
  const toggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  // State and actions values
  const stateValue: MenuStateContextType = {
    isDashboardDrawerOpened,
    isSearchOpen,
    isNotificationsOpen,
    activeItem
  };

  const actionsValue: MenuActionsContextType = {
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
 * 
 * Custom hook that provides access to the menu state context.
 * Returns the current state of menu elements.
 */
export const useMenuState = (): MenuStateContextType => {
  const context = useContext(MenuStateContext);
  
  if (!context) {
    // Return default values instead of throwing an error for better fault tolerance
    return {
      isDashboardDrawerOpened: true,
      isSearchOpen: false,
      isNotificationsOpen: false,
      activeItem: null
    };
  }
  
  return context;
};

/**
 * useMenuActions Hook
 * 
 * Custom hook that provides access to the menu actions context.
 * Returns functions for modifying menu state.
 */
export const useMenuActions = (): MenuActionsContextType => {
  const context = useContext(MenuActionsContext);
  
  if (!context) {
    // Return no-op functions instead of throwing an error for better fault tolerance
    return {
      handleDrawerOpen: () => {},
      toggleSearch: () => {},
      toggleNotifications: () => {},
      setActiveItem: () => {}
    };
  }
  
  return context;
};

export default MenuStateProvider;
