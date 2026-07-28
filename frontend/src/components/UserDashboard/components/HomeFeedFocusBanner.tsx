/**
 * FILE: HomeFeedFocusBanner.tsx
 * PURPOSE: Focused-feed header and empty state for Home social drilldowns.
 */
import React from 'react';
import { ArrowLeft, Hash, Radio } from 'lucide-react';
import {
  FeedFocusBackButton,
  FeedFocusCopy,
  FeedFocusIcon,
  FeedFocusMeta,
  FeedFocusPanel,
  FeedFocusSubtitle,
  FeedFocusTitle,
} from './HomeFeedFocusBanner.styles';
import {
  homeFeedFocusSubtitle,
  homeFeedFocusTitle,
  isHomeFeedFocused,
  type HomeFeedFocus,
} from './HomeFeedFocus';

interface HomeFeedFocusBannerProps {
  focus: HomeFeedFocus;
  resultCount: number;
  loading: boolean;
  onClearFocus: () => void;
}

export const HomeFeedFocusBanner: React.FC<HomeFeedFocusBannerProps> = ({
  focus,
  resultCount,
  loading,
  onClearFocus,
}) => {
  if (!isHomeFeedFocused(focus)) return null;
  const Icon = focus.kind === 'hashtag' ? Hash : Radio;
  const resultLabel = loading
    ? 'Loading exact matches'
    : `${resultCount} ${resultCount === 1 ? 'match' : 'matches'}`;

  return (
    <FeedFocusPanel aria-live="polite">
      <FeedFocusIcon aria-hidden="true">
        <Icon size={17} />
      </FeedFocusIcon>
      <FeedFocusCopy>
        <FeedFocusMeta>{resultLabel}</FeedFocusMeta>
        <FeedFocusTitle>{homeFeedFocusTitle(focus)}</FeedFocusTitle>
        <FeedFocusSubtitle>{homeFeedFocusSubtitle(focus)}</FeedFocusSubtitle>
      </FeedFocusCopy>
      <FeedFocusBackButton type="button" onClick={onClearFocus}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all Home posts
      </FeedFocusBackButton>
    </FeedFocusPanel>
  );
};

