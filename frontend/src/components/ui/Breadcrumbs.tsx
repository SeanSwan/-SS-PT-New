import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styled from 'styled-components';

// Swan primitives + hooks
import { Box, Chip, Typography } from './primitives';
import { alpha, useSwanTheme, useMediaQuery } from '../../styles/mui-replacements';

// Icons (lucide-react)
import {
  Home,
  Dumbbell,
  User,
  CalendarDays,
  BarChart3,
  ShoppingCart,
  Settings,
  PersonStanding,
  UtensilsCrossed,
  Trophy,
  Heart,
  HeartPulse,
} from 'lucide-react';

// Hooks
import useConfig from './../../hooks/useConfig';
import { useAuth } from '../../context/AuthContext';

// Constants from your theme
import { THEME_CONFIG } from './../../store/constant';

// Styled components
const BreadcrumbsContainer = styled.div`
  margin-bottom: 16px;
  padding: 8px 12px;
  border-radius: ${THEME_CONFIG?.borderRadius?.medium ?? 8}px;
  background-color: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease-in-out;
  width: 100%;
`;

const StyledBreadcrumbsNav = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
`;

const Separator = styled.span`
  margin: 0 8px;
  color: ${alpha('#FFFFFF', 0.4)};
  font-size: 0.875rem;
`;

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: #00FFFF;
  font-weight: 400;
  font-size: 0.875rem;
  transition: all 0.2s ease-in-out;

  &:hover {
    text-decoration: underline;
    transform: translateY(-1px);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ActiveText = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #FFFFFF;
  font-weight: 500;
  font-size: 0.875rem;

  svg {
    width: 20px;
    height: 20px;
  }
`;

/**
 * Enhanced Breadcrumbs Component for Fitness Training App
 *
 * Displays the current navigation path with clickable links and fitness-specific
 * categorization for the personal training application.
 *
 * Integration with auth system for role-specific breadcrumbs
 * and active session management.
 */
const Breadcrumbs = () => {
  const location = useLocation();
  const theme = useSwanTheme();
  const isMobile = useMediaQuery((t) => t.breakpoints.down('sm'));
  const config = useConfig();
  const { user } = useAuth();

  // Get the fitness theme for category highlighting
  const fitnessTheme = config.getFitnessTheme ? config.getFitnessTheme() : 'general';

  // Map of path segments to readable names and icons - fitness-specific
  const pathMap = useMemo(
    () => ({
      '': { title: 'Home', icon: <Home size={20} /> },
      'admin-dashboard': { title: 'Dashboard', icon: <BarChart3 size={20} /> },
      clients: { title: 'Clients', icon: <User size={20} /> },
      workouts: { title: 'Workouts', icon: <Dumbbell size={20} /> },
      schedule: { title: 'Schedule', icon: <CalendarDays size={20} /> },
      store: { title: 'Store', icon: <ShoppingCart size={20} /> },
      'admin-sessions': { title: 'Training Sessions', icon: <CalendarDays size={20} /> },
      settings: { title: 'Settings', icon: <Settings size={20} /> },
      progress: { title: 'Progress Tracking', icon: <PersonStanding size={20} /> },
      nutrition: { title: 'Nutrition Plans', icon: <UtensilsCrossed size={20} /> },
      exercises: { title: 'Exercise Library', icon: <Trophy size={20} /> },
      'client-dashboard': {
        title: user?.role === 'admin' ? 'Client Dashboard' : 'My Dashboard',
        icon: <BarChart3 size={20} />,
      },
      health: { title: 'Health Metrics', icon: <Heart size={20} /> },
      vitals: { title: 'Vital Signs', icon: <HeartPulse size={20} /> },
    }),
    [user]
  );

  // In a real app, you would get this from your session state
  const hasActiveSession = false;
  const activeClientName = 'John Doe';

  // Process the current path
  const breadcrumbItems = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter((segment) => segment !== '');

    if (pathSegments.length === 0) {
      return [];
    }

    const isDashboardPage =
      pathSegments[0] === 'admin-dashboard' || pathSegments[0] === 'client-dashboard';

    if (!isDashboardPage && pathSegments[0] !== 'schedule' && pathSegments[0] !== 'store') {
      return [];
    }

    const items: React.ReactNode[] = [];

    items.push(
      <StyledLink to="/" key="home">
        <Home size={16} />
        Home
      </StyledLink>
    );

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      const isLast = index === pathSegments.length - 1;
      const pathInfo = (pathMap as Record<string, { title: string; icon: React.ReactNode | null }>)[
        segment
      ] || {
        title: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        icon: null,
      };

      if (isLast) {
        items.push(
          <ActiveText key={segment}>
            {pathInfo.icon}
            {pathInfo.title}
          </ActiveText>
        );
      } else {
        items.push(
          <StyledLink to={currentPath} key={segment}>
            {pathInfo.icon}
            {pathInfo.title}
          </StyledLink>
        );
      }

      if (
        segment === 'clients' &&
        pathSegments[index + 1] &&
        !isNaN(Number(pathSegments[index + 1]))
      ) {
        const clientName = 'John Doe';
        items.push(
          <ActiveText key={`client-${pathSegments[index + 1]}`}>
            <User size={20} />
            {clientName}
          </ActiveText>
        );
      }
    });

    return items;
  }, [location.pathname, pathMap]);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  // On mobile, only show first and last breadcrumb
  const displayItems = isMobile && breadcrumbItems.length > 2
    ? [breadcrumbItems[0], breadcrumbItems[breadcrumbItems.length - 1]]
    : breadcrumbItems;

  return (
    <BreadcrumbsContainer>
      <Box
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <StyledBreadcrumbsNav aria-label="fitness app navigation breadcrumbs">
          {displayItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Separator>/</Separator>}
              {item}
            </React.Fragment>
          ))}
        </StyledBreadcrumbsNav>

        {hasActiveSession && !isMobile && (
          <Chip
            label={`Active Session: ${activeClientName}`}
            variant="filled"
            size="small"
            color="#22c55e"
            icon={<PersonStanding size={14} />}
          />
        )}

        {user?.role === 'admin' && !isMobile && !hasActiveSession && (
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.75rem',
              color: alpha('#FFFFFF', 0.6),
            }}
          >
            <User size={16} />
            <span>Active Clients: 28</span>
          </Box>
        )}
      </Box>
    </BreadcrumbsContainer>
  );
};

export default Breadcrumbs;
