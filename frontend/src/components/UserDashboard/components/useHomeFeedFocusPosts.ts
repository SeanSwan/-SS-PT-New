/**
 * FILE: useHomeFeedFocusPosts.ts
 * PURPOSE: Fetches the exact Home feed rows needed for a widget drilldown.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Post } from '../../Social/Feed/types/PostCardTypes';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import { postMatchesActivityFocus, type HomeFeedFocus } from './HomeFeedFocus';

interface FocusPostState {
  posts: Post[];
  isLoading: boolean;
  error: Error | null;
}

export interface HomeFeedFocusPostsResult extends FocusPostState {
  refetch: () => void;
}

const EMPTY_FOCUS_POSTS: Post[] = [];

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('Unable to load focused posts.');
}

async function loadActivityFocusedPost(
  feed: SocialFeedApi,
  focus: HomeFeedFocus,
): Promise<Post[]> {
  if (focus.kind !== 'activity' || !focus.postId) return [];
  const post = await feed.getPostDetails(focus.postId);
  return post ? [post] : [];
}

export function useHomeFeedFocusPosts(
  focus: HomeFeedFocus,
  feed: SocialFeedApi,
): HomeFeedFocusPostsResult {
  const [state, setState] = useState<FocusPostState>({
    posts: EMPTY_FOCUS_POSTS,
    isLoading: false,
    error: null,
  });
  const [reloadIndex, setReloadIndex] = useState(0);
  const refetch = useCallback(() => setReloadIndex((index) => index + 1), []);

  useEffect(() => {
    let alive = true;

    if (focus.kind === 'all') {
      setState({ posts: EMPTY_FOCUS_POSTS, isLoading: false, error: null });
      return () => { alive = false; };
    }

    if (focus.kind === 'activity' && !focus.postId) {
      setState({
        posts: feed.posts.filter((post) => postMatchesActivityFocus(post, focus)),
        isLoading: false,
        error: null,
      });
      return () => { alive = false; };
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    async function loadFocusedPosts() {
      try {
        const posts = focus.kind === 'hashtag'
          ? await feed.getPostsByHashtag(focus.hashtag)
          : await loadActivityFocusedPost(feed, focus);

        if (alive) setState({ posts, isLoading: false, error: null });
      } catch (error) {
        if (alive) setState({ posts: EMPTY_FOCUS_POSTS, isLoading: false, error: toError(error) });
      }
    }

    void loadFocusedPosts();
    return () => { alive = false; };
  }, [feed, feed.posts, focus, reloadIndex]);

  return { ...state, refetch };
}