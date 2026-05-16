/**
 * palette.ts
 * Theme palette configuration
 */
// MUI createTheme removed — this file is unused legacy Berry Admin infrastructure

// Import theme variables
import defaultColor from '../assets/scss/_themes-vars.module.scss';

// Types for the color palette
interface ColorPalette {
  [key: string]: string;
}

/**
 * Creates a theme palette based on mode and preset color
 * @param mode - Theme mode (light/dark)
 * @param presetColor - Preset color palette name
 * @returns Theme with palette configuration
 */
export default function Palette(mode: 'light' | 'dark', presetColor: string = 'default'): any {
  // Select color palette based on preset
  let colors: ColorPalette;
  switch (presetColor) {
    case 'default':
    default:
      colors = defaultColor;
  }

  return ({
    palette: {
      mode,
      common: {
        black: colors.darkPaper
      },
      primary: {
        light: colors.primaryLight,
        main: colors.primaryMain,
        dark: colors.primaryDark,
        200: colors.primary200,
        800: colors.primary800
      },
      secondary: {
        light: colors.secondaryLight,
        main: colors.secondaryMain,
        dark: colors.secondaryDark,
        200: colors.secondary200,
        800: colors.secondary800
      },
      error: {
        light: colors.errorLight,
        main: colors.errorMain,
        dark: colors.errorDark
      },
      orange: {
        light: colors.orangeLight,
        main: colors.orangeMain,
        dark: colors.orangeDark
      },
      warning: {
        light: colors.warningLight,
        main: colors.warningMain,
        dark: colors.warningDark,
        contrastText: colors.grey700
      },
      success: {
        light: colors.successLight,
        200: colors.success200,
        main: colors.successMain,
        dark: colors.successDark
      },
      grey: {
        50: colors.grey50,
        100: colors.grey100,
        500: colors.grey500,
        600: colors.grey600,
        700: colors.grey700,
        900: colors.grey900
      },
      dark: {
        light: colors.darkTextPrimary,
        main: colors.darkLevel1,
        dark: colors.darkLevel2,
        800: colors.darkBackground,
        900: colors.darkPaper
      },
      text: {
        primary: colors.grey700,
        secondary: colors.grey500,
        dark: colors.grey900,
        hint: colors.grey100
      },
      divider: colors.grey200,
      background: {
        paper: colors.paper,
        default: colors.paper
      }
    }
  });
}