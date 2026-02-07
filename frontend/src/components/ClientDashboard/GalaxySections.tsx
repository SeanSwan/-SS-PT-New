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
import { useAuth } from '../../hooks/useAuth';
import { useCurrentWorkout } from '../../hooks/useCurrentWorkout';
import { useNutritionPlan } from '../../hooks/useNutritionPlan';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useClientStats } from '../../hooks/useClientStats';
import { useSessionCredits } from '../UniversalMasterSchedule/hooks/useSessionCredits';
import { useNavigate } from 'react-router-dom';

// Add missing pulse animation
const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;
import {
  Activity,
  Award,
  BarChart3,
  CreditCard,
  Loader,
  MessageCircle,
  Package,
  Rocket,
  Target,
  Trophy,
  User,
  Users,
  Video
} from 'lucide-react';
import ClientProgressPanel from '../DashBoard/Pages/client-dashboard/progress/ClientProgressPanel';

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
    content: '*';
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

export const WorkoutUniverse: React.FC = () => {
  const { user } = useAuth();
  // Only fetch client-specific data if user is a client (prevents 404 for admin/trainer users)
  const isClient = user?.role === 'client';
  const { data: workout, isLoading, error } = useCurrentWorkout(user?.id, isClient);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SectionCard>
        <SectionTitle>
          <Activity /> Today's Mission
        </SectionTitle>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading workout plan...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#ff6b6b' }}>
            <p>{error}</p>
          </div>
        ) : workout ? (
          <div style={{
            background: 'linear-gradient(135deg, #00ffff, #7851a9)',
            borderRadius: '15px',
            padding: '1.5rem',
            marginBottom: '1rem',
            color: '#fff'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>{workout.name}</h3>
            <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
              {workout.duration} | {workout.days?.[0]?.exercises?.length || 0} exercises | {workout.difficulty ? `Level ${workout.difficulty}` : 'Custom'}
            </p>
            {workout.description && (
              <p style={{ margin: '0 0 1rem 0', opacity: 0.8, fontSize: '0.9rem' }}>
                {workout.description}
              </p>
            )}
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
        ) : (
          <div style={{
            background: 'rgba(0, 255, 255, 0.05)',
            borderRadius: '15px',
            padding: '2rem',
            textAlign: 'center',
            border: '1px dashed rgba(0, 255, 255, 0.3)'
          }}>
            <Rocket size={48} color="rgba(0, 255, 255, 0.5)" style={{ marginBottom: '1rem' }} />
            <h4 style={{ color: '#00ffff', margin: '0 0 0.5rem 0' }}>No Workout Plan Yet</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.9rem' }}>
              Your trainer will create one after your assessment.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle>
          <Rocket /> Workout History
        </SectionTitle>
        {workout?.days && workout.days.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workout.days.slice(0, 3).map((day, index) => (
              <div
                key={day.id || index}
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
                  <h4 style={{ margin: 0, color: '#00ffff' }}>{day.name || `Day ${day.dayNumber}`}</h4>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                    {day.exercises?.length || 0} exercises
                  </p>
                </div>
                <span style={{ color: '#ffd700' }}>Day {day.dayNumber}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255, 255, 255, 0.5)' }}>
            <p>Complete sessions to build your workout history!</p>
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
};

export const ProgressConstellation: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <ClientProgressPanel />
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
      <div
        style={{
          background: 'rgba(255, 215, 0, 0.08)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px dashed rgba(255, 215, 0, 0.35)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}
      >
        Complete sessions and hit milestones to unlock achievements.
      </div>
    </SectionCard>
    
    <SectionCard>
      <SectionTitle>
        <Trophy /> Leaderboard
      </SectionTitle>
      <div
        style={{
          background: 'rgba(0, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px dashed rgba(0, 255, 255, 0.3)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}
      >
        Leaderboards will appear once community challenges go live.
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
      <div
        style={{
          background: 'rgba(30, 30, 60, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px dashed rgba(0, 255, 255, 0.2)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}
      >
        Community updates will appear here once social features are enabled.
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
      <div
        style={{
          background: 'rgba(0, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px dashed rgba(0, 255, 255, 0.3)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}
      >
        No messages yet. Your trainer will contact you here once your program starts.
      </div>
    </SectionCard>
  </motion.div>
);

export const PersonalStarmap: React.FC = () => {
  const { user } = useAuth();
  // Only fetch client-specific data if user is a client (prevents 404 for admin/trainer users)
  const isClient = user?.role === 'client';
  const { data: clientStats } = useClientStats(user?.id, isClient);
  const displayName =
    user?.spiritName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    'SwanStudios Member';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = user?.role ? user.role.toUpperCase() : 'MEMBER';
  const totalWorkouts =
    typeof clientStats?.totalWorkouts === 'number' ? String(clientStats.totalWorkouts) : '--';
  const sleepAvg =
    typeof clientStats?.sleepAvg === 'number' ? clientStats.sleepAvg.toFixed(1) : '--';
  const goalConsistency =
    typeof clientStats?.goalConsistency === 'number' ? `${clientStats.goalConsistency}%` : '--';

  return (
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
          <div
            style={{
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
            }}
          >
            {initials}
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#00ffff' }}>{displayName}</h3>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>Role: {roleLabel}</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ffff', fontSize: '1.5rem', fontWeight: 'bold' }}>{totalWorkouts}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Total Workouts</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>{sleepAvg}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Hours Sleep Avg</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ff88', fontSize: '1.5rem', fontWeight: 'bold' }}>{goalConsistency}</div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Goal Consistency</div>
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
};

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
      <div
        style={{
          background: 'rgba(0, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px dashed rgba(0, 255, 255, 0.3)',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)'
        }}
      >
        No videos assigned yet. Your trainer will share guidance here.
      </div>
    </SectionCard>
  </motion.div>
);

export const LogsAndTrackers: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  // Only fetch client-specific data if user is a client (prevents 404 for admin/trainer users)
  const isClient = user?.role === 'client';
  const { data: nutritionPlan, isLoading: nutritionLoading } = useNutritionPlan(userId, isClient);
  const {
    data: workoutHistory,
    isLoading: historyLoading,
    error: historyError
  } = useWorkoutHistory(userId, 3, isClient);
  const { data: clientStats } = useClientStats(userId, isClient);

  const formatLogDate = (value?: string) => {
    if (!value) {
      return 'Unknown';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((todayStart.getTime() - targetStart.getTime()) / 86400000);
    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const totalWorkoutsValue =
    typeof clientStats?.totalWorkouts === 'number' ? String(clientStats.totalWorkouts) : '--';
  const sleepAvgValue =
    typeof clientStats?.sleepAvg === 'number' ? clientStats.sleepAvg.toFixed(1) : '--';
  const goalConsistencyValue =
    typeof clientStats?.goalConsistency === 'number' ? `${clientStats.goalConsistency}%` : '--';

  // Calculate nutrition progress
  const dailyCalories = nutritionPlan?.dailyCalories || 2500;
  // For now, we'll show the target as the "consumed" since we don't have tracking yet
  // In a full implementation, this would come from a food log
  const consumed = nutritionPlan ? Math.round(dailyCalories * 0.68) : 0; // Placeholder until food logging
  const remaining = dailyCalories - consumed;
  const progressPercent = nutritionPlan ? Math.round((consumed / dailyCalories) * 100) : 0;

  return (
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
              {historyLoading ? (
                <div
                  style={{
                    background: 'rgba(0, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ margin: '0.5rem 0 0 0' }}>Loading workout history...</p>
                </div>
              ) : historyError ? (
                <div
                  style={{
                    background: 'rgba(255, 107, 107, 0.1)',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid rgba(255, 107, 107, 0.2)',
                    color: '#ff6b6b'
                  }}
                >
                  {historyError}
                </div>
              ) : workoutHistory && workoutHistory.length > 0 ? (
                workoutHistory.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: 'rgba(0, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid rgba(0, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h5 style={{ margin: 0, color: '#fff' }}>{log.name || 'Workout'}</h5>
                        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                          {log.duration || `${log.exercises || 0} exercises`}
                        </p>
                      </div>
                      <span style={{ color: '#ffd700', fontSize: '0.8rem' }}>{formatLogDate(log.date)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    background: 'rgba(0, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid rgba(0, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  No workout history yet.
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#00ffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} /> Nutrition Tracking
            </h4>
            {nutritionLoading ? (
              <div style={{
                background: 'rgba(120, 81, 169, 0.1)',
                borderRadius: '15px',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <Loader className="spin" size={32} style={{ color: '#00ffff' }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>Loading nutrition data...</p>
              </div>
            ) : nutritionPlan ? (
              <div style={{
                background: 'rgba(120, 81, 169, 0.1)',
                borderRadius: '15px',
                padding: '1.5rem',
                marginBottom: '1rem'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <ProgressOrb progress={progressPercent}>
                    <div className="progress-text">{progressPercent}%</div>
                  </ProgressOrb>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                    Daily Calorie Goal
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>{consumed.toLocaleString()}</div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>Consumed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ffd700', fontSize: '1.2rem', fontWeight: 'bold' }}>{remaining.toLocaleString()}</div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>Remaining</div>
                  </div>
                </div>

                {/* Macro breakdown */}
                {nutritionPlan.macros && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                      <div>
                        <div style={{ color: '#ff6b6b', fontSize: '1rem', fontWeight: 'bold' }}>{nutritionPlan.macros.protein}g</div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>Protein</div>
                      </div>
                      <div>
                        <div style={{ color: '#4ecdc4', fontSize: '1rem', fontWeight: 'bold' }}>{nutritionPlan.macros.carbs}g</div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>Carbs</div>
                      </div>
                      <div>
                        <div style={{ color: '#ffe66d', fontSize: '1rem', fontWeight: 'bold' }}>{nutritionPlan.macros.fat}g</div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>Fat</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(120, 81, 169, 0.1)',
                borderRadius: '15px',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <Target size={40} style={{ color: 'rgba(255, 255, 255, 0.3)', marginBottom: '0.5rem' }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                  No nutrition plan assigned yet
                </p>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                  Your trainer will create one for you
                </p>
              </div>
            )}
          </div>
        </div>

        <StatGrid>
            <StatCard whileHover={{ scale: 1.05 }}>
              <span className="stat-value">{totalWorkoutsValue}</span>
              <div className="stat-label">Total Workouts</div>
            </StatCard>
          <StatCard whileHover={{ scale: 1.05 }}>
            <span className="stat-value">{nutritionPlan?.dailyCalories?.toLocaleString() || '--'}</span>
            <div className="stat-label">Daily Calorie Target</div>
          </StatCard>
            <StatCard whileHover={{ scale: 1.05 }}>
              <span className="stat-value">{sleepAvgValue}</span>
              <div className="stat-label">Hours Sleep Avg</div>
            </StatCard>
            <StatCard whileHover={{ scale: 1.05 }}>
              <span className="stat-value">{goalConsistencyValue}</span>
              <div className="stat-label">Goal Consistency</div>
            </StatCard>
        </StatGrid>
      </SectionCard>
    </motion.div>
  );
};

// Enhanced Galactic Package Components
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
    content: '*';
    color: #00ff88;
    font-size: 0.8rem;
    animation: ${pulse} 2s infinite;
  }
`;

// Import GlowButton
import GlowButton from '../ui/buttons/GlowButton';

export const PackageSubscription: React.FC = () => {
  const navigate = useNavigate();
  const { data: credits, isLoading, error } = useSessionCredits(true);
  const sessionsRemaining = credits?.sessionsRemaining ?? 0;
  const packageName = credits?.packageName || 'No Active Package';
  const expiresAt = credits?.expiresAt ? new Date(credits.expiresAt) : null;
  const hasValidExpiry = expiresAt && !Number.isNaN(expiresAt.getTime());
  const daysRemaining = hasValidExpiry
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
    : null;
  const statusLabel = sessionsRemaining > 0 ? 'ACTIVE' : 'NO ACTIVE PACKAGE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SectionCard>
        <SectionTitle>
          <Package /> Galactic Marketplace
        </SectionTitle>

        <CurrentPackageCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3
                style={{
                  margin: '0 0 0.75rem 0',
                  color: '#00ffff',
                  fontSize: '1.8rem',
                  textShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
                }}
              >
                {packageName}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1.1rem'
                }}
              >
                {sessionsRemaining > 0
                  ? 'Credits ready for booking sessions.'
                  : 'No active package yet. Visit the store to get started.'}
              </p>
            </div>
            <StatusIndicator>{statusLabel}</StatusIndicator>
          </div>

          {isLoading ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '1rem',
                position: 'relative',
                zIndex: 1
              }}
            >
              Loading package details...
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: 'center',
                color: '#ff6b6b',
                padding: '1rem',
                position: 'relative',
                zIndex: 1
              }}
            >
              {error instanceof Error ? error.message : String(error)}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    color: '#00ffff',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    textShadow: '0 0 15px rgba(0, 255, 255, 0.8)'
                  }}
                >
                  {sessionsRemaining}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  Sessions Left
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    color: '#ffd700',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    textShadow: '0 0 15px rgba(255, 215, 0, 0.8)'
                  }}
                >
                  {daysRemaining !== null ? daysRemaining : '--'}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  Days Remaining
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    color: '#00ff88',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    textShadow: '0 0 15px rgba(0, 255, 136, 0.8)'
                  }}
                >
                  {hasValidExpiry ? expiresAt?.toLocaleDateString() : '--'}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  Expires On
                </div>
              </div>
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <GlowButton
              text="View Packages in Store"
              theme="cosmic"
              size="medium"
              style={{
                width: '100%',
                borderRadius: '25px',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
              onClick={() => navigate('/shop')}
            />
          </div>
        </CurrentPackageCard>

        <div
          style={{
            position: 'relative',
            background: 'rgba(0, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(0, 255, 255, 0.2)'
          }}
        >
          <h4
            style={{
              color: '#00ffff',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '1.2rem'
            }}
          >
            <CreditCard size={22} /> Browse Packages
          </h4>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 1rem 0' }}>
            Pricing and package details live in the store. Choose the plan that fits your schedule.
          </p>
          <GlowButton
            text="Go to Store"
            theme="primary"
            size="medium"
            onClick={() => navigate('/shop')}
          />
        </div>
      </SectionCard>
    </motion.div>
  );
};
