/**
 * menu.js
 * 
 * API utilities for menu handling in Berry Admin
 */
import { useSelector } from 'react-redux';

// Default menu state
const defaultMenuMaster = {
  isDashboardDrawerOpened: true,
  openedMenuItems: []
};

// Global menu master state (for persistence between hook calls)
let menuMaster = { ...defaultMenuMaster };

/**
 * Set drawer open state
 * 
 * @param {boolean} isOpen - Whether drawer should be open
 */
export const handlerDrawerOpen = (isOpen) => {
  menuMaster = {
    ...menuMaster,
    isDashboardDrawerOpened: isOpen
  };
};

/**
 * Toggle a menu item's open state
 * 
 * @param {string} id - ID of the menu item to toggle
 */
export const handlerMenuOpen = (id) => {
  if (menuMaster.openedMenuItems.includes(id)) {
    menuMaster = {
      ...menuMaster,
      openedMenuItems: menuMaster.openedMenuItems.filter(item => item !== id)
    };
  } else {
    menuMaster = {
      ...menuMaster,
      openedMenuItems: [...menuMaster.openedMenuItems, id]
    };
  }
};

/**
 * Hook to get the current menu state
 * 
 * @returns {Object} The current menu state
 */
export const useGetMenuMaster = () => {
  // Get customization from Redux if available
  const customization = useSelector((state) => state.customization || {});
  
  // Return loading state and menu master
  return {
    menuMasterLoading: false,
    menuMaster: {
      ...menuMaster,
      // Override with customization from Redux if available
      isDashboardDrawerOpened: customization.isDashboardDrawerOpened !== undefined 
        ? customization.isDashboardDrawerOpened 
        : menuMaster.isDashboardDrawerOpened
    }
  };
};