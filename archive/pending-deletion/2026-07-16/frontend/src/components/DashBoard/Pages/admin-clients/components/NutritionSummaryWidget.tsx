/**
 * ┌─── SUB-COMPONENT: NutritionSummaryWidget ──────────────────┐
 * │ PARENT: ClientDetailsPanel (Nutrition tab)                  │
 * │ PURPOSE: Compact macro summary for admin/trainer viewing    │
 * │          a client's daily and weekly nutrition intake        │
 * │ Props: { clientId: number }                                 │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Day buttons] → Switch viewed date → Refetch summary       │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Apple, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

interface NutritionSummaryWidgetProps {
  clientId: number;
}

interface MacroSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  mealCount: number;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const NutritionSummaryWidget: React.FC<NutritionSummaryWidgetProps> = ({ clientId }) => {
  const [summary, setSummary] = useState<MacroSummary | null>(null);
  const [weeklyAvg, setWeeklyAvg] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const getToken = () => localStorage.getItem('token');

  const fetchSummary = useCallback(async (date: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/macros/summary?date=${date}&userId=${clientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch { /* silent */ }
  }, [clientId]);

  const fetchWeekly = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/macros/weekly?start=${daysAgo(6)}&end=${todayStr()}&userId=${clientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success && data.days?.length > 0) {
        const days = data.days;
        setWeeklyAvg({
          calories: Math.round(days.reduce((s: number, d: { calories: number }) => s + d.calories, 0) / days.length),
          protein: Math.round(days.reduce((s: number, d: { protein: number }) => s + d.protein, 0) / days.length),
          carbs: Math.round(days.reduce((s: number, d: { carbs: number }) => s + d.carbs, 0) / days.length),
          fat: Math.round(days.reduce((s: number, d: { fat: number }) => s + d.fat, 0) / days.length),
        });
      }
    } catch { /* silent */ }
  }, [clientId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(selectedDate), fetchWeekly()])
      .finally(() => setLoading(false));
  }, [selectedDate, fetchSummary, fetchWeekly]);

  const dayLabels = ['Today', 'Yesterday', '2 days ago'];

  if (loading) {
    return (
      <Wrapper>
        <ShimmerCard>
          <ShimmerBar style={{ width: '60%' }} />
          <ShimmerBar style={{ width: '100%', height: 48 }} />
          <ShimmerBar style={{ width: '80%' }} />
        </ShimmerCard>
      </Wrapper>
    );
  }

  const noData = !summary || summary.mealCount === 0;

  return (
    <Wrapper>
      <SectionHeader>
        <Apple size={18} color="var(--accent-primary, #60C0F0)" />
        <SectionTitle>Daily Nutrition</SectionTitle>
      </SectionHeader>

      {/* Day selector */}
      <DayRow>
        {dayLabels.map((label, i) => {
          const date = daysAgo(i);
          return (
            <DayChip
              key={date}
              $active={selectedDate === date}
              onClick={() => setSelectedDate(date)}
            >
              {label}
            </DayChip>
          );
        })}
      </DayRow>

      {noData ? (
        <EmptyState>
          <AlertTriangle size={20} color="var(--text-muted, rgba(224,236,244,0.4))" />
          <EmptyText>No meals logged for {selectedDate === todayStr() ? 'today' : selectedDate}</EmptyText>
        </EmptyState>
      ) : (
        <>
          {/* Calorie hero */}
          <CalorieCard>
            <CalorieValue>{Math.round(summary.totalCalories)}</CalorieValue>
            <CalorieLabel>calories · {summary.mealCount} meal{summary.mealCount !== 1 ? 's' : ''}</CalorieLabel>
          </CalorieCard>

          {/* Macro grid */}
          <MacroGrid>
            <MacroCell $color="var(--accent-primary, #60C0F0)">
              <MacroVal>{Math.round(summary.totalProtein)}g</MacroVal>
              <MacroLbl>Protein</MacroLbl>
            </MacroCell>
            <MacroCell $color="var(--accent-secondary, #8B5CF6)">
              <MacroVal>{Math.round(summary.totalCarbs)}g</MacroVal>
              <MacroLbl>Carbs</MacroLbl>
            </MacroCell>
            <MacroCell $color="var(--accent-gold, #C6A84B)">
              <MacroVal>{Math.round(summary.totalFat)}g</MacroVal>
              <MacroLbl>Fat</MacroLbl>
            </MacroCell>
            <MacroCell $color="var(--text-secondary, rgba(224,236,244,0.6))">
              <MacroVal>{Math.round(summary.totalFiber)}g</MacroVal>
              <MacroLbl>Fiber</MacroLbl>
            </MacroCell>
          </MacroGrid>

          {/* Health flags */}
          {(summary.totalSodium > 2300 || summary.totalSugar > 50) && (
            <FlagRow>
              {summary.totalSodium > 2300 && (
                <FlagBadge $level="warning">Sodium: {Math.round(summary.totalSodium)}mg (over 2,300mg limit)</FlagBadge>
              )}
              {summary.totalSugar > 50 && (
                <FlagBadge $level="warning">Sugar: {Math.round(summary.totalSugar)}g (over 50g limit)</FlagBadge>
              )}
            </FlagRow>
          )}
        </>
      )}

      {/* Weekly average */}
      {weeklyAvg && (
        <WeeklyCard>
          <SectionHeader>
            <TrendingUp size={16} color="var(--accent-primary, #60C0F0)" />
            <SectionTitle style={{ fontSize: '0.8rem' }}>7-Day Average</SectionTitle>
          </SectionHeader>
          <WeeklyRow>
            <WeeklyItem>{weeklyAvg.calories} cal</WeeklyItem>
            <WeeklyItem>{weeklyAvg.protein}g P</WeeklyItem>
            <WeeklyItem>{weeklyAvg.carbs}g C</WeeklyItem>
            <WeeklyItem>{weeklyAvg.fat}g F</WeeklyItem>
          </WeeklyRow>
          {summary && weeklyAvg.calories > 0 && (
            <TrendIndicator>
              {summary.totalCalories > weeklyAvg.calories * 1.1 ? (
                <><TrendingUp size={14} color="#C6A84B" /> Above average today</>
              ) : summary.totalCalories < weeklyAvg.calories * 0.9 ? (
                <><TrendingDown size={14} color="var(--accent-primary, #60C0F0)" /> Below average today</>
              ) : (
                <><Minus size={14} color="var(--text-secondary)" /> On track today</>
              )}
            </TrendIndicator>
          )}
        </WeeklyCard>
      )}
    </Wrapper>
  );
};

export default NutritionSummaryWidget;

// ── Styled Components ──

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const DayRow = styled.div`
  display: flex;
  gap: 6px;
`;

const DayChip = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  min-height: 34px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, rgba(224,236,244,0.4))'};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #E0ECF4);
  }
`;

const CalorieCard = styled.div`
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

const CalorieValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
`;

const CalorieLabel = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
`;

const MacroGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const MacroCell = styled.div<{ $color: string }>`
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  background: color-mix(in srgb, ${({ $color }) => $color} 6%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 12%, transparent);
`;

const MacroVal = styled.div`
  font-size: 1rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #E0ECF4);
`;

const MacroLbl = styled.div`
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224,236,244,0.4));
  margin-top: 2px;
`;

const FlagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const FlagBadge = styled.span<{ $level: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 500;
  background: ${({ $level }) =>
    $level === 'warning'
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)'
      : 'color-mix(in srgb, #C92A54 12%, transparent)'};
  border: 1px solid ${({ $level }) =>
    $level === 'warning'
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent)'
      : 'rgba(201,42,84,0.25)'};
  color: var(--text-primary, #E0ECF4);
`;

const WeeklyCard = styled.div`
  padding: 14px;
  border-radius: 10px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
`;

const WeeklyRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 10px;
`;

const WeeklyItem = styled.span`
  font-size: 0.8rem;
  font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224,236,244,0.6));
`;

const TrendIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  text-align: center;
`;

const EmptyText = styled.p`
  font-size: 0.85rem;
  color: var(--text-muted, rgba(224,236,244,0.4));
  margin: 0;
`;

const ShimmerCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
`;

const ShimmerBar = styled.div`
  height: 20px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg-surface, #1A1A24) 25%, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 50%, var(--bg-surface, #1A1A24) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
