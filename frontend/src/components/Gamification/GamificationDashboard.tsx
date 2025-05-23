import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Trophy,
  Award,
  Star,
  Zap,
  Users,
  Heart,
  CheckCircle,
  Clock, 
  Calendar,
  Map
} from 'lucide-react';

// Import custom hooks for MCP integration
import { useAuth } from '../../context/AuthContext';
import useGamificationMcp from '../../hooks/useGamificationMcp';

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.columns || 1}, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(30, 30, 60, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatCard = styled.div`
  background: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
`;

const StatIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${(props) => props.color ? `${props.color}22` : 'rgba(0, 255, 255, 0.15)'};
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Button = styled.button<{ active?: boolean }>`
  background: ${(props) => props.active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(30, 30, 60, 0.5)'};
  border: 1px solid ${(props) => props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.1)'};
  color: ${(props) => props.active ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const IconButton = styled.button`
  background: rgba(0, 255, 255, 0.1);
  border: none;
  color: #00ffff;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.2);
  }
`;

const AchievementCard = styled.div`
  background: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.05);
  }
`;

const AchievementIcon = styled.div<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${(props) => props.color ? `${props.color}22` : 'rgba(0, 255, 255, 0.15)'};
`;

const AchievementContent = styled.div`
  flex: 1;
`;

const AchievementTitle = styled.h4`
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: #ffffff;
`;

const AchievementDescription = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
`;

const Badge = styled.span<{ color?: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  background-color: ${(props) => props.color ? `${props.color}22` : 'rgba(0, 255, 255, 0.15)'};
  color: ${(props) => props.color || '#00ffff'};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin: 0.5rem 0;
`;

const ProgressFill = styled.div<{ value: number; color?: string }>`
  height: 100%;
  width: ${(props) => `${props.value}%`};
  background: ${(props) => props.color || 'linear-gradient(90deg, #00ffff, #7851a9)'};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const QuestContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const GameboardCard = styled.div`
  width: 100%;
  aspect-ratio: 1;
  background: rgba(30, 30, 60, 0.5);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
`;

const GameboardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('/game-board-bg.jpg') center center/cover no-repeat;
  opacity: 0.15;
  z-index: 0;
`;

const PlayerToken = styled.div<{ position: number }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 1.2rem;
  position: absolute;
  bottom: ${props => 20 + (props.position % 10) * 10}%;
  left: ${props => 20 + Math.floor(props.position / 10) * 10}%;
  z-index: 3;
  transition: all 0.5s ease;
`;

const DiceContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const DiceButton = styled.button`
  background: rgba(120, 81, 169, 0.2);
  border: 1px solid #7851a9;
  color: #ffffff;
  border-radius: 6px;
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(120, 81, 169, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/**
 * GamificationDashboard Component
 * 
 * A comprehensive dashboard for gamification features including:
 * - Progress and achievements
 * - Leaderboard
 * - Game board
 * - Kindness quests
 * - Challenges
 */
const GamificationDashboard: React.FC = () => {
  const { user } = useAuth();
  const [rollingDice, setRollingDice] = useState<boolean>(false);
  
  // Use the gamification MCP hook
  const { 
    profile, 
    achievements, 
    challenges, 
    kindnessQuests, 
    boardPosition, 
    loading, 
    error, 
    rollDice,
    joinChallenge,
    completeQuest
  } = useGamificationMcp();
  

  
  // Handle rolling the dice on the game board
  const handleRollDice = async (useBoost: boolean = false) => {
    if (rollingDice) return;
    
    setRollingDice(true);
    
    await rollDice(useBoost);
    
    // Add a slight delay for animation purposes
    setTimeout(() => {
      setRollingDice(false);
    }, 1500);
  };
  
  // Handle joining a challenge
  const handleJoinChallenge = async (challengeId: string) => {
    return joinChallenge(challengeId);
  };
  
  // Handle completing a kindness quest
  const handleCompleteQuest = async (questId: string) => {
    return completeQuest(questId);
  };
  
  // If loading, show loading state
  if (loading) {
    return (
      <Container>
        <Card style={{ alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <div className="loading-spinner" style={{ width: '60px', height: '60px' }}></div>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            Loading gamification data...
          </p>
        </Card>
      </Container>
    );
  }
  
  // If error, show error state
  if (error) {
    return (
      <Container>
        <Card style={{ alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <Trophy size={30} color="#FF6B6B" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff' }}>Error Loading Gamification Data</h3>
          <p style={{ margin: '0 0 1.5rem', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
            {error}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      </Container>
    );
  }
  
  // If no profile, show error state
  if (!profile) {
    return (
      <Container>
        <Card style={{ alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <Trophy size={30} color="#FF6B6B" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#ffffff' }}>No Gamification Profile Found</h3>
          <p style={{ margin: '0 0 1.5rem', color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
            You don't have a gamification profile yet. Complete a workout to get started!
          </p>
          <Button onClick={() => window.location.href = '/workout-tracker'}>
            Go to Workout Tracker
          </Button>
        </Card>
      </Container>
    );
  }
  
  return (
    <Container>
      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trophy size={20} />
            Gamification Level & Stats
          </CardTitle>
        </CardHeader>
        
        <Grid columns={4}>
          <StatCard>
            <StatIcon color="#00ffff">
              <Trophy size={24} color="#00ffff" />
            </StatIcon>
            <StatValue>Level {profile.level}</StatValue>
            <StatLabel>Current Level</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon color="#7851a9">
              <Zap size={24} color="#7851a9" />
            </StatIcon>
            <StatValue>{profile.points}</StatValue>
            <StatLabel>Total Points</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon color="#FF6B6B">
              <Heart size={24} color="#FF6B6B" />
            </StatIcon>
            <StatValue>{profile.kindnessScore}</StatValue>
            <StatLabel>Kindness Score</StatLabel>
          </StatCard>
          
          <StatCard>
            <StatIcon color="#4CAF50">
              <Award size={24} color="#4CAF50" />
            </StatIcon>
            <StatValue>{profile.challengesCompleted}</StatValue>
            <StatLabel>Challenges</StatLabel>
          </StatCard>
        </Grid>
      </Card>
      
      {/* Game Board & Achievements */}
      <Grid columns={2}>
        <Card>
          <CardHeader>
            <CardTitle>
              <Map size={20} />
              The Wholesome Warrior's Path
            </CardTitle>
          </CardHeader>
          
          <GameboardCard>
            <GameboardOverlay />
            <PlayerToken position={boardPosition.position || 0}>
              {user?.firstName?.[0] || 'U'}
            </PlayerToken>
            
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: 'auto' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#ffffff' }}>
                Position: {boardPosition.position || 0}
              </h4>
              {boardPosition.lastRoll && (
                <p style={{ margin: '0 0 1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Last roll: {boardPosition.lastRoll}
                </p>
              )}
              
              <DiceContainer>
                <DiceButton 
                  onClick={() => handleRollDice(false)} 
                  disabled={rollingDice || !boardPosition.canRoll}
                >
                  {rollingDice ? 'Rolling...' : 'Roll Dice'}
                </DiceButton>
                
                {profile.boosts > 0 && (
                  <DiceButton 
                    onClick={() => handleRollDice(true)} 
                    disabled={rollingDice || !boardPosition.canRoll}
                    style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', borderColor: '#FF6B6B' }}
                  >
                    <Zap size={16} color="#FF6B6B" />
                    Boost ({profile.boosts})
                  </DiceButton>
                )}
              </DiceContainer>
              
              {!boardPosition.canRoll && boardPosition.nextRollTime && (
                <p style={{ margin: '0.5rem 0 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                  Next roll available in {new Date(boardPosition.nextRollTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          </GameboardCard>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Award size={20} />
              Achievements
            </CardTitle>
          </CardHeader>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {achievements.slice(0, 4).map((achievement) => (
              <AchievementCard key={achievement.id}>
                <AchievementIcon color={achievement.color || '#00ffff'}>
                  {achievement.icon === 'heart' ? (
                    <Heart size={24} color={achievement.color || '#00ffff'} />
                  ) : achievement.icon === 'users' ? (
                    <Users size={24} color={achievement.color || '#00ffff'} />
                  ) : (
                    <Award size={24} color={achievement.color || '#00ffff'} />
                  )}
                </AchievementIcon>
                
                <AchievementContent>
                  <AchievementTitle>{achievement.name}</AchievementTitle>
                  <AchievementDescription>{achievement.description}</AchievementDescription>
                  
                  {achievement.completed ? (
                    <Badge color="#4CAF50">Completed</Badge>
                  ) : (
                    <>
                      <ProgressBar>
                        <ProgressFill 
                          value={achievement.progress} 
                          color={achievement.color} 
                        />
                      </ProgressBar>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        <span>{achievement.progress}% complete</span>
                      </div>
                    </>
                  )}
                </AchievementContent>
              </AchievementCard>
            ))}
            
            {achievements.length > 4 && (
              <Button style={{ alignSelf: 'center' }}>
                View All Achievements
              </Button>
            )}
          </div>
        </Card>
      </Grid>
      
      {/* Challenges & Quests */}
      <Grid columns={2}>
        <Card>
          <CardHeader>
            <CardTitle>
              <Star size={20} />
              Active Challenges
            </CardTitle>
          </CardHeader>
          
          <QuestContainer>
            {challenges.map((challenge) => (
              <AchievementCard key={challenge.id}>
                <AchievementIcon color="#7851a9">
                  <Star size={24} color="#7851a9" />
                </AchievementIcon>
                
                <AchievementContent>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AchievementTitle>{challenge.name}</AchievementTitle>
                    <Badge color="#7851a9">{challenge.participants} Participants</Badge>
                  </div>
                  <AchievementDescription>{challenge.description}</AchievementDescription>
                  
                  {challenge.joined ? (
                    <>
                      <ProgressBar>
                        <ProgressFill value={challenge.progress} color="#7851a9" />
                      </ProgressBar>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        <span>{challenge.progress}% complete</span>
                        <span>Ends: {new Date(challenge.endDate).toLocaleDateString()}</span>
                      </div>
                    </>
                  ) : (
                    <Button 
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                      onClick={() => handleJoinChallenge(challenge.id)}
                    >
                      Join Challenge
                    </Button>
                  )}
                </AchievementContent>
              </AchievementCard>
            ))}
            
            {challenges.length === 0 && (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)' 
              }}>
                No active challenges available.
              </div>
            )}
          </QuestContainer>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Heart size={20} />
              Kindness Quests
            </CardTitle>
          </CardHeader>
          
          <QuestContainer>
            {kindnessQuests.map((quest) => (
              <AchievementCard key={quest.id}>
                <AchievementIcon color="#FF6B6B">
                  <Heart size={24} color="#FF6B6B" />
                </AchievementIcon>
                
                <AchievementContent>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AchievementTitle>{quest.name}</AchievementTitle>
                    <Badge color="#FF6B6B">+{quest.points} Points</Badge>
                  </div>
                  <AchievementDescription>{quest.description}</AchievementDescription>
                  
                  {quest.completed ? (
                    <Badge color="#4CAF50" style={{ marginTop: '0.5rem' }}>
                      <CheckCircle size={12} style={{ marginRight: '0.25rem' }} /> Completed
                    </Badge>
                  ) : (
                    <Button 
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                      onClick={() => handleCompleteQuest(quest.id)}
                    >
                      Complete Quest
                    </Button>
                  )}
                </AchievementContent>
              </AchievementCard>
            ))}
            
            {kindnessQuests.length === 0 && (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: 'rgba(255, 255, 255, 0.7)' 
              }}>
                No kindness quests available.
              </div>
            )}
          </QuestContainer>
        </Card>
      </Grid>
    </Container>
  );
};

export default GamificationDashboard;