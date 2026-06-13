/**
 * ============================================================================
 * FILE: useHomeComposer.ts
 * PURPOSE: Quick Post composer state for the Home tab (workstream O3,
 *          extracted from HomeTab for the rule-4 cap). Owns the text, mood,
 *          media pick, the live smart-intent preview, and the workout-proof
 *          attachment: "Share my week" arms the latest logged session so the
 *          post ships typed 'workout' with the REAL workoutSessionId link.
 * HOW IT FITS: HomeTab mounts it with the stateful feed's createPost; the
 *          values feed HomeTabVisionCenter's composer panel.
 * ============================================================================
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import { buildHomePostPayload, previewHomePostIntent } from './HomeTabViewModel';

interface UseHomeComposerInput {
  createPost: SocialFeedApi['createPost'];
  isCreatingPost: boolean;
  /** Newest logged session id from the training proof — null when unlogged. */
  latestSessionId: string | null;
}

function useHomeComposer({ createPost, isCreatingPost, latestSessionId }: UseHomeComposerInput) {
  const [postText, setPostText] = useState('');
  const [activeMood, setActiveMood] = useState('achievement');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  // O3 workout-proof share: the latest logged session rides the next post as
  // a REAL workout link (workoutSessionId) when armed by "Share my week".
  const [pendingProofSessionId, setPendingProofSessionId] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const canPost = postText.trim().length >= 3 && !isCreatingPost;

  const postIntentPreview = useMemo(
    () => (postText.trim().length >= 3 ? previewHomePostIntent(postText, activeMood) : null),
    [activeMood, postText],
  );

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] || null;
    setSelectedMedia(file);
    event.currentTarget.value = '';
  };

  // O3: "Share my week" prefills the composer AND arms the workout-proof
  // attachment — the post ships typed 'workout' with the real session link.
  const handleShareProgress = useCallback((line: string) => {
    setPostText(line);
    setActiveMood('workout');
    setPendingProofSessionId(latestSessionId);
  }, [latestSessionId]);

  const submitPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPost) return;
    const payload = buildHomePostPayload(postText, activeMood, selectedMedia);
    // O3: posts land through the stateful feed (instant prepend, points
    // toast) with the workout-proof session link attached when armed.
    const created = await createPost(
      pendingProofSessionId ? { ...payload, workoutSessionId: pendingProofSessionId } : payload,
    );
    if (!created) return;
    setPostText('');
    setSelectedMedia(null);
    setPendingProofSessionId(null);
  };

  return {
    postText,
    setPostText,
    activeMood,
    setActiveMood,
    selectedMedia,
    mediaInputRef,
    proofAttached: !!pendingProofSessionId,
    canPost,
    postIntentPreview,
    handleMediaSelect,
    handleShareProgress,
    submitPost,
  };
}

export default useHomeComposer;
