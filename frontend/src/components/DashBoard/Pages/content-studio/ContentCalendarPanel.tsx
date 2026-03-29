/**
 * ┌─── SUB-COMPONENT: ContentCalendarPanel ──────────────────────┐
 * │ PARENT: ContentStudioHub                                      │
 * │ PURPOSE: Weekly content planner with AI topic suggestions     │
 * │ WIREFRAME:                                                    │
 * │ ┌─���────────────────────────────────────────────┐              │
 * │ │ Content Calendar          [← Week →] [AI ✨] │              │
 * │ │ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐ │              │
 * │ │ │Mon ││Tue ││Wed ││Thu ││Fri ││Sat ││Sun │ │              │
 * │ │ │    ││    ││    ││    ││    ││    ││    │ │              │
 * │ │ └────┘└────┘└────┘└────┘└────┘└────┘└────┘ │              │
 * │ │ AI Suggested Topics:                         │              │
 * │ │ [Leg Day Form] [NASM Phase 3] [Recovery]    │              │
 * │ └──────────────────────────────────────────────┘              │
 * │ Props: (none)                                                 │
 * │ CLICK-OUTCOMES:                                               │
 * │ [Day cell] → Opens add content modal                          │
 * │ [AI suggest] → GET /api/oracle/trends → topic chips           │
 * │ [Topic chip] → Pre-fills content for that day                 │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import {
  CalendarDays, ChevronLeft, ChevronRight, Sparkles, Plus,
  Video, Mic2, FileText, X, Loader2,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ──────────────────────────────────────────────────────────��──
type ContentType = 'video' | 'voiceover' | 'post' | 'reel';

interface CalendarItem {
  id: string;
  day: number; // 0=Mon..6=Sun
  title: string;
  type: ContentType;
  platform: string;
  time: string;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ReactNode; color: string }> = {
  video: { label: 'Video', icon: <Video size={12} />, color: '#60C0F0' },
  voiceover: { label: 'Voiceover', icon: <Mic2 size={12} />, color: '#8B5CF6' },
  post: { label: 'Post', icon: <FileText size={12} />, color: '#C6A84B' },
  reel: { label: 'Reel', icon: <Video size={12} />, color: '#F59E0B' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrap = styled.div`padding: 24px;`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
`;

const WeekNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { border-color: var(--accent-primary, rgba(96, 192, 240, 0.25)); }
`;

const WeekLabel = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  min-width: 180px;
  text-align: center;
`;

const AiBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid rgba(198, 168, 75, 0.25);
  background: rgba(198, 168, 75, 0.08);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { background: rgba(198, 168, 75, 0.15); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 24px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const DayCell = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 10px;
  min-height: 140px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease;

  &:hover { border-color: var(--accent-primary, rgba(96, 192, 240, 0.2)); }
`;

const DayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const DayName = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

const AddBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 6px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.15));
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { color: var(--accent-primary, #60C0F0); border-color: var(--accent-primary, rgba(96, 192, 240, 0.3)); }
`;

const ItemChip = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 12%, transparent)`};
  border: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 25%, transparent)`};
  font-size: 0.65rem;
  font-weight: 500;
  color: ${({ $color }) => $color};
  margin-bottom: 4px;
  cursor: default;
`;

const RemoveBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: none;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: auto;
  &:hover { opacity: 1; }
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

// AI Suggestions
const SuggestionsSection = styled.div`margin-top: 8px;`;

const SugTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SugGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SugChip = styled.button`
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(198, 168, 75, 0.2);
  background: rgba(198, 168, 75, 0.06);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: rgba(198, 168, 75, 0.12); border-color: rgba(198, 168, 75, 0.35); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ContentCalendarPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Week date range
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const fetchSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const res = await authAxios.get('/api/oracle/trends', { params: { q: 'fitness personal training' } });
      const topics = res.data?.trends?.risingQueries?.slice(0, 8)?.map((t: any) => t.query || t) || [];
      if (topics.length > 0) {
        setSuggestions(topics);
      } else {
        // Fallback suggestions
        setSuggestions([
          'Leg Day Form Guide', 'NASM Phase 3 Hypertrophy', '5 Min Recovery Routine',
          'Proper Deadlift Setup', 'Client Transformation Story', 'Weekly Workout Recap',
          'Nutrition Tip: Post-Workout', 'Stretching vs Flexibility',
        ]);
      }
    } catch {
      setSuggestions([
        'Leg Day Form Guide', 'NASM Phase 3 Hypertrophy', '5 Min Recovery Routine',
        'Proper Deadlift Setup', 'Client Transformation Story', 'Weekly Workout Recap',
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [authAxios]);

  const addItem = (day: number, title: string, type: ContentType = 'video') => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      day,
      title,
      type,
      platform: type === 'reel' ? 'Instagram' : 'YouTube',
      time: '10:00 AM',
    }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSuggestionClick = (topic: string) => {
    // Find first empty day or append to Monday
    const dayCounts = Array(7).fill(0);
    items.forEach(i => dayCounts[i.day]++);
    const targetDay = dayCounts.indexOf(Math.min(...dayCounts));
    addItem(targetDay, topic, 'video');
  };

  return (
    <Wrap>
      <HeaderRow>
        <WeekNav>
          <NavBtn onClick={() => setWeekOffset(prev => prev - 1)} aria-label="Previous week">
            <ChevronLeft size={16} />
          </NavBtn>
          <WeekLabel>{weekLabel}</WeekLabel>
          <NavBtn onClick={() => setWeekOffset(prev => prev + 1)} aria-label="Next week">
            <ChevronRight size={16} />
          </NavBtn>
        </WeekNav>
        <AiBtn onClick={fetchSuggestions} disabled={loadingSuggestions}>
          {loadingSuggestions ? <Loader2 size={14} /> : <Sparkles size={14} />}
          AI Suggest Topics
        </AiBtn>
      </HeaderRow>

      <CalendarGrid>
        {DAY_NAMES.map((dayName, dayIndex) => {
          const dayItems = items.filter(i => i.day === dayIndex);
          return (
            <DayCell key={dayIndex}>
              <DayHeader>
                <DayName>{dayName}</DayName>
                <AddBtn onClick={() => addItem(dayIndex, 'New Content')} aria-label={`Add to ${dayName}`}>
                  <Plus size={12} />
                </AddBtn>
              </DayHeader>
              <ItemsList>
                {dayItems.map(item => {
                  const cfg = CONTENT_TYPE_CONFIG[item.type];
                  return (
                    <ItemChip key={item.id} $color={cfg.color}>
                      {cfg.icon}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                      <RemoveBtn onClick={() => removeItem(item.id)} aria-label="Remove">
                        <X size={10} />
                      </RemoveBtn>
                    </ItemChip>
                  );
                })}
              </ItemsList>
            </DayCell>
          );
        })}
      </CalendarGrid>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <SuggestionsSection>
          <SugTitle><Sparkles size={14} /> AI Topic Suggestions</SugTitle>
          <SugGrid>
            {suggestions.map((topic, i) => (
              <SugChip key={i} onClick={() => handleSuggestionClick(topic)}>
                + {topic}
              </SugChip>
            ))}
          </SugGrid>
        </SuggestionsSection>
      )}
    </Wrap>
  );
};

export default ContentCalendarPanel;
