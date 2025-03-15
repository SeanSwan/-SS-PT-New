/**
 * main-content-styled.ts
 * Styled component for main content area
 * Enhanced to support external header and application themes
 */
import { styled, Theme } from '@mui/material/styles';

// Interface for the component props
interface MainContentProps {
  open?: boolean;
  borderRadius?: number;
  withExternalHeader?: boolean;
  theme?: Theme;
}

// Main content styled component with TypeScript support
const MainContentStyled = styled('main', { 
  shouldForwardProp: (prop) => 
    prop !== 'open' && 
    prop !== 'borderRadius' && 
    prop !== 'withExternalHeader' 
})<MainContentProps>(
  ({ theme, open, borderRadius = 8, withExternalHeader = false }) => {
    // Create the base styles
    const baseStyles = {
      backgroundColor: theme.palette.background.default,
      width: '100%',
      minHeight: 'calc(100vh - 88px)',
      flexGrow: 1,
      padding: '20px',
      marginTop: withExternalHeader ? '60px' : '88px', // Adjust based on external header
      marginRight: '20px',
      borderRadius: `${borderRadius}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
      }),
      [theme.breakpoints.down('md')]: {
        marginLeft: '20px',
        padding: '16px',
        marginRight: '20px'
      },
      [theme.breakpoints.down('sm')]: {
        marginLeft: '10px',
        marginRight: '10px',
        padding: '12px',
        borderRadius: `${borderRadius}px`
      }
    };

    // Add open state styles if needed
    if (open) {
      baseStyles.transition = theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      });
    }

    // Add dark mode styles if needed
    if (theme.palette.mode === 'dark') {
      baseStyles.boxShadow = '0 2px 10px 0 rgba(0, 0, 0, 0.2)';
      baseStyles.backgroundColor = theme.palette.background.default;
    }

    return baseStyles;
  }
);

export default MainContentStyled;