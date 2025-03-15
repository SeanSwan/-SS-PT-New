import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypeText {
    dark?: string;
  }

  interface TypeBackground {
    alt?: string;
  }

  // Extend PaletteColor to add indexed properties
  interface PaletteColor {
    200?: string;
    100?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  }

  interface Palette {
    dark?: {
      main: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    // Add orange to the palette
    orange: PaletteColor;
  }

  interface PaletteOptions {
    dark?: {
      main: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
    // Add orange to palette options
    orange?: PaletteColorOptions;
  }
}

// Extend components that might need additional props
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    dark: true;
    orange: true; // Allow orange as a button color
  }
}

// Needed for DataGrid styling
declare module '@mui/x-data-grid' {
  interface DataGridPropsOptions {
    customDataGrid?: React.CSSProperties;
  }
}