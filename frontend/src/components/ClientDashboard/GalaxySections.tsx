/**
 * GalaxySections.tsx
 * ==================
 * 
 * Section components for the Gamified Galaxy Dashboard
 * Each section implements the space theme with stellar styling
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// Add missing pulse animation
const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;
import { 
  Star, Activity, TrendingUp, Trophy, Calendar, 
  MessageCircle, User, Settings, Target, Zap,
  Award, Shield, Rocket, Users, Play, Monitor,
  BarChart3, FileText, CreditCard, Package,
  Video, BookOpen, Camera, Headphones
} from 'lucide-react';

// === SHARED STYLED COMPONENTS ===
const SectionCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  
  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 12px 35px rgba(0, 255, 255, 0.1);
  }
`;

const SectionTitle = styled.h2`
  color: #00ffff;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '✦';
    color: #ffd700;
    animation: pulse 2s infinite;
  }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const StatCard = styled(motion.div)`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #00ffff;
    display: block;
  }
  
  .stat-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 0.5rem;
  }
`;

const ProgressOrb = styled.div<{ progress: number }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    #00ffff 0deg,
    #00ffff ${props => props.progress * 3.6}deg,
    rgba(0, 255, 255, 0.2) ${props => props.progress * 3.6}deg,
    rgba(0, 255, 255, 0.2) 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  position: relative;
  
  &::before {
    content: '';
    width: 80%;
    height: 80%;
    background: #0a0a0f;
    border-radius: 50%;
    position: absolute;
  }
  
  .progress-text {
    position: relative;
    z-index: 1;
    color: #00ffff;
    font-weight: bold;
    font-size: 1.2rem;
  }
`;

// === SECTION COMPONENTS ===

// Import the enhanced overview component
import EnhancedOverviewGalaxy from './EnhancedOverviewGalaxy';

export const OverviewGalaxy: React.FC = () => (
  <EnhancedOverviewGalaxy />
);

export const WorkoutUniverse: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <Activity /> Today's Mission
      </SectionTitle>
      <div style={{
        background: 'linear-gradient(135deg, #00ffff, #7851a9)',
        borderRadius: '15px',
        padding: '1.5rem',
        marginBottom: '1rem',
        color: '#fff'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Upper Body Strength</h3>
        <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
          45 minutes • 6 exercises • Intermediate
        </p>
        <motion.button
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '25px',
            padding: '0.75rem 2rem',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
          whileTap={{ scale: 0.95 }}
        >
          Start Workout
        </motion.button>
      </div>
    </SectionCard>
    
    <SectionCard>
      <SectionTitle>
        <Rocket /> Workout History
      </SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[
          { name: 'Leg Day', date: 'Yesterday', duration: '52 min' },
          { name: 'Core Blast', date: '2 days ago', duration: '30 min' },
          { name: 'Cardio HIIT', date: '3 days ago', duration: '25 min' }
        ].map((workout, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: 'rgba(0, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 255, 0.1)'
            }}
          >
            <div>
              <h4 style={{ margin: 0, color: '#00ffff' }}>{workout.name}</h4>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                {workout.date}
              </p>
            </div>
            <span style={{ color: '#ffd700' }}>{workout.duration}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  </motion.div>
);

export const ProgressConstellation: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <TrendingUp /> Progress Tracking
      </SectionTitle>
      
      <StatGrid>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">-5.2</span>
          <div className="stat-label">lbs This Month</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">+3.8</span>
          <div className="stat-label">lbs Muscle Gained</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">16.2</span>
          <div className="stat-label">Body Fat %</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">92%</span>
          <div className="stat-label">Goal Progress</div>
        </StatCard>
      </StatGrid>
    </SectionCard>
    
    <SectionCard>
      <SectionTitle>
        <Target /> Strength Progression
      </SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          { exercise: 'Squat', current: '185 lbs', increase: '+15 lbs' },
          { exercise: 'Bench Press', current: '155 lbs', increase: '+10 lbs' },
          { exercise: 'Deadlift', current: '225 lbs', increase: '+20 lbs' }
        ].map((lift, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: 'rgba(120, 81, 169, 0.1)',
              borderRadius: '10px'
            }}
          >
            <span style={{ color: '#00ffff', fontWeight: 'bold' }}>{lift.exercise}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>{lift.current}</div>
              <div style={{ color: '#00ff88', fontSize: '0.8rem' }}>{lift.increase}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  </motion.div>
);

export const AchievementNebula: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <Award /> Achievement Gallery
      </SectionTitle>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { icon: Shield, title: 'Iron Will', color: '#ffd700', unlocked: true },
          { icon: Target, title: 'Precision', color: '#00ffff', unlocked: true },
          { icon: Rocket, title: 'Explosive', color: '#ff416c', unlocked: true },
          { icon: Users, title: 'Team Player', color: '#888', unlocked: false },
          { icon: Zap, title: 'Lightning', color: '#888', unlocked: false },
          { icon: Star, title: 'Superstar', color: '#888', unlocked: false }
        ].map((achievement, index) => (
          <motion.div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1rem',
              background: achievement.unlocked 
                ? 'rgba(255, 215, 0, 0.1)' 
                : 'rgba(136, 136, 136, 0.1)',
              borderRadius: '10px',
              border: `1px solid ${achievement.color}30`,
              opacity: achievement.unlocked ? 1 : 0.5
            }}
            whileHover={{ scale: achievement.unlocked ? 1.05 : 1 }}
          >
            <achievement.icon size={40} color={achievement.color} />
            <h4 style={{ 
              margin: '0.5rem 0 0 0', 
              color: achievement.unlocked ? achievement.color : '#888',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {achievement.title}
            </h4>
          </motion.div>
        ))}
      </div>
    </SectionCard>
    
    <SectionCard>
      <SectionTitle>
        <Trophy /> Leaderboard
      </SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[
          { rank: 1, name: 'You', score: '2,450 XP', highlight: true },
          { rank: 2, name: 'Sarah M.', score: '2,380 XP' },
          { rank: 3, name: 'Mike R.', score: '2,210 XP' },
          { rank: 4, name: 'Emma K.', score: '2,050 XP' }
        ].map((player, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: player.highlight 
                ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2))'
                : 'rgba(0, 255, 255, 0.05)',
              borderRadius: '8px',
              border: player.highlight 
                ? '2px solid rgba(0, 255, 255, 0.5)'
                : '1px solid rgba(0, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ 
                color: player.highlight ? '#ffd700' : '#00ffff',
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}>
                #{player.rank}
              </span>
              <span style={{ 
                color: player.highlight ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                fontWeight: player.highlight ? 'bold' : 'normal'
              }}>
                {player.name}
              </span>
            </div>
            <span style={{ color: '#ffd700' }}>{player.score}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  </motion.div>
);

// Import the enhanced TimeWarp component
import EnhancedTimeWarp from './EnhancedTimeWarp';

export const TimeWarp: React.FC = () => (
  <EnhancedTimeWarp />
);

export const SocialGalaxy: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <Users /> Community Feed
      </SectionTitle>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          {
            user: 'Sarah M.',
            action: 'completed a workout',
            workout: 'Beast Mode HIIT',
            time: '2 hours ago',
            likes: 12
          },
          {
            user: 'Mike R.',
            action: 'achieved a new PR',
            workout: 'Deadlift: 315 lbs',
            time: '5 hours ago',
            likes: 24
          },
          {
            user: 'Emma K.',
            action: 'shared a tip',
            workout: 'Pre-workout nutrition guide',
            time: '1 day ago',
            likes: 18
          }
        ].map((post, index) => (
          <motion.div
            key={index}
            style={{
              background: 'rgba(30, 30, 60, 0.3)',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid rgba(0, 255, 255, 0.1)'
            }}
            whileHover={{ borderColor: 'rgba(0, 255, 255, 0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>
                  <strong style={{ color: '#00ffff' }}>{post.user}</strong> {post.action}
                </p>
                <p style={{ margin: '0 0 0.5rem 0', color: '#ffd700' }}>{post.workout}</p>
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                  {post.time}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={16} color="#ffd700" />
                <span style={{ color: '#ffd700' }}>{post.likes}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  </motion.div>
);

export const CommunicationHub: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <MessageCircle /> Messages
      </SectionTitle>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          {
            from: 'Coach Sarah',
            message: 'Great job on yesterday\'s workout! Ready for today\'s challenge?',
            time: '10 min ago',
            unread: true
          },
          {
            from: 'Admin',
            message: 'New group fitness classes available this weekend!',
            time: '2 hours ago',
            unread: true
          },
          {
            from: 'Mike R.',
            message: 'Thanks for the motivation during today\'s session!',
            time: '1 day ago',
            unread: false
          }
        ].map((message, index) => (
          <motion.div
            key={index}
            style={{
              background: message.unread 
                ? 'rgba(0, 255, 255, 0.1)' 
                : 'rgba(30, 30, 60, 0.3)',
              borderRadius: '10px',
              padding: '1rem',
              border: message.unread 
                ? '1px solid rgba(0, 255, 255, 0.3)' 
                : '1px solid rgba(0, 255, 255, 0.1)',
              cursor: 'pointer'
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h4 style={{ margin: 0, color: message.unread ? '#00ffff' : 'rgba(255, 255, 255, 0.8)' }}>
                {message.from}
              </h4>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                {message.time}
              </span>
            </div>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
              {message.message}
            </p>
            {message.unread && (
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#00ffff',
                position: 'absolute',
                top: '1rem',
                right: '1rem'
              }} />
            )}
          </motion.div>
        ))}
      </div>
    </SectionCard>
  </motion.div>
);

export const PersonalStarmap: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <User /> Personal Profile
      </SectionTitle>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ffff, #7851a9)',
          margin: '0 auto 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: '#fff'
        }}>
          JD
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#00ffff' }}>John Doe</h3>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>Fitness Enthusiast • Level 8</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00ffff', fontSize: '1.5rem', fontWeight: 'bold' }}>156</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Total Workouts</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>42</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Achievements</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00ff88', fontSize: '1.5rem', fontWeight: 'bold' }}>18</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Month Streak</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ff416c', fontSize: '1.5rem', fontWeight: 'bold' }}>8.2k</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Total XP</div>
        </div>
      </div>
      
      <motion.button
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #00ffff, #7851a9)',
          border: 'none',
          borderRadius: '25px',
          padding: '1rem',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Edit Profile
      </motion.button>
    </SectionCard>
  </motion.div>
);

// === NEW BLUEPRINT-REQUIRED SECTIONS ===

export const PersonalizedVideoHub: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <Video /> Stellar Cinema
      </SectionTitle>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            title: 'Personal Training Sessions',
            trainer: 'Coach Sarah',
            duration: '45 min',
            thumbnail: '🎯',
            type: 'Assigned'
          },
          {
            title: 'Advanced Squat Technique',
            trainer: 'Coach Mike',
            duration: '12 min',
            thumbnail: '🏋️',
            type: 'Recommended'
          },
          {
            title: 'Nutrition Masterclass',
            trainer: 'Dr. Emma',
            duration: '28 min',
            thumbnail: '🥗',
            type: 'AI Suggested'
          }
        ].map((video, index) => (
          <motion.div
            key={index}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.2))',
              borderRadius: '15px',
              padding: '1.5rem',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            whileHover={{ scale: 1.02, borderColor: 'rgba(0, 255, 255, 0.4)' }}
          >
            <div style={{
              width: '100%',
              height: '120px',
              background: 'linear-gradient(45deg, #0a0a0f, #1e1e3f)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              marginBottom: '1rem',
              position: 'relative'
            }}>
              {video.thumbnail}
              <Play 
                size={40} 
                color="#00ffff" 
                style={{
                  position: 'absolute',
                  background: 'rgba(0, 255, 255, 0.2)',
                  borderRadius: '50%',
                  padding: '8px'
                }} 
              />
            </div>
            
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: video.type === 'Assigned' ? 'rgba(255, 215, 0, 0.2)' : 
                         video.type === 'Recommended' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(120, 81, 169, 0.2)',
              color: video.type === 'Assigned' ? '#ffd700' : 
                     video.type === 'Recommended' ? '#00ffff' : '#7851a9',
              padding: '0.25rem 0.75rem',
              borderRadius: '15px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {video.type}
            </div>
            
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#00ffff' }}>{video.title}</h4>
            <p style={{ margin: '0 0 0.5rem 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
              by {video.trainer}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffd700' }}>
              <Monitor size={16} />
              <span style={{ fontSize: '0.8rem' }}>{video.duration}</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      <StatGrid>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">24</span>
          <div className="stat-label">Videos Watched</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">8.5</span>
          <div className="stat-label">Hours This Week</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">12</span>
          <div className="stat-label">Favorites Saved</div>
        </StatCard>
      </StatGrid>
    </SectionCard>
  </motion.div>
);

export const LogsAndTrackers: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <BarChart3 /> Cosmic Journal
      </SectionTitle>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h4 style={{ color: '#00ffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} /> Workout Logs
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { exercise: 'Chest Press', sets: '4x12', weight: '135 lbs', date: 'Today' },
              { exercise: 'Squats', sets: '3x15', weight: '185 lbs', date: 'Yesterday' },
              { exercise: 'Deadlifts', sets: '5x5', weight: '225 lbs', date: '2 days ago' }
            ].map((log, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(0, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid rgba(0, 255, 255, 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ margin: 0, color: '#fff' }}>{log.exercise}</h5>
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                      {log.sets} @ {log.weight}
                    </p>
                  </div>
                  <span style={{ color: '#ffd700', fontSize: '0.8rem' }}>{log.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 style={{ color: '#00ffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={20} /> Nutrition Tracking
          </h4>
          <div style={{
            background: 'rgba(120, 81, 169, 0.1)',
            borderRadius: '15px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <ProgressOrb progress={68}>
                <div className="progress-text">68%</div>
              </ProgressOrb>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                Daily Calorie Goal
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>1,680</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>Consumed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffd700', fontSize: '1.2rem', fontWeight: 'bold' }}>820</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <StatGrid>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">156</span>
          <div className="stat-label">Total Workouts</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">2,340</span>
          <div className="stat-label">Avg Daily Calories</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">7.2</span>
          <div className="stat-label">Hours Sleep Avg</div>
        </StatCard>
        <StatCard whileHover={{ scale: 1.05 }}>
          <span className="stat-value">92%</span>
          <div className="stat-label">Goal Consistency</div>
        </StatCard>
      </StatGrid>
    </SectionCard>
  </motion.div>
);

// Enhanced Galactic Package Components
const CosmicPackageCard = styled(motion.div)<{ $isPopular?: boolean; $theme?: string }>`
  background: ${props => props.$isPopular 
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.2))'
    : 'linear-gradient(135deg, rgba(30, 30, 60, 0.4), rgba(120, 81, 169, 0.2), rgba(0, 255, 255, 0.1))'};
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 2rem;
  border: ${props => props.$isPopular 
    ? '2px solid rgba(255, 215, 0, 0.6)' 
    : '1px solid rgba(0, 255, 255, 0.3)'};
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.03);
    border-color: ${props => props.$isPopular ? 'rgba(255, 215, 0, 1)' : 'rgba(0, 255, 255, 0.8)'};
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.4),
      0 0 40px ${props => props.$isPopular ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 255, 255, 0.3)'};
    
    &::before {
      left: 100%;
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(120, 81, 169, 0.1) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const PopularBadge = styled(motion.div)`
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #0a0a0f;
  padding: 0.5rem 1.5rem;
  border-radius: 25px;
  font-size: 0.8rem;
  font-weight: bold;
  z-index: 2;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  
  &::before {
    content: '⭐';
    margin-right: 0.5rem;
  }
`;

const PackageTitle = styled.h5`
  margin: 0 0 1rem 0;
  color: ${props => props.color || '#00ffff'};
  font-size: 1.4rem;
  font-weight: 600;
  position: relative;
  z-index: 1;
`;

const PriceDisplay = styled.div`
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
  
  .price-main {
    font-size: 2.5rem;
    font-weight: bold;
    color: #fff;
    text-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  }
  
  .price-period {
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.1rem;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  position: relative;
  z-index: 1;
  
  li {
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    
    &::before {
      content: '✦';
      color: #00ffff;
      font-size: 0.8rem;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
    }
  }
`;

const CurrentPackageCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.3), rgba(255, 215, 0, 0.1));
  backdrop-filter: blur(20px);
  border-radius: 25px;
  padding: 2.5rem;
  margin-bottom: 3rem;
  border: 2px solid rgba(0, 255, 255, 0.4);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.1) 0%, transparent 60%),
      radial-gradient(circle at 70% 70%, rgba(255, 215, 0, 0.1) 0%, transparent 60%);
    pointer-events: none;
    animation: ${pulse} 6s ease-in-out infinite;
  }
`;

const StatusIndicator = styled.div`
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '●';
    color: #00ff88;
    font-size: 0.8rem;
    animation: ${pulse} 2s infinite;
  }
`;

// Import GlowButton
import GlowButton from '../ui/buttons/GlowButton';

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

export const PackageSubscription: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <SectionCard>
      <SectionTitle>
        <Package /> Galactic Marketplace
      </SectionTitle>
      
      {/* Current Active Package */}
      <CurrentPackageCard
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ 
              margin: '0 0 0.75rem 0', 
              color: '#00ffff', 
              fontSize: '1.8rem',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
            }}>
              Premium Galaxy Pass
            </h3>
            <p style={{ 
              margin: 0, 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '1.1rem' 
            }}>
              Unlimited access to all stellar training sessions
            </p>
          </div>
          <StatusIndicator>
            ACTIVE
          </StatusIndicator>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#00ffff', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.8)'
            }}>∞</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Sessions Left</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#ffd700', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(255, 215, 0, 0.8)'
            }}>23</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Days Remaining</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#00ff88', 
              fontSize: '2rem', 
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 136, 0.8)'
            }}>$49</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>Monthly</div>
          </div>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <GlowButton
            text="Manage Subscription"
            theme="info"
            size="medium"
            style={{
              width: '100%',
              borderRadius: '25px',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          />
        </div>
      </CurrentPackageCard>
      
      {/* Available Packages Section */}
      <div style={{ position: 'relative' }}>
        <h4 style={{ 
          color: '#00ffff', 
          marginBottom: '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          fontSize: '1.4rem',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
        }}>
          <CreditCard size={24} /> Available Cosmic Packages
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '2rem' 
        }}>
          {[
            {
              name: 'Stellar Starter',
              price: '$19',
              period: '/month',
              features: ['4 Sessions/month', 'Basic tracking', 'Email support', 'Mobile app access'],
              popular: false,
              theme: 'primary'
            },
            {
              name: 'Cosmic Crusher',
              price: '$39',
              period: '/month',
              features: ['12 Sessions/month', 'Advanced analytics', 'Priority support', 'Nutrition guidance', 'Progress coaching'],
              popular: true,
              theme: 'warning'
            },
            {
              name: 'Galaxy Guardian',
              price: '$79',
              period: '/month',
              features: ['Unlimited sessions', 'Personal trainer', '24/7 support', 'Custom meal plans', 'Progress coaching', 'VIP access'],
              popular: false,
              theme: 'secondary'
            }
          ].map((pkg, index) => (
            <CosmicPackageCard
              key={index}
              $isPopular={pkg.popular}
              $theme={pkg.theme}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * (index + 1) }}
              whileHover={{ y: -8 }}
            >
              {pkg.popular && (
                <PopularBadge
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  MOST POPULAR
                </PopularBadge>
              )}
              
              <PackageTitle color={pkg.popular ? '#ffd700' : '#00ffff'}>
                {pkg.name}
              </PackageTitle>
              
              <PriceDisplay>
                <span className="price-main">{pkg.price}</span>
                <span className="price-period">{pkg.period}</span>
              </PriceDisplay>
              
              <FeatureList>
                {pkg.features.map((feature, fIndex) => (
                  <motion.li 
                    key={fIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + (fIndex * 0.1) }}
                  >
                    {feature}
                  </motion.li>
                ))}
              </FeatureList>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <GlowButton
                text={pkg.popular ? 'Upgrade Now' : 'Select Plan'}
                theme={pkg.popular ? 'cosmic' : 'primary'}
                size="medium"
                style={{
                width: '100%',
                borderRadius: '20px',
                padding: '0.875rem 1.5rem',
                fontSize: '1rem',
                  fontWeight: 'bold'
                  }}
                />
              </div>
            </CosmicPackageCard>
          ))}
        </div>
      </div>
    </SectionCard>
  </motion.div>
);