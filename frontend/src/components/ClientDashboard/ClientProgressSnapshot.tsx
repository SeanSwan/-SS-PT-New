/**
 * ClientProgressSnapshot.tsx
 * ==========================
 * Shared component showing a client's progress at a glance:
 * - Hero metric cards (weight, body fat, waist change)
 * - 3D area chart (weight/body fat/waist trends over time)
 * - Radar chart (body shape: first vs current)
 * - Recent measurements list
 * - Last workout summary
 * - Weekly weight tracker
 *
 * Used in both the admin MeasurementEntry page and the client's dashboard.
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Activity, Ruler, TrendingDown, TrendingUp,
  Dumbbell, Clock, Calendar, ChevronRight,
} from 'lucide-react';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLegend,
  VictoryGroup,
  VictoryPolarAxis,
} from 'victory';
import apiService from '../../services/api.service';

// ─── Props ───────────────────────────────────────────────────────────────────
interface ClientProgressSnapshotProps {
  userId: number | string;
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface MeasurementEntry {
  id: string;
  measurementDate: string;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  neck?: number;
  shoulders?: number;
  chest?: number;
  rightBicep?: number;
  leftBicep?: number;
  rightForearm?: number;
  leftForearm?: number;
  naturalWaist?: number;
  hips?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
  weightUnit?: string;
  circumferenceUnit?: string;
}

interface WorkoutEntry {
  id: string | number;
  name: string;
  date: string;
  duration?: string | null;
  /**
   * Phase 1 Slice 1.2 (2026-05-03): true count of distinct exercises
   * (from joined DailyWorkoutForm.formData), null when not available.
   */
  exerciseCount?: number | null;
  /** Slice 1.2: count of SETS across all exercises (was named `exercises` pre-1.2). */
  setsCount?: number;
  /** Slice 1.3: distinct exercise names from joined form, null when not joined. */
  exerciseNames?: string[] | null;
  type?: string;
}

// ─── Styled Components ──────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SnapshotWrapper = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const SectionCard = styled.div`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
`;

const SectionHeading = styled.h2`
  color: #60C0F0;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HeroMetricGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
  margin-bottom: 1.25rem;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const HeroCard = styled(motion.div)<{ $positive?: boolean }>`
  padding: 16px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(139, 92, 246, 0.15)'};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $positive }) =>
      $positive
        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, transparent 60%)'
        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, transparent 60%)'};
    pointer-events: none;
  }
`;

const HeroLabel = styled.div`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
`;

const HeroValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.6rem;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#8B5CF6')};
  line-height: 1.2;
  @media (min-width: 768px) {
    font-size: 1.9rem;
  }
`;

const HeroUnit = styled.span`
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;
`;

const HeroIcon = styled.div<{ $positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#8B5CF6')};
  margin-bottom: 6px;
`;

const ChartWrapper3D = styled.div`
  background: rgba(15, 20, 40, 0.5);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
  margin-bottom: 1rem;
  perspective: 1200px;

  & > .chart-inner {
    transform: rotateX(5deg);
    transform-origin: center bottom;
    transition: transform 0.4s ease;
  }

  &:hover > .chart-inner {
    transform: rotateX(0deg);
  }
`;

const ChartLabel = styled.h3`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(130, 200, 255, 0.9);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChartRow = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const TooltipBox = styled.div`
  background: rgba(0, 32, 96, 0.95);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  .tooltip-label {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 6px;
    font-weight: 500;
  }
  .tooltip-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #fff;
    padding: 2px 0;
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }
`;

const MiniList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const MiniListItem = styled.li`
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.04);
  }
  &:last-child {
    border-bottom: none;
  }
`;

const MiniListPrimary = styled.span`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
`;

const MiniListSecondary = styled.span`
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.8rem;
`;

const WeeklyWeightGrid = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const WeeklyWeightPill = styled.div<{ $active?: boolean }>`
  flex-shrink: 0;
  padding: 10px 14px;
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.12)' : 'rgba(0, 0, 0, 0.2)'};
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 10px;
  text-align: center;
  min-width: 72px;
`;

const WeeklyWeightDate = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
`;

const WeeklyWeightValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #8B5CF6;
`;

const WorkoutCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const WorkoutIconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B5CF6;
  flex-shrink: 0;
`;

const WorkoutInfo = styled.div`
  flex: 1;
`;

const WorkoutName = styled.div`
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
`;

const WorkoutMeta = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const EmptyState = styled.div`
  background: rgba(139, 92, 246, 0.04);
  border: 1px dashed rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
`;

const StatsFooter = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 8px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);

  span {
    color: #8B5CF6;
  }
`;

// ─── Radar Label Map ────────────────────────────────────────────────────────
const radarLabelMap: Record<string, string> = {
  neck: 'Neck', shoulders: 'Shoulders', chest: 'Chest', rightBicep: 'Bicep',
  naturalWaist: 'Waist', hips: 'Hips', rightThigh: 'Thigh', rightCalf: 'Calf',
};

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════

const ClientProgressSnapshot: React.FC<ClientProgressSnapshotProps> = ({ userId }) => {
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [lastWorkout, setLastWorkout] = useState<WorkoutEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    if (!userId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [measurementsRes, statsRes, workoutRes] = await Promise.all([
          apiService.get(`/api/measurements/user/${userId}?limit=100`).catch(() => null),
          apiService.get(`/api/measurements/user/${userId}/stats`).catch(() => null),
          apiService.get(`/api/workouts/${userId}/history?limit=1`).catch(() => null),
        ]);

        const mData = measurementsRes?.data?.data?.measurements || measurementsRes?.data?.measurements || [];
        setMeasurements(mData);

        const sData = statsRes?.data?.data || statsRes?.data;
        setStats(sData || null);

        const wData = workoutRes?.data?.data || workoutRes?.data;
        const workouts = Array.isArray(wData) ? wData : [];
        setLastWorkout(workouts.length > 0 ? workouts[0] : null);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId]);

  // ─── Chart Data Memos ──────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (measurements.length < 2) return [];
    return [...measurements]
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .map(m => ({
        date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: m.weight || null,
        bodyFat: m.bodyFatPercentage || null,
        waist: m.naturalWaist || null,
      }));
  }, [measurements]);

  const radarData = useMemo(() => {
    if (measurements.length < 2) return [];
    const sorted = [...measurements]
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const fields = ['neck', 'shoulders', 'chest', 'rightBicep', 'naturalWaist', 'hips', 'rightThigh', 'rightCalf'] as const;
    return fields
      .map(f => ({
        metric: radarLabelMap[f] || f,
        first: (first as any)[f] || 0,
        current: (latest as any)[f] || 0,
      }))
      .filter(d => d.first > 0 || d.current > 0);
  }, [measurements]);

  // Weekly weight: last 8 measurements with weight values
  const weeklyWeights = useMemo(() => {
    return [...measurements]
      .filter(m => m.weight)
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .slice(-8)
      .map(m => ({
        date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: m.weight!,
      }));
  }, [measurements]);

  // Recent measurements (last 5 for the list)
  const recentList = useMemo(() => {
    return [...measurements]
      .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime())
      .slice(0, 5);
  }, [measurements]);

  if (loading) {
    return (
      <SectionCard>
        <SectionHeading><Activity size={20} /> Progress Snapshot</SectionHeading>
        <EmptyState>Loading your progress data...</EmptyState>
      </SectionCard>
    );
  }

  const hasData = measurements.length > 0;

  return (
    <SnapshotWrapper>
      {/* ── Progress Graph ── */}
      {trendData.length >= 2 && (
        <SectionCard>
          <SectionHeading><TrendingUp size={20} /> Progress at a Glance</SectionHeading>

          {/* Hero Metric Cards */}
          {stats?.totalChange && (
            <HeroMetricGrid>
              {[
                { label: 'Weight Change', value: stats.totalChange.weight, unit: 'lbs', Icon: Scale },
                { label: 'Body Fat Change', value: stats.totalChange.bodyFat, unit: '%', Icon: Activity },
                { label: 'Waist Change', value: stats.totalChange.waist, unit: 'in', Icon: Ruler },
              ].map(({ label, value, unit, Icon }) => {
                const numVal = value !== null && value !== undefined ? parseFloat(value) : null;
                const isPositive = numVal !== null && numVal < 0;
                return (
                  <HeroCard
                    key={label}
                    $positive={isPositive}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <HeroIcon $positive={isPositive}><Icon size={16} /></HeroIcon>
                    <HeroLabel>{label}</HeroLabel>
                    <HeroValue $positive={isPositive}>
                      {numVal !== null ? (
                        <>{numVal > 0 ? '+' : ''}{numVal.toFixed(1)}<HeroUnit>{unit}</HeroUnit></>
                      ) : '—'}
                    </HeroValue>
                  </HeroCard>
                );
              })}
            </HeroMetricGrid>
          )}

          {/* Charts */}
          <ChartRow>
            <ChartWrapper3D>
              <div className="chart-inner">
                <ChartLabel>Trend Over Time</ChartLabel>
                <VictoryChart
                  height={260}
                  padding={{ top: 10, right: 50, left: 50, bottom: 50 }}
                  containerComponent={
                    <VictoryVoronoiContainer
                      labels={({ datum }) => {
                        const parts = [datum.x];
                        if (datum.weight != null) parts.push(`Weight: ${datum.weight.toFixed(1)} lbs`);
                        if (datum.bodyFat != null) parts.push(`Body Fat: ${datum.bodyFat.toFixed(1)}%`);
                        if (datum.waist != null) parts.push(`Waist: ${datum.waist.toFixed(1)} in`);
                        return parts.join('\n');
                      }}
                      labelComponent={
                        <VictoryTooltip
                          flyoutStyle={{
                            fill: '#141419',
                            stroke: 'rgba(139, 92, 246, 0.3)',
                            strokeWidth: 1,
                          }}
                          style={{
                            fill: '#E0ECF4',
                            fontSize: 9,
                            fontFamily: "'Fira Code', monospace",
                          }}
                          cornerRadius={8}
                          flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                        />
                      }
                    />
                  }
                >
                  <defs>
                    <linearGradient id="snapGradWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#50A0F0" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#50A0F0" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="snapGradBodyFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <VictoryLegend
                    x={50} y={0}
                    orientation="horizontal"
                    gutter={20}
                    style={{
                      labels: { fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: "'Sora', sans-serif" },
                    }}
                    data={[
                      { name: 'Weight (lbs)', symbol: { fill: '#50A0F0' } },
                      { name: 'Body Fat (%)', symbol: { fill: '#8B5CF6' } },
                      { name: 'Waist (in)', symbol: { fill: '#4ECDC4' } },
                    ]}
                  />
                  <VictoryAxis
                    style={{
                      axis: { stroke: 'rgba(255, 255, 255, 0.1)' },
                      tickLabels: {
                        fill: '#E0ECF4',
                        fontSize: 10,
                        fontFamily: "'Fira Code', monospace",
                        angle: -30,
                        textAnchor: 'end',
                      },
                      grid: {
                        stroke: 'rgba(96, 192, 240, 0.08)',
                        strokeDasharray: '4,4',
                      },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    style={{
                      axis: { stroke: 'rgba(255, 255, 255, 0.1)' },
                      tickLabels: {
                        fill: '#E0ECF4',
                        fontSize: 10,
                        fontFamily: "'Fira Code', monospace",
                      },
                      grid: {
                        stroke: 'rgba(96, 192, 240, 0.08)',
                        strokeDasharray: '4,4',
                      },
                    }}
                  />
                  <VictoryArea
                    data={trendData.map(d => ({ x: d.date, y: d.weight, ...d }))}
                    interpolation="monotoneX"
                    animate={{ duration: 800, easing: 'cubicInOut' }}
                    style={{
                      data: {
                        fill: 'url(#snapGradWeight)',
                        stroke: '#50A0F0',
                        strokeWidth: 2.5,
                      },
                    }}
                  />
                  <VictoryArea
                    data={trendData.map(d => ({ x: d.date, y: d.bodyFat, ...d }))}
                    interpolation="monotoneX"
                    animate={{ duration: 800, easing: 'cubicInOut' }}
                    style={{
                      data: {
                        fill: 'url(#snapGradBodyFat)',
                        stroke: '#8B5CF6',
                        strokeWidth: 2,
                      },
                    }}
                  />
                  <VictoryArea
                    data={trendData.map(d => ({ x: d.date, y: d.waist, ...d }))}
                    interpolation="monotoneX"
                    animate={{ duration: 800, easing: 'cubicInOut' }}
                    style={{
                      data: {
                        fill: 'transparent',
                        stroke: '#4ECDC4',
                        strokeWidth: 2,
                      },
                    }}
                  />
                </VictoryChart>
              </div>
            </ChartWrapper3D>

            {radarData.length >= 3 && (
              <ChartWrapper3D>
                <div className="chart-inner">
                  <ChartLabel>Body Shape: First vs Now</ChartLabel>
                  <VictoryChart
                    polar
                    height={260}
                    padding={{ top: 30, right: 40, left: 40, bottom: 40 }}
                  >
                    <VictoryLegend
                      x={60} y={0}
                      orientation="horizontal"
                      gutter={20}
                      style={{
                        labels: { fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: "'Sora', sans-serif" },
                      }}
                      data={[
                        { name: 'First', symbol: { fill: '#4070C0' } },
                        { name: 'Current', symbol: { fill: '#50A0F0' } },
                      ]}
                    />
                    {radarData.map((_d, i) => (
                      <VictoryPolarAxis
                        key={i}
                        dependentAxis
                        style={{
                          axis: { stroke: 'rgba(255, 255, 255, 0.1)' },
                          tickLabels: { fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: "'Fira Code', monospace" },
                          grid: { stroke: 'rgba(255, 255, 255, 0.1)', strokeDasharray: '4,4' },
                        }}
                        tickFormat={() => ''}
                        axisValue={i + 1}
                      />
                    ))}
                    <VictoryPolarAxis
                      labelPlacement="vertical"
                      tickValues={radarData.map((_d, i) => i + 1)}
                      tickFormat={radarData.map(d => d.metric)}
                      style={{
                        axis: { stroke: 'none' },
                        tickLabels: {
                          fill: 'rgba(255,255,255,0.6)',
                          fontSize: 10,
                          fontFamily: "'Fira Code', monospace",
                        },
                        grid: { stroke: 'rgba(255, 255, 255, 0.1)' },
                      }}
                    />
                    <VictoryGroup animate={{ duration: 800, easing: 'cubicInOut' }}>
                      <VictoryArea
                        data={radarData.map((d, i) => ({ x: i + 1, y: d.first }))}
                        style={{
                          data: {
                            fill: '#4070C0',
                            fillOpacity: 0.1,
                            stroke: '#4070C0',
                            strokeWidth: 2,
                          },
                        }}
                      />
                      <VictoryArea
                        data={radarData.map((d, i) => ({ x: i + 1, y: d.current }))}
                        style={{
                          data: {
                            fill: '#50A0F0',
                            fillOpacity: 0.25,
                            stroke: '#50A0F0',
                            strokeWidth: 2,
                          },
                        }}
                      />
                    </VictoryGroup>
                  </VictoryChart>
                </div>
              </ChartWrapper3D>
            )}
          </ChartRow>

          {/* Summary footer */}
          {stats && (
            <StatsFooter>
              <div><span>{stats.totalMeasurements}</span> measurements over <span>{stats.daysSinceStart}</span> days</div>
            </StatsFooter>
          )}
        </SectionCard>
      )}

      {/* ── Weekly Weight ── */}
      {weeklyWeights.length > 0 && (
        <SectionCard>
          <SectionHeading><Scale size={20} /> Weekly Weight</SectionHeading>
          <WeeklyWeightGrid>
            {weeklyWeights.map((w, i) => (
              <WeeklyWeightPill key={i} $active={i === weeklyWeights.length - 1}>
                <WeeklyWeightDate>{w.date}</WeeklyWeightDate>
                <WeeklyWeightValue>{w.weight} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>lbs</span></WeeklyWeightValue>
              </WeeklyWeightPill>
            ))}
          </WeeklyWeightGrid>
        </SectionCard>
      )}

      {/* ── Last Workout ── */}
      <SectionCard>
        <SectionHeading><Dumbbell size={20} /> Last Workout</SectionHeading>
        {lastWorkout ? (
          <WorkoutCard>
            <WorkoutIconBox>
              <Dumbbell size={22} />
            </WorkoutIconBox>
            <WorkoutInfo>
              <WorkoutName>{lastWorkout.name}</WorkoutName>
              <WorkoutMeta>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={13} />
                  {new Date(lastWorkout.date).toLocaleDateString()}
                </span>
                {lastWorkout.duration && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} />
                    {lastWorkout.duration}
                  </span>
                )}
                {/* Slice 1.2: prefer exerciseCount when present, fall
                    back to setsCount. Renders the truthful value. */}
                {typeof lastWorkout.exerciseCount === 'number' && lastWorkout.exerciseCount > 0 ? (
                  <span>
                    {lastWorkout.exerciseCount} exercise{lastWorkout.exerciseCount === 1 ? '' : 's'}
                  </span>
                ) : (typeof lastWorkout.setsCount === 'number' && lastWorkout.setsCount > 0 ? (
                  <span>{lastWorkout.setsCount} sets</span>
                ) : null)}
                {/* Slice 1.3: short names preview when available. */}
                {Array.isArray(lastWorkout.exerciseNames) && lastWorkout.exerciseNames.length > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {' · '}
                    {lastWorkout.exerciseNames.slice(0, 3).join(', ')}
                    {lastWorkout.exerciseNames.length > 3 && ` +${lastWorkout.exerciseNames.length - 3}`}
                  </span>
                )}
              </WorkoutMeta>
            </WorkoutInfo>
            <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </WorkoutCard>
        ) : (
          <EmptyState>No workout sessions recorded yet. Your first session will appear here!</EmptyState>
        )}
      </SectionCard>

      {/* ── Recent Measurements ── */}
      {hasData && (
        <SectionCard>
          <SectionHeading><Ruler size={20} /> Recent Measurements</SectionHeading>
          <MiniList>
            {recentList.map((m) => (
              <MiniListItem key={m.id}>
                <div>
                  <MiniListPrimary>
                    {new Date(m.measurementDate).toLocaleDateString()}
                    {m.weight ? ` — ${m.weight} lbs` : ''}
                  </MiniListPrimary>
                  <MiniListSecondary>
                    {[
                      m.bodyFatPercentage && `BF: ${m.bodyFatPercentage}%`,
                      m.chest && `Chest: ${m.chest}"`,
                      m.naturalWaist && `Waist: ${m.naturalWaist}"`,
                    ].filter(Boolean).join(' · ') || 'View details'}
                  </MiniListSecondary>
                </div>
              </MiniListItem>
            ))}
          </MiniList>
        </SectionCard>
      )}

      {/* No data fallback */}
      {!hasData && !lastWorkout && (
        <SectionCard>
          <SectionHeading><Activity size={20} /> Progress Snapshot</SectionHeading>
          <EmptyState>
            No progress data yet. Once your trainer records measurements and workouts, your progress will appear here!
          </EmptyState>
        </SectionCard>
      )}
    </SnapshotWrapper>
  );
};

export default ClientProgressSnapshot;
