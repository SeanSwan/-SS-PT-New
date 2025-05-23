/**
 * chip.ts
 * MUI Chip component overrides
 */
import { alpha, Theme, PaletteColor } from '@mui/material/styles';

// Type for variant props in the style function
interface VariantProps {
  variant: string;
  color: string;
}

// Type guard to check if an object is a PaletteColor
function isPaletteColor(color: any): color is PaletteColor {
  return (
    color !== null &&
    typeof color === 'object' &&
    'main' in color &&
    'light' in color &&
    'dark' in color
  );
}

// Chip component style overrides
export default function Chip(theme: Theme) {
  return {
    MuiChip: {
      defaultProps: {
        color: 'primary',
        variant: 'light'
      },
      styleOverrides: {
        root: {
          '&.MuiChip-deletable .MuiChip-deleteIcon': {
            color: 'inherit'
          },
          variants: [
            {
              props: { variant: 'light' }, // Variant for light Chip
              style: ({ ownerState }: { ownerState: VariantProps }) => {
                // Safe access to palette color with type assertion
                const colorKey = ownerState.color as keyof typeof theme.palette;
                const paletteColor = theme.palette[colorKey];
                
                // Only apply styles if we have a proper palette color object
                if (!isPaletteColor(paletteColor)) {
                  return {}; // Return empty object if not a valid palette color
                }

                return {
                  color: paletteColor.main,
                  backgroundColor: paletteColor.light,
                  ...(ownerState.color === 'error' && {
                    backgroundColor: alpha(paletteColor.light, 0.25)
                  }),
                  ...(ownerState.color === 'success' && {
                    backgroundColor: alpha(paletteColor.light, 0.5)
                  }),
                  ...((ownerState.color === 'warning' || ownerState.color === 'success') && {
                    color: paletteColor.dark
                  }),
                  '&.MuiChip-clickable': {
                    '&:hover': {
                      color: paletteColor.light,
                      backgroundColor: paletteColor.dark
                    }
                  }
                };
              }
            },
            {
              props: { variant: 'outlined', color: 'warning' },
              style: {
                borderColor: theme.palette.warning.dark,
                color: theme.palette.warning.dark
              }
            },
            {
              props: { variant: 'outlined', color: 'success' },
              style: {
                borderColor: theme.palette.success.dark,
                color: theme.palette.success.dark
              }
            }
          ]
        }
      }
    }
  };
}