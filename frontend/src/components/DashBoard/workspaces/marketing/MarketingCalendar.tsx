/**
 * ┌─── PANEL: Marketing Calendar ───────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Visual content calendar across all channels (blog,  │
 * │          social, email, video). Week view with channel       │
 * │          color coding and status tracking.                   │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  StatusChip, PillTabs, PillTab,
} from './marketing.styles';
import type { CalendarEvent, CalendarChannel } from './marketing.types';

// ─── Channel Config ────────────────────────────────────────────
const CHANNEL_CONFIG: Record<CalendarChannel, { label: string; color: string }> = {
  blog: { label: 'Blog', color: CHART_COLORS.iceWing },
  social: { label: 'Social', color: CHART_COLORS.wingPurple },
  email: { label: 'Email', color: CHART_COLORS.gildedFern },
  video: { label: 'Video', color: '#F59E0B' },
};

// ─── Demo Data ─────────────────────────────────────────────────
const today = new Date();
const getDate = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

const DEMO_EVENTS: CalendarEvent[] = [
  { id: '1', date: getDate(-1), channel: 'blog', title: '5 Mobility Drills for Golfers', status: 'published' },
  { id: '2', date: getDate(0), channel: 'social', title: 'Instagram: Client transformation post', status: 'approved' },
  { id: '3', date: getDate(0), channel: 'social', title: 'X: Youth athlete training tip', status: 'draft' },
  { id: '4', date: getDate(1), channel: 'email', title: 'Monthly Recap Newsletter', status: 'pending_review' },
  { id: '5', date: getDate(2), channel: 'video', title: 'Golf flexibility routine (YouTube)', status: 'draft' },
  { id: '6', date: getDate(3), channel: 'social', title: 'Facebook: New class announcement', status: 'draft' },
  { id: '7', date: getDate(4), channel: 'blog', title: 'Why Periodized Training Matters', status: 'draft' },
  { id: '8', date: getDate(5), channel: 'social', title: 'Instagram: Weekend motivation reel', status: 'draft' },
];

// ─── Styled Components ─────────────────────────────────────────
const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const NavBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

const WeekLabel = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  min-width: 200px;
  text-align: center;
`;

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const DayCell = styled.div<{ $isToday: boolean }>`
  min-height: 140px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $isToday }) =>
    $isToday ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DayHeader = styled.div<{ $isToday: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $isToday }) => $isToday ? '#8B5CF6' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DayNum = styled.span<{ $isToday: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $isToday }) => $isToday ? '#8B5CF6' : 'var(--text-primary, #E0ECF4)'};
  ${({ $isToday }) => $isToday && `
    background: rgba(139, 92, 246, 0.15);
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  `}
`;

const EventPill = styled.div<{ $color: string }>`
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $color }) => hexAlpha($color, 0.12)};
  border-left: 3px solid ${({ $color }) => $color};
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: ${({ $color }) => hexAlpha($color, 0.2)}; }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean; $color: string }>`
  min-height: 36px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid ${({ $active, $color }) => $active ? $color : 'rgba(96,192,240,0.08)'};
  background: ${({ $active, $color }) => $active ? hexAlpha($color, 0.12) : 'transparent'};
  color: ${({ $active, $color }) => $active ? $color : 'rgba(224,236,244,0.75)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;

  &:hover { border-color: ${({ $color }) => $color}; }
`;

const ColorDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Component ─────────────────────────────────────────────────
const MarketingCalendar: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeChannels, setActiveChannels] = useState<Set<CalendarChannel>>(
    new Set(['blog', 'social', 'email', 'video'])
  );

  const toggleChannel = (ch: CalendarChannel) => {
    setActiveChannels(prev => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const weekStart = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
    d.setDate(diff);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekEnd = weekDays[6];
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const todayStr = today.toISOString().split('T')[0];

  return (
    <MarketingCard>
      <CardHeader>
        <HeaderLeft>
          <IconWrap $bg={hexAlpha(CHART_COLORS.iceWing, 0.15)} $color={CHART_COLORS.iceWing}>
            <CalendarDays size={18} />
          </IconWrap>
          <div>
            <CardTitle>Content Calendar</CardTitle>
            <CardSubtitle>{DEMO_EVENTS.length} items scheduled</CardSubtitle>
          </div>
        </HeaderLeft>
        <FilterRow>
          {(Object.entries(CHANNEL_CONFIG) as [CalendarChannel, { label: string; color: string }][]).map(([ch, cfg]) => (
            <FilterChip key={ch} $active={activeChannels.has(ch)} $color={cfg.color} onClick={() => toggleChannel(ch)}>
              <ColorDot $color={cfg.color} />
              {cfg.label}
            </FilterChip>
          ))}
        </FilterRow>
      </CardHeader>

      <Controls>
        <NavBtn onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week">
          <ChevronLeft size={18} />
        </NavBtn>
        <WeekLabel>{weekLabel}</WeekLabel>
        <NavBtn onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week">
          <ChevronRight size={18} />
        </NavBtn>
        {weekOffset !== 0 && (
          <NavBtn onClick={() => setWeekOffset(0)} aria-label="Today" style={{ fontSize: 12, padding: '0 12px' }}>
            Today
          </NavBtn>
        )}
      </Controls>

      <WeekGrid>
        {weekDays.map((day, i) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          const events = DEMO_EVENTS.filter(e => e.date === dateStr && activeChannels.has(e.channel));

          return (
            <DayCell key={i} $isToday={isToday}>
              <DayHeader $isToday={isToday}>
                {DAYS[i]}
                <DayNum $isToday={isToday}>{day.getDate()}</DayNum>
              </DayHeader>
              {events.map(ev => (
                <EventPill key={ev.id} $color={CHANNEL_CONFIG[ev.channel].color} title={`${ev.title} (${ev.status})`}>
                  {ev.title}
                </EventPill>
              ))}
            </DayCell>
          );
        })}
      </WeekGrid>
    </MarketingCard>
  );
};

export default MarketingCalendar;
