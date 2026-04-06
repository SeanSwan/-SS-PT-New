/**
 * ┌─── PANEL: Keyword Research ─────────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Target keyword suggestions for personal training,   │
 * │          golf fitness, and local SEO. Search volume,         │
 * │          competition, difficulty, and intent tracking.       │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { TrendingUp, Star, StarOff } from 'lucide-react';
import { VictoryLine } from 'victory';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  DataTable, PillTabs, PillTab, CompetitionBadge,
} from './marketing.styles';
import type { KeywordEntry, KeywordCategory } from './marketing.types';

// ─── Demo Data ─────────────────────────────────────────────────
const DEMO_KEYWORDS: KeywordEntry[] = [
  { id: '1', keyword: 'personal trainer near me', volume: 12100, competition: 'high', difficulty: 78, intent: 'transactional', category: 'personal-training', tracked: true, rankTrend: [45, 38, 32, 28, 22, 18] },
  { id: '2', keyword: 'personal training programs', volume: 6600, competition: 'high', difficulty: 72, intent: 'informational', category: 'personal-training', tracked: false, rankTrend: [60, 55, 48, 42, 38, 35] },
  { id: '3', keyword: 'certified personal trainer', volume: 4400, competition: 'medium', difficulty: 65, intent: 'informational', category: 'personal-training', tracked: false, rankTrend: [50, 48, 45, 40, 38, 35] },
  { id: '4', keyword: 'youth athlete training', volume: 1900, competition: 'low', difficulty: 42, intent: 'transactional', category: 'personal-training', tracked: true, rankTrend: [30, 25, 20, 15, 12, 8] },
  { id: '5', keyword: 'golf fitness program', volume: 880, competition: 'low', difficulty: 35, intent: 'transactional', category: 'golf-fitness', tracked: true, rankTrend: [40, 35, 28, 22, 15, 10] },
  { id: '6', keyword: 'golf stretching exercises', volume: 1600, competition: 'low', difficulty: 28, intent: 'informational', category: 'golf-fitness', tracked: false, rankTrend: [55, 50, 42, 38, 30, 25] },
  { id: '7', keyword: 'golf fitness trainer', volume: 590, competition: 'low', difficulty: 22, intent: 'transactional', category: 'golf-fitness', tracked: false, rankTrend: [35, 30, 25, 20, 18, 12] },
  { id: '8', keyword: 'improve golf swing strength', volume: 720, competition: 'medium', difficulty: 45, intent: 'informational', category: 'golf-fitness', tracked: false, rankTrend: [48, 45, 40, 35, 30, 28] },
  { id: '9', keyword: 'personal trainer [your city]', volume: 2400, competition: 'medium', difficulty: 55, intent: 'local', category: 'local-seo', tracked: true, rankTrend: [25, 20, 15, 12, 8, 5] },
  { id: '10', keyword: 'gym near me with personal training', volume: 3200, competition: 'high', difficulty: 68, intent: 'local', category: 'local-seo', tracked: false, rankTrend: [50, 48, 42, 38, 35, 30] },
  { id: '11', keyword: 'best personal trainer [your city]', volume: 1300, competition: 'medium', difficulty: 50, intent: 'local', category: 'local-seo', tracked: true, rankTrend: [35, 28, 22, 15, 10, 6] },
  { id: '12', keyword: 'fitness training [your city]', volume: 1800, competition: 'medium', difficulty: 52, intent: 'local', category: 'local-seo', tracked: false, rankTrend: [40, 38, 32, 28, 22, 18] },
];

const CATEGORIES: { id: KeywordCategory; label: string }[] = [
  { id: 'personal-training', label: 'Personal Training' },
  { id: 'golf-fitness', label: 'Golf Fitness' },
  { id: 'local-seo', label: 'Local SEO' },
];

// ─── Styled Components ─────────────────────────────────────────
const DifficultyBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(96, 192, 240, 0.1);
  max-width: 80px;
`;

const BarFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 3px;
  background: ${({ $pct }) =>
    $pct >= 70 ? '#EF4444' : $pct >= 40 ? '#F59E0B' : '#10B981'};
  transition: width 0.3s ease;
`;

const DiffNum = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  min-width: 24px;
`;

const VolumeCell = styled.td`
  && {
    font-weight: 600;
    color: var(--accent-primary, #60C0F0);
  }
`;

const TrackBtn = styled.button<{ $tracked: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: ${({ $tracked }) => $tracked ? CHART_COLORS.gildedFern : 'rgba(224, 236, 244, 0.3)'};
  transition: color 0.15s;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { color: ${CHART_COLORS.gildedFern}; }
`;

const SparkWrap = styled.div`
  width: 80px;
  height: 30px;
`;

const IntentBadge = styled.span<{ $intent: string }>`
  font-size: 11px;
  font-family: 'Sora', sans-serif;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $intent }) =>
    $intent === 'transactional' ? 'rgba(16, 185, 129, 0.12)' :
    $intent === 'local' ? 'rgba(198, 168, 75, 0.12)' :
    'rgba(96, 192, 240, 0.12)'};
  color: ${({ $intent }) =>
    $intent === 'transactional' ? '#10B981' :
    $intent === 'local' ? '#C6A84B' :
    '#60C0F0'};
`;

const SortHeader = styled.th`
  && { cursor: pointer; user-select: none; }
  &:hover { color: var(--accent-primary, #60C0F0); }
`;

// ─── Sparkline ─────────────────────────────────────────────────
const RankSparkline: React.FC<{ data: number[] }> = ({ data }) => (
  <SparkWrap>
    <VictoryLine
      data={data.map((y, x) => ({ x, y }))}
      style={{ data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2 } }}
      height={30}
      width={80}
      padding={2}
      animate={{ duration: 400 }}
    />
  </SparkWrap>
);

// ─── Component ─────────────────────────────────────────────────
type SortKey = 'volume' | 'difficulty' | 'competition';

const KeywordResearchWidget: React.FC = () => {
  const [category, setCategory] = useState<KeywordCategory>('personal-training');
  const [keywords, setKeywords] = useState(DEMO_KEYWORDS);
  const [sortBy, setSortBy] = useState<SortKey>('volume');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const list = keywords.filter(k => k.category === category);
    return list.sort((a, b) => {
      const compMap = { low: 1, medium: 2, high: 3 };
      const av = sortBy === 'competition' ? compMap[a.competition] : a[sortBy];
      const bv = sortBy === 'competition' ? compMap[b.competition] : b[sortBy];
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [keywords, category, sortBy, sortAsc]);

  const trackedCount = keywords.filter(k => k.tracked).length;

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const toggleTrack = (id: string) => {
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, tracked: !k.tracked } : k));
  };

  return (
    <MarketingCard>
      <CardHeader>
        <HeaderLeft>
          <IconWrap $bg={hexAlpha(CHART_COLORS.iceWing, 0.15)} $color={CHART_COLORS.iceWing}>
            <TrendingUp size={18} />
          </IconWrap>
          <div>
            <CardTitle>Keyword Research</CardTitle>
            <CardSubtitle>{trackedCount} keywords tracked</CardSubtitle>
          </div>
        </HeaderLeft>
      </CardHeader>

      <PillTabs>
        {CATEGORIES.map(cat => (
          <PillTab key={cat.id} $active={category === cat.id} onClick={() => setCategory(cat.id)}>
            {cat.label}
          </PillTab>
        ))}
      </PillTabs>

      <div style={{ overflowX: 'auto' }}>
        <DataTable>
          <thead>
            <tr>
              <th style={{ width: 44 }} />
              <th>Keyword</th>
              <SortHeader onClick={() => handleSort('volume')}>
                Volume {sortBy === 'volume' && (sortAsc ? '↑' : '↓')}
              </SortHeader>
              <SortHeader onClick={() => handleSort('competition')}>
                Competition {sortBy === 'competition' && (sortAsc ? '↑' : '↓')}
              </SortHeader>
              <SortHeader onClick={() => handleSort('difficulty')}>
                Difficulty {sortBy === 'difficulty' && (sortAsc ? '↑' : '↓')}
              </SortHeader>
              <th>Intent</th>
              <th>Rank Trend</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(kw => (
              <tr key={kw.id}>
                <td>
                  <TrackBtn $tracked={!!kw.tracked} onClick={() => toggleTrack(kw.id)} aria-label={kw.tracked ? 'Untrack' : 'Track'}>
                    {kw.tracked ? <Star size={16} /> : <StarOff size={16} />}
                  </TrackBtn>
                </td>
                <td>{kw.keyword}</td>
                <VolumeCell>{kw.volume.toLocaleString()}</VolumeCell>
                <td><CompetitionBadge $level={kw.competition}>{kw.competition}</CompetitionBadge></td>
                <td>
                  <DifficultyBar>
                    <DiffNum>{kw.difficulty}</DiffNum>
                    <BarTrack><BarFill $pct={kw.difficulty} /></BarTrack>
                  </DifficultyBar>
                </td>
                <td><IntentBadge $intent={kw.intent}>{kw.intent}</IntentBadge></td>
                <td>{kw.rankTrend && <RankSparkline data={kw.rankTrend} />}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </MarketingCard>
  );
};

export default KeywordResearchWidget;
