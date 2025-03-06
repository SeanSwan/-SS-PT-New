import { createTheme } from '@mui/material/styles';
import berryDarkTheme from './berryDarkTheme';
import berryLightTheme from './berryLightTheme';

const themes = (customization) => {
  // Choose theme based on customization
  const themeType = customization?.themeType || 'dark';
  
  if (themeType === 'light') {
    return berryLightTheme;
  }
  
  return berryDarkTheme;
};

export default themes;