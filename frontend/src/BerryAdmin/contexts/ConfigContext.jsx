/**
 * ConfigContext.jsx
 * Configuration context for Berry Admin
 */
import React, { createContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';

// Initial configuration
const initialConfig = {
  fontFamily: "'Roboto', sans-serif",
  borderRadius: 8,
  outlinedFilled: true,
  navType: 'light', // light, dark
  presetColor: 'default', // default, theme1, theme2, theme3, theme4, theme5, theme6
  locale: 'en', // 'en' - English, 'fr' - French, 'ro' - Romanian
  rtlLayout: false,
  container: false
};

// Configuration actions
export const ActionTypes = {
  MENU_OPEN: 'MENU_OPEN',
  MENU_TYPE: 'MENU_TYPE',
  THEME_LOCALE: 'THEME_LOCALE',
  THEME_RTL: 'THEME_RTL',
  SET_MENU: 'SET_MENU',
  SET_FONT_FAMILY: 'SET_FONT_FAMILY',
  SET_BORDER_RADIUS: 'SET_BORDER_RADIUS',
  SET_OUTLINED_FILLED: 'SET_OUTLINED_FILLED'
};

// Create configuration context
const ConfigContext = createContext({
  ...initialConfig,
  onChangeMenuType: () => {},
  onChangeLocale: () => {},
  onChangeRTL: () => {},
  onChangeContainer: () => {},
  onChangeFontFamily: () => {},
  onChangeBorderRadius: () => {},
  onChangeOutlinedField: () => {}
});

// ConfigContext reducer
const configReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.MENU_OPEN:
      return {
        ...state,
        opened: action.opened
      };
    case ActionTypes.MENU_TYPE:
      return {
        ...state,
        navType: action.navType
      };
    case ActionTypes.THEME_LOCALE:
      return {
        ...state,
        locale: action.locale
      };
    case ActionTypes.THEME_RTL:
      return {
        ...state,
        rtlLayout: action.rtlLayout
      };
    case ActionTypes.SET_MENU:
      return {
        ...state,
        container: action.container
      };
    case ActionTypes.SET_FONT_FAMILY:
      return {
        ...state,
        fontFamily: action.fontFamily
      };
    case ActionTypes.SET_BORDER_RADIUS:
      return {
        ...state,
        borderRadius: action.borderRadius
      };
    case ActionTypes.SET_OUTLINED_FILLED:
      return {
        ...state,
        outlinedFilled: action.outlinedFilled
      };
    default:
      return state;
  }
};

// Configuration provider component
const ConfigProvider = ({ children }) => {
  const [config, dispatch] = useReducer(configReducer, initialConfig);

  // Handle theme font family change
  const onChangeFontFamily = (fontFamily) => {
    dispatch({
      type: ActionTypes.SET_FONT_FAMILY,
      fontFamily
    });
  };

  // Handle theme border radius change
  const onChangeBorderRadius = (borderRadius) => {
    dispatch({
      type: ActionTypes.SET_BORDER_RADIUS,
      borderRadius
    });
  };

  // Handle outlined/filled input change
  const onChangeOutlinedField = (outlinedFilled) => {
    dispatch({
      type: ActionTypes.SET_OUTLINED_FILLED,
      outlinedFilled
    });
  };

  // Handle theme mode change (light/dark)
  const onChangeMenuType = (navType) => {
    dispatch({
      type: ActionTypes.MENU_TYPE,
      navType
    });
  };

  // Handle locale change
  const onChangeLocale = (locale) => {
    dispatch({
      type: ActionTypes.THEME_LOCALE,
      locale
    });
  };

  // Handle RTL layout change
  const onChangeRTL = (rtlLayout) => {
    dispatch({
      type: ActionTypes.THEME_RTL,
      rtlLayout
    });
  };

  // Handle container layout change
  const onChangeContainer = (container) => {
    dispatch({
      type: ActionTypes.SET_MENU,
      container
    });
  };

  // Create context value object
  const configContextValue = {
    ...config,
    onChangeMenuType,
    onChangeLocale,
    onChangeRTL,
    onChangeContainer,
    onChangeFontFamily,
    onChangeBorderRadius,
    onChangeOutlinedField
  };

  return <ConfigContext.Provider value={configContextValue}>{children}</ConfigContext.Provider>;
};

ConfigProvider.propTypes = {
  children: PropTypes.node
};

export { ConfigContext, ConfigProvider };
export default ConfigProvider;