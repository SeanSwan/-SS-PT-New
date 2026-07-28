/**
 * FILE: HomeTabTrendingPanel.tsx
 * PURPOSE: Real-data trending topic panel for the /user-dashboard Home rail.
 */

import React, { useMemo } from 'react';
import { compactNumber } from './HomeTabVision.data';
import type { TrendingTagSummary } from './HomeTabViewModel';
import { Chip } from './HomeTabVisionCards.styles';
import { Eyebrow, Panel } from './HomeTabVision.styles';
import {
  EmptyState,
  RailHeader,
  TagName,
  TrendCopy,
  TrendCount,
  TrendMeter,
  TrendMeterFill,
  TrendRank,
  TrendSignal,
  TrendingGrid,
} from './HomeTabVisionRightRail.styles';
import { TrendingRow } from './HomeTabVisionRailButtons.styles';

interface HomeTabTrendingPanelProps {
  trendingTags: TrendingTagSummary[];
  trendingLoading: boolean;
  onSelectTag: (tag: TrendingTagSummary) => void;
}

function trendPercent(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  return Math.max(18, Math.round((count / maxCount) * 100));
}

const HomeTabTrendingPanel: React.FC<HomeTabTrendingPanelProps> = ({
  trendingTags,
  trendingLoading,
  onSelectTag,
}) => {
  const maxTrendCount = useMemo(
    () => trendingTags.reduce((max, tag) => Math.max(max, tag.count), 0),
    [trendingTags],
  );

  return (
    <Panel aria-labelledby="home-trending-heading">
      <RailHeader>
        <Eyebrow id="home-trending-heading">Trending</Eyebrow>
        <Chip $tone={trendingLoading ? 'violet' : 'cyan'}>
          {trendingLoading ? 'Syncing' : `${trendingTags.length} signals`}
        </Chip>
      </RailHeader>

      {trendingTags.length ? (
        <TrendingGrid role="list" aria-label="Trending community topics">
          {trendingTags.map((tag, index) => {
            const hasCount = tag.count > 0;
            const countLabel = hasCount ? `${compactNumber(tag.count)} posts` : 'New signal';

            return (
              <div key={tag.name} role="listitem">
                <TrendingRow
                  type="button"
                  aria-label={`Open #${tag.name} posts, ${countLabel}`}
                  onClick={() => onSelectTag(tag)}
                >
                  <TrendRank aria-hidden="true">{String(index + 1).padStart(2, '0')}</TrendRank>
                  <TrendCopy>
                    <TagName>#{tag.name}</TagName>
                    <TrendSignal>{hasCount ? 'Community momentum' : 'Awaiting first posts'}</TrendSignal>
                    <TrendMeter aria-hidden="true">
                      <TrendMeterFill $pct={trendPercent(tag.count, maxTrendCount)} $active={hasCount} />
                    </TrendMeter>
                  </TrendCopy>
                  <TrendCount>
                    {hasCount ? compactNumber(tag.count) : 'New'}
                    <span>{hasCount ? 'posts' : 'tag'}</span>
                  </TrendCount>
                </TrendingRow>
              </div>
            );
          })}
        </TrendingGrid>
      ) : (
        <EmptyState>{trendingLoading ? 'Loading trend signals.' : 'No trending tags yet.'}</EmptyState>
      )}
    </Panel>
  );
};

export default HomeTabTrendingPanel;
