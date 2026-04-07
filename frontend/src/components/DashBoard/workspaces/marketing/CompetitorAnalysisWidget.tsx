/**
 * ┌─── PANEL: Competitor Analysis ──────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Track 3-5 local competitors. Compare social        │
 * │          following, reviews, keywords, pricing. Trend        │
 * │          sparklines for follower growth.                     │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Users, Star, Globe, Plus } from 'lucide-react';
import { VictoryLine } from 'victory';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ActionButton, DataTable,
} from './marketing.styles';
import type { CompetitorProfile, SocialPlatform } from './marketing.types';

// ─── Demo Data ─────────────────────────────────────────────────
const SWAN_STUDIOS: CompetitorProfile = {
  id: 'swan', name: 'SwanStudios', website: 'sswanstudios.com',
  socialFollowers: { instagram: 245, facebook: 180, x: 92 },
  reviewScore: 5.0, reviewCount: 8,
  topKeywords: ['personal trainer', 'golf fitness', 'youth athlete training'],
  estimatedPricing: 'Premium ($80-150/session)',
  followerTrend: [50, 80, 120, 160, 200, 245],
};

const DEMO_COMPETITORS: CompetitorProfile[] = [
  {
    id: '1', name: 'Iron Athletics PT', website: 'ironathleticspt.com',
    socialFollowers: { instagram: 1200, facebook: 890, x: 340 },
    reviewScore: 4.6, reviewCount: 42,
    topKeywords: ['personal training', 'weight loss', 'strength training'],
    estimatedPricing: 'Standard ($50-80/session)',
    followerTrend: [800, 850, 920, 1000, 1100, 1200],
  },
  {
    id: '2', name: 'Pinnacle Fitness Studio', website: 'pinnaclefitness.com',
    socialFollowers: { instagram: 2800, facebook: 1500, x: 210 },
    reviewScore: 4.3, reviewCount: 67,
    topKeywords: ['group classes', 'personal training', 'nutrition coaching'],
    estimatedPricing: 'Mid-range ($40-70/session)',
    followerTrend: [1800, 2000, 2200, 2400, 2600, 2800],
  },
  {
    id: '3', name: 'CoreFlex Training', website: 'coreflextraining.com',
    socialFollowers: { instagram: 580, facebook: 320, x: 45 },
    reviewScore: 4.8, reviewCount: 23,
    topKeywords: ['functional training', 'flexibility', 'rehab fitness'],
    estimatedPricing: 'Premium ($75-120/session)',
    followerTrend: [200, 280, 350, 420, 500, 580],
  },
];

// ─── Styled Components ─────────────────────────────────────────
const CompGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const CompCard = styled(MarketingCard)<{ $selected: boolean }>`
  padding: 16px;
  cursor: pointer;
  border-color: ${({ $selected }) =>
    $selected ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-subtle, rgba(96, 192, 240, 0.12))'};
  transition: all 0.15s;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const CompName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 2px;
`;

const CompWebsite = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 10px;
`;

const MetricRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
`;

const MetricLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  min-width: 60px;
`;

const MetricValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
`;

const ReviewStars = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${CHART_COLORS.gildedFern};
`;

const SparkWrap = styled.div`
  width: 100%;
  height: 40px;
  margin-top: 8px;
`;

const SocialRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const SocialBadge = styled.div<{ $platform: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${({ $platform }) =>
    $platform === 'instagram' ? 'rgba(228, 64, 95, 0.1)' :
    $platform === 'facebook' ? 'rgba(24, 119, 242, 0.1)' :
    'rgba(224, 236, 244, 0.08)'};
  color: ${({ $platform }) =>
    $platform === 'instagram' ? '#E4405F' :
    $platform === 'facebook' ? '#1877F2' :
    '#E0ECF4'};
`;

const KeywordList = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const KwChip = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.08);
  color: var(--accent-primary, #60C0F0);
`;

const CompareSection = styled.div`
  margin-top: 24px;
`;

const VsLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CompareRow = styled.tr`
  && td:first-child {
    font-family: 'Sora', sans-serif;
    font-weight: 600;
    color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  }
`;

const WinCell = styled.td<{ $win: boolean }>`
  && {
    color: ${({ $win }) => $win ? '#10B981' : 'var(--text-primary, #E0ECF4)'};
    font-weight: ${({ $win }) => $win ? 700 : 400};
  }
`;

// ─── Sparkline ─────────────────────────────────────────────────
const GrowthSparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color }) => (
  <SparkWrap>
    <VictoryLine
      data={data.map((y, x) => ({ x, y }))}
      style={{ data: { stroke: color || CHART_COLORS.iceWing, strokeWidth: 2 } }}
      height={40}
      padding={{ top: 4, bottom: 4, left: 2, right: 2 }}
      animate={{ duration: 400 }}
    />
  </SparkWrap>
);

// ─── Component ─────────────────────────────────────────────────
const CompetitorAnalysisWidget: React.FC = () => {
  const [selected, setSelected] = useState<string | null>('1');
  const competitor = DEMO_COMPETITORS.find(c => c.id === selected);

  const totalFollowers = (p: CompetitorProfile) =>
    Object.values(p.socialFollowers).reduce((a, b) => a + b, 0);

  return (
    <>
      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg={hexAlpha(CHART_COLORS.wingPurple, 0.15)} $color={CHART_COLORS.wingPurple}>
              <Users size={18} />
            </IconWrap>
            <div>
              <CardTitle>Competitor Analysis</CardTitle>
              <CardSubtitle>{DEMO_COMPETITORS.length} competitors tracked</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        <CompGrid>
          {DEMO_COMPETITORS.map(comp => (
            <CompCard key={comp.id} $selected={selected === comp.id} onClick={() => setSelected(comp.id)}>
              <CompName>{comp.name}</CompName>
              <CompWebsite>{comp.website}</CompWebsite>

              <MetricRow>
                <MetricLabel>Followers</MetricLabel>
                <SocialRow>
                  {(Object.entries(comp.socialFollowers) as [SocialPlatform, number][]).map(([p, count]) => (
                    <SocialBadge key={p} $platform={p}>
                      {p === 'instagram' ? 'IG' : p === 'facebook' ? 'FB' : 'X'}: {count.toLocaleString()}
                    </SocialBadge>
                  ))}
                </SocialRow>
              </MetricRow>

              <MetricRow>
                <MetricLabel>Reviews</MetricLabel>
                <ReviewStars>
                  <Star size={14} fill="#C6A84B" />
                  <MetricValue>{comp.reviewScore}</MetricValue>
                  <span style={{ fontSize: 11, color: 'rgba(224,236,244,0.85)' }}>({comp.reviewCount})</span>
                </ReviewStars>
              </MetricRow>

              <MetricRow>
                <MetricLabel>Pricing</MetricLabel>
                <MetricValue style={{ fontSize: 12 }}>{comp.estimatedPricing}</MetricValue>
              </MetricRow>

              <KeywordList>
                {comp.topKeywords.map(kw => <KwChip key={kw}>{kw}</KwChip>)}
              </KeywordList>

              <GrowthSparkline data={comp.followerTrend} color={CHART_COLORS.wingPurple} />
            </CompCard>
          ))}
        </CompGrid>
      </MarketingCard>

      {competitor && (
        <CompareSection>
          <MarketingCard>
            <VsLabel>
              <Globe size={14} />
              SwanStudios vs {competitor.name}
            </VsLabel>
            <div style={{ overflowX: 'auto' }}>
              <DataTable>
                <thead>
                  <tr><th>Metric</th><th>SwanStudios</th><th>{competitor.name}</th></tr>
                </thead>
                <tbody>
                  <CompareRow>
                    <td>Total Followers</td>
                    <WinCell $win={totalFollowers(SWAN_STUDIOS) > totalFollowers(competitor)}>
                      {totalFollowers(SWAN_STUDIOS).toLocaleString()}
                    </WinCell>
                    <WinCell $win={totalFollowers(competitor) > totalFollowers(SWAN_STUDIOS)}>
                      {totalFollowers(competitor).toLocaleString()}
                    </WinCell>
                  </CompareRow>
                  <CompareRow>
                    <td>Review Score</td>
                    <WinCell $win={SWAN_STUDIOS.reviewScore >= competitor.reviewScore}>
                      {SWAN_STUDIOS.reviewScore} ({SWAN_STUDIOS.reviewCount} reviews)
                    </WinCell>
                    <WinCell $win={competitor.reviewScore > SWAN_STUDIOS.reviewScore}>
                      {competitor.reviewScore} ({competitor.reviewCount} reviews)
                    </WinCell>
                  </CompareRow>
                  <CompareRow>
                    <td>Pricing Tier</td>
                    <td>{SWAN_STUDIOS.estimatedPricing}</td>
                    <td>{competitor.estimatedPricing}</td>
                  </CompareRow>
                  <CompareRow>
                    <td>Keyword Overlap</td>
                    <td colSpan={2}>
                      <KeywordList>
                        {SWAN_STUDIOS.topKeywords.filter(kw =>
                          competitor.topKeywords.includes(kw)
                        ).map(kw => <KwChip key={kw}>{kw}</KwChip>)}
                        {SWAN_STUDIOS.topKeywords.filter(kw =>
                          competitor.topKeywords.includes(kw)
                        ).length === 0 && <span style={{ fontSize: 12, opacity: 0.85 }}>No overlap</span>}
                      </KeywordList>
                    </td>
                  </CompareRow>
                </tbody>
              </DataTable>
            </div>
          </MarketingCard>
        </CompareSection>
      )}
    </>
  );
};

export default CompetitorAnalysisWidget;
