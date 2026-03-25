/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: WorkoutsTab                                      ║
 * ║  PURPOSE: Real exercise usage chart by category from logs    ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-23                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Exercise Usage                           [Log Workout]     │
 * ├────────────────────────────────────────────────────────────┤
 * │ ┌─ Total Done ─┐ ┌─ Most Active ─┐ ┌─ Streak ──────┐    │
 * │ │   1,247       │ │   Legs         │ │   5 days      │    │
 * │ └──────────────┘ └───────────────┘ └──────────────  ┘    │
 * ├────────────────────────────────────────────────────────────┤
 * │ 🫁 CHEST                                                   │
 * │ ┌──────────────────────────────────────────────────────┐   │
 * │ │ Barbell Bench Press  ████████████████████████████  47│   │
 * │ │ Incline DB Press     ██████████████████████        38│   │
 * │ └──────────────────────────────────────────────────────┘   │
 * │ (per category, real data from workout logs + exercise DB)  │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  (none — uses AuthContext)
 * State:     { categories, loading, error, streak }
 * API Calls: GET /api/workout/sessions?limit=200 (includes WorkoutLog)
 * Children:  VictoryBar charts per category
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dumbbell, Flame, TrendingUp, BarChart3 } from 'lucide-react';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryLabel } from 'victory';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  type CategoryData,
  CATEGORY_META,
  computeStats,
} from './WorkoutsTabData';
import {
  Container, Header, SectionTitle, LogButton,
  StatsRow, StatCard, StatIcon, StatValue, StatLabel,
  CategorySection, CategoryHeader, CategoryIcon, CategoryName, CategoryCount,
  ChartScroll, ChartContainer,
  ErrorCard, RetryButton, ShimmerCard,
  EmptyState, EmptyTitle, EmptyText,
} from './WorkoutsTabStyles';
import { classifyMuscleGroup } from '../../../hooks/analytics/workoutAnalyticsUtils';

// ─────────────────────────────────────────────────────────────
// SECTION: Muscle Group → Category Key Mapping
// PURPOSE: Map classifyMuscleGroup output to CATEGORY_META keys
// ─────────────────────────────────────────────────────────────
const GROUP_TO_CATEGORY: Record<string, string> = {
  Chest: 'Chest',
  Back: 'Back',
  Shoulders: 'Shoulders',
  Arms: 'Arms',
  Legs: 'Legs',
  Core: 'Core',
  Cardio: 'Cardio',
  'Full Body': 'Full Body',
  Other: 'Core', // Default fallback
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Real exercise usage chart from workout log data
// ─────────────────────────────────────────────────────────────
const WorkoutsTab: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sessions with WorkoutLog data included
      const res = await authAxios.get('/api/workout/sessions', {
        params: { limit: 200, page: 1 }
      });
      const payload = res.data?.data;
      const list = Array.isArray(payload?.workouts)
        ? payload.workouts
        : Array.isArray(payload) ? payload : [];

      if (list.length === 0) {
        setCategories([]);
        setStreak(0);
      } else {
        setCategories(transformWorkoutLogs(list));
        setStreak(calcStreak(list));
      }
    } catch {
      setCategories([]);
      setError('Unable to load workout data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  const stats = useMemo(() => computeStats(categories), [categories]);

  if (loading) {
    return <Container><ShimmerCard /><ShimmerCard /><ShimmerCard /></Container>;
  }

  if (error) {
    return (
      <Container>
        <ErrorCard>
          <p>{error}</p>
          <RetryButton onClick={fetchWorkouts}>Retry</RetryButton>
        </ErrorCard>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <SectionTitle>
          <BarChart3 size={20} style={{ color: '#60C0F0' }} />
          Exercise Usage
        </SectionTitle>
        <LogButton onClick={() => navigate('/dashboard/admin-sessions')}>
          <Dumbbell size={16} />
          Log Workout
        </LogButton>
      </Header>

      {categories.length === 0 ? (
        <EmptyState>
          <Dumbbell size={48} style={{ opacity: 0.3, color: '#60C0F0' }} />
          <EmptyTitle>No workouts logged yet</EmptyTitle>
          <EmptyText>
            Start logging workouts to see your exercise breakdown by body part.
            Your most-used exercises will appear here as charts.
          </EmptyText>
          <LogButton onClick={() => navigate('/dashboard/admin-sessions')}>
            <Dumbbell size={16} />
            Log Your First Workout
          </LogButton>
        </EmptyState>
      ) : (
        <>
          <StatsRow>
            <StatCard>
              <StatIcon><TrendingUp size={18} /></StatIcon>
              <StatValue>{stats.totalExercises.toLocaleString()}</StatValue>
              <StatLabel>Total Sets</StatLabel>
            </StatCard>
            <StatCard>
              <StatIcon><Flame size={18} /></StatIcon>
              <StatValue>{stats.mostActiveCategory}</StatValue>
              <StatLabel>Most Active</StatLabel>
            </StatCard>
            <StatCard>
              <StatIcon><Dumbbell size={18} /></StatIcon>
              <StatValue>{streak}</StatValue>
              <StatLabel>Day Streak</StatLabel>
            </StatCard>
          </StatsRow>

          {categories.map((cat) => (
        <CategorySection key={cat.key}>
          <CategoryHeader>
            <CategoryIcon>{cat.icon}</CategoryIcon>
            <CategoryName>{cat.label.toUpperCase()}</CategoryName>
            <CategoryCount>
              {cat.exercises.reduce((s, e) => s + e.count, 0)}
            </CategoryCount>
          </CategoryHeader>
          <ChartScroll>
            <ChartContainer>
              <VictoryChart
                horizontal
                padding={{ top: 4, bottom: 4, left: 140, right: 50 }}
                height={cat.exercises.length * 32 + 8}
                width={500}
                domainPadding={{ x: [0, 8] }}
              >
                <VictoryAxis
                  dependentAxis
                  style={{
                    axis: { stroke: 'none' },
                    tickLabels: { fill: 'none' },
                    grid: { stroke: 'none' },
                  }}
                />
                <VictoryAxis
                  style={{
                    axis: { stroke: 'none' },
                    tickLabels: {
                      fill: '#E0ECF4',
                      fontSize: 11,
                      fontFamily: "'Sora', sans-serif",
                      textAnchor: 'end',
                    },
                    grid: { stroke: 'none' },
                  }}
                  tickFormat={(_, i) => {
                    const name = cat.exercises[i]?.name ?? '';
                    return name.length > 22 ? name.slice(0, 20) + '…' : name;
                  }}
                />
                <VictoryBar
                  data={cat.exercises.map((e, i) => ({ x: i + 1, y: e.count }))}
                  style={{
                    data: { fill: cat.color, opacity: 0.85 },
                  }}
                  barWidth={18}
                  cornerRadius={{ topLeft: 4, topRight: 4 }}
                  labels={({ datum }) => datum.y}
                  labelComponent={
                    <VictoryLabel
                      dx={6}
                      style={{
                        fill: '#E0ECF4',
                        fontSize: 11,
                        fontFamily: "'Fira Code', monospace",
                        fontWeight: 600,
                      }}
                    />
                  }
                />
              </VictoryChart>
            </ChartContainer>
          </ChartScroll>
        </CategorySection>
      ))}
        </>
      )}
    </Container>
  );
};

export default React.memo(WorkoutsTab);

// ─────────────────────────────────────────────────────────────
// SECTION: Data Transformer
// PURPOSE: Convert workout sessions (with WorkoutLog entries) into
//          category-grouped exercise usage counts sorted most→least
// ─────────────────────────────────────────────────────────────

interface LogEntry {
  exerciseName?: string;
  setNumber?: number;
  reps?: number;
  weight?: number;
}

interface RawSession {
  logs?: LogEntry[];
  WorkoutLogs?: LogEntry[];
  completedAt?: string;
  workoutDate?: string;
  date?: string;
}

function transformWorkoutLogs(sessions: RawSession[]): CategoryData[] {
  // Count sets per exercise name, categorized by muscle group
  const counts: Record<string, Record<string, number>> = {};

  for (const session of sessions) {
    // WorkoutLog data comes as 'logs' (alias) or 'WorkoutLogs' (model name)
    const logs = session.logs || session.WorkoutLogs || [];
    // Track unique exercises per session (count each exercise once per session)
    const exercisesInSession = new Set<string>();

    for (const log of logs) {
      const name = log.exerciseName;
      if (!name) continue;
      exercisesInSession.add(name);
    }

    // Count each exercise once per session it appears in (usage count)
    for (const name of exercisesInSession) {
      const category = GROUP_TO_CATEGORY[classifyMuscleGroup(name)] || 'Core';
      if (!counts[category]) counts[category] = {};
      counts[category][name] = (counts[category][name] || 0) + 1;
    }
  }

  // Build category data sorted most → least used
  return Object.entries(CATEGORY_META)
    .map(([key, meta]) => ({
      key,
      label: key,
      icon: meta.icon,
      color: meta.color,
      exercises: Object.entries(counts[key] || {})
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .filter(c => c.exercises.length > 0);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Streak Calculator
// PURPOSE: Calculate consecutive workout days from session dates
// ─────────────────────────────────────────────────────────────

function calcStreak(sessions: RawSession[]): number {
  const dates = new Set<string>();
  for (const s of sessions) {
    const raw = s.completedAt || s.workoutDate || s.date;
    if (raw) {
      dates.add(new Date(raw).toISOString().split('T')[0]);
    }
  }
  if (dates.size === 0) return 0;

  const sorted = Array.from(dates).sort().reverse();
  const today = new Date().toISOString().split('T')[0];

  // Check if most recent workout is today or yesterday
  const most = sorted[0];
  const diffFromToday = Math.round(
    (new Date(today).getTime() - new Date(most).getTime()) / 86400000
  );
  if (diffFromToday > 1) return 0; // Streak broken

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
