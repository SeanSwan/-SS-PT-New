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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SocialFeedApi } from '../../../hooks/social/useSocialFeed';
import { reviewSwanAuraPostDraft } from './SwanAuraComposeReview';
import { validateHomeComposerMediaFile } from './HomeComposerMediaPolicy';
import { buildHomePostPayload, previewHomePostIntent } from './HomeTabViewModel';

export { HOME_COMPOSER_ACCEPT } from './HomeComposerMediaPolicy';

interface UseHomeComposerInput {
  createPost: SocialFeedApi['createPost'];
  isCreatingPost: boolean;
  /** Newest logged session id from the training proof - null when unlogged. */
  latestSessionId: string | null;
}

function useHomeComposer({ createPost, isCreatingPost, latestSessionId }: UseHomeComposerInput) {
  const [postText, setPostText] = useState('');
  const [activeMood, setActiveMood] = useState('community');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedMediaPreviewUrl, setSelectedMediaPreviewUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  // O3 workout-proof share: the latest logged session rides the next post as
  // a REAL workout link (workoutSessionId) when armed by "Share my week".
  const [pendingProofSessionId, setPendingProofSessionId] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const canPost = postText.trim().length >= 3 && !isCreatingPost;

  useEffect(() => {
    if (!selectedMedia) {
      setSelectedMediaPreviewUrl(null);
      return undefined;
    }

    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setSelectedMediaPreviewUrl(null);
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedMedia);
    setSelectedMediaPreviewUrl(previewUrl);

    return () => {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [selectedMedia]);

  const postIntentPreview = useMemo(
    () => (postText.trim().length >= 3 ? previewHomePostIntent(postText, activeMood) : null),
    [activeMood, postText],
  );

  const swanAuraReview = useMemo(
    () => reviewSwanAuraPostDraft(postText),
    [postText],
  );

  const clearSelectedMedia = useCallback(() => {
    setSelectedMedia(null);
    setMediaError(null);
  }, []);

  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] || null;
    const validation = validateHomeComposerMediaFile(file);
    setSelectedMedia(validation.accepted ? file : null);
    setMediaError(validation.error);
    event.currentTarget.value = '';
  };

  // O3: "Share my week" prefills the composer AND arms the workout-proof
  // attachment - the post ships typed 'workout' with the real session link.
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
    setMediaError(null);
    setPendingProofSessionId(null);
  };

  return {
    postText,
    setPostText,
    activeMood,
    setActiveMood,
    selectedMedia,
    selectedMediaPreviewUrl,
    mediaError,
    mediaInputRef,
    proofAttached: !!pendingProofSessionId,
    canPost,
    postIntentPreview,
    swanAuraReview,
    clearSelectedMedia,
    handleMediaSelect,
    handleShareProgress,
    submitPost,
  };
}

export default useHomeComposer;
