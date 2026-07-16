/**
 * ============================================================================
 * FILE: useCreatePostForm.ts
 * PURPOSE: State and submission logic for the Social Feed create-post card
 * AUTHOR: Claude Opus 4.6 | UPDATED BY: Codex | LAST MODIFIED: 2026-06-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages the shared composer state, media upload previews,
 * category inference, and post submission. Workout-specific details are delegated
 * to useWorkoutAttachmentBuilder so the feed CTA can open real workout details.
 *
 * HOW IT FITS IN THE APP: CreatePostCard consumes this hook and passes the return
 * values into the presentational Social Feed composer components.
 *
 * KEY DECISIONS: Keep this hook as the thin orchestrator. The workout builder
 * owns workout stats, history selection, Rolodex exercises, and workoutData shape.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useSocialFeed } from '../../../../hooks/social/useSocialFeed';
import { useCelebrationTriggers } from '../../../../hooks/useCelebrationTriggers';
import { useToast } from '../../../../hooks/use-toast';

import type { CategorySuggestion, PostType, Visibility } from '../types/CreatePostTypes';
import { appendHashtag, inferSmartPostIntent } from '../utils/postIntentInference';
import { useWorkoutAttachmentBuilder } from './useWorkoutAttachmentBuilder';

const CORE_SUGGESTION_TYPES = new Set<PostType>([
  'workout',
  'transformation',
  'achievement',
  'challenge',
]);

export function useCreatePostForm() {
  const { user, authAxios } = useAuth();
  const { createPost, isCreatingPost } = useSocialFeed();
  const { triggerFromResult } = useCelebrationTriggers();
  const { error: toastError } = useToast();

  const [postContent, setPostContent] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [postType, setPostType] = useState<PostType>('general');
  const [showCreateOptions, setShowCreateOptions] = useState(false);

  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const createCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeImageRef = useRef<HTMLInputElement>(null);
  const afterImageRef = useRef<HTMLInputElement>(null);

  const workoutAttachment = useWorkoutAttachmentBuilder(authAxios, setPostContent);
  const {
    workoutStats,
    setWorkoutStats,
    showWorkoutHistory,
    workoutHistory,
    isLoadingHistory,
    workoutExercises,
    hasWorkoutDraft,
    fetchWorkoutHistory,
    selectWorkoutFromHistory,
    addWorkoutExercise,
    addCustomWorkoutExercise,
    updateWorkoutExercise,
    removeWorkoutExercise,
    buildWorkoutData,
    resetWorkoutAttachment,
  } = workoutAttachment;

  useEffect(() => {
    return () => {
      [mediaPreview, beforePreview, afterPreview].forEach((url) => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [mediaPreview, beforePreview, afterPreview]);

  const smartIntent = useMemo(
    () => inferSmartPostIntent(postContent, postType),
    [postContent, postType],
  );

  const categorySuggestion = useMemo<CategorySuggestion | null>(() => {
    if (
      postType !== 'general' ||
      smartIntent.submissionType === 'general' ||
      !CORE_SUGGESTION_TYPES.has(smartIntent.submissionType)
    ) {
      return null;
    }

    return {
      suggested: smartIntent.submissionType,
      confidence: smartIntent.confidence,
      reason: smartIntent.reason,
    };
  }, [postType, smartIntent]);

  const addHashtagToContent = useCallback((hashtag: string) => {
    setPostContent((current) => appendHashtag(current, hashtag));
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file.size > maxSize) {
      toastError(`File size exceeds ${isVideo ? '50MB' : '10MB'} limit`);
      return;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toastError('Only image and video files are allowed');
      return;
    }

    if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMedia(file);

    if (isVideo) {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [mediaPreview, toastError]);

  const handleRemoveMedia = useCallback(() => {
    if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [mediaPreview]);

  const handleBeforeImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    setBeforeImage(event.target.files[0]);
    const reader = new FileReader();
    reader.onload = () => setBeforePreview(reader.result as string);
    reader.readAsDataURL(event.target.files[0]);
  }, []);

  const handleAfterImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    setAfterImage(event.target.files[0]);
    const reader = new FileReader();
    reader.onload = () => setAfterPreview(reader.result as string);
    reader.readAsDataURL(event.target.files[0]);
  }, []);

  const handleRemoveBeforeImage = useCallback(() => {
    if (beforePreview?.startsWith('blob:')) URL.revokeObjectURL(beforePreview);
    setBeforeImage(null);
    setBeforePreview(null);
    if (beforeImageRef.current) beforeImageRef.current.value = '';
  }, [beforePreview]);

  const handleRemoveAfterImage = useCallback(() => {
    if (afterPreview?.startsWith('blob:')) URL.revokeObjectURL(afterPreview);
    setAfterImage(null);
    setAfterPreview(null);
    if (afterImageRef.current) afterImageRef.current.value = '';
  }, [afterPreview]);

  const resetForm = useCallback(() => {
    [mediaPreview, beforePreview, afterPreview].forEach((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setPostContent('');
    setMedia(null);
    setMediaPreview(null);
    setBeforeImage(null);
    setAfterImage(null);
    setBeforePreview(null);
    setAfterPreview(null);
    setPostType('general');
    resetWorkoutAttachment();
    setShowCreateOptions(false);
    [fileInputRef, beforeImageRef, afterImageRef].forEach((ref) => {
      if (ref.current) ref.current.value = '';
    });
  }, [mediaPreview, beforePreview, afterPreview, resetWorkoutAttachment]);

  const handleCreatePost = useCallback(async () => {
    if (postType === 'transformation' && !postContent.trim() && !beforeImage && !afterImage) return;
    if (postType === 'workout' && !postContent.trim() && !hasWorkoutDraft) return;
    if (postType !== 'transformation' && postType !== 'workout' && !postContent.trim() && !media) return;

    const typeForSubmit = postType === 'general' ? smartIntent.submissionType : postType;
    const postData: any = { content: postContent, type: typeForSubmit, visibility };

    if (postType === 'transformation') {
      if (beforeImage) postData.media = beforeImage;
      postData.transformationData = { hasBeforeImage: !!beforeImage, hasAfterImage: !!afterImage };
    } else if (postType === 'workout') {
      if (media) postData.media = media;
      postData.workoutData = buildWorkoutData(postContent);
    } else if (media) {
      postData.media = media;
    }

    const result = await createPost(postData);
    if (result?.pointsAwarded) triggerFromResult(result);
    resetForm();
  }, [
    postType,
    postContent,
    beforeImage,
    afterImage,
    hasWorkoutDraft,
    media,
    smartIntent.submissionType,
    visibility,
    buildWorkoutData,
    createPost,
    triggerFromResult,
    resetForm,
  ]);

  const isSubmitDisabled = isCreatingPost || (
    postType === 'transformation' ? (!postContent.trim() && !beforeImage && !afterImage) :
    postType === 'workout' ? (!postContent.trim() && !hasWorkoutDraft) :
    (!postContent.trim() && !media)
  );

  return {
    user,
    postContent,
    setPostContent,
    media,
    mediaPreview,
    visibility,
    setVisibility,
    postType,
    setPostType,
    showCreateOptions,
    setShowCreateOptions,
    beforePreview,
    afterPreview,
    workoutStats,
    setWorkoutStats,
    showWorkoutHistory,
    workoutHistory,
    isLoadingHistory,
    workoutExercises,
    categorySuggestion,
    smartIntent,
    addHashtagToContent,
    createCardRef,
    fileInputRef,
    beforeImageRef,
    afterImageRef,
    isCreatingPost,
    isSubmitDisabled,
    handleCreatePost,
    handleFileSelect,
    handleRemoveMedia,
    handleBeforeImageSelect,
    handleAfterImageSelect,
    handleRemoveBeforeImage,
    handleRemoveAfterImage,
    fetchWorkoutHistory,
    selectWorkoutFromHistory,
    addWorkoutExercise,
    addCustomWorkoutExercise,
    updateWorkoutExercise,
    removeWorkoutExercise,
  };
}
