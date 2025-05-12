/**
 * user-dashboard.tsx
 * User Dashboard View Component for SwanStudios Platform
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Download,
  Activity,
  Heart,
  Calendar,
  Award,
  Edit,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import MainLayout from '../../MainLayout/MainLayout';

// Styled Components
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  background: #0a0a1a;
  min-height: 100vh;
  color: white;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

const DashboardHeader = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
`;

const HeaderTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
  color: #00ffff;
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ProfileImage = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const ImageUploadButton = styled.button`
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #00ffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #00c8ff;
    transform: scale(1.1);
  }
  
  svg {
    color: #0a0a1a;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: white;
`;

const ProfileDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
`;

const ProfileDetail = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SectionCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const SectionIcon = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${({ color }) => `${color}20`};

  svg {
    color: ${({ color }) => color};
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: white;
`;

const SectionContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const InfoValue = styled.span`
  color: white;
  font-weight: 500;
`;

const ActionButton = styled.button<{ color?: string; variant?: 'primary' | 'secondary' }>`
  background: ${({ variant, color }) => 
    variant === 'primary' 
      ? `linear-gradient(135deg, ${color || '#00ffff'}, ${color ? `${color}cc` : '#00c8ff'})` 
      : 'rgba(255, 255, 255, 0.1)'
  };
  border: ${({ variant }) => variant === 'secondary' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: ${({ variant }) => variant === 'primary' ? '#0a0a1a' : 'white'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  width: 100%;
  
  &:hover {
    transform: translateY(-2px);
    ${({ variant, color }) => 
      variant === 'primary' 
        ? `box-shadow: 0 4px 8px ${color ? `${color}40` : 'rgba(0, 255, 255, 0.3)'};`
        : 'background: rgba(255, 255, 255, 0.15);'
    }
  }
`;

const PreferenceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  &:last-child {
    border-bottom: none;
  }
`;

const PreferenceLabel = styled.div`
  font-size: 0.9rem;
  color: white;
`;

const PreferenceDescription = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
`;

const ToggleSwitch = styled.button<{ enabled: boolean }>`
  width: 48px;
  height: 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  background: ${({ enabled }) => enabled ? '#00ffff' : 'rgba(255, 255, 255, 0.2)'};
  
  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: ${({ enabled }) => enabled ? '26px' : '2px'};
    transition: all 0.2s ease;
  }
`;

const ActivityItem = styled.div`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid #00ffff;
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  color: white;
  margin-bottom: 0.25rem;
`;

const ActivityDescription = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
`;

const ActivityTime = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
  color: #00ffff;
`;

// Mock data
const mockActivities = [
  {
    id: 1,
    title: 'Completed Workout',
    description: 'Upper Body Strength Training - 60 minutes',
    time: '2 hours ago'
  },
  {
    id: 2,
    title: 'Training Session Booked',
    description: 'Personal training with John Doe',
    time: '1 day ago'
  },
  {
    id: 3,
    title: 'Achievement Unlocked',
    description: 'Completed 10 workouts this month',
    time: '3 days ago'
  }
];

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    workoutReminders: true
  });
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const togglePreference = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner>
          <div>Loading user dashboard...</div>
        </LoadingSpinner>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <DashboardContainer>
        <DashboardHeader>
          <HeaderContent>
            <HeaderTitle>User Dashboard</HeaderTitle>
            
            <ProfileSection>
              <ProfileImage>
                {getInitials(user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User')}
                <ImageUploadButton>
                  <Camera size={16} />
                </ImageUploadButton>
              </ProfileImage>
              
              <ProfileInfo>
                <ProfileName>
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : 'User Name'
                  }
                </ProfileName>
                <ProfileDetails>
                  <ProfileDetail>
                    <Mail size={16} />
                    {user?.email || 'user@example.com'}
                  </ProfileDetail>
                  <ProfileDetail>
                    <User size={16} />
                    Role: {user?.role || 'User'}
                  </ProfileDetail>
                  <ProfileDetail>
                    <CalendarIcon size={16} />
                    Member since: {new Date().getFullYear()}
                  </ProfileDetail>
                </ProfileDetails>
              </ProfileInfo>
              
              <ActionButton color="#00ffff" variant="primary">
                <Edit size={16} />
                Edit Profile
              </ActionButton>
            </ProfileSection>
          </HeaderContent>
        </DashboardHeader>
        
        <MainContent>
          <SectionCard>
            <SectionHeader>
              <SectionIcon color="#10b981">
                <Activity size={24} />
              </SectionIcon>
              <SectionTitle>Activity Overview</SectionTitle>
            </SectionHeader>
            <SectionContent>
              <InfoItem>
                <InfoLabel>Workouts Completed</InfoLabel>
                <InfoValue>42</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Hours Trained</InfoLabel>
                <InfoValue>68.5</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Calories Burned</InfoLabel>
                <InfoValue>12,450</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Active Days</InfoLabel>
                <InfoValue>28</InfoValue>
              </InfoItem>
            </SectionContent>
          </SectionCard>
          
          <SectionCard>
            <SectionHeader>
              <SectionIcon color="#7851a9">
                <Shield size={24} />
              </SectionIcon>
              <SectionTitle>Account Security</SectionTitle>
            </SectionHeader>
            <SectionContent>
              <InfoItem>
                <InfoLabel>Password</InfoLabel>
                <InfoValue>••••••••</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Two-Factor Auth</InfoLabel>
                <InfoValue>
                  <ToggleSwitch 
                    enabled={false} 
                    onClick={() => {}}
                  />
                </InfoValue>
              </InfoItem>
              <ActionButton variant="secondary">
                <Settings size={16} />
                Security Settings
              </ActionButton>
            </SectionContent>
          </SectionCard>
          
          <SectionCard>
            <SectionHeader>
              <SectionIcon color="#f59e0b">
                <Bell size={24} />
              </SectionIcon>
              <SectionTitle>Notification Preferences</SectionTitle>
            </SectionHeader>
            <SectionContent>
              <PreferenceItem>
                <div>
                  <PreferenceLabel>Email Notifications</PreferenceLabel>
                  <PreferenceDescription>Receive updates via email</PreferenceDescription>
                </div>
                <ToggleSwitch 
                  enabled={preferences.emailNotifications}
                  onClick={() => togglePreference('emailNotifications')}
                />
              </PreferenceItem>
              <PreferenceItem>
                <div>
                  <PreferenceLabel>Push Notifications</PreferenceLabel>
                  <PreferenceDescription>Get instant mobile alerts</PreferenceDescription>
                </div>
                <ToggleSwitch 
                  enabled={preferences.pushNotifications}
                  onClick={() => togglePreference('pushNotifications')}
                />
              </PreferenceItem>
              <PreferenceItem>
                <div>
                  <PreferenceLabel>Marketing Emails</PreferenceLabel>
                  <PreferenceDescription>Promotional content and offers</PreferenceDescription>
                </div>
                <ToggleSwitch 
                  enabled={preferences.marketingEmails}
                  onClick={() => togglePreference('marketingEmails')}
                />
              </PreferenceItem>
              <PreferenceItem>
                <div>
                  <PreferenceLabel>Workout Reminders</PreferenceLabel>
                  <PreferenceDescription>Daily training notifications</PreferenceDescription>
                </div>
                <ToggleSwitch 
                  enabled={preferences.workoutReminders}
                  onClick={() => togglePreference('workoutReminders')}
                />
              </PreferenceItem>
            </SectionContent>
          </SectionCard>
          
          <SectionCard>
            <SectionHeader>
              <SectionIcon color="#ec4899">
                <Award size={24} />
              </SectionIcon>
              <SectionTitle>Recent Activity</SectionTitle>
            </SectionHeader>
            <SectionContent>
              {mockActivities.map(activity => (
                <ActivityItem key={activity.id}>
                  <ActivityTitle>{activity.title}</ActivityTitle>
                  <ActivityDescription>{activity.description}</ActivityDescription>
                  <ActivityTime>{activity.time}</ActivityTime>
                </ActivityItem>
              ))}
            </SectionContent>
          </SectionCard>
          
          <SectionCard>
            <SectionHeader>
              <SectionIcon color="#00ffff">
                <Download size={24} />
              </SectionIcon>
              <SectionTitle>Data Export</SectionTitle>
            </SectionHeader>
            <SectionContent>
              <InfoItem>
                <InfoLabel>Account Data</InfoLabel>
                <InfoValue>Available</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Workout History</InfoLabel>
                <InfoValue>42 sessions</InfoValue>
              </InfoItem>
              <ActionButton color="#00ffff" variant="primary">
                <Download size={16} />
                Export My Data
              </ActionButton>
            </SectionContent>
          </SectionCard>
          
          <SectionCard>
            <SectionHeader>
              <SectionIcon color="#ef4444">
                <Heart size={24} />
              </SectionIcon>
              <SectionTitle>Health Metrics</SectionTitle>
            </SectionHeader>
            <SectionContent>
              <InfoItem>
                <InfoLabel>Resting Heart Rate</InfoLabel>
                <InfoValue>68 bpm</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Current Weight</InfoLabel>
                <InfoValue>Not set</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Body Fat %</InfoLabel>
                <InfoValue>Not set</InfoValue>
              </InfoItem>
              <ActionButton variant="secondary">
                <Edit size={16} />
                Update Metrics
              </ActionButton>
            </SectionContent>
          </SectionCard>
        </MainContent>
      </DashboardContainer>
    </MainLayout>
  );
};

export default UserDashboard;