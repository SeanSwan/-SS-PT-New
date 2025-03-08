/**
 * MainContentStyled.js
 * Styled component for main content area of Berry Admin
 * Modified to support external header
 */
import { styled } from '@mui/material/styles';

// main content style
const MainContentStyled = styled('main', { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'borderRadius' && prop !== 'withExternalHeader' })(
  ({ theme, open, borderRadius, withExternalHeader }) => ({
    backgroundColor: theme.palette.background.default,
    width: '100%',
    minHeight: 'calc(100vh - 88px)',
    flexGrow: 1,
    padding: '20px',
    marginTop: withExternalHeader ? '60px' : '88px', // Adjust top margin based on external header
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
    },
    ...(open && {
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      })
    })
  })
);

export default MainContentStyled;