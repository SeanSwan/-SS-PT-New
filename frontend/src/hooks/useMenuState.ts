import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setDrawerOpen, toggleMenuItem } from '../store/menuSlice';

/**
 * Hook to access menu state from Redux store
 */
export const useMenuState = () => {
  return useSelector((state: RootState) => state.menu);
};

/**
 * Hook to access menu action creators with dispatch
 */
export const useMenuActions = () => {
  const dispatch = useDispatch();
  
  return {
    handleDrawerOpen: (isOpen: boolean) => dispatch(setDrawerOpen(isOpen)),
    handleMenuOpen: (id: string) => dispatch(toggleMenuItem(id))
  };
};

/**
 * Compatibility hook for BerryAdmin components
 */
export const useMenuStates = () => {
  const menuState = useMenuState();
  const { handleDrawerOpen } = useMenuActions();
  
  return {
    isDashboardDrawerOpened: menuState.isDashboardDrawerOpened,
    setIsDashboardDrawerOpened: handleDrawerOpen
  };
};