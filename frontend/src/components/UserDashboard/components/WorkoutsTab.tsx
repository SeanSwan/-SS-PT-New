/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: WorkoutsTab                                      ║
 * ║  PURPOSE: Overwatch-style exercise usage chart by category   ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Exercise Usage                           [Log Workout]     │
 * ├────────────────────────────────────────────────────────────┤
 * │ ┌─ Total Done ─┐ ┌─ Most Active ─┐ ┌─ Streak ──────┐    │
 * │ │   1,247       │ │   Legs         │ │   12 days     │    │
 * │ └──────────────┘ └───────────────┘ └──────────────  ┘    │
 * ├────────────────────────────────────────────────────────────┤
 * │ 🫁 CHEST                                                   │
 * │ ┌──────────────────────────────────────────────────────┐   │
 * │ │ Barbell Bench Press  ████████████████████████████  47│   │
 * │ │ Incline DB Press     ██████████████████████        38│   │
 * │ │ Cable Flye           ███████████████               31│   │
 * │ │ Push-Up              ████████████                  28│   │
 * │ │ Dumbbell Pullover    █████████                     22│   │
 * │ │  ... scroll for more ...                              │   │
 * │ └──────────────────────────────────────────────────────┘   │
 * │                                                            │
 * │ 🔙 BACK                                                    │
 * │ ┌──────────────────────────────────────────────────────┐   │
 * │ │ Lat Pulldown         ████████████████████████████  52│   │
 * │ │ Barbell Deadlift     █████████████████████████     44│   │
 * │ │ ... (same pattern per category)                       │   │
 * │ └──────────────────────────────────────────────────────┘   │
 * └────────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[WorkoutsTab] --> B[StatsRow - 3 stat cards]
 *   A --> C[CategorySection x6]
 *   C --> D[VictoryChart horizontal bars]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Log Workout] -> navigates to /dashboard/admin-sessions
 * [Category scroll] -> reveals exercises 6-10 within scrollable area
 *
 * DATA FLOW:
 * Props In:  (none — uses AuthContext)
 * State:     { categories: CategoryData[], loading, error, useMock }
 * API Calls: GET /api/workout/sessions
 * Children:  VictoryBar charts per category
 *
 * GAMIFICATION HOOKS:
 * - Displays XP-related stats from workout history
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dumbbell, Flame, TrendingUp, BarChart3 } from 'lucide-react';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryLabel } from 'victory';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  type CategoryData,
  MOCK_CATEGORIES,
  CATEGORY_META,
  computeStats,
} from './WorkoutsTabData';
import {
  Container, Header, SectionTitle, MockBadge, LogButton,
  StatsRow, StatCard, StatIcon, StatValue, StatLabel,
  CategorySection, CategoryHeader, CategoryIcon, CategoryName, CategoryCount,
  ChartScroll, ChartContainer,
  ErrorCard, RetryButton, ShimmerCard,
} from './WorkoutsTabStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Overwatch-style exercise usage chart with Victory horizontal bars
// ─────────────────────────────────────────────────────────────
const WorkoutsTab: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAxios.get('/api/workout/sessions', { params: { limit: 100 } });
      const payload = res.data?.data;
      const list = Array.isArray(payload?.workouts)
        ? payload.workouts
        : Array.isArray(payload) ? payload : [];

      if (list.length === 0) {
        setUseMock(true);
        setCategories(MOCK_CATEGORIES);
      } else {
        setUseMock(false);
        setCategories(transformWorkouts(list));
      }
    } catch {
      setUseMock(true);
      setCategories(MOCK_CATEGORIES);
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
          {useMock && <MockBadge>PREVIEW</MockBadge>}
        </SectionTitle>
        <LogButton onClick={() => navigate('/dashboard/admin-sessions')}>
          <Dumbbell size={16} />
          Log Workout
        </LogButton>
      </Header>

      <StatsRow>
        <StatCard>
          <StatIcon><TrendingUp size={18} /></StatIcon>
          <StatValue>{stats.totalExercises.toLocaleString()}</StatValue>
          <StatLabel>Total Done</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon><Flame size={18} /></StatIcon>
          <StatValue>{stats.mostActiveCategory}</StatValue>
          <StatLabel>Most Active</StatLabel>
        </StatCard>
        <StatCard>
          <StatIcon><Dumbbell size={18} /></StatIcon>
          <StatValue>12</StatValue>
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
                  tickFormat={(_, i) => cat.exercises[i]?.name ?? ''}
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
    </Container>
  );
};

export default React.memo(WorkoutsTab);

// ─────────────────────────────────────────────────────────────
// SECTION: Data Transformer
// PURPOSE: Convert raw workout sessions into category buckets
// ─────────────────────────────────────────────────────────────
interface RawExercise {
  name?: string;
  exerciseName?: string;
  bodyPartCategory?: string;
  bodyPart?: string;
  muscleGroup?: string;
}
interface RawSession {
  exercises?: RawExercise[];
}

function transformWorkouts(sessions: RawSession[]): CategoryData[] {
  const counts: Record<string, Record<string, number>> = {};

  for (const session of sessions) {
    for (const ex of session.exercises ?? []) {
      const cat = ex.bodyPartCategory || ex.bodyPart || ex.muscleGroup || 'Core';
      const name = ex.name || ex.exerciseName || 'Unknown Exercise';
      if (!counts[cat]) counts[cat] = {};
      counts[cat][name] = (counts[cat][name] || 0) + 1;
    }
  }

  return Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key,
    label: key,
    icon: meta.icon,
    color: meta.color,
    exercises: Object.entries(counts[key] || {})
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  })).filter(c => c.exercises.length > 0);
}
