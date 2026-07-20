/**
 * Gallery vNext — photo votes. BIND-ONLY mirror of GalleryPage.tsx:1412-1471: optimistic update with
 * toggle-off semantics, replaced by server-confirmed counts on success, reverted on failure.
 * Same endpoints, same `{ photoId, voteType }` body.
 */
import { useCallback, useEffect, useState } from 'react';
import { castVote, listVotes } from './gallery.api';
import type { PhotoVoteData } from './gallery.types';

const EMPTY: PhotoVoteData = { thumbsUp: 0, thumbsDown: 0, userVote: null };

export interface GalleryVotes {
  votesMap: Record<number, PhotoVoteData>;
  vote(photoId: number, voteType: 1 | -1): Promise<void>;
}

export function useGalleryVotes(slug: string, galleryToken: string | null): GalleryVotes {
  const [votesMap, setVotesMap] = useState<Record<number, PhotoVoteData>>({});

  useEffect(() => {
    if (!slug || !galleryToken) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await listVotes(slug, galleryToken, controller.signal);
        if (data.success) setVotesMap(data.votes || {});
      } catch {
        /* non-critical — votes just won't show */
      }
    })();
    return () => controller.abort();
  }, [slug, galleryToken]);

  const vote = useCallback(
    async (photoId: number, voteType: 1 | -1) => {
      if (!galleryToken) return;
      let previous: PhotoVoteData = EMPTY;

      setVotesMap((map) => {
        const prev = map[photoId] || EMPTY;
        previous = prev;
        const toggleOff = prev.userVote === voteType;
        const next: PhotoVoteData = toggleOff
          ? {
              thumbsUp: prev.thumbsUp - (voteType === 1 ? 1 : 0),
              thumbsDown: prev.thumbsDown - (voteType === -1 ? 1 : 0),
              userVote: null,
            }
          : {
              thumbsUp: prev.thumbsUp + (voteType === 1 ? 1 : 0) - (prev.userVote === 1 ? 1 : 0),
              thumbsDown: prev.thumbsDown + (voteType === -1 ? 1 : 0) - (prev.userVote === -1 ? 1 : 0),
              userVote: voteType,
            };
        return { ...map, [photoId]: next };
      });

      try {
        const data = await castVote(galleryToken, photoId, voteType);
        if (data.success) {
          setVotesMap((map) => ({
            ...map,
            [photoId]: {
              thumbsUp: data.thumbsUp ?? 0,
              thumbsDown: data.thumbsDown ?? 0,
              userVote: data.userVote ?? null,
            },
          }));
        }
      } catch {
        setVotesMap((map) => ({ ...map, [photoId]: previous })); // revert
      }
    },
    [galleryToken],
  );

  return { votesMap, vote };
}
