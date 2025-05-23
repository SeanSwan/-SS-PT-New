// src/styles/theme.ts
export const lightTheme = {
    // paper & background
    paper: '#ffffff',
  
    // primary
    primaryLight: '#e3f2fd',
    primary200: '#90caf9',
    primaryMain: '#2196f3',
    primaryDark: '#1e88e5',
    primary800: '#1565c0',
  
    // secondary
    secondaryLight: '#ede7f6',
    secondary200: '#b39ddb',
    secondaryMain: '#673ab7',
    secondaryDark: '#5e35b1',
    secondary800: '#4527a0',
  
    // success
    successLight: '#b9f6ca',
    success200: '#69f0ae',
    successMain: '#00e676',
    successDark: '#00c853',
  
    // error
    errorLight: '#ef9a9a',
    errorMain: '#f44336',
    errorDark: '#c62828',
  
    // orange
    orangeLight: '#fbe9e7',
    orangeMain: '#ffab91',
    orangeDark: '#d84315',
  
    // warning
    warningLight: '#fff8e1',
    warningMain: '#ffe57f',
    warningDark: '#ffc107',
  
    // grey
    grey50: '#f8fafc',
    grey100: '#eef2f6',
    grey200: '#e3e8ef',
    grey300: '#cdd5df',
    grey500: '#697586',
    grey600: '#4b5565',
    grey700: '#364152',
    grey900: '#121926',
  };
  
  export const darkTheme = {
    // paper & background
    paper: '#111936',
    background: '#1a223f',
  
    // dark levels
    level1: '#29314f',
    level2: '#212946',
  
    // text
    textTitle: '#d7dcec',
    textPrimary: '#bdc8f0',
    textSecondary: '#8492c4',
  
    // primary
    primaryLight: '#e3f2fd',
    primary200: '#90caf9',
    primaryMain: '#2196f3',
    primaryDark: '#1e88e5',
    primary800: '#1565c0',
  
    // secondary
    secondaryLight: '#d1c4e9',
    secondary200: '#b39ddb',
    secondaryMain: '#7c4dff',
    secondaryDark: '#651fff',
    secondary800: '#6200ea',
  };
  
  // Combined theme with light and dark variants
  const theme = {
    light: lightTheme,
    dark: darkTheme
  };
  
  export default theme;