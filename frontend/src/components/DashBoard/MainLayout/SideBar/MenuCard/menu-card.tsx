/**
 * menu-card.tsx
 *
 * Enhanced 7-star premium MenuCard component for the sidebar
 * Features glass-morphism effects, animations, and premium styling
 * Provides rich user information and navigation shortcuts for personal training app
 */

import { memo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';

// Swan primitives
import {
  Avatar,
  Card,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Divider,
  Tooltip,
  Button,
} from '../../../../ui/primitives/components';

// Icons (lucide-react replacements for MUI icons)
import {
  Calendar,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  User,
  Settings,
  Trophy,
  ChevronRight,
} from 'lucide-react';

// Project imports
import { useAuth } from '../../../../../context/AuthContext';

// ====================== Styled Components ======================

// Premium card with glass morphism effect
const StyledCard = styled(Card)`
  background: linear-gradient(135deg,
    rgba(0, 255, 255, 0.15),
    rgba(120, 81, 169, 0.1));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(120deg,
      rgba(0, 255, 255, 0.1),
      rgba(120, 81, 169, 0.05));
    opacity: 0.5;
    z-index: 0;
  }

  &::after {
    content: '';
    position: absolute;
    width: 200px;
    height: 200px;
    background: rgba(0, 255, 255, 0.08);
    border-radius: 50%;
    top: -100px;
    right: -100px;
    z-index: 0;
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  }
`;

// Premium avatar with glow effect
const StyledAvatar = styled(Avatar)`
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: #0a0a1a;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);

  svg {
    font-size: 2rem;
    color: #00FFFF;
  }
`;

// Glowing progress bar wrapper
const ProgressWrapper = styled.div`
  .progress-bar {
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
    background: rgba(10, 10, 26, 0.3);
  }
`;

// Quick link buttons
const StyledIconButton = styled(IconButton)<{ $isActive?: boolean }>`
  background: rgba(10, 10, 26, 0.15);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px;
  transition: all 0.3s ease;
  color: #FFFFFF;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  ${({ $isActive }) =>
    $isActive &&
    css`
      background: rgba(0, 255, 255, 0.15);
      border-color: rgba(0, 255, 255, 0.3);
    `}
`;

const StatusChip = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  background: rgba(76, 175, 80, 0.2);
  backdrop-filter: blur(5px);
  border-radius: 12px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #4caf50;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 1;
`;

const ViewProfileButton = styled(Button)`
  margin-top: 16px;
  padding: 6px 16px;
  background: rgba(10, 10, 26, 0.15);
  color: #FFFFFF;
  border-radius: 8px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  text-transform: none;
  width: 100%;

  &:hover {
    background: rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const QuickLinkWrapper = styled(Link)`
  text-decoration: none;
`;

// ====================== Component ======================

const MenuCard = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Use state for animated values
  const [progress, setProgress] = useState(0);
  const [sessionMetrics, setSessionMetrics] = useState({
    completed: 0,
    scheduled: 0,
    achievements: 0
  });

  // Sample user data
  const userData = {
    name: user?.name || "James Reynolds",
    avatar: user?.avatar || "/path-to-default-avatar.jpg",
    level: "Premium",
    progress: 78
  };

  // Simulate loading progress on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(userData.progress);
      setSessionMetrics({
        completed: 48,
        scheduled: 5,
        achievements: 12
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [userData.progress]);

  // Quick link navigation items
  const quickLinks = [
    { icon: <Calendar size={20} />, path: '/dashboard/schedule', tooltip: 'Schedule' },
    { icon: <Dumbbell size={20} />, path: '/dashboard/workouts', tooltip: 'Workouts' },
    { icon: <TrendingUp size={20} />, path: '/dashboard/progress', tooltip: 'Progress' },
    { icon: <UtensilsCrossed size={20} />, path: '/dashboard/nutrition', tooltip: 'Nutrition' },
    { icon: <Trophy size={20} />, path: '/dashboard/achievements', tooltip: 'Achievements' },
  ];

  return (
    <StyledCard elevation={0}>
      {/* Premium Status Indicator */}
      <StatusChip>{userData.level}</StatusChip>

      {/* User Profile Summary */}
      <List disablePadding style={{ position: 'relative', zIndex: 1, marginBottom: 8 }}>
        <ListItem disablePadding style={{ alignItems: 'flex-start' }}>
          <ListItemAvatar style={{ marginTop: 0, marginRight: 16 }}>
            <StyledAvatar src={userData.avatar} alt={userData.name}>
              {!userData.avatar && <User size={28} />}
            </StyledAvatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="h6" style={{ color: '#FFFFFF', fontWeight: 500, marginBottom: 4 }}>
                {userData.name}
              </Typography>
            }
            secondary={
              <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Fitness Enthusiast
              </Typography>
            }
          />
        </ListItem>
      </List>

      {/* Progress Section */}
      <Box style={{ position: 'relative', zIndex: 1, marginTop: 8, marginBottom: 16 }}>
        <Grid container spacing={1} style={{ marginBottom: 8 }}>
          <Grid item xs={7}>
            <Typography variant="subtitle2" style={{ color: '#FFFFFF' }}>
              Overall Progress
            </Typography>
          </Grid>
          <Grid item xs={5}>
            <Typography variant="subtitle2" style={{ color: '#FFFFFF', textAlign: 'right' }}>
              {progress}%
            </Typography>
          </Grid>
        </Grid>
        <LinearProgress value={progress} variant="determinate" />
      </Box>

      {/* Session Metrics */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 16,
        position: 'relative',
        zIndex: 1
      }}>
        <Box style={{ textAlign: 'center' }}>
          <Typography variant="h6" style={{ color: '#FFFFFF' }}>
            {sessionMetrics.completed}
          </Typography>
          <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Completed
          </Typography>
        </Box>
        <Divider orientation="vertical" style={{ height: 40, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Box style={{ textAlign: 'center' }}>
          <Typography variant="h6" style={{ color: '#FFFFFF' }}>
            {sessionMetrics.scheduled}
          </Typography>
          <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Scheduled
          </Typography>
        </Box>
        <Divider orientation="vertical" style={{ height: 40, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Box style={{ textAlign: 'center' }}>
          <Typography variant="h6" style={{ color: '#FFFFFF' }}>
            {sessionMetrics.achievements}
          </Typography>
          <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Achievements
          </Typography>
        </Box>
      </Box>

      {/* Quick Links */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 16,
        position: 'relative',
        zIndex: 1
      }}>
        {quickLinks.map((link, index) => (
          <Tooltip key={index} title={link.tooltip} placement="top">
            <QuickLinkWrapper to={link.path}>
              <StyledIconButton $isActive={location.pathname === link.path}>
                {link.icon}
              </StyledIconButton>
            </QuickLinkWrapper>
          </Tooltip>
        ))}
      </Box>

      {/* Profile Button */}
      <QuickLinkWrapper to="/dashboard/profile">
        <ViewProfileButton>
          View Profile <ChevronRight size={16} style={{ marginLeft: 4 }} />
        </ViewProfileButton>
      </QuickLinkWrapper>
    </StyledCard>
  );
};

export default memo(MenuCard);
