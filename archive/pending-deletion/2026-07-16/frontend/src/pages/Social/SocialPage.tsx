import React, { lazy, Suspense } from 'react';
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
  Award,
  Play,
  MessageCircle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGamificationData } from '../../hooks/gamification/useGamificationData';
import SocialFeed from '../../components/Social/Feed/SocialFeed';
import FriendsList from '../../components/Social/Friends/FriendsList';
import ChallengesView from '../../components/Social/Challenges/ChallengesView';
const VerticalReels = lazy(() => import('../../components/Social/Reels/VerticalReels'));
const ExploreView = lazy(() => import('../../components/Social/Explore/ExploreView'));
const MessagingView = lazy(() => import('../../components/Social/Messaging/MessagingView'));
import styled from 'styled-components';

// Styled components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
`;

const PageTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 2.125rem;
  font-weight: 600;
  line-height: 1.235;
`;

const SidebarContainer = styled.div`
  padding: 16px;
  height: fit-content;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);
`;

const SidebarMenu = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MenuButton = styled.button<{ $active?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: flex-start;
  text-transform: none;
  font-weight: ${props => props.$active ? 'bold' : 'normal'};
  background-color: ${props => props.$active ? 'rgba(139, 92, 246, 0.12)' : 'transparent'};
  padding: 12px 16px;
  min-height: 44px;
  border: none;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  font-size: 0.875rem;
  color: ${props => props.$active ? '#8B5CF6' : 'inherit'};
  font-family: inherit;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: ${props => props.disabled
      ? (props.$active ? 'rgba(139, 92, 246, 0.12)' : 'transparent')
      : (props.$active ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.04)')};
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
`;

const GamificationSidebar = styled.div`
  background: linear-gradient(135deg, #002060, #003080);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(96, 192, 240, 0.15);
`;

const PointsSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const StreakSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const ProgressSection = styled.div`
  margin-top: 16px;
`;

const QuickActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
  justify-content: flex-start;
  text-transform: none;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: inherit;
  font-family: inherit;
  transition: transform 0.2s ease, background-color 0.2s ease;

  &:hover {
    transform: translateX(4px);
    background-color: rgba(139, 92, 246, 0.08);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
`;

const NotificationBadge = styled.span`
  position: relative;
  display: inline-flex;
`;

const BadgeDot = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1;
  padding: 0 4px;
  background: #8B5CF6;
  color: white;
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  margin: 16px 0;
`;

const LevelChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.2);
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number }>`
  height: 100%;
  border-radius: 3px;
  background-color: #60C0F0;
  box-shadow: 0 0 6px rgba(96, 192, 240, 0.4);
  width: ${props => Math.min(Math.max(props.$value, 0), 100)}%;
  transition: width 0.4s ease;
`;

const PointsValue = styled.h6`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.6;
`;

const PointsLabel = styled.span`
  font-size: 0.875rem;
  opacity: 0.8;
`;

const StreakText = styled.span`
  font-size: 0.875rem;
`;

const StreakEmoji = styled.span`
  font-size: 0.875rem;
  opacity: 0.8;
`;

const ProgressCaption = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
`;

const SidebarTitle = styled.h6`
  margin: 0 0 12px 0;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.6;
`;

const QuickActionsTitle = styled.h6`
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.57;
`;

/* --- Grid layout ---- */
const DesktopGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 900px) {
    grid-template-columns: 1fr 3fr;
  }
`;

/* Sidebar column — hidden on mobile via CSS, no JS resize listener */
const SidebarColumn = styled.div`
  display: none;

  @media (min-width: 900px) {
    display: block;
  }
`;

/* --- Mobile tab bar (hidden on desktop) --- */
const TabBar = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 24px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.12);

  @media (min-width: 900px) {
    display: none;
  }
`;

const TabButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  min-height: 44px;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#8B5CF6' : 'transparent'};
  margin-bottom: -2px;
  background: transparent;
  color: ${props => props.$active ? '#8B5CF6' : 'inherit'};
  cursor: pointer;
  font-size: 0.8125rem;
  font-family: inherit;
  font-weight: ${props => props.$active ? 600 : 400};
  opacity: ${props => props.$active ? 1 : 0.7};
  transition: color 0.2s, border-color 0.2s, opacity 0.2s;

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
`;

/**
 * Main Social Page Component
 * Displays the social feed and provides navigation to other social features
 */
const VALID_TABS = ['feed', 'explore', 'reels', 'friends', 'challenges', 'messaging'] as const;
type SocialTab = typeof VALID_TABS[number];

const SocialPage: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useGamificationData();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  // Derive activeTab directly from URL — no state duplication
  const activeTab: SocialTab = VALID_TABS.includes(tab as SocialTab)
    ? (tab as SocialTab)
    : 'feed';

  // Mock notification count for demo
  const notificationCount = 3;

  // Handle tab change — update URL so back/forward work
  const handleTabChange = (newTab: SocialTab) => {
    navigate(newTab === 'feed' ? '/user-dashboard' : `/user-dashboard/${newTab}`);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <SocialFeed />;
      case 'explore':
        return (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>Loading Explore...</div>}>
            <ExploreView />
          </Suspense>
        );
      case 'reels':
        return (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>Loading Reels...</div>}>
            <VerticalReels />
          </Suspense>
        );
      case 'friends':
        return <FriendsList />;
      case 'challenges':
        return <ChallengesView />;
      case 'messaging':
        return (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>Loading Messages...</div>}>
            <MessagingView />
          </Suspense>
        );
      default:
        return <SocialFeed />;
    }
  };

  return (
    <PageContainer>
      <PageTitle>Social Hub</PageTitle>

      {/* Mobile tab bar — hidden on desktop via CSS */}
      <TabBar>
        <TabButton
          $active={activeTab === 'feed'}
          onClick={() => handleTabChange('feed')}
        >
          <Home size={20} />
          Feed
        </TabButton>
        <TabButton
          $active={activeTab === 'explore'}
          onClick={() => handleTabChange('explore')}
        >
          <TrendingUp size={20} />
          Explore
        </TabButton>
        <TabButton
          $active={activeTab === 'reels'}
          onClick={() => handleTabChange('reels')}
        >
          <Play size={20} />
          Reels
        </TabButton>
        <TabButton
          $active={activeTab === 'friends'}
          onClick={() => handleTabChange('friends')}
        >
          <Users size={20} />
          Friends
        </TabButton>
        <TabButton
          $active={activeTab === 'challenges'}
          onClick={() => handleTabChange('challenges')}
        >
          <Trophy size={20} />
          Challenges
        </TabButton>
        <TabButton
          $active={activeTab === 'messaging'}
          onClick={() => handleTabChange('messaging')}
        >
          <MessageCircle size={20} />
          Messages
        </TabButton>
      </TabBar>

      {/* Desktop sidebar + content grid */}
      <DesktopGrid>
        <SidebarColumn>
          {/* Gamification Section */}
          {profile.data && (
            <GamificationSidebar>
              <PointsSection>
                <div>
                  <PointsValue>
                    {profile.data.points?.toLocaleString() || 0}
                  </PointsValue>
                  <PointsLabel>
                    Points
                  </PointsLabel>
                </div>
                <LevelChip>
                  <Star size={16} />
                  Level {profile.data.level || 1}
                </LevelChip>
              </PointsSection>

              <StreakSection>
                <Zap size={18} />
                <StreakText>
                  {profile.data.streakDays || 0} day streak
                </StreakText>
                <StreakEmoji>
                  {'\uD83D\uDD25'}
                </StreakEmoji>
              </StreakSection>

              <ProgressSection>
                <ProgressCaption>
                  Next Level Progress
                </ProgressCaption>
                <ProgressBarTrack>
                  <ProgressBarFill $value={profile.data.nextLevelProgress || 0} />
                </ProgressBarTrack>
                <ProgressCaption>
                  {profile.data.nextLevelProgress || 0}% to Level {(profile.data.level || 1) + 1}
                </ProgressCaption>
              </ProgressSection>
            </GamificationSidebar>
          )}

          <SidebarContainer>
            <SidebarTitle>
              Social Hub
            </SidebarTitle>
            <SidebarMenu>
              <MenuButton
                onClick={() => handleTabChange('feed')}
                $active={activeTab === 'feed'}
              >
                <Home size={20} />
                Feed
              </MenuButton>
              <MenuButton
                onClick={() => handleTabChange('explore')}
                $active={activeTab === 'explore'}
              >
                <TrendingUp size={20} />
                Explore
              </MenuButton>
              <MenuButton
                onClick={() => handleTabChange('reels')}
                $active={activeTab === 'reels'}
              >
                <Play size={20} />
                Reels
              </MenuButton>
              <MenuButton
                onClick={() => handleTabChange('friends')}
                $active={activeTab === 'friends'}
              >
                <Users size={20} />
                Friends
              </MenuButton>
              <MenuButton
                onClick={() => handleTabChange('challenges')}
                $active={activeTab === 'challenges'}
              >
                <Trophy size={20} />
                Challenges
              </MenuButton>
              <MenuButton
                onClick={() => handleTabChange('messaging')}
                $active={activeTab === 'messaging'}
              >
                <MessageCircle size={20} />
                Messages
              </MenuButton>
              <MenuButton
                disabled
              >
                <NotificationBadge>
                  <Bell size={20} />
                  {notificationCount > 0 && (
                    <BadgeDot>{notificationCount}</BadgeDot>
                  )}
                </NotificationBadge>
                Notifications
              </MenuButton>
            </SidebarMenu>

            <StyledDivider />

            <QuickActionsTitle>
              Quick Actions
            </QuickActionsTitle>

            <QuickActionButton
              onClick={() => handleTabChange('feed')}
            >
              <PlusCircle size={18} />
              Create Post
            </QuickActionButton>

            <QuickActionButton>
              <Target size={18} />
              Set Goal
            </QuickActionButton>

            <QuickActionButton>
              <Award size={18} />
              View Rewards
            </QuickActionButton>
          </SidebarContainer>
        </SidebarColumn>

        <div>
          {renderContent()}
        </div>
      </DesktopGrid>
    </PageContainer>
  );
};

export default SocialPage;
