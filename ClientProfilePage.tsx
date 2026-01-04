import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api.service';

// Icons
import { User, Award, TrendingUp, Target, Dumbbell, Flame, Trophy, Users, MessageSquare, UserPlus, UserCheck, Edit } from 'lucide-react';

// Child Components
import AchievementGallery from './components/AchievementGallery';
import UserGoalsView from './components/UserGoalsView';
import WorkoutProgressCharts from './WorkoutProgressCharts';

// --- STYLED COMPONENTS ---

const ProfileContainer = styled(motion.div)`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
  color: white;
`;

const CoverPhoto = styled.div`
  height: 300px;
  background: linear-gradient(rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 1)), url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070') center/cover;
`;

const ProfileHeader = styled.div`
  padding: 0 2rem;
  margin-top: -80px;
  position: relative;
`;

const ProfileActions = styled.div`
  position: absolute;
  top: 1rem;
  right: 2rem;
`;

const Avatar = styled.img`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 5px solid #1e293b;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
`;

const UserInfo = styled.div`
  margin-top: 1rem;
`;

const UserName = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
`;

const UserBio = styled.p`
  color: rgba(255, 255, 255, 0.7);
  max-width: 600px;
  margin-top: 0.5rem;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 2rem;
  padding: 1.5rem 2rem;
  background: rgba(30, 41, 59, 0.6);
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  margin-top: 2rem;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
`;

const ProfileContent = styled.div`
  padding: 2rem;
`;

const ProfileNav = styled.div`
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
`;

const NavTab = styled.button<{ active?: boolean }>`
  padding: 1rem 0.5rem;
  background: none;
  border: none;
  color: ${props => (props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.7)')};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: color 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #00ffff;
    transform: ${props => (props.active ? 'scaleX(1)' : 'scaleX(0)')};
    transition: transform 0.3s ease;
  }

  &:hover {
    color: white;
  }
`;

const Placeholder = styled.div`
  padding: 4rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 16px;
`;

const ClientProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const response = await apiService.get(`/api/profiles/${userId}`);
        setProfileData(response.data);

      } catch (error) {
        console.error("Failed to fetch profile data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profileData) {
      setIsFollowing(profileData.isFollowing);
      setFollowerCount(profileData.stats.followers);
    }
  }, [profileData]);

  const handleMessage = async () => {
    if (!userId || isCreatingConversation) return;

    setIsCreatingConversation(true);
    try {
      // A more robust backend would check for an existing conversation and return it.
      // This implementation assumes the backend creates a new one or handles duplicates.
      const response = await apiService.post('/api/messaging/conversations', {
        type: 'direct',
        participantIds: [parseInt(userId)],
      });

      const conversationId = response.data.id;
      if (conversationId) {
        navigate(`/messaging?conversation=${conversationId}`);
      } else {
        throw new Error("Conversation ID not returned from API.");
      }
    } catch (error) {
      console.error("Failed to start conversation", error);
      alert("Could not start a new conversation. Please try again later.");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!userId) return;

    // Optimistic UI update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(prev => wasFollowing ? prev - 1 : prev + 1);

    try {
      if (wasFollowing) {
        await apiService.delete(`/api/profiles/${userId}/follow`);
      } else {
        await apiService.post(`/api/profiles/${userId}/follow`);
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowerCount(prev => wasFollowing ? prev + 1 : prev - 1);
      console.error("Failed to toggle follow status", error);
    }
  };

  if (loading) {
    return <div style={{ color: 'white', padding: '2rem' }}>Loading Profile...</div>;
  }

  if (!profileData) {
    return <div style={{ color: 'white', padding: '2rem' }}>Profile not found.</div>;
  }

  const { user, stats } = profileData;

  return (
    <ProfileContainer>
      <CoverPhoto />
      <ProfileHeader>
        <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`} alt={`${user.firstName}'s avatar`} />
        <ProfileActions>
          {currentUser?.id === parseInt(userId) ? (
            <motion.button style={{...buttonStyles, background: '#374151'}}>
              <Edit size={16} style={{ marginRight: '0.5rem' }} />
              Edit Profile
            </motion.button>
          ) : (
            <>
              <motion.button
                onClick={handleMessage}
                disabled={isCreatingConversation}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{...buttonStyles, background: '#10b981', marginRight: '0.5rem'}}
              >
                <MessageSquare size={16} style={{ marginRight: '0.5rem' }} />
                {isCreatingConversation ? 'Starting...' : 'Message'}
              </motion.button>
              <motion.button
                onClick={handleFollowToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  ...buttonStyles,
                  background: isFollowing ? '#374151' : '#3b82f6',
                }}
              >
                {isFollowing ? <UserCheck size={16} style={{ marginRight: '0.5rem' }} /> : <UserPlus size={16} style={{ marginRight: '0.5rem' }} />}
                {isFollowing ? 'Following' : 'Follow'}
              </motion.button>
            </>
          )}
        </ProfileActions>
        <UserInfo>
          <UserName>{user.firstName} {user.lastName}</UserName>
          <UserBio>{user.bio}</UserBio>
        </UserInfo>
      </ProfileHeader>

      <StatsBar>
        <StatItem><Dumbbell size={20} color="#3b82f6" /> {stats.workouts || 0} Workouts</StatItem>
        <StatItem><Flame size={20} color="#ef4444" /> {stats.streak} Day Streak</StatItem>
        <StatItem><Trophy size={20} color="#fbbf24" /> {stats.achievements} Achievements</Trophy>
        <StatItem><Users size={20} color="#10b981" /> {followerCount} Followers</StatItem>
      </StatsBar>

      <ProfileContent>
        <ProfileNav>
          <NavTab active={activeTab === 'feed'} onClick={() => setActiveTab('feed')}>Feed</NavTab>
          <NavTab active={activeTab === 'achievements'} onClick={() => setActiveTab('achievements')}>Achievements</NavTab>
          <NavTab active={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>Progress</NavTab>
          <NavTab active={activeTab === 'goals'} onClick={() => setActiveTab('goals')}>Goals</NavTab>
        </ProfileNav>

        <div>
          {activeTab === 'feed' && profileData.recentActivity && (
            // The UserActivityFeed component would be created to display this data
            // For now, we'll render a simple list.
            <div>
              {profileData.recentActivity.map(item => <div key={item.id}>{item.user.firstName} {item.title}</div>)}
            </div>
          )}
          {activeTab === 'achievements' && (
            <AchievementGallery achievements={profileData.achievements} />
          )}
          {activeTab === 'progress' && (
            // Assuming the user is viewing their own profile, or has permission
            (currentUser?.id === parseInt(userId) ? <WorkoutProgressCharts /> : <Placeholder>Progress charts are private.</Placeholder>)
          )}
          {activeTab === 'goals' && (
            <UserGoalsView goals={profileData.goals} />
          )}
        </div>
      </ProfileContent>
    </ProfileContainer>
  );
};

const buttonStyles: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
};

export default ClientProfilePage;