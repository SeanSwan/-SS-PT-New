/**
 * ConfigContext.tsx
 * Configuration context for Dashboard
 */
import React, { createContext, useEffect, useReducer, ReactNode } from 'react';

// Define configuration state interface
interface ConfigState {
  fontFamily: string;
  borderRadius: number;
  outlinedFilled: boolean;
  navType: 'light' | 'dark';
  presetColor: 'default' | 'theme1' | 'theme2' | 'theme3' | 'theme4' | 'theme5' | 'theme6';
  locale: string;
  rtlLayout: boolean;
  container: boolean;
}

// Define context interface with state and actions
interface ConfigContextProps extends ConfigState {
  onChangeMenuType: (navType: 'light' | 'dark') => void;
  onChangeLocale: (locale: string) => void;
  onChangeRTL: (rtlLayout: boolean) => void;
  onChangeContainer: (container: boolean) => void;
  onChangeFontFamily: (fontFamily: string) => void;
  onChangeBorderRadius: (borderRadius: number) => void;
  onChangeOutlinedField: (outlinedFilled: boolean) => void;
}

// Initial configuration
const initialConfig: ConfigState = {
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
export enum ActionTypes {
  MENU_OPEN = 'MENU_OPEN',
  MENU_TYPE = 'MENU_TYPE',
  THEME_LOCALE = 'THEME_LOCALE',
  THEME_RTL = 'THEME_RTL',
  SET_MENU = 'SET_MENU',
  SET_FONT_FAMILY = 'SET_FONT_FAMILY',
  SET_BORDER_RADIUS = 'SET_BORDER_RADIUS',
  SET_OUTLINED_FILLED = 'SET_OUTLINED_FILLED'
}

// Define action types
type ConfigAction =
  | { type: ActionTypes.MENU_OPEN; opened: boolean }
  | { type: ActionTypes.MENU_TYPE; navType: 'light' | 'dark' }
  | { type: ActionTypes.THEME_LOCALE; locale: string }
  | { type: ActionTypes.THEME_RTL; rtlLayout: boolean }
  | { type: ActionTypes.SET_MENU; container: boolean }
  | { type: ActionTypes.SET_FONT_FAMILY; fontFamily: string }
  | { type: ActionTypes.SET_BORDER_RADIUS; borderRadius: number }
  | { type: ActionTypes.SET_OUTLINED_FILLED; outlinedFilled: boolean };

// Create configuration context with default values
const ConfigContext = createContext<ConfigContextProps>({
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
const configReducer = (state: ConfigState, action: ConfigAction): ConfigState => {
  switch (action.type) {
    case ActionTypes.MENU_OPEN:
      return {
        ...state,
        opened: action.opened
      } as ConfigState;
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

interface ConfigProviderProps {
  children: ReactNode;
}

// Configuration provider component
const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, dispatch] = useReducer(configReducer, initialConfig);

  // Handle theme font family change
  const onChangeFontFamily = (fontFamily: string) => {
    dispatch({
      type: ActionTypes.SET_FONT_FAMILY,
      fontFamily
    });
  };

  // Handle theme border radius change
  const onChangeBorderRadius = (borderRadius: number) => {
    dispatch({
      type: ActionTypes.SET_BORDER_RADIUS,
      borderRadius
    });
  };

  // Handle outlined/filled input change
  const onChangeOutlinedField = (outlinedFilled: boolean) => {
    dispatch({
      type: ActionTypes.SET_OUTLINED_FILLED,
      outlinedFilled
    });
  };

  // Handle theme mode change (light/dark)
  const onChangeMenuType = (navType: 'light' | 'dark') => {
    dispatch({
      type: ActionTypes.MENU_TYPE,
      navType
    });
  };

  // Handle locale change
  const onChangeLocale = (locale: string) => {
    dispatch({
      type: ActionTypes.THEME_LOCALE,
      locale
    });
  };

  // Handle RTL layout change
  const onChangeRTL = (rtlLayout: boolean) => {
    dispatch({
      type: ActionTypes.THEME_RTL,
      rtlLayout
    });
  };

  // Handle container layout change
  const onChangeContainer = (container: boolean) => {
    dispatch({
      type: ActionTypes.SET_MENU,
      container
    });
  };

  // Create context value object
  const configContextValue: ConfigContextProps = {
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

export { ConfigContext, ConfigProvider };
export default ConfigProvider;