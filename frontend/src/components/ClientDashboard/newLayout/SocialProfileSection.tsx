import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

// Import lucide-react icons
import { 
  Camera, 
  Edit, 
  Save, 
  Plus, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  CheckCircle, 
  Trophy, 
  Dumbbell, 
  Music, 
  Image as ImageIcon,
  X
} from 'lucide-react';

// Import GlowButton to replace regular button
import GlowButton from '../../ui/GlowButton';

// Styled components
const ProfileContainer = styled.div`
  padding: 2rem;
  border-radius: 12px;
  background-color: rgba(20, 20, 40, 0.7);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
`;

const ProfileHeader = styled.div`
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

const AvatarContainer = styled.div`
  position: relative;
`;

const Avatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid #00ffff;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  color: white;
`;

const CameraButton = styled.button`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #00ffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #00cccc;
    transform: scale(1.1);
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: #1a1a2e;
  }
`;

const VerifiedBadge = styled.div`
  position: absolute;
  bottom: -5px;
  left: -5px;
  background-color: #17a2b8;
  border-radius: 50%;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 18px;
    height: 18px;
    color: white;
  }
`;

const ProfileInfo = styled.div`
  margin-top: 1.5rem;
  width: 100%;
  
  @media (min-width: 600px) {
    margin-top: 0;
    margin-left: 2rem;
  }
`;

const ProfileName = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (min-width: 600px) {
    justify-content: flex-start;
  }
`;

const NameTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: bold;
  margin: 0;
  color: rgba(255, 255, 255, 0.95);
`;

const NameInput = styled.input`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  outline: none;
  max-width: 300px;
  
  &:focus {
    border-bottom-color: #00ffff;
  }
`;

const Handle = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1rem;
`;

const HandleInput = styled.input`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  outline: none;
  width: 100%;
  max-width: 300px;
  
  &:focus {
    border-bottom-color: #00ffff;
  }
`;

const Bio = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1rem;
`;

const BioTextArea = styled.textarea`
  font-size: 1rem;
  line-height: 1.6;
  color: white;
  background: rgba(30, 30, 60, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  width: 100%;
  outline: none;
  resize: vertical;
  
  &:focus {
    border-color: #00ffff;
    background: rgba(30, 30, 60, 0.5);
  }
`;

const MetaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  
  @media (min-width: 600px) {
    flex-direction: row;
    gap: 1.5rem;
  }
`;

const MetaItem = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const MetaInput = styled.input`
  font-size: 0.875rem;
  color: white;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  outline: none;
  
  &:focus {
    border-bottom-color: #00ffff;
  }
`;

const EditButtonContainer = styled.div`
  margin-left: auto;
  align-self: center;
  margin-top: 1rem;
  
  @media (min-width: 600px) {
    align-self: flex-start;
    margin-top: 0;
  }
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-around;
  background-color: rgba(30, 30, 60, 0.5);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1.5rem 0;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #00ffff;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.9);
`;

const InterestsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const Chip = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 16px;
  background-color: transparent;
  border: 1px solid #7851a9;
  color: #7851a9;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(120, 81, 169, 0.1);
  }
`;

const ChipDeleteButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: inherit;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.2);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const AddInterestContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
`;

const AddInterestInput = styled.input`
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(30, 30, 60, 0.3);
  color: white;
  outline: none;
  font-size: 0.875rem;
  
  &:focus {
    border-color: #00ffff;
    background: rgba(30, 30, 60, 0.5);
  }
`;

const AddButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #00ffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #00cccc;
    transform: scale(1.1);
  }
  
  svg {
    width: 18px;
    height: 18px;
    color: #1a1a2e;
  }
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 2rem 0;
`;

const TabsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1.5rem;
  background: ${({ $active }) => 
    $active ? 'rgba(0, 255, 255, 0.2)' : 'transparent'};
  color: ${({ $active }) => 
    $active ? '#00ffff' : 'rgba(255, 255, 255, 0.7)'};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background: rgba(0, 255, 255, 0.15);
    color: #00ffff;
  }
  
  ${({ $active }) => $active && `
    &:after {
      content: '';
      position: absolute;
      bottom: -0.6rem;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 2px;
      background: #00ffff;
    }
  `}
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const AchievementCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background-color: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  }
`;

const AchievementIcon = styled.div`
  background: linear-gradient(135deg, #00ffff, #7851a9);
  border-radius: 50%;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  
  svg {
    width: 40px;
    height: 40px;
    color: white;
  }
`;

const AchievementTitle = styled.h3`
  font-size: 1.125rem;
  text-align: center;
  margin: 0 0 0.5rem 0;
  color: rgba(255, 255, 255, 0.9);
`;

const AchievementDescription = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin: 0 0 0.75rem 0;
`;

const AchievementDate = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ActivityFeed = styled.div`
  margin-top: 1.5rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const ActivityAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7851a9, #00ffff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  margin-left: 1rem;
  flex: 1;
`;

const ActivityText = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
  
  strong {
    font-weight: 600;
  }
`;

const ActivityMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const ActivityMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  gap: 1rem;
`;

const LoadMoreContainer = styled.div`
  text-align: center;
  margin-top: 2rem;
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
  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  
  // Handle profile data update
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      icon: <Dumbbell />,
      date: 'July 15, 2023'
    },
    {
      id: 2,
      title: 'Creative Explorer',
      description: 'Shared 10 creative works in the community',
      icon: <ImageIcon />,
      date: 'August 22, 2023'
    },
    {
      id: 3,
      title: 'Dance Master',
      description: 'Completed all beginner dance routines',
      icon: <Music />,
      date: 'September 5, 2023'
    }
  ];
  
  // Mock activity feed data
  const activityFeed = [
    {
      id: 1,
      user: {
        name: 'Sarah Johnson',
        avatar: undefined,
        initials: 'SJ'
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
        avatar: undefined,
        initials: 'SJ'
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
        avatar: undefined,
        initials: 'SJ'
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
      <ProfileContainer>
        <form onSubmit={handleSubmit}>
          <ProfileHeader>
            <AvatarContainer>
              <Avatar>
                {profileData.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              {editMode && (
                <CameraButton type="button">
                  <Camera />
                </CameraButton>
              )}
              {profileData.verified && !editMode && (
                <VerifiedBadge>
                  <CheckCircle />
                </VerifiedBadge>
              )}
            </AvatarContainer>
            
            <ProfileInfo>
              <ProfileName>
                {editMode ? (
                  <NameInput
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                  />
                ) : (
                  <>
                    <NameTitle>{profileData.name}</NameTitle>
                    {profileData.verified && <CheckCircle size={24} color="#17a2b8" />}
                  </>
                )}
              </ProfileName>
              
              {editMode ? (
                <HandleInput
                  name="handle"
                  value={profileData.handle}
                  onChange={handleInputChange}
                />
              ) : (
                <Handle>{profileData.handle}</Handle>
              )}
              
              {editMode ? (
                <BioTextArea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  rows={3}
                />
              ) : (
                <Bio>{profileData.bio}</Bio>
              )}
              
              <MetaInfo>
                {editMode ? (
                  <MetaInput
                    name="location"
                    value={profileData.location}
                    onChange={handleInputChange}
                    placeholder="Location"
                  />
                ) : (
                  <MetaItem>📍 {profileData.location}</MetaItem>
                )}
                
                <MetaItem>🗓️ Member since {profileData.memberSince}</MetaItem>
                <MetaItem>⭐ Level {profileData.level}</MetaItem>
              </MetaInfo>
            </ProfileInfo>
            
            <EditButtonContainer>
              {editMode ? (
                <GlowButton
                  variant="success"
                  type="submit"
                >
                  <Save size={18} />
                  Save Profile
                </GlowButton>
              ) : (
                <GlowButton
                  variant="primary"
                  onClick={toggleEditMode}
                  type="button"
                >
                  <Edit size={18} />
                  Edit Profile
                </GlowButton>
              )}
            </EditButtonContainer>
          </ProfileHeader>
          
          <StatsContainer>
            <StatItem>
              <StatValue>125</StatValue>
              <StatLabel>Workouts</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>15</StatValue>
              <StatLabel>Achievements</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>42</StatValue>
              <StatLabel>Followers</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>37</StatValue>
              <StatLabel>Following</StatLabel>
            </StatItem>
          </StatsContainer>
          
          <div>
            <SectionTitle>Interests</SectionTitle>
            <InterestsContainer>
              {profileData.interests.map((interest, index) => (
                <Chip key={index}>
                  {interest}
                  {editMode && (
                    <ChipDeleteButton
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                    >
                      <X />
                    </ChipDeleteButton>
                  )}
                </Chip>
              ))}
              
              {editMode && (
                <AddInterestContainer>
                  <AddInterestInput
                    type="text"
                    placeholder="Add interest"
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                  />
                  <AddButton type="button" onClick={handleAddInterest}>
                    <Plus />
                  </AddButton>
                </AddInterestContainer>
              )}
            </InterestsContainer>
          </div>
        </form>
        
        <Divider />
        
        <div>
          <TabsContainer>
            <TabButton
              $active={activeTab === 0}
              onClick={() => handleTabChange(0)}
            >
              Achievements
            </TabButton>
            <TabButton
              $active={activeTab === 1}
              onClick={() => handleTabChange(1)}
            >
              Activity
            </TabButton>
          </TabsContainer>
          
          {activeTab === 0 && (
            <GridContainer>
              {achievements.map(achievement => (
                <AchievementCard key={achievement.id}>
                  <AchievementIcon>
                    {achievement.icon}
                  </AchievementIcon>
                  <AchievementTitle>
                    {achievement.title}
                  </AchievementTitle>
                  <AchievementDescription>
                    {achievement.description}
                  </AchievementDescription>
                  <AchievementDate>
                    Achieved on {achievement.date}
                  </AchievementDate>
                </AchievementCard>
              ))}
            </GridContainer>
          )}
          
          {activeTab === 1 && (
            <ActivityFeed>
              {activityFeed.map(activity => (
                <ActivityItem key={activity.id}>
                  <ActivityAvatar>
                    {activity.user.initials}
                  </ActivityAvatar>
                  <ActivityContent>
                    <ActivityText>
                      <strong>{activity.user.name}</strong> {activity.content}
                    </ActivityText>
                    <ActivityMeta>
                      <span>{activity.timestamp}</span>
                      <ActivityMetaItem>
                        <Heart size={14} />
                        {activity.likes}
                      </ActivityMetaItem>
                      <ActivityMetaItem>
                        <MessageCircle size={14} />
                        {activity.comments}
                      </ActivityMetaItem>
                    </ActivityMeta>
                  </ActivityContent>
                </ActivityItem>
              ))}
              
              <LoadMoreContainer>
                <GlowButton variant="secondary">
                  Load More
                </GlowButton>
              </LoadMoreContainer>
            </ActivityFeed>
          )}
        </div>
        
        <ActionButtons>
          <GlowButton variant="primary">
            <UserPlus size={18} />
            Connect
          </GlowButton>
          <GlowButton variant="secondary">
            <MessageCircle size={18} />
            Message
          </GlowButton>
        </ActionButtons>
      </ProfileContainer>
    </motion.div>
  );
};

export default SocialProfileSection;
