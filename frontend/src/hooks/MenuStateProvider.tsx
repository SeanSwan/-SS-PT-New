/**
 * @file MenuStateProvider.tsx
 * @description Component-only provider for global dashboard menu state.
 *
 * Context declarations and consumer hooks live in non-component modules so
 * React Fast Refresh can preserve this provider boundary.
 */
import { type ReactNode, useState } from 'react';

import {
  MenuActionsContext,
  MenuStateContext,
  type MenuActions,
  type MenuState,
} from './menuStateContext';

interface MenuStateProviderProps {
  children: ReactNode;
}

export const MenuStateProvider = ({ children }: MenuStateProviderProps) => {
  const [isDashboardDrawerOpened, setIsDashboardDrawerOpened] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const stateValue: MenuState = {
    isDashboardDrawerOpened,
    isSearchOpen,
    isNotificationsOpen,
    activeItem,
  };

  const actionsValue: MenuActions = {
    handleDrawerOpen: setIsDashboardDrawerOpened,
    toggleSearch: () => setIsSearchOpen((previous) => !previous),
    toggleNotifications: () => setIsNotificationsOpen((previous) => !previous),
    setActiveItem,
  };

  return (
    <MenuStateContext.Provider value={stateValue}>
      <MenuActionsContext.Provider value={actionsValue}>
        {children}
      </MenuActionsContext.Provider>
    </MenuStateContext.Provider>
  );
};

export default MenuStateProvider;
