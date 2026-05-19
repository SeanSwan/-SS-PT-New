/**
 * PANEL: Marketing Calendar
 * PARENT: MarketingWorkspace
 * PURPOSE: Persisted Marketing calendar with read-only PT schedule awareness.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import { MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle, ActionButton } from './marketing.styles';
import type { CalendarChannel, SocialPlatform } from './marketing.types';
import {
  createMarketingCalendarItem,
  fetchMarketingCalendar,
  updateMarketingCalendarItem,
  type MarketingCalendarAdvisory,
  type MarketingCalendarItem,
  type MarketingCalendarPayload,
} from './MarketingCalendar.api';
import {
  Banner,
  ColorDot,
  Controls,
  DayCell,
  DayHeader,
  EventPill,
  Field,
  FilterChip,
  FilterRow,
  FormGrid,
  Input,
  Meta,
  NavBtn,
  Select,
  SmallBtn,
  WeekGrid,
  WeekLabel,
} from './MarketingCalendar.styles';

const CHANNEL_CONFIG: Record<CalendarChannel, { label: string; color: string }> = {
  blog: { label: 'Blog', color: CHART_COLORS.iceWing },
  social: { label: 'Social', color: CHART_COLORS.wingPurple },
  email: { label: 'Email', color: CHART_COLORS.gildedFern },
  video: { label: 'Video', color: CHART_COLORS.warning },
  local: { label: 'Local', color: CHART_COLORS.success },
};

const PT_ADVISORY_CALENDAR = 'personal_training';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SOCIAL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'youtube', 'bluesky', 'tiktok', 'nextdoor'];

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const initialForm = (): MarketingCalendarPayload => ({
  title: '',
  content: '',
  channel: 'social',
  platform: 'instagram',
  status: 'scheduled',
  scheduledAt: toLocalInput(new Date(Date.now() + 60 * 60000)),
  durationMinutes: 30,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
});

const MarketingCalendar: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [items, setItems] = useState<MarketingCalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<MarketingCalendarPayload>(() => initialForm());
  const [lastAdvisories, setLastAdvisories] = useState<MarketingCalendarAdvisory[]>([]);
  const [lastItem, setLastItem] = useState<MarketingCalendarItem | null>(null);
  const [activeChannels, setActiveChannels] = useState<Set<CalendarChannel>>(new Set(['blog', 'social', 'email', 'video', 'local']));

  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);
  const weekEnd = weekDays[6];
  const todayKey = dateKey(new Date());

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const endExclusive = new Date(weekEnd);
      endExclusive.setDate(endExclusive.getDate() + 1);
      setItems(await fetchMarketingCalendar(weekStart.toISOString(), endExclusive.toISOString()));
      setMessage('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load marketing calendar');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const upsertItem = (item: MarketingCalendarItem) => {
    setItems(prev => [...prev.filter(row => row.id !== item.id), item].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    try {
      const result = await createMarketingCalendarItem({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() });
      upsertItem(result.item);
      setLastItem(result.item);
      setLastAdvisories(result.advisories);
      setMessage('Marketing item scheduled.');
      setForm(prev => ({ ...initialForm(), channel: prev.channel, platform: prev.platform }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to schedule marketing item');
    }
  };

  const moveLastItem = async (minutes: number) => {
    if (!lastItem) return;
    try {
      const nextDate = new Date(new Date(lastItem.scheduledAt).getTime() + minutes * 60000);
      const result = await updateMarketingCalendarItem(lastItem.id, {
        ...lastItem,
        content: lastItem.content ?? undefined,
        platform: lastItem.platform ?? undefined,
        campaignName: lastItem.campaignName ?? undefined,
        scheduledAt: nextDate.toISOString(),
      });
      upsertItem(result.item);
      setLastItem(result.item);
      setLastAdvisories(result.advisories);
      setMessage('Marketing item moved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to move marketing item');
    }
  };

  const byDate = useMemo(() => items.reduce<Record<string, MarketingCalendarItem[]>>((acc, item) => {
    const key = dateKey(new Date(item.scheduledAt));
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {}), [items]);

  const toggleChannel = (channel: CalendarChannel) => setActiveChannels(prev => {
    const next = new Set(prev);
    next.has(channel) ? next.delete(channel) : next.add(channel);
    return next;
  });
  const advisoryCount = lastAdvisories.filter(item => item.calendar === PT_ADVISORY_CALENDAR).length;
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <MarketingCard>
      <CardHeader>
        <HeaderLeft>
          <IconWrap $bg={hexAlpha(CHART_COLORS.iceWing, 0.15)} $color={CHART_COLORS.iceWing}><CalendarDays size={18} /></IconWrap>
          <div>
            <CardTitle>Marketing Calendar</CardTitle>
            <CardSubtitle>{loading ? 'Loading' : `${items.length} real item${items.length === 1 ? '' : 's'} this week`}</CardSubtitle>
          </div>
        </HeaderLeft>
        <FilterRow>
          {(Object.entries(CHANNEL_CONFIG) as [CalendarChannel, { label: string; color: string }][]).map(([channel, cfg]) => (
            <FilterChip key={channel} $active={activeChannels.has(channel)} $color={cfg.color} onClick={() => toggleChannel(channel)}>
              <ColorDot $color={cfg.color} /> {cfg.label}
            </FilterChip>
          ))}
        </FilterRow>
      </CardHeader>

      <FormGrid onSubmit={handleSubmit}>
        <Field>Title<Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Campaign item" /></Field>
        <Field>Channel<Select value={form.channel} onChange={e => setForm(prev => ({ ...prev, channel: e.target.value as CalendarChannel }))}>{Object.entries(CHANNEL_CONFIG).map(([id, cfg]) => <option key={id} value={id}>{cfg.label}</option>)}</Select></Field>
        <Field>Platform<Select value={form.platform || 'instagram'} onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}>{SOCIAL_PLATFORMS.map(platform => <option key={platform} value={platform}>{platform}</option>)}</Select></Field>
        <Field>When<Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(prev => ({ ...prev, scheduledAt: e.target.value }))} /></Field>
        <Field>Duration<Input type="number" min="5" max="1440" step="5" value={form.durationMinutes} onChange={e => setForm(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))} /></Field>
        <Field>Status<Select value={form.status || 'scheduled'} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as MarketingCalendarPayload['status'] }))}><option value="draft">draft</option><option value="scheduled">scheduled</option><option value="published">published</option><option value="failed">failed</option><option value="cancelled">cancelled</option></Select></Field>
        <ActionButton type="submit"><Plus size={14} /> Schedule</ActionButton>
      </FormGrid>

      {message && <Banner>{message}</Banner>}
      {advisoryCount > 0 && (
        <Banner $warning>
          <AlertTriangle size={16} />
          {advisoryCount} PT calendar overlap{advisoryCount === 1 ? '' : 's'} detected.
          <SmallBtn onClick={() => setLastAdvisories([])}>Keep as-is</SmallBtn>
          <SmallBtn onClick={() => moveLastItem(30)}>Move 30m later</SmallBtn>
        </Banner>
      )}

      <Controls>
        <NavBtn onClick={() => setWeekOffset(o => o - 1)} aria-label="Previous week"><ChevronLeft size={18} /></NavBtn>
        <WeekLabel>{weekLabel}</WeekLabel>
        <NavBtn onClick={() => setWeekOffset(o => o + 1)} aria-label="Next week"><ChevronRight size={18} /></NavBtn>
        {weekOffset !== 0 && <SmallBtn onClick={() => setWeekOffset(0)}>Today</SmallBtn>}
      </Controls>

      <WeekGrid>
        {weekDays.map((day, index) => {
          const key = dateKey(day);
          const dayItems = (byDate[key] || []).filter(item => activeChannels.has(item.channel));
          return (
            <DayCell key={key} $today={key === todayKey}>
              <DayHeader $today={key === todayKey}><span>{DAYS[index]}</span><span>{day.getDate()}</span></DayHeader>
              {dayItems.map(item => {
                const cfg = CHANNEL_CONFIG[item.channel] || CHANNEL_CONFIG.social;
                const hasPtOverlap = item.advisories?.some(advisory => advisory.calendar === PT_ADVISORY_CALENDAR);
                return (
                  <EventPill key={item.id} $color={cfg.color} $warn={!!hasPtOverlap} title={item.title}>
                    {item.title}
                    <Meta>{new Date(item.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} / {item.status}{hasPtOverlap ? ' / PT overlap' : ''}</Meta>
                  </EventPill>
                );
              })}
            </DayCell>
          );
        })}
      </WeekGrid>
    </MarketingCard>
  );
};

export default MarketingCalendar;
