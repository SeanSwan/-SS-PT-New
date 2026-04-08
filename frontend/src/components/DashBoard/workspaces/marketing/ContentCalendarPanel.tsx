/**
 * ┌─── PANEL: Content Calendar (AI-Powered) ──────────────────────┐
 * │ PARENT: MarketingWorkspace                                      │
 * │ PURPOSE: AI content calendar suggestions, best-time-to-post   │
 * │   analytics, and community stats auto-post templates.          │
 * │ PHASE 3: Intelligence layer for social media publishing.      │
 * │ BACKEND: /api/admin/social-publishing/*                        │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  CalendarDays, Clock, Sparkles, Send, Copy, Check,
  TrendingUp, Loader, Megaphone, FileText,
} from 'lucide-react';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
} from './marketing.styles';

// ── Styled Components ──
const TabBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
  padding-bottom: 10px;
`;

const Tab = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: 8px 16px;
  border-radius: 8px 8px 0 0;
  border: none;
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 2px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  transition: all 0.15s;

  &:hover { color: var(--accent-primary, #60C0F0); }
`;

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 20px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const DayCard = styled.div<{ $isToday: boolean }>`
  padding: 14px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $isToday }) => $isToday ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.1)'};
  min-height: 140px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DayLabel = styled.div<{ $isToday: boolean }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $isToday }) => $isToday ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
`;

const DateLabel = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
`;

const ThemeBadge = styled.div`
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #8B5CF6;
`;

const SuggestionText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  line-height: 1.4;
  flex: 1;
`;

const TimeChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--accent-primary, #60C0F0);
`;

// ── Best Times ──
const PlatformRow = styled.div`
  padding: 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
  margin-bottom: 10px;
`;

const PlatformName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PeakBadge = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.25);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #C6A84B;
`;

const TimeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
`;

const TimeSlot = styled.span`
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.08);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--accent-primary, #60C0F0);
`;

const PlatformNote = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  margin-top: 6px;
`;

// ── Templates ──
const TemplateCard = styled.div`
  padding: 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.1);
  margin-bottom: 10px;
`;

const TemplateHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const TemplateName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const FreqBadge = styled.span`
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.08);
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  text-transform: capitalize;
`;

const TemplateBody = styled.pre`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0 0 10px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.5);
`;

const CopyBtn = styled.button`
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;

  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

const LoadingCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

// ── Types ──
interface Suggestion {
  date: string;
  dayName: string;
  theme: string;
  suggestedContent: string;
  category: string;
  bestTime: string;
  hashtags: string;
}

interface PlatformBestTimes {
  best: { day: string; times: string[] }[];
  peakDay: string;
  peakTime: string;
  note: string;
}

interface Template {
  id: string;
  name: string;
  template: string;
  category: string;
  frequency: string;
}

type SubTab = 'calendar' | 'best-times' | 'templates';

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  bluesky: 'BlueSky',
};

const ContentCalendarPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('calendar');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bestTimes, setBestTimes] = useState<Record<string, PlatformBestTimes>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, timesRes, tplRes] = await Promise.all([
        fetch('/api/admin/social-publishing/calendar-suggestions', { headers }),
        fetch('/api/admin/social-publishing/best-times', { headers }),
        fetch('/api/admin/social-publishing/auto-post-templates', { headers }),
      ]);
      const [calData, timesData, tplData] = await Promise.all([
        calRes.json(), timesRes.json(), tplRes.json(),
      ]);
      if (calData.success) setSuggestions(calData.data);
      if (timesData.success) setBestTimes(timesData.data);
      if (tplData.success) setTemplates(tplData.data);
    } catch { /* best-effort */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) {
    return (
      <MarketingCard>
        <LoadingCenter>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Loading content intelligence...
        </LoadingCenter>
      </MarketingCard>
    );
  }

  return (
    <>
      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap><Sparkles size={18} /></IconWrap>
            <div>
              <CardTitle>Content Intelligence</CardTitle>
              <CardSubtitle>AI calendar suggestions, optimal timing, auto-post templates</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        <TabBar>
          <Tab $active={subTab === 'calendar'} onClick={() => setSubTab('calendar')}>
            <CalendarDays size={14} /> 7-Day Calendar
          </Tab>
          <Tab $active={subTab === 'best-times'} onClick={() => setSubTab('best-times')}>
            <Clock size={14} /> Best Times
          </Tab>
          <Tab $active={subTab === 'templates'} onClick={() => setSubTab('templates')}>
            <FileText size={14} /> Auto-Post Templates
          </Tab>
        </TabBar>

        {/* 7-Day Calendar */}
        {subTab === 'calendar' && (
          <WeekGrid>
            {suggestions.map(s => (
              <DayCard key={s.date} $isToday={s.date === today}>
                <DayLabel $isToday={s.date === today}>{s.dayName}</DayLabel>
                <DateLabel>{s.date}</DateLabel>
                <ThemeBadge>{s.theme}</ThemeBadge>
                <SuggestionText>{s.suggestedContent}</SuggestionText>
                <TimeChip><Clock size={10} /> Post at {s.bestTime}</TimeChip>
              </DayCard>
            ))}
          </WeekGrid>
        )}

        {/* Best Times */}
        {subTab === 'best-times' && (
          <>
            {Object.entries(bestTimes).map(([platform, data]) => (
              <PlatformRow key={platform}>
                <PlatformName>
                  {PLATFORM_NAMES[platform] || platform}
                  <PeakBadge>Peak: {data.peakDay} {data.peakTime}</PeakBadge>
                </PlatformName>
                {data.best.map(day => (
                  <div key={day.day} style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, color: 'rgba(224, 236, 244, 0.6)', display: 'inline-block', width: 80 }}>
                      {day.day}
                    </span>
                    <TimeGrid style={{ display: 'inline-flex' }}>
                      {day.times.map(t => <TimeSlot key={t}>{t}</TimeSlot>)}
                    </TimeGrid>
                  </div>
                ))}
                <PlatformNote>{data.note}</PlatformNote>
              </PlatformRow>
            ))}
          </>
        )}

        {/* Auto-Post Templates */}
        {subTab === 'templates' && (
          <>
            {templates.map(tpl => (
              <TemplateCard key={tpl.id}>
                <TemplateHeader>
                  <TemplateName>{tpl.name}</TemplateName>
                  <FreqBadge>{tpl.frequency}</FreqBadge>
                </TemplateHeader>
                <TemplateBody>{tpl.template}</TemplateBody>
                <CopyBtn onClick={() => handleCopy(tpl.template, tpl.id)}>
                  {copiedId === tpl.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy to Clipboard</>}
                </CopyBtn>
              </TemplateCard>
            ))}
          </>
        )}
      </MarketingCard>
    </>
  );
};

export default ContentCalendarPanel;
