import { styled } from '@mui/material/styles';

interface MainContentStyledProps {
  open: boolean;
  borderRadius: number;
  withExternalHeader: boolean;
}

/**
 * MainContentStyled Component
 * 
 * Styled wrapper for the main content area of the dashboard.
 * Handles the responsiveness and appearance of the content area.
 * Enhanced to utilize full screen width for better widget layout.
 */
const MainContentStyled = styled('main', {
  shouldForwardProp: (prop) => 
    prop !== 'open' && 
    prop !== 'borderRadius' && 
    prop !== 'withExternalHeader'
})<MainContentStyledProps>(({ theme, open, borderRadius, withExternalHeader }) => ({
  flexGrow: 1,
  paddingTop: theme.spacing(withExternalHeader ? 0 : 0),
  [theme.breakpoints.up('md')]: {
    width: '100%', // Use full width instead of calculating based on sidebar
    // Remove the marginLeft to allow content to expand
    transition: theme.transitions.create(
      ['width'],
      {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      }
    )
  },
  [theme.breakpoints.down('md')]: {
    width: '100%',
    marginLeft: 0
  },
  backgroundColor: theme.palette.background.default,
  borderRadius: `${borderRadius}px`,
  maxWidth: '100vw', // Use full viewport width
  boxSizing: 'border-box', // Include padding in width calculation
  paddingLeft: open ? '220px' : 0, // Dynamic padding based on sidebar state
  paddingRight: 0 // No right padding to maximize width
}));

export default MainContentStyled;