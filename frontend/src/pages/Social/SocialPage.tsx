import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Tabs,
  Tab,
  Paper,
  Divider,
  Button,
  useMediaQuery,
  useTheme,
  Chip,
  Avatar,
  Tooltip,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Home,
  Users,
  Trophy,
  Bell,
  Settings,
  PlusCircle,
  Star,
  Zap,
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGamificationData } from '../../hooks/gamification/useGamificationData';
import SocialFeed from '../../components/Social/Feed/SocialFeed';
import FriendsList from '../../components/Social/Friends/FriendsList';
import styled from 'styled-components';

// Styled components
const PageContainer = styled(Container)`
  padding-top: 24px;
  padding-bottom: 24px;
`;

const PageTitle = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 600;
`;

const SidebarContainer = styled(Paper)`
  padding: 16px;
  height: fit-content;
  border-radius: 8px;
`;

const SidebarMenu = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MenuButton = styled(Button)<{ active?: boolean }>`
  justify-content: flex-start;
  text-transform: none;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  background-color: ${props => props.active ? 'rgba(25, 118, 210, 0.08)' : 'transparent'};
  padding: 12px 16px;
  
  &:hover {
    background-color: ${props => props.active ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'};
  }
`;

const GamificationSidebar = styled(Box)`
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
`;

const PointsSection = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const StreakSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const ProgressSection = styled(Box)`
  margin-top: 16px;
`;

const QuickActionButton = styled(Button)`
  margin-bottom: 8px;
  justify-content: flex-start;
  text-transform: none;
  
  &:hover {
    transform: translateX(4px);
    transition: transform 0.2s ease;
  }
`;

const NotificationBadge = styled(Badge)`
  .MuiBadge-badge {
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    color: white;
  }
`;

/**
 * Main Social Page Component
 * Displays the social feed and provides navigation to other social features
 */
const VALID_TABS = ['feed', 'friends', 'challenges'] as const;
type SocialTab = typeof VALID_TABS[number];

const SocialPage: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useGamificationData();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const initialTab: SocialTab = VALID_TABS.includes(tab as SocialTab) ? (tab as SocialTab) : 'feed';
  const [activeTab, setActiveTab] = useState<SocialTab>(initialTab);

  // Sync tab state when URL param changes
  useEffect(() => {
    const urlTab = VALID_TABS.includes(tab as SocialTab) ? (tab as SocialTab) : 'feed';
    setActiveTab(urlTab);
  }, [tab]);

  // Mock notification count for demo
  const notificationCount = 3;

  // Handle tab change — update URL so back/forward work
  const handleTabChange = (newTab: SocialTab) => {
    setActiveTab(newTab);
    navigate(newTab === 'feed' ? '/social' : `/social/${newTab}`, { replace: true });
  };
  
  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <SocialFeed />;
      case 'friends':
        return <FriendsList />;
      case 'challenges':
        return (
          <Box textAlign="center" py={4}>
            <Trophy size={64} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <Typography variant="h5" gutterBottom>
              Challenges Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Join fitness challenges with friends and compete for achievements!
            </Typography>
            <Button variant="contained" color="primary" disabled>
              Stay Tuned
            </Button>
          </Box>
        );
      default:
        return <SocialFeed />;
    }
  };
  
  return (
    <PageContainer maxWidth="lg">
      <PageTitle variant="h4">Social Hub</PageTitle>
      
      {isMobile ? (
        // Mobile layout with tabs
        <>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => handleTabChange(newValue)}
            variant="fullWidth"
            centered
            sx={{ mb: 3 }}
          >
            <Tab
              icon={<Home size={20} />}
              label="Feed"
              value="feed"
            />
            <Tab
              icon={<Users size={20} />}
              label="Friends"
              value="friends"
            />
            <Tab
              icon={<Trophy size={20} />}
              label="Challenges"
              value="challenges"
            />
          </Tabs>
          
          {renderContent()}
        </>
      ) : (
        // Desktop layout with sidebar
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {/* Gamification Section */}
            {profile.data && (
              <GamificationSidebar>
                <PointsSection>
                  <Box>
                    <Typography variant="h6" fontWeight="600">
                      {profile.data.points?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Points
                    </Typography>
                  </Box>
                  <Chip 
                    icon={<Star size={16} />}
                    label={`Level ${profile.data.level || 1}`}
                    size="small"
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      color: 'white',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </PointsSection>
                
                <StreakSection>
                  <Zap size={18} />
                  <Typography variant="body2">
                    {profile.data.streakDays || 0} day streak
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    🔥
                  </Typography>
                </StreakSection>
                
                <ProgressSection>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Next Level Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={profile.data.nextLevelProgress || 0}
                    sx={{ 
                      mt: 1, 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    }}
                  />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {profile.data.nextLevelProgress || 0}% to Level {(profile.data.level || 1) + 1}
                  </Typography>
                </ProgressSection>
              </GamificationSidebar>
            )}
            
            <SidebarContainer elevation={1}>
              <Typography variant="h6" gutterBottom>
                Social Hub
              </Typography>
              <SidebarMenu>
                <MenuButton
                  startIcon={<Home size={20} />}
                  onClick={() => handleTabChange('feed')}
                  active={activeTab === 'feed'}
                  fullWidth
                >
                  Feed
                </MenuButton>
                <MenuButton
                  startIcon={<Users size={20} />}
                  onClick={() => handleTabChange('friends')}
                  active={activeTab === 'friends'}
                  fullWidth
                >
                  Friends
                </MenuButton>
                <MenuButton
                  startIcon={<Trophy size={20} />}
                  onClick={() => handleTabChange('challenges')}
                  active={activeTab === 'challenges'}
                  fullWidth
                >
                  Challenges
                </MenuButton>
                <MenuButton
                  startIcon={
                    <NotificationBadge badgeContent={notificationCount} color="primary">
                      <Bell size={20} />
                    </NotificationBadge>
                  }
                  fullWidth
                  disabled
                >
                  Notifications
                </MenuButton>
              </SidebarMenu>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Quick Actions
              </Typography>
              
              <QuickActionButton
                variant="outlined"
                startIcon={<PlusCircle size={18} />}
                fullWidth
                onClick={() => handleTabChange('feed')}
                sx={{ mb: 1 }}
              >
                Create Post
              </QuickActionButton>
              
              <QuickActionButton
                variant="outlined"
                startIcon={<Target size={18} />}
                fullWidth
                sx={{ mb: 1 }}
              >
                Set Goal
              </QuickActionButton>
              
              <QuickActionButton
                variant="outlined"
                startIcon={<Award size={18} />}
                fullWidth
              >
                View Rewards
              </QuickActionButton>
            </SidebarContainer>
          </Grid>
          
          <Grid item xs={12} md={9}>
            {renderContent()}
          </Grid>
        </Grid>
      )}
    </PageContainer>
  );
};

export default SocialPage;
