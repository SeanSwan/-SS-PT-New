import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';
import styled from 'styled-components';

// Swan primitives
import { Box, Typography } from '../../../ui/primitives/components';

// Use your existing Logo component
import Logo from '../../../ui/logo';

// Auth hook for user role
import { useAuth } from '../../../../context/AuthContext';

// Styled components for enhanced logo display
const LogoContainer = styled(Box)`
  display: flex;
  align-items: center;
  transition: all 0.3s ease-in-out;
  &:hover {
    transform: translateY(-2px);
  }
`;

const LogoText = styled(Typography)`
  font-weight: 600;
  font-size: 1.25rem;
  margin-left: 8px;
  color: #00FFFF;
  transition: color 0.2s ease-in-out;
`;

const LogoLink = styled(RouterLink)`
  display: flex;
  text-decoration: none;
`;

/**
 * Enhanced LogoSection Component
 *
 * Displays the application logo with appropriate dashboard link
 * based on user role. Uses the existing Logo component and integrates
 * with the authentication system.
 */
const LogoSection = () => {
  const { user } = useAuth();

  // Determine the dashboard path based on user role
  const dashboardPath = useMemo(() => {
    if (!user) return '/';
    return user.role === 'admin' ? '/admin-dashboard' : '/client-dashboard';
  }, [user]);

  return (
    <LogoLink
      to={dashboardPath}
      aria-label="Swan Studios Logo"
    >
      <LogoContainer>
        <Logo
          height={40}
          alt="Swan Studios"
        />
        <LogoText variant="h6">
          SwanStudios
        </LogoText>
      </LogoContainer>
    </LogoLink>
  );
};

export default LogoSection;
