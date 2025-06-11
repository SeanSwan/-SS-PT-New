import React from 'react';
import { 
  Trophy, 
  Award, 
  Star, 
  Activity, 
  Flame, 
  Target, 
  TrendingUp, 
  Clock,
  Users,
  Share,
  Heart
} from 'lucide-react';
import ClientMainContent, { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter, 
  Grid, 
  Flex,
  ProgressBar,
  Badge,
  Button
} from '../ClientMainContent';

// Mock achievements data
const achievements = [
  {
    id: 1,
    title: 'Consistent Athlete',
    description: 'Complete 10 workouts in a row without missing a day',
    progress: 7,
    total: 10,
    icon: Activity,
    color: '#00FFFF',
  },
  {
    id: 2,
    title: 'Dance Master',
    description: 'Participate in 5 different dance routines',
    progress: 3,
    total: 5,
    icon: Star,
    color: '#FFA500',
  },
  {
    id: 3,
    title: 'Strength Builder',
    description: 'Increase your strength score by 20%',
    progress: 15,
    total: 20,
    icon: TrendingUp,
    color: '#4CAF50',
  },
  {
    id: 4,
    title: 'Creative Expressionist',
    description: 'Share 3 creative works in the community',
    progress: 1,
    total: 3,
    icon: Heart,
    color: '#FF6B6B',
  },
  {
    id: 5,
    title: 'Social Butterfly',
    description: 'Connect with 5 other community members',
    progress: 2,
    total: 5,
    icon: Users,
    color: '#7851A9',
  },
];

// Mock rewards data
const rewards = [
  {
    id: 101,
    title: '15% Off Next Package',
    description: 'Discount on your next training package purchase',
    cost: 500,
    icon: Trophy,
    available: true,
  },
  {
    id: 102,
    title: 'Free Dance Workshop',
    description: 'Attend a premium dance workshop at no cost',
    cost: 750,
    icon: Award,
    available: false,
  },
  {
    id: 103,
    title: 'Custom Workout Plan',
    description: 'Receive a personalized workout plan based on your goals',
    cost: 1000,
    icon: Target,
    available: true,
  },
];

// Mock leaderboard data
const leaderboard = [
  { id: 201, name: 'Jessica T.', points: 1250, position: 1, avatar: null },
  { id: 202, name: 'Michael R.', points: 1120, position: 2, avatar: null },
  { id: 203, name: 'Sarah K.', points: 980, position: 3, avatar: null },
  { id: 204, name: 'David L.', points: 870, position: 4, avatar: null },
  { id: 205, name: 'Current User', points: 750, position: 5, avatar: null, isCurrentUser: true },
];

/**
 * GamificationSection Component
 * 
 * Displays the client's achievements, rewards, challenges, and leaderboard.
 * Implements an engaging, game-like interface to encourage participation.
 */
const GamificationSection: React.FC = () => {
  // Current user's stats
  const userStats = {
    level: 12,
    currentPoints: 750,
    nextLevelPoints: 1000,
    totalAchievements: 15,
    completedAchievements: 8,
  };

  // Calculate progress percentage for level
  const levelProgress = (userStats.currentPoints / userStats.nextLevelPoints) * 100;

  return (
    <ClientMainContent
      title="Achievements & Rewards"
      actions={<Button variant="outline">View History</Button>}
    >
      {/* User Level Card */}
      <Card>
        <CardContent>
          <Flex>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginRight: '1.5rem'
            }}>
              {userStats.level}
            </div>
            
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 0.5rem' }}>Level {userStats.level}</h2>
              <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)' }}>
                {userStats.currentPoints} / {userStats.nextLevelPoints} XP to Level {userStats.level + 1}
              </p>
              
              <ProgressBar value={userStats.currentPoints} max={userStats.nextLevelPoints} />
              
              <p style={{ textAlign: 'right', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                {Math.round(levelProgress)}% Complete
              </p>
            </div>
          </Flex>
          
          <Flex style={{ marginTop: '1.5rem', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {userStats.completedAchievements}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Achievements</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {userStats.currentPoints}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Points</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                5
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Leaderboard Position</div>
            </div>
          </Flex>
        </CardContent>
      </Card>

      {/* Two-column layout for achievements and rewards */}
      <Grid columns={2}>
        {/* Achievements Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Challenges</CardTitle>
            <Badge color="var(--secondary-color)">
              {userStats.completedAchievements}/{userStats.totalAchievements} Completed
            </Badge>
          </CardHeader>
          
          <CardContent>
            {achievements.map((achievement) => (
              <Flex 
                key={achievement.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '0.5rem',
                }}
                align="flex-start"
              >
                <div style={{ 
                  padding: '0.75rem', 
                  borderRadius: '50%', 
                  backgroundColor: `${achievement.color}22`,
                  marginRight: '0.75rem'
                }}>
                  {React.createElement(achievement.icon, { 
                    size: 20, 
                    color: achievement.color 
                  })}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{achievement.title}</h3>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {achievement.description}
                  </p>
                  
                  <ProgressBar value={achievement.progress} max={achievement.total} color={achievement.color} />
                  
                  <p style={{ 
                    textAlign: 'right', 
                    margin: '0.25rem 0 0', 
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}>
                    {achievement.progress} / {achievement.total}
                  </p>
                </div>
              </Flex>
            ))}
          </CardContent>
          
          <CardFooter>
            <Button variant="outline">View All Challenges</Button>
          </CardFooter>
        </Card>

        {/* Rewards Card */}
        <div>
          {/* Rewards */}
          <Card style={{ marginBottom: '1rem' }}>
            <CardHeader>
              <CardTitle>Available Rewards</CardTitle>
              <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                {userStats.currentPoints} Points Available
              </div>
            </CardHeader>
            
            <CardContent>
              {rewards.map((reward) => (
                <Flex 
                  key={reward.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.5rem',
                  }}
                  align="flex-start"
                >
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    marginRight: '0.75rem'
                  }}>
                    {React.createElement(reward.icon, { 
                      size: 20, 
                      color: 'var(--primary-color)' 
                    })}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{reward.title}</h3>
                    <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {reward.description}
                    </p>
                  </div>
                  
                  <Button 
                    variant={reward.available && userStats.currentPoints >= reward.cost ? "primary" : "outline"}
                    disabled={!reward.available || userStats.currentPoints < reward.cost}
                  >
                    {reward.cost} Points
                  </Button>
                </Flex>
              ))}
            </CardContent>
          </Card>
          
          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Community Leaderboard</CardTitle>
              <Button variant="text">This Month</Button>
            </CardHeader>
            
            <CardContent>
              {leaderboard.map((user) => (
                <Flex 
                  key={user.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.5rem',
                    backgroundColor: user.isCurrentUser ? 'rgba(0, 255, 255, 0.05)' : 'transparent',
                  }}
                >
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    marginRight: '0.75rem',
                    color: user.position <= 3 ? 'var(--primary-color)' : 'var(--text-muted)',
                  }}>
                    {user.position}
                  </div>
                  
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '0.75rem',
                  }}>
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                      />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: '0', 
                      fontSize: '0.9rem',
                      fontWeight: user.isCurrentUser ? 'bold' : 'normal',
                    }}>
                      {user.name}
                      {user.isCurrentUser && (
                        <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          (You)
                        </span>
                      )}
                    </h3>
                  </div>
                  
                  <div style={{ 
                    fontWeight: 'bold',
                    color: user.position <= 3 ? 'var(--primary-color)' : 'var(--text)',
                  }}>
                    {user.points} pts
                  </div>
                </Flex>
              ))}
            </CardContent>
            
            <CardFooter>
              <Button variant="outline">View Full Leaderboard</Button>
            </CardFooter>
          </Card>
        </div>
      </Grid>
    </ClientMainContent>
  );
};

export default GamificationSection;