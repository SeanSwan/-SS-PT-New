/**
 * FILE: useHomeFeedFocusController.ts
 * PURPOSE: Home-owned controller for social widget drilldowns.
 */
import { useCallback, useState } from 'react';
import type { HomeLiveActivityItem, TrendingTagSummary } from './HomeTabViewModel';
import {
  HOME_FEED_ALL_FOCUS,
  buildActivityFeedFocus,
  buildHashtagFeedFocus,
  type HomeFeedFocus,
} from './HomeFeedFocus';

function scrollFocusedFeedIntoView() {
  window.requestAnimationFrame(() => {
    const feedElement = document.getElementById('home-community-feed');
    if (!feedElement) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    feedElement.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    feedElement.focus({ preventScroll: true });
  });
}

export function useHomeFeedFocusController() {
  const [feedFocus, setFeedFocus] = useState<HomeFeedFocus>(HOME_FEED_ALL_FOCUS);

  const clearFeedFocus = useCallback(() => setFeedFocus(HOME_FEED_ALL_FOCUS), []);
  const focusFeed = useCallback((nextFocus: HomeFeedFocus) => {
    setFeedFocus(nextFocus);
    scrollFocusedFeedIntoView();
  }, []);
  const focusActivity = useCallback(
    (item: HomeLiveActivityItem) => focusFeed(buildActivityFeedFocus(item)),
    [focusFeed],
  );
  const focusTrending = useCallback(
    (tag: TrendingTagSummary) => focusFeed(buildHashtagFeedFocus(tag)),
    [focusFeed],
  );

  return { feedFocus, clearFeedFocus, focusActivity, focusTrending };
}
