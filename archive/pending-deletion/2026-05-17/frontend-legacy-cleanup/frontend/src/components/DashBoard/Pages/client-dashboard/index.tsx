/**
 * ============================================================================
 * FILE: EnhancedClientDashboard (index.tsx)
 * PURPOSE: Client-facing fitness dashboard with REAL data from backend APIs
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders client dashboard sections using real gamification,
 * workout history, and scheduled session data fetched via useClientDashboardData hook.
 * NO mock/fake data — new users see empty "level 1, 0 workouts" state.
 *
 * APIs CONSUMED (via useClientDashboardData):
 *   GET /api/v1/gamification/profile
 *   GET /api/workout/sessions
 *   GET /api/schedule
 */

import React, { useState } from 'react';
import { Box, CircularProgress, Typography } from '../../../ui/primitives/components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Icons
import {
  Activity, Award, Dumbbell, Flame, Heart, Move,
  RefreshCw, Target, Zap, Trophy, Gift, Unlock, Lock
} from 'lucide-react';

// Layout & shared
import DashboardLayout from './components/layout/DashboardLayout';
import AITerminalPanel from '../../../Shared/AITerminalPanel';

// Cards
import OverallProgressCard from './components/cards/OverallProgressCard';
import ScheduledSessionsCard from './components/cards/ScheduledSessionsCard';

// Progress
import NasmCategoryProgress from './components/progress/NasmCategoryProgress';

// Exercises
import KeyExerciseProgress from './components/exercises/KeyExerciseProgress';
import RecommendedExercises from './components/exercises/RecommendedExercises';

// Achievements & Gamification
import AchievementsCard from './components/achievements/AchievementsCard';
import ChallengesCard from './components/gamification/ChallengesCard';
import RewardsCard from './components/gamification/RewardsCard';
import AchievementNotification from './components/gamification/AchievementNotification';

// Aegis HUD (V2 Gamification)
import { AegisHud } from '../../../AdvancedGamification/components/AegisHud';
import { CompanionPet } from '../../../AdvancedGamification/components/CompanionPet';

// Types
import type { NasmCategory, BodyPartProgress, Achievement, Challenge, Reward, Exercise } from './types';
import { PageContainer } from './components/styled-components';

// Real data hook
import { useClientDashboardData } from './hooks/useClientDashboardData';

// ─────────────────────────────────────────────────────────────
// SECTION: Static achievement definitions (unlocked status from API)
// ─────────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked' | 'dateUnlocked'>[] = [
  { id: 'core-10', name: 'Core Beginner', icon: <Target />, description: 'Reach level 10 in Core exercises', points: 100 },
  { id: 'balance-10', name: 'Balanced Start', icon: <Activity />, description: 'Reach level 10 in Balance exercises', points: 100 },
  { id: 'flexibility-10', name: 'First Stretch', icon: <Move />, description: 'Reach level 10 in Flexibility', points: 100 },
  { id: 'calisthenics-10', name: 'Bodyweight Basics', icon: <Zap />, description: 'Reach level 10 in Calisthenics', points: 100 },
  { id: 'squats-10', name: 'Squat Novice', icon: <Dumbbell />, description: 'Reach level 10 in Squats', points: 150 },
  { id: 'streak-7', name: 'Weekly Warrior', icon: <Flame />, description: 'Maintain a 7-day workout streak', points: 200 },
  { id: 'streak-30', name: 'Monthly Master', icon: <Flame />, description: 'Maintain a 30-day workout streak', points: 500 },
  { id: 'workouts-10', name: 'Dedicated Athlete', icon: <Dumbbell />, description: 'Complete 10 workouts', points: 200 },
  { id: 'workouts-50', name: 'Fitness Fanatic', icon: <Dumbbell />, description: 'Complete 50 workouts', points: 500 },
  { id: 'overall-50', name: 'Fitness Journey', icon: <Award />, description: 'Reach overall level 50', points: 500 },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Build NASM categories from real muscle group data
// ─────────────────────────────────────────────────────────────
function buildNasmCategories(muscleGroups: Array<{ name: string; count: number }>, totalWorkouts: number): NasmCategory[] {
  const getCount = (name: string) => muscleGroups.find(m => m.name.toLowerCase().includes(name.toLowerCase()))?.count || 0;
  const maxCount = Math.max(1, ...muscleGroups.map(m => m.count));

  return [
    { type: 'core', name: 'Core & Stability', level: Math.min(100, Math.round(getCount('core') / maxCount * 100)), progress: Math.round(getCount('core') / Math.max(1, totalWorkouts) * 100), icon: <Target size={16} />, color: 'primary' },
    { type: 'balance', name: 'Balance', level: Math.min(100, Math.round(getCount('balance') / maxCount * 100)), progress: Math.round(getCount('balance') / Math.max(1, totalWorkouts) * 100), icon: <Activity size={16} />, color: 'info' },
    { type: 'flexibility', name: 'Flexibility', level: Math.min(100, Math.round(getCount('stretch') / maxCount * 100)), progress: Math.round(getCount('stretch') / Math.max(1, totalWorkouts) * 100), icon: <Move size={16} />, color: 'secondary' },
    { type: 'calisthenics', name: 'Calisthenics', level: Math.min(100, Math.round(getCount('bodyweight') / maxCount * 100)), progress: Math.round(getCount('bodyweight') / Math.max(1, totalWorkouts) * 100), icon: <Zap size={16} />, color: 'warning' },
    { type: 'isolation', name: 'Isolation', level: Math.min(100, Math.round(getCount('bicep') / maxCount * 100)), progress: Math.round((getCount('bicep') + getCount('tricep')) / Math.max(1, totalWorkouts) * 100), icon: <Dumbbell size={16} />, color: 'success' },
    { type: 'stabilizers', name: 'Stabilizers', level: Math.min(100, Math.round(getCount('shoulder') / maxCount * 100)), progress: Math.round(getCount('shoulder') / Math.max(1, totalWorkouts) * 100), icon: <Target size={16} />, color: 'primary' },
    { type: 'injury_prevention', name: 'Injury Prevention', level: Math.min(100, Math.round(getCount('glute') / maxCount * 100)), progress: Math.round(getCount('glute') / Math.max(1, totalWorkouts) * 100), icon: <Heart size={16} />, color: 'error' },
    { type: 'injury_recovery', name: 'Injury Recovery', level: Math.min(100, Math.round(getCount('back') / maxCount * 100)), progress: Math.round(getCount('back') / Math.max(1, totalWorkouts) * 100), icon: <RefreshCw size={16} />, color: 'success' },
  ];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Build key exercises from real top exercise data
// ─────────────────────────────────────────────────────────────
function buildKeyExercises(topExercises: Array<{ name: string; count: number; muscleGroup: string }>) {
  const result: Record<string, { level: number; progress: number }> = {};
  const maxCount = Math.max(1, ...topExercises.map(e => e.count));
  for (const ex of topExercises.slice(0, 4)) {
    const key = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    result[key] = {
      level: Math.round(ex.count / maxCount * 100),
      progress: Math.min(100, Math.round(ex.count / maxCount * 100)),
    };
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Build recommended exercises from top muscle groups
// ─────────────────────────────────────────────────────────────
function buildRecommendedExercises(topExercises: Array<{ name: string; count: number; muscleGroup: string }>): Exercise[] {
  return topExercises.slice(0, 5).map((ex, i) => ({
    id: String(i + 1),
    name: ex.name,
    type: ex.muscleGroup.toLowerCase(),
    level: ex.count,
    sets: 3,
    reps: 12,
    muscleGroups: [ex.muscleGroup],
    icon: <Dumbbell size={20} />,
  }));
}

const EnhancedClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const data = useClientDashboardData();

  // UI state
  const [showChallengesDialog, setShowChallengesDialog] = useState(false);
  const [showRewardsDialog, setShowRewardsDialog] = useState(false);

  // Derive display data from real API data
  const overallLevel = {
    level: data.level,
    name: data.levelName,
    description: `Level ${data.level} — ${data.tier}`,
    progress: data.levelProgress,
    totalNeeded: data.levelTotal,
  };

  const nasmCategories = buildNasmCategories(data.muscleGroupBreakdown, data.userStats.workoutsCompleted);
  const keyExercises = buildKeyExercises(data.topExercises);
  const recommendedExercises = buildRecommendedExercises(data.topExercises);

  // Map achievement definitions with real unlock status
  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: data.unlockedAchievementIds.includes(def.id) ||
      (def.id === 'streak-7' && data.streak >= 7) ||
      (def.id === 'streak-30' && data.streak >= 30) ||
      (def.id === 'workouts-10' && data.userStats.workoutsCompleted >= 10) ||
      (def.id === 'workouts-50' && data.userStats.workoutsCompleted >= 50) ||
      (def.id === 'overall-50' && data.level >= 50),
  }));

  // Static challenges (will be from API when challenge system is built)
  const challenges: Challenge[] = [];

  // Static rewards (will be from API when rewards system is built)
  const rewards: Reward[] = [];

  const handleStartFocusedTraining = () => {
    toast({ title: 'Training Session Started', description: 'Follow the guidance on screen.', variant: 'default' });
  };

  const handleScheduleNewSession = () => {
    toast({ title: 'Scheduling', description: 'Opening the session scheduling interface.', variant: 'default' });
  };

  if (data.loading) {
    return (
      <PageContainer>
        <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <CircularProgress size={60} style={{ color: '#60C0F0', marginBottom: 24 }} />
          <Typography variant="h6">Loading your fitness dashboard...</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <DashboardLayout
      points={data.points}
      streak={data.streak}
      onViewChallenges={() => setShowChallengesDialog(true)}
      onViewRewards={() => setShowRewardsDialog(true)}
    >
      <AITerminalPanel
        context="workout_suggestions"
        label="Fitness Assistant"
        emptyHint="I'm your Fitness Assistant. Ask about workout plans, exercise form, nutrition tips, or progress insights."
        defaultOpen={false}
      />

      <OverallProgressCard
        overallLevel={overallLevel}
        userStats={data.userStats}
        activitySummary={data.activitySummary}
      />

      <NasmCategoryProgress nasmCategories={nasmCategories} />

      <KeyExerciseProgress
        keyExercises={keyExercises}
        onStartTraining={handleStartFocusedTraining}
      />

      {user?.id && <AegisHud userId={user.id} showMoodlet />}
      {user?.id && <CompanionPet userId={user.id} size={140} compact showControls={false} />}

      <AchievementsCard achievements={achievements} />

      <RecommendedExercises exercises={recommendedExercises} />

      {challenges.length > 0 && (
        <ChallengesCard challenges={challenges} onViewAllChallenges={() => setShowChallengesDialog(true)} />
      )}

      {rewards.length > 0 && (
        <RewardsCard
          rewards={rewards}
          points={data.points}
          onClaimReward={() => {}}
          onViewAllRewards={() => setShowRewardsDialog(true)}
        />
      )}

      {user?.clientSource !== 'move_fitness' && (
        <ScheduledSessionsCard
          sessions={data.scheduledSessions}
          onScheduleMore={handleScheduleNewSession}
        />
      )}
    </DashboardLayout>
  );
};

export default EnhancedClientDashboard;
