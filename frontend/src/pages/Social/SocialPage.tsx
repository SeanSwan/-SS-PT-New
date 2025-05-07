import React, { useState } from 'react';
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
  useTheme
} from '@mui/material';
import {
  Home,
  Users,
  Trophy,
  Bell,
  Settings,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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

/**
 * Main Social Page Component
 * Displays the social feed and provides navigation to other social features
 */
const SocialPage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'challenges'>('feed');
  
  // Handle tab change
  const handleTabChange = (tab: 'feed' | 'friends' | 'challenges') => {
    setActiveTab(tab);
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
            <SidebarContainer elevation={1}>
              <Typography variant="h6" gutterBottom>
                Social
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
                  startIcon={<Bell size={20} />}
                  fullWidth
                  disabled
                >
                  Notifications
                </MenuButton>
              </SidebarMenu>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Create
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PlusCircle size={18} />}
                fullWidth
                onClick={() => handleTabChange('feed')}
                sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 1.5 }}
              >
                Create Post
              </Button>
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
