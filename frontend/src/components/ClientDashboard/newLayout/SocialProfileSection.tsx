import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Paper, 
  Grid, 
  TextField,
  Badge,
  Tabs,
  Tab,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import styled from 'styled-components';
import { motion } from 'framer-motion';

// Icons
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatIcon from '@mui/icons-material/Chat';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';

// Import GlowButton to replace regular button
import GlowButton from '../../ui/GlowButton';

// Styled components
const ProfileContainer = styled(Paper)`
  padding: 2rem;
  border-radius: 12px;
  background-color: rgba(20, 20, 40, 0.7);
`;

const ProfileHeader = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 2rem;
  
  @media (min-width: 600px) {
    flex-direction: row;
    text-align: left;
  }
`;

const ProfileInfo = styled(Box)`
  margin-top: 1.5rem;
  width: 100%;
  
  @media (min-width: 600px) {
    margin-top: 0;
    margin-left: 2rem;
  }
`;

const StatsContainer = styled(Box)`
  display: flex;
  justify-content: space-around;
  background-color: rgba(30, 30, 60, 0.5);
  padding: 1rem;
  border-radius: 8px;
  margin: 1.5rem 0;
`;

const StatItem = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const InterestsContainer = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const AchievementCard = styled(Paper)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background-color: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
`;

const AchievementIcon = styled(Box)`
  background: linear-gradient(135deg, #00ffff, #7851a9);
  border-radius: 50%;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ActivityFeed = styled(Box)`
  margin-top: 1.5rem;
`;

const ActivityItem = styled(Paper)`
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
`;

const ActivityContent = styled(Box)`
  margin-left: 1rem;
  flex: 1;
`;

const ActivityMeta = styled(Typography)`
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  gap: 1rem;
`;

/**
 * SocialProfileSection Component
 * 
 * A comprehensive social profile for clients that displays personal information,
 * fitness achievements, creative endeavors, and connection to the community.
 */
const SocialProfileSection: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [profileData, setProfileData] = useState({
    name: 'Sarah Johnson',
    handle: '@sarah_fitness',
    bio: 'Fitness enthusiast, amateur painter, and always looking for the next adventure! I love combining exercise with creative expression.',
    location: 'Los Angeles, CA',
    memberSince: 'January 2023',
    interests: ['HIIT Training', 'Dance', 'Painting', 'Hiking', 'Yoga'],
    level: 15,
    verified: true
  });
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  
  // Handle profile data update
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would save the data to API here
    setEditMode(false);
  };
  
  // Add new interest
  const [newInterest, setNewInterest] = useState('');
  
  const handleAddInterest = () => {
    if (newInterest.trim()) {
      setProfileData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };
  
  // Remove interest
  const handleRemoveInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.filter(item => item !== interest)
    }));
  };
  
  // Mock achievements data
  const achievements = [
    {
      id: 1,
      title: 'Consistency Champion',
      description: 'Completed workouts for 30 consecutive days',
      icon: <FitnessCenterIcon sx={{ fontSize: 40, color: 'white' }} />,
      date: 'July 15, 2023'
    },
    {
      id: 2,
      title: 'Creative Explorer',
      description: 'Shared 10 creative works in the community',
      icon: <ArtTrackIcon sx={{ fontSize: 40, color: 'white' }} />,
      date: 'August 22, 2023'
    },
    {
      id: 3,
      title: 'Dance Master',
      description: 'Completed all beginner dance routines',
      icon: <MusicNoteIcon sx={{ fontSize: 40, color: 'white' }} />,
      date: 'September 5, 2023'
    }
  ];
  
  // Mock activity feed data
  const activityFeed = [
    {
      id: 1,
      user: {
        name: 'Sarah Johnson',
        avatar: undefined
      },
      type: 'workout',
      content: 'Completed a 45-minute HIIT session',
      timestamp: '2 hours ago',
      likes: 12,
      comments: 3
    },
    {
      id: 2,
      user: {
        name: 'Sarah Johnson',
        avatar: undefined
      },
      type: 'creative',
      content: 'Shared a new painting in the Creative Hub',
      timestamp: '1 day ago',
      likes: 24,
      comments: 7
    },
    {
      id: 3,
      user: {
        name: 'Sarah Johnson',
        avatar: undefined
      },
      type: 'achievement',
      content: 'Earned the "Consistency Champion" badge',
      timestamp: '3 days ago',
      likes: 31,
      comments: 5
    }
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProfileContainer elevation={3}>
        <form onSubmit={handleSubmit}>
          <ProfileHeader>
            <Box sx={{ position: 'relative' }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  editMode ? (
                    <IconButton
                      sx={{
                        backgroundColor: 'primary.main',
                        '&:hover': { backgroundColor: 'primary.dark' }
                      }}
                      size="small"
                    >
                      <PhotoCameraIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }
              >
                <Avatar
                  sx={{ width: 120, height: 120, border: '3px solid #00ffff' }}
                  alt={profileData.name}
                />
              </Badge>
              {profileData.verified && !editMode && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -5,
                    left: -5,
                    backgroundColor: 'info.main',
                    borderRadius: '50%',
                    padding: '3px'
                  }}
                >
                  <VerifiedIcon sx={{ fontSize: 18 }} />
                </Box>
              )}
            </Box>
            
            <ProfileInfo>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                {editMode ? (
                  <TextField
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    variant="standard"
                    InputProps={{ sx: { fontSize: '1.5rem', fontWeight: 'bold', color: 'white' } }}
                    sx={{ maxWidth: 300 }}
                  />
                ) : (
                  <Typography variant="h4" component="h1" fontWeight="bold">
                    {profileData.name}
                  </Typography>
                )}
                
                {profileData.verified && !editMode && (
                  <VerifiedIcon sx={{ color: 'info.main', ml: 1 }} />
                )}
              </Box>
              
              {editMode ? (
                <TextField
                  name="handle"
                  value={profileData.handle}
                  onChange={handleInputChange}
                  variant="standard"
                  fullWidth
                  InputProps={{ sx: { color: 'text.secondary' } }}
                  sx={{ mb: 2, maxWidth: 300 }}
                />
              ) : (
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {profileData.handle}
                </Typography>
              )}
              
              {editMode ? (
                <TextField
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  variant="outlined"
                  multiline
                  rows={3}
                  fullWidth
                  InputProps={{ sx: { color: 'white' } }}
                  sx={{ mb: 2 }}
                />
              ) : (
                <Typography variant="body1" paragraph>
                  {profileData.bio}
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                {editMode ? (
                  <TextField
                    name="location"
                    value={profileData.location}
                    onChange={handleInputChange}
                    variant="standard"
                    label="Location"
                    InputProps={{ sx: { color: 'white' } }}
                    InputLabelProps={{ sx: { color: 'text.secondary' } }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    📍 {profileData.location}
                  </Typography>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  🗓️ Member since {profileData.memberSince}
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  ⭐ Level {profileData.level}
                </Typography>
              </Box>
            </ProfileInfo>
            
            <Box sx={{ ml: 'auto', alignSelf: { xs: 'center', sm: 'flex-start' }, mt: { xs: 2, sm: 0 } }}>
              {editMode ? (
                <GlowButton
                  variant="success"
                  type="submit"
                  startIcon={<SaveIcon />}
                >
                  Save Profile
                </GlowButton>
              ) : (
                <GlowButton
                  variant="primary"
                  onClick={toggleEditMode}
                  startIcon={<EditIcon />}
                >
                  Edit Profile
                </GlowButton>
              )}
            </Box>
          </ProfileHeader>
          
          <StatsContainer>
            <StatItem>
              <Typography variant="h5" color="primary.main" fontWeight="bold">125</Typography>
              <Typography variant="body2" color="text.secondary">Workouts</Typography>
            </StatItem>
            <StatItem>
              <Typography variant="h5" color="primary.main" fontWeight="bold">15</Typography>
              <Typography variant="body2" color="text.secondary">Achievements</Typography>
            </StatItem>
            <StatItem>
              <Typography variant="h5" color="primary.main" fontWeight="bold">42</Typography>
              <Typography variant="body2" color="text.secondary">Followers</Typography>
            </StatItem>
            <StatItem>
              <Typography variant="h5" color="primary.main" fontWeight="bold">37</Typography>
              <Typography variant="body2" color="text.secondary">Following</Typography>
            </StatItem>
          </StatsContainer>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Interests
            </Typography>
            <InterestsContainer>
              {profileData.interests.map((interest, index) => (
                <Chip
                  key={index}
                  label={interest}
                  color="secondary"
                  variant="outlined"
                  onDelete={editMode ? () => handleRemoveInterest(interest) : undefined}
                  sx={{ borderRadius: '16px' }}
                />
              ))}
              
              {editMode && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', marginTop: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Add interest"
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                    variant="outlined"
                    InputProps={{ sx: { color: 'white' } }}
                  />
                  <IconButton onClick={handleAddInterest} color="primary">
                    <AddIcon />
                  </IconButton>
                </Box>
              )}
            </InterestsContainer>
          </Box>
        </form>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ mb: 3 }}
            centered
          >
            <Tab label="Achievements" sx={{ color: 'white' }} />
            <Tab label="Activity" sx={{ color: 'white' }} />
          </Tabs>
          
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {achievements.map(achievement => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <AchievementCard>
                    <AchievementIcon>
                      {achievement.icon}
                    </AchievementIcon>
                    <Typography variant="h6" align="center" gutterBottom>
                      {achievement.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" paragraph>
                      {achievement.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Achieved on {achievement.date}
                    </Typography>
                  </AchievementCard>
                </Grid>
              ))}
            </Grid>
          )}
          
          {activeTab === 1 && (
            <ActivityFeed>
              {activityFeed.map(activity => (
                <ActivityItem key={activity.id}>
                  <Avatar alt={activity.user.name} src={activity.user.avatar} />
                  <ActivityContent>
                    <Typography variant="body1">
                      <strong>{activity.user.name}</strong> {activity.content}
                    </Typography>
                    <ActivityMeta variant="caption" color="text.secondary">
                      <span>{activity.timestamp}</span>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FavoriteIcon fontSize="small" sx={{ mr: 0.5 }} />
                        {activity.likes}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ChatIcon fontSize="small" sx={{ mr: 0.5 }} />
                        {activity.comments}
                      </Box>
                    </ActivityMeta>
                  </ActivityContent>
                </ActivityItem>
              ))}
              
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <GlowButton variant="secondary">
                  Load More
                </GlowButton>
              </Box>
            </ActivityFeed>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
          <GlowButton 
            variant="primary"
            startIcon={<PersonAddIcon />}
          >
            Connect
          </GlowButton>
          <GlowButton 
            variant="secondary"
            startIcon={<ChatIcon />}
          >
            Message
          </GlowButton>
        </Box>
      </ProfileContainer>
    </motion.div>
  );
};

export default SocialProfileSection;