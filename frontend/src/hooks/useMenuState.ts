/**
 * @file useMenuState.ts
 * @description Consumer hooks for dashboard menu state and actions.
 */
import { useContext } from 'react';

import {
  DEFAULT_MENU_ACTIONS,
  DEFAULT_MENU_STATE,
  MenuActionsContext,
  MenuStateContext,
  type MenuActions,
  type MenuState,
} from './menuStateContext';

export const useMenuState = (): MenuState => {
  return useContext(MenuStateContext) ?? DEFAULT_MENU_STATE;
};

export const useMenuActions = (): MenuActions => {
  return useContext(MenuActionsContext) ?? DEFAULT_MENU_ACTIONS;
};
