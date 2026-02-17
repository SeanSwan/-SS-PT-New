/**
 * GamificationDisplay Component
 *
 * Displays gamification data from the MCP server, including:
 * - Achievements
 * - Game board position
 * - Challenges and quests
 * - Points and level information
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gamificationMcpApi } from '../../services/mcp/gamificationMcpService';
import styled, { keyframes, css } from 'styled-components';
import {
  Trophy,
  Shield,
  Star,
  Heart,
  Zap,
  Dice5,
  Puzzle,
  Lightbulb,
  CheckCircle,
  Hourglass,
  Lock,
  Brain,
  Map,
  BarChart,
  Flag,
  Info,
  Wifi,
  RefreshCw,
  X
} from 'lucide-react';

// ==================== Styled Components ====================

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const progressStripe = keyframes`
  0% { background-position: 1rem 0; }
  100% { background-position: 0 0; }
`;

const GlassCard = styled.div<{ $completed?: boolean; $borderColor?: string }>`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid ${({ $completed, $borderColor }) =>
    $completed && $borderColor ? $borderColor : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(12px);
  ${({ $completed }) => $completed && css`
    background: rgba(15, 23, 42, 0.98);
  `}
`;

const GlassPanel = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const SectionTitle = styled.h5`
  color: #e2e8f0;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CompactTitle = styled.h6`
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SubTitle = styled.h6`
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px 0;
`;

const BodyText = styled.p`
  color: #e2e8f0;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
`;

const SecondaryText = styled.span`
  color: #94a3b8;
  font-size: 0.75rem;
`;

const CaptionText = styled.span`
  color: #94a3b8;
  font-size: 0.75rem;
`;

const AccentText = styled.span`
  color: #0ea5e9;
  font-weight: 700;
`;

const TierText = styled.span`
  color: #e2e8f0;
  font-size: 0.875rem;
  text-transform: capitalize;
`;

const FlexRow = styled.div<{
  $justify?: string;
  $align?: string;
  $gap?: string;
  $wrap?: string;
}>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
  gap: ${({ $gap }) => $gap || '0'};
  flex-wrap: ${({ $wrap }) => $wrap || 'nowrap'};
`;

const FlexGrow = styled.div`
  flex-grow: 1;
  min-width: 0;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const StatBox = styled.div`
  text-align: center;
  padding: 8px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
`;

const AvatarCircle = styled.div<{ $bgColor?: string; $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  min-width: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  background: ${({ $bgColor }) => $bgColor || '#0ea5e9'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: ${({ $size }) => ($size ? $size * 0.4 : 16)}px;
  font-weight: 700;
`;

const ProgressBarContainer = styled.div<{ $height?: number }>`
  width: 100%;
  height: ${({ $height }) => $height || 8}px;
  background: rgba(14, 165, 233, 0.1);
  border-radius: ${({ $height }) => ($height ? $height / 2 : 4)}px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number; $color?: string }>`
  height: 100%;
  width: ${({ $value }) => Math.min($value, 100)}%;
  background: ${({ $color }) => $color || '#0ea5e9'};
  border-radius: inherit;
  transition: width 0.5s ease;
`;

const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 32}px;
  height: ${({ $size }) => $size || 32}px;
  border: 3px solid rgba(14, 165, 233, 0.2);
  border-top-color: #0ea5e9;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const PrimaryButton = styled.button<{ $fullWidth?: boolean; $small?: boolean; $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: ${({ $small }) => ($small ? '8px 16px' : '12px 24px')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  background: ${({ $active }) => ($active !== false ? '#0ea5e9' : 'transparent')};
  color: ${({ $active }) => ($active !== false ? '#fff' : '#0ea5e9')};
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  font-size: ${({ $small }) => ($small ? '0.8125rem' : '0.875rem')};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 44px;

  &:hover:not(:disabled) {
    background: ${({ $active }) => ($active !== false ? '#0284c7' : 'rgba(14, 165, 233, 0.1)')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OutlineButton = styled.button<{ $small?: boolean; $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: ${({ $small }) => ($small ? '8px 16px' : '12px 24px')};
  background: ${({ $active }) => ($active ? '#0ea5e9' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#0ea5e9')};
  border: 1px solid ${({ $active }) => ($active ? '#0ea5e9' : 'rgba(14, 165, 233, 0.3)')};
  border-radius: 8px;
  font-size: ${({ $small }) => ($small ? '0.8125rem' : '0.875rem')};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 44px;

  &:hover {
    background: ${({ $active }) => ($active ? '#0284c7' : 'rgba(14, 165, 233, 0.1)')};
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #0ea5e9;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;

  &:hover:not(:disabled) {
    background: rgba(14, 165, 233, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ChipBadge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $color }) => {
    switch ($color) {
      case 'success': return 'rgba(34, 197, 94, 0.15)';
      case 'info': return 'rgba(14, 165, 233, 0.15)';
      case 'warning': return 'rgba(234, 179, 8, 0.15)';
      case 'error': return 'rgba(239, 68, 68, 0.15)';
      case 'primary': return 'rgba(14, 165, 233, 0.15)';
      default: return 'rgba(148, 163, 184, 0.15)';
    }
  }};
  color: ${({ $color }) => {
    switch ($color) {
      case 'success': return '#22c55e';
      case 'info': return '#0ea5e9';
      case 'warning': return '#eab308';
      case 'error': return '#ef4444';
      case 'primary': return '#0ea5e9';
      default: return '#94a3b8';
    }
  }};
  border: 1px solid ${({ $color }) => {
    switch ($color) {
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      case 'info': return 'rgba(14, 165, 233, 0.3)';
      case 'warning': return 'rgba(234, 179, 8, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'primary': return 'rgba(14, 165, 233, 0.3)';
      default: return 'rgba(148, 163, 184, 0.3)';
    }
  }};
`;

const AlertBox = styled.div<{ $severity?: 'error' | 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 16px;
  background: ${({ $severity }) => {
    switch ($severity) {
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(234, 179, 8, 0.1)';
      case 'info': return 'rgba(14, 165, 233, 0.1)';
      case 'success': return 'rgba(34, 197, 94, 0.1)';
      default: return 'rgba(14, 165, 233, 0.1)';
    }
  }};
  border: 1px solid ${({ $severity }) => {
    switch ($severity) {
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(234, 179, 8, 0.3)';
      case 'info': return 'rgba(14, 165, 233, 0.3)';
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      default: return 'rgba(14, 165, 233, 0.3)';
    }
  }};
  color: ${({ $severity }) => {
    switch ($severity) {
      case 'error': return '#fca5a5';
      case 'warning': return '#fde68a';
      case 'info': return '#7dd3fc';
      case 'success': return '#86efac';
      default: return '#e2e8f0';
    }
  }};
`;

const SpaceHighlight = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: rgba(14, 165, 233, 0.05);
  border: 1px dashed rgba(14, 165, 233, 0.3);
`;

const TierBadge = styled.div<{ $color: string }>`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AchievementCard = styled.div<{ $completed?: boolean; $borderColor?: string }>`
  background: ${({ $completed }) =>
    $completed ? 'rgba(34, 197, 94, 0.05)' : 'rgba(15, 23, 42, 0.95)'};
  border: 1px solid ${({ $completed, $borderColor }) =>
    $completed && $borderColor ? $borderColor : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 12px;
  padding: 20px;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const ChallengeCard = styled.div<{ $status?: string }>`
  background: ${({ $status }) => {
    switch ($status) {
      case 'completed': return 'rgba(34, 197, 94, 0.05)';
      case 'active': return 'rgba(14, 165, 233, 0.05)';
      default: return 'rgba(15, 23, 42, 0.95)';
    }
  }};
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
`;

const NoWrapText = styled.span`
  color: #e2e8f0;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
`;

const NoWrapCaption = styled.span`
  color: #94a3b8;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
`;

const CompactAchievementRow = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  gap: 8px;
  background: rgba(15, 23, 42, 0.6);
`;

const StatusDot = styled.span<{ $online?: boolean }>`
  color: ${({ $online }) => ($online ? '#22c55e' : '#64748b')};
  display: inline-flex;
  align-items: center;
`;

const FullWidthOutline = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  background: transparent;
  color: #0ea5e9;
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
  }
`;

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

// ==================== Types and interfaces ====================

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  progress: number;
  totalRequired: number;
  dateCompleted?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointValue: number;
}

interface GameBoard {
  currentPosition: number;
  totalSpaces: number;
  boardName: string;
  currentSpace: {
    id: string;
    name: string;
    description: string;
    type: string;
    reward?: any;
  };
  lastRoll?: {
    date: string;
    value: number;
    fromPosition: number;
    toPosition: number;
  };
  nextRollAvailable: boolean;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  status: 'active' | 'completed' | 'available';
  progress: number;
  totalRequired: number;
  reward: {
    points: number;
    badge?: string;
  };
  expiryDate?: string;
}

interface UserProfile {
  id: string;
  level: number;
  points: number;
  streak: number;
  nextLevelPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  attributes: {
    strength: { level: number; progress: number };
    cardio: { level: number; progress: number };
    flexibility: { level: number; progress: number };
    balance: { level: number; progress: number };
  };
}

interface GamificationData {
  achievements: Achievement[];
  gameBoard: GameBoard;
  challenges: Challenge[];
  profile: UserProfile;
}

interface GamificationDisplayProps {
  variant?: 'full' | 'compact';
  onDataLoaded?: (data: GamificationData) => void;
}

/**
 * Component to display gamification data from the MCP server
 */
const GamificationDisplay: React.FC<GamificationDisplayProps> = ({
  variant = 'full',
  onDataLoaded
}) => {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpAvailable, setMcpAvailable] = useState<boolean>(false);
  const [showConnectionAlert, setShowConnectionAlert] = useState<boolean>(false);

  // Gamification data
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [gameBoard, setGameBoard] = useState<GameBoard | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Filter state
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'completed' | 'inProgress'>('all');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'active' | 'completed' | 'available'>('all');

  // Check MCP server status
  const checkMcpStatus = useCallback(async () => {
    try {
      const available = await gamificationMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);

      setMcpAvailable(available);
      setShowConnectionAlert(!available);

      return available;
    } catch (error) {
      console.error('[Gamification] Error checking MCP server status:', error);
      setMcpAvailable(false);
      setShowConnectionAlert(true);
      return false;
    }
  }, []);

  // Load gamification data
  const loadGamificationData = useCallback(async () => {
    if (!user?.id) {
      setError('User ID not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if MCP server is available
      const isAvailable = await checkMcpStatus();

      if (!isAvailable) {
        // Fall back to mock data for development
        console.log('[Gamification] Using mock data');
        setMockData();
        setLoading(false);
        return;
      }

      // Get profile data
      const profileResponse = await gamificationMcpApi.getGamificationProfile({
        userId: user.id
      });

      // Get achievements
      const achievementsResponse = await gamificationMcpApi.getAchievements({
        userId: user.id,
        includeCompleted: true,
        includeInProgress: true
      });

      // Get game board position
      const boardResponse = await gamificationMcpApi.getBoardPosition({
        userId: user.id
      });

      // Get challenges
      const challengesResponse = await gamificationMcpApi.getChallenges({
        userId: user.id,
        status: 'all'
      });

      // Update state with real data
      if (profileResponse.data) {
        setProfile(profileResponse.data);
      }

      if (achievementsResponse.data) {
        setAchievements(achievementsResponse.data);
      }

      if (boardResponse.data) {
        setGameBoard(boardResponse.data);
      }

      if (challengesResponse.data) {
        setChallenges(challengesResponse.data);
      }

      // Combine data for callback
      const combinedData: GamificationData = {
        profile: profileResponse.data || generateMockProfile(),
        achievements: achievementsResponse.data || generateMockAchievements(),
        gameBoard: boardResponse.data || generateMockGameBoard(),
        challenges: challengesResponse.data || generateMockChallenges()
      };

      if (onDataLoaded) {
        onDataLoaded(combinedData);
      }
    } catch (error: any) {
      console.error('[Gamification] Error loading data:', error);
      setError(error.message || 'Error loading gamification data');

      // Fall back to mock data for development
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkMcpStatus, onDataLoaded]);

  // Set mock data for development
  const setMockData = () => {
    setProfile(generateMockProfile());
    setAchievements(generateMockAchievements());
    setGameBoard(generateMockGameBoard());
    setChallenges(generateMockChallenges());

    // Combine data for callback
    if (onDataLoaded) {
      onDataLoaded({
        profile: generateMockProfile(),
        achievements: generateMockAchievements(),
        gameBoard: generateMockGameBoard(),
        challenges: generateMockChallenges()
      });
    }
  };

  // Roll dice and move on game board
  const handleRollDice = async () => {
    if (!user?.id || !gameBoard?.nextRollAvailable) {
      return;
    }

    try {
      setLoading(true);

      if (mcpAvailable) {
        // Use real MCP server
        const response = await gamificationMcpApi.rollDice({
          userId: user.id
        });

        if (response.data) {
          // Update game board with new position
          setGameBoard(response.data);

          // Reload profile to get updated points
          const profileResponse = await gamificationMcpApi.getGamificationProfile({
            userId: user.id
          });

          if (profileResponse.data) {
            setProfile(profileResponse.data);
          }
        }
      } else {
        // Mock roll for development
        console.log('[Gamification] Using mock dice roll');

        // Random roll between 1-6
        const roll = Math.floor(Math.random() * 6) + 1;
        const oldPosition = gameBoard.currentPosition;
        let newPosition = oldPosition + roll;

        // Wrap around if needed
        if (newPosition > gameBoard.totalSpaces) {
          newPosition = newPosition - gameBoard.totalSpaces;
        }

        // Generate new game board state
        const updatedGameBoard: GameBoard = {
          ...gameBoard,
          currentPosition: newPosition,
          lastRoll: {
            date: new Date().toISOString(),
            value: roll,
            fromPosition: oldPosition,
            toPosition: newPosition
          },
          nextRollAvailable: false,
          currentSpace: {
            id: `space-${newPosition}`,
            name: `Space ${newPosition}`,
            description: 'You landed on a reward space!',
            type: 'reward',
            reward: {
              points: roll * 10,
              message: `You earned ${roll * 10} points!`
            }
          }
        };

        setGameBoard(updatedGameBoard);

        // Update profile with reward points
        if (profile) {
          setProfile({
            ...profile,
            points: profile.points + (roll * 10)
          });
        }

        // Simulate delay for user experience
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error('[Gamification] Error rolling dice:', error);
      setError(error.message || 'Error rolling dice');
    } finally {
      setLoading(false);
    }
  };

  // Join a challenge
  const handleJoinChallenge = async (challengeId: string) => {
    if (!user?.id) {
      return;
    }

    try {
      if (mcpAvailable) {
        // Use real MCP server
        await gamificationMcpApi.joinChallenge({
          userId: user.id,
          challengeId: challengeId
        });

        // Reload challenges
        const challengesResponse = await gamificationMcpApi.getChallenges({
          userId: user.id,
          status: 'all'
        });

        if (challengesResponse.data) {
          setChallenges(challengesResponse.data);
        }
      } else {
        // Mock join for development
        console.log('[Gamification] Mocking challenge join:', challengeId);

        // Update challenge status in local state
        setChallenges(challenges.map(challenge => {
          if (challenge.id === challengeId) {
            return {
              ...challenge,
              status: 'active' as const
            };
          }
          return challenge;
        }));
      }
    } catch (error: any) {
      console.error('[Gamification] Error joining challenge:', error);
      setError(error.message || 'Error joining challenge');
    }
  };

  // Load data on mount
  useEffect(() => {
    loadGamificationData();
  }, [loadGamificationData]);

  // Check MCP status regularly
  useEffect(() => {
    const interval = setInterval(checkMcpStatus, 30000);
    return () => clearInterval(interval);
  }, [checkMcpStatus]);

  // Filter achievements
  const filteredAchievements = achievements.filter(achievement => {
    if (achievementFilter === 'all') return true;
    if (achievementFilter === 'completed') return achievement.completed;
    if (achievementFilter === 'inProgress') return !achievement.completed;
    return true;
  });

  // Filter challenges
  const filteredChallenges = challenges.filter(challenge => {
    if (challengeFilter === 'all') return true;
    return challenge.status === challengeFilter;
  });

  // Get badge color based on tier
  const getBadgeColor = (tier: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#CD7F32';
    }
  };

  // Get icon component based on string name
  const getIconComponent = (iconName: string, size: number = 24) => {
    switch (iconName) {
      case 'Star': return <Star size={size} />;
      case 'Trophy': return <Trophy size={size} />;
      case 'Medal': return <Shield size={size} />;
      case 'Heart': return <Heart size={size} />;
      case 'Lightning': return <Zap size={size} />;
      case 'Dice': return <Dice5 size={size} />;
      case 'Puzzle': return <Puzzle size={size} />;
      case 'Idea': return <Lightbulb size={size} />;
      default: return <Star size={size} />;
    }
  };

  // Get challenge status color
  const getChallengeStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'active': return '#0ea5e9';
      case 'available': return '#eab308';
      default: return '#64748b';
    }
  };

  // Calculate level progress percentage
  const calculateLevelProgress = () => {
    if (!profile) return 0;

    const { points, nextLevelPoints } = profile;
    return Math.min(Math.round((points / nextLevelPoints) * 100), 100);
  };

  // Render compact version
  if (variant === 'compact') {
    return (
      <GlassCard>
        <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
          <CompactTitle>
            <Trophy size={20} />
            Gamification
          </CompactTitle>
          <StatusDot
            $online={mcpAvailable}
            title={mcpAvailable ? "MCP Server Connected" : "MCP Server Offline"}
          >
            <Wifi size={18} />
          </StatusDot>
        </FlexRow>

        {/* Error Message */}
        {error && (
          <AlertBox $severity="error">
            {error}
          </AlertBox>
        )}

        {/* Profile Summary */}
        {profile && (
          <div style={{ marginBottom: 16 }}>
            <CompactGrid>
              <StatBox>
                <CaptionText>Level</CaptionText>
                <CompactTitle style={{ justifyContent: 'center', marginTop: 4 }}>
                  {profile.level}
                </CompactTitle>
              </StatBox>
              <StatBox>
                <CaptionText>Points</CaptionText>
                <CompactTitle style={{ justifyContent: 'center', marginTop: 4 }}>
                  {profile.points}
                </CompactTitle>
              </StatBox>
            </CompactGrid>

            {/* Level Progress */}
            <div style={{ marginTop: 16 }}>
              <FlexRow $justify="space-between" style={{ marginBottom: 4 }}>
                <CaptionText>
                  Progress to Level {profile.level + 1}
                </CaptionText>
                <CaptionText>
                  {profile.points} / {profile.nextLevelPoints}
                </CaptionText>
              </FlexRow>
              <ProgressBarContainer $height={8}>
                <ProgressBarFill $value={calculateLevelProgress()} />
              </ProgressBarContainer>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        <SubTitle>Recent Achievements</SubTitle>

        {loading ? (
          <FlexRow $justify="center" style={{ padding: '16px 0' }}>
            <Spinner $size={24} />
          </FlexRow>
        ) : (
          <div>
            {filteredAchievements.slice(0, 3).map((achievement) => (
              <CompactAchievementRow key={achievement.id}>
                <AvatarCircle
                  $bgColor={getBadgeColor(achievement.tier)}
                  $size={32}
                >
                  {getIconComponent(achievement.icon, 16)}
                </AvatarCircle>
                <FlexGrow>
                  <NoWrapText>{achievement.name}</NoWrapText>
                  <NoWrapCaption>{achievement.description}</NoWrapCaption>
                </FlexGrow>
                {achievement.completed ? (
                  <CheckCircle size={18} color="#22c55e" />
                ) : (
                  <CaptionText>
                    {achievement.progress}/{achievement.totalRequired}
                  </CaptionText>
                )}
              </CompactAchievementRow>
            ))}

            <FullWidthOutline onClick={() => loadGamificationData()}>
              View All
            </FullWidthOutline>
          </div>
        )}
      </GlassCard>
    );
  }

  // Render full version
  return (
    <div>
      <GlassPanel style={{ marginBottom: 24 }}>
        {/* Header */}
        <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 24 }}>
          <SectionTitle>
            <Trophy size={24} />
            Wholesome Warrior's Path
          </SectionTitle>

          <FlexRow $align="center" $gap="4px">
            <IconBtn
              onClick={loadGamificationData}
              disabled={loading}
              title="Refresh Data"
            >
              {loading && (
                <Spinner
                  $size={24}
                  style={{ position: 'absolute', top: 10, left: 10 }}
                />
              )}
              <RefreshCw size={20} />
            </IconBtn>
            <StatusDot
              $online={mcpAvailable}
              title={mcpAvailable ? "MCP Server Connected" : "MCP Server Offline"}
            >
              <Wifi size={20} />
            </StatusDot>
          </FlexRow>
        </FlexRow>

        {/* Connection Alert */}
        {showConnectionAlert && (
          <AlertBox $severity="warning">
            <span>Unable to connect to the Gamification MCP server. Using cached data.</span>
            <IconBtn
              aria-label="close"
              onClick={() => setShowConnectionAlert(false)}
              style={{ width: 32, height: 32, minWidth: 32 }}
            >
              <X size={16} />
            </IconBtn>
          </AlertBox>
        )}

        {/* Error Message */}
        {error && (
          <AlertBox $severity="error">
            {error}
          </AlertBox>
        )}

        {/* Player Stats */}
        {profile && (
          <LayoutGrid>
            <GlassCard>
              <SubTitle>Your Progress</SubTitle>

              <StatGrid>
                {/* Level */}
                <div style={{ textAlign: 'center' }}>
                  <AvatarCircle
                    $bgColor={getBadgeColor(profile.tier)}
                    $size={60}
                    style={{ margin: '0 auto 8px' }}
                  >
                    {profile.level}
                  </AvatarCircle>
                  <BodyText>Level</BodyText>
                </div>

                {/* Points */}
                <div style={{ textAlign: 'center' }}>
                  <AvatarCircle
                    $bgColor="#0ea5e9"
                    $size={60}
                    style={{ margin: '0 auto 8px' }}
                  >
                    <Star size={24} />
                  </AvatarCircle>
                  <BodyText>{profile.points} Points</BodyText>
                </div>

                {/* Streak */}
                <div style={{ textAlign: 'center' }}>
                  <AvatarCircle
                    $bgColor="#eab308"
                    $size={60}
                    style={{ margin: '0 auto 8px' }}
                  >
                    <Zap size={24} />
                  </AvatarCircle>
                  <BodyText>{profile.streak} Day Streak</BodyText>
                </div>

                {/* Tier */}
                <div style={{ textAlign: 'center' }}>
                  <AvatarCircle
                    $bgColor={getBadgeColor(profile.tier)}
                    $size={60}
                    style={{ margin: '0 auto 8px' }}
                  >
                    <Trophy size={24} />
                  </AvatarCircle>
                  <TierText>{profile.tier} Tier</TierText>
                </div>
              </StatGrid>

              {/* Level Progress */}
              <div style={{ marginTop: 24 }}>
                <FlexRow $justify="space-between" style={{ marginBottom: 4 }}>
                  <BodyText>Progress to Level {profile.level + 1}</BodyText>
                  <BodyText>{profile.points} / {profile.nextLevelPoints} Points</BodyText>
                </FlexRow>
                <ProgressBarContainer $height={10}>
                  <ProgressBarFill $value={calculateLevelProgress()} />
                </ProgressBarContainer>
              </div>
            </GlassCard>

            {/* Attributes */}
            <GlassCard style={{ height: '100%' }}>
              <SubTitle>Attributes</SubTitle>

              {profile.attributes && (
                <div>
                  {/* Strength */}
                  <div style={{ marginBottom: 16 }}>
                    <BodyText style={{ marginBottom: 4 }}>
                      Strength (Lvl {profile.attributes.strength.level})
                    </BodyText>
                    <ProgressBarContainer $height={8}>
                      <ProgressBarFill
                        $value={profile.attributes.strength.progress}
                        $color="#ef4444"
                      />
                    </ProgressBarContainer>
                  </div>

                  {/* Cardio */}
                  <div style={{ marginBottom: 16 }}>
                    <BodyText style={{ marginBottom: 4 }}>
                      Cardio (Lvl {profile.attributes.cardio.level})
                    </BodyText>
                    <ProgressBarContainer $height={8}>
                      <ProgressBarFill
                        $value={profile.attributes.cardio.progress}
                        $color="#0ea5e9"
                      />
                    </ProgressBarContainer>
                  </div>

                  {/* Flexibility */}
                  <div style={{ marginBottom: 16 }}>
                    <BodyText style={{ marginBottom: 4 }}>
                      Flexibility (Lvl {profile.attributes.flexibility.level})
                    </BodyText>
                    <ProgressBarContainer $height={8}>
                      <ProgressBarFill
                        $value={profile.attributes.flexibility.progress}
                        $color="#22c55e"
                      />
                    </ProgressBarContainer>
                  </div>

                  {/* Balance */}
                  <div>
                    <BodyText style={{ marginBottom: 4 }}>
                      Balance (Lvl {profile.attributes.balance.level})
                    </BodyText>
                    <ProgressBarContainer $height={8}>
                      <ProgressBarFill
                        $value={profile.attributes.balance.progress}
                        $color="#eab308"
                      />
                    </ProgressBarContainer>
                  </div>
                </div>
              )}
            </GlassCard>
          </LayoutGrid>
        )}

        {/* Game Board */}
        {gameBoard && (
          <GlassCard style={{ marginBottom: 32 }}>
            <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
              <SectionTitle>
                <Map size={20} />
                {gameBoard.boardName}
              </SectionTitle>
              <ChipBadge $color="primary">
                Space {gameBoard.currentPosition} of {gameBoard.totalSpaces}
              </ChipBadge>
            </FlexRow>

            <div style={{ marginBottom: 24 }}>
              <SpaceHighlight>
                <BodyText style={{ fontWeight: 600, marginBottom: 4 }}>
                  {gameBoard.currentSpace.name}
                </BodyText>
                <SecondaryText>
                  {gameBoard.currentSpace.description}
                </SecondaryText>

                {gameBoard.currentSpace.reward && (
                  <FlexRow $align="center" $gap="4px" style={{ marginTop: 8 }}>
                    <Star size={16} color="#eab308" />
                    <BodyText style={{ fontWeight: 600 }}>
                      {gameBoard.currentSpace.reward.message || `Reward: ${gameBoard.currentSpace.reward.points} points`}
                    </BodyText>
                  </FlexRow>
                )}
              </SpaceHighlight>
            </div>

            {/* Last Roll Info */}
            {gameBoard.lastRoll && (
              <FlexRow $align="center" $gap="8px" style={{ marginBottom: 24 }}>
                <Dice5 size={20} color="#94a3b8" />
                <BodyText>
                  Last roll: You rolled a{' '}
                  <AccentText>{gameBoard.lastRoll.value}</AccentText>
                  {' '}and moved from space {gameBoard.lastRoll.fromPosition} to {gameBoard.lastRoll.toPosition}.
                </BodyText>
              </FlexRow>
            )}

            {/* Roll Button */}
            <PrimaryButton
              $fullWidth
              disabled={loading || !gameBoard.nextRollAvailable}
              onClick={handleRollDice}
            >
              {loading ? (
                <Spinner $size={24} />
              ) : gameBoard.nextRollAvailable ? (
                <>
                  <Dice5 size={20} />
                  Roll Dice & Move
                </>
              ) : (
                'Next Roll Available Tomorrow'
              )}
            </PrimaryButton>
          </GlassCard>
        )}

        {/* Achievements */}
        <GlassCard style={{ marginBottom: 32 }}>
          <FlexRow $justify="space-between" $align="center" $wrap="wrap" $gap="12px" style={{ marginBottom: 16 }}>
            <SectionTitle>
              <Trophy size={20} />
              Achievements
            </SectionTitle>
            <FlexRow $gap="8px" $wrap="wrap">
              <OutlineButton
                $small
                $active={achievementFilter === 'all'}
                onClick={() => setAchievementFilter('all')}
              >
                All
              </OutlineButton>
              <OutlineButton
                $small
                $active={achievementFilter === 'completed'}
                onClick={() => setAchievementFilter('completed')}
              >
                Completed
              </OutlineButton>
              <OutlineButton
                $small
                $active={achievementFilter === 'inProgress'}
                onClick={() => setAchievementFilter('inProgress')}
              >
                In Progress
              </OutlineButton>
            </FlexRow>
          </FlexRow>

          {/* Loading State */}
          {loading ? (
            <FlexRow $justify="center" style={{ padding: '32px 0' }}>
              <Spinner />
            </FlexRow>
          ) : (
            // Achievements Grid
            <AchievementGrid>
              {filteredAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  $completed={achievement.completed}
                  $borderColor={getBadgeColor(achievement.tier)}
                >
                  {/* Tier Badge */}
                  <TierBadge $color={getBadgeColor(achievement.tier)}>
                    <Star size={16} color="#fff" />
                  </TierBadge>

                  <FlexRow $align="center" $gap="12px" style={{ marginBottom: 16 }}>
                    <AvatarCircle $bgColor={getBadgeColor(achievement.tier)}>
                      {getIconComponent(achievement.icon)}
                    </AvatarCircle>
                    <SectionTitle style={{ fontSize: '1rem' }}>
                      {achievement.name}
                    </SectionTitle>
                  </FlexRow>

                  <SecondaryText style={{ display: 'block', marginBottom: 16, fontSize: '0.875rem' }}>
                    {achievement.description}
                  </SecondaryText>

                  {achievement.completed ? (
                    <FlexRow $align="center" $gap="8px" style={{ marginTop: 'auto' }}>
                      <CheckCircle size={20} color="#22c55e" />
                      <BodyText>
                        Completed{achievement.dateCompleted && ` on ${new Date(achievement.dateCompleted).toLocaleDateString()}`}
                      </BodyText>
                    </FlexRow>
                  ) : (
                    <div style={{ marginTop: 'auto' }}>
                      <FlexRow $justify="space-between" style={{ marginBottom: 4 }}>
                        <BodyText>Progress</BodyText>
                        <BodyText>{achievement.progress} / {achievement.totalRequired}</BodyText>
                      </FlexRow>
                      <ProgressBarContainer $height={8}>
                        <ProgressBarFill
                          $value={Math.min((achievement.progress / achievement.totalRequired) * 100, 100)}
                        />
                      </ProgressBarContainer>
                    </div>
                  )}

                  {/* Point Value */}
                  <div style={{ marginTop: 16 }}>
                    <ChipBadge $color={achievement.completed ? 'success' : undefined}>
                      <Star size={14} />
                      {achievement.pointValue} Points
                    </ChipBadge>
                  </div>
                </AchievementCard>
              ))}

              {filteredAchievements.length === 0 && (
                <EmptyState style={{ gridColumn: '1 / -1' }}>
                  <Info size={40} color="#94a3b8" style={{ marginBottom: 16 }} />
                  <SectionTitle style={{ justifyContent: 'center', marginBottom: 8 }}>
                    No Achievements Found
                  </SectionTitle>
                  <SecondaryText style={{ fontSize: '0.875rem' }}>
                    {achievementFilter === 'completed' ?
                      "You haven't completed any achievements yet. Keep going!" :
                      achievementFilter === 'inProgress' ?
                      "All achievements are either completed or not started yet." :
                      "No achievements available. Check back later."}
                  </SecondaryText>
                </EmptyState>
              )}
            </AchievementGrid>
          )}
        </GlassCard>

        {/* Challenges */}
        <GlassCard>
          <FlexRow $justify="space-between" $align="center" $wrap="wrap" $gap="12px" style={{ marginBottom: 16 }}>
            <SectionTitle>
              <Flag size={20} />
              Challenges & Quests
            </SectionTitle>
            <FlexRow $gap="8px" $wrap="wrap">
              <OutlineButton
                $small
                $active={challengeFilter === 'all'}
                onClick={() => setChallengeFilter('all')}
              >
                All
              </OutlineButton>
              <OutlineButton
                $small
                $active={challengeFilter === 'active'}
                onClick={() => setChallengeFilter('active')}
              >
                Active
              </OutlineButton>
              <OutlineButton
                $small
                $active={challengeFilter === 'available'}
                onClick={() => setChallengeFilter('available')}
              >
                Available
              </OutlineButton>
              <OutlineButton
                $small
                $active={challengeFilter === 'completed'}
                onClick={() => setChallengeFilter('completed')}
              >
                Completed
              </OutlineButton>
            </FlexRow>
          </FlexRow>

          {/* Loading State */}
          {loading ? (
            <FlexRow $justify="center" style={{ padding: '32px 0' }}>
              <Spinner />
            </FlexRow>
          ) : (
            // Challenges List
            <div>
              {filteredChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} $status={challenge.status}>
                  <FlexRow $align="flex-start" $gap="16px">
                    {/* Status Icon */}
                    <AvatarCircle $bgColor={getChallengeStatusColor(challenge.status)}>
                      {challenge.status === 'completed' ? <CheckCircle size={20} /> :
                       challenge.status === 'active' ? <Hourglass size={20} /> :
                       challenge.status === 'available' ? <Lightbulb size={20} /> :
                       <Brain size={20} />}
                    </AvatarCircle>

                    <FlexGrow>
                      <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 8 }}>
                        <SectionTitle style={{ fontSize: '1rem' }}>
                          {challenge.name}
                        </SectionTitle>
                        <ChipBadge $color={
                          challenge.difficulty === 'easy' ? 'success' :
                          challenge.difficulty === 'medium' ? 'info' :
                          challenge.difficulty === 'hard' ? 'warning' :
                          'error'
                        }>
                          {challenge.difficulty}
                        </ChipBadge>
                      </FlexRow>

                      <SecondaryText style={{ display: 'block', marginBottom: 12, fontSize: '0.875rem' }}>
                        {challenge.description}
                      </SecondaryText>

                      {/* Progress (for active challenges) */}
                      {challenge.status === 'active' && (
                        <div style={{ marginTop: 16, marginBottom: 16 }}>
                          <FlexRow $justify="space-between" style={{ marginBottom: 4 }}>
                            <BodyText>Progress</BodyText>
                            <BodyText>{challenge.progress} / {challenge.totalRequired}</BodyText>
                          </FlexRow>
                          <ProgressBarContainer $height={8}>
                            <ProgressBarFill
                              $value={Math.min((challenge.progress / challenge.totalRequired) * 100, 100)}
                            />
                          </ProgressBarContainer>
                        </div>
                      )}

                      {/* Expiry Date (for active challenges) */}
                      {challenge.status === 'active' && challenge.expiryDate && (
                        <SecondaryText style={{ display: 'block', marginTop: 8, fontSize: '0.875rem' }}>
                          Expires: {new Date(challenge.expiryDate).toLocaleDateString()}
                        </SecondaryText>
                      )}

                      {/* Reward */}
                      <FlexRow $align="center" $gap="4px" style={{ marginTop: 8 }}>
                        <Star size={16} color="#eab308" />
                        <BodyText>
                          Reward: {challenge.reward.points} Points
                          {challenge.reward.badge && ` + "${challenge.reward.badge}" Badge`}
                        </BodyText>
                      </FlexRow>

                      {/* Join Button (for available challenges) */}
                      {challenge.status === 'available' && (
                        <PrimaryButton
                          $small
                          onClick={() => handleJoinChallenge(challenge.id)}
                          style={{ marginTop: 16 }}
                        >
                          Accept Challenge
                        </PrimaryButton>
                      )}
                    </FlexGrow>
                  </FlexRow>
                </ChallengeCard>
              ))}

              {filteredChallenges.length === 0 && (
                <EmptyState>
                  <Info size={40} color="#94a3b8" style={{ marginBottom: 16 }} />
                  <SectionTitle style={{ justifyContent: 'center', marginBottom: 8 }}>
                    No Challenges Found
                  </SectionTitle>
                  <SecondaryText style={{ fontSize: '0.875rem' }}>
                    {challengeFilter === 'completed' ?
                      "You haven't completed any challenges yet." :
                      challengeFilter === 'active' ?
                      "You don't have any active challenges. Try accepting some!" :
                      challengeFilter === 'available' ?
                      "There are no available challenges at the moment. Check back later." :
                      "No challenges available in any category. Check back later."}
                  </SecondaryText>
                </EmptyState>
              )}
            </div>
          )}
        </GlassCard>
      </GlassPanel>
    </div>
  );
};

// Mock data generators for development
const generateMockProfile = (): UserProfile => ({
  id: '1',
  level: 24,
  points: 4850,
  streak: 8,
  nextLevelPoints: 5000,
  tier: 'silver',
  attributes: {
    strength: { level: 28, progress: 65 },
    cardio: { level: 22, progress: 40 },
    flexibility: { level: 20, progress: 75 },
    balance: { level: 18, progress: 30 }
  }
});

const generateMockAchievements = (): Achievement[] => [
  {
    id: '1',
    name: 'Consistency Champion',
    description: 'Maintain a 7-day workout streak',
    icon: 'Lightning',
    completed: true,
    progress: 7,
    totalRequired: 7,
    dateCompleted: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'silver',
    pointValue: 300
  },
  {
    id: '2',
    name: 'Strength Builder',
    description: 'Complete 50 strength workouts',
    icon: 'Trophy',
    completed: false,
    progress: 32,
    totalRequired: 50,
    tier: 'gold',
    pointValue: 500
  },
  {
    id: '3',
    name: 'Nutrition Master',
    description: 'Log 30 high-quality meals',
    icon: 'Star',
    completed: false,
    progress: 22,
    totalRequired: 30,
    tier: 'silver',
    pointValue: 300
  },
  {
    id: '4',
    name: 'First Steps',
    description: 'Complete your first workout',
    icon: 'Medal',
    completed: true,
    progress: 1,
    totalRequired: 1,
    dateCompleted: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'bronze',
    pointValue: 100
  },
  {
    id: '5',
    name: 'Level 10 Milestone',
    description: 'Reach level 10 in your fitness journey',
    icon: 'Trophy',
    completed: true,
    progress: 10,
    totalRequired: 10,
    dateCompleted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    tier: 'silver',
    pointValue: 250
  },
  {
    id: '6',
    name: 'Cardio King',
    description: 'Complete 30 cardio workouts',
    icon: 'Heart',
    completed: false,
    progress: 18,
    totalRequired: 30,
    tier: 'silver',
    pointValue: 300
  }
];

const generateMockGameBoard = (): GameBoard => ({
  currentPosition: 14,
  totalSpaces: 30,
  boardName: 'Wellness Journey',
  currentSpace: {
    id: 'space-14',
    name: 'Wisdom Spring',
    description: 'You have landed on a space that increases your knowledge of health and fitness.',
    type: 'wisdom',
    reward: {
      points: 20,
      message: 'You gained 20 points for fitness wisdom!'
    }
  },
  lastRoll: {
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    value: 4,
    fromPosition: 10,
    toPosition: 14
  },
  nextRollAvailable: true
});

const generateMockChallenges = (): Challenge[] => [
  {
    id: '1',
    name: '30-Day Plank Challenge',
    description: 'Complete a plank exercise every day for 30 days, increasing duration each day.',
    difficulty: 'medium',
    status: 'active',
    progress: 18,
    totalRequired: 30,
    reward: {
      points: 500,
      badge: 'Core Master'
    },
    expiryDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    name: 'Hydration Hero',
    description: 'Drink at least 8 glasses of water every day for 14 days.',
    difficulty: 'easy',
    status: 'completed',
    progress: 14,
    totalRequired: 14,
    reward: {
      points: 300
    }
  },
  {
    id: '3',
    name: 'Strength Summit',
    description: 'Complete 20 strength workouts within 60 days.',
    difficulty: 'hard',
    status: 'available',
    progress: 0,
    totalRequired: 20,
    reward: {
      points: 600,
      badge: 'Strength Summiteer'
    }
  },
  {
    id: '4',
    name: 'Nutrition Challenge',
    description: 'Log 21 consecutive days of balanced nutrition with proper protein intake.',
    difficulty: 'medium',
    status: 'available',
    progress: 0,
    totalRequired: 21,
    reward: {
      points: 450
    }
  }
];

export default GamificationDisplay;
