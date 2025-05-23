import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';

// material-ui
import Link from '@mui/material/Link';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Use your existing Logo component
import Logo from '../../../ui/logo';

// Auth hook for user role
import { useAuth } from '../../../../context/AuthContext';

// Styled components for enhanced logo display
const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
  }
}));

const LogoText = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.25rem',
  marginLeft: theme.spacing(1),
  color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
  transition: `color ${theme.transitions.duration.shorter}ms ${theme.transitions.easing.easeInOut}`,
}));

/**
 * Enhanced LogoSection Component
 * 
 * Displays the application logo with appropriate dashboard link
 * based on user role. Uses the existing Logo component and integrates
 * with the authentication system.
 */
const LogoSection = () => {
  const theme = useTheme();
  const { user } = useAuth();
  
  // Determine the dashboard path based on user role
  const dashboardPath = useMemo(() => {
    if (!user) return '/';
    return user.role === 'admin' ? '/admin-dashboard' : '/client-dashboard';
  }, [user]);
  
  return (
    <Link 
      component={RouterLink} 
      to={dashboardPath} 
      aria-label="Swan Studios Logo"
      underline="none"
      sx={{ display: 'flex' }}
    >
      <LogoContainer>
        <Logo 
          height={40}
          alt="Swan Studios"
        />
        <LogoText variant="h6" color="inherit">
          SwanStudios
        </LogoText>
      </LogoContainer>
    </Link>
  );
};

export default LogoSection;