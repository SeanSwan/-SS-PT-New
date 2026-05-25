/**
 * ============================================================================
 * FILE: useCreatePostForm.ts
 * PURPOSE: Custom hook extracting file handling, workout history, and submission
 *          logic from CreatePostCard orchestrator
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages all mutable state and side-effect callbacks for
 * the CreatePostCard feature — file uploads (general + transformation before/after),
 * workout history fetching/selection, form reset, and post submission with
 * gamification celebration triggers.
 *
 * HOW IT FITS IN THE APP: CreatePostCard.tsx imports this hook and spreads its
 * return value into presentational sub-components (CreatePostForm,
 * CreatePostMediaUpload, etc.).
 *
 * KEY DECISIONS: Extracted from CreatePostCard.tsx to satisfy the 300-line
 * no-monolith rule. All state that was local to CreatePostCard now lives here;
 * the component becomes a thin render shell.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useSocialFeed } from '../../../../hooks/social/useSocialFeed';
import { useCelebrationTriggers } from '../../../../hooks/useCelebrationTriggers';
import { useToast } from '../../../../hooks/use-toast';

import type {
  PostType, Visibility, WorkoutSession, WorkoutSessionsResponse, WorkoutStats,
  CategorySuggestion,
} from '../types/CreatePostTypes';
import { appendHashtag, inferSmartPostIntent } from '../utils/postIntentInference';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// PURPOSE: Default state values reused on reset
// ─────────────────────────────────────────────────────────────

const EMPTY_WORKOUT_STATS: WorkoutStats = {
  duration: '', exerciseCount: '', totalWeight: '', caloriesBurned: '',
};

const CORE_SUGGESTION_TYPES = new Set<PostType>([
  'workout',
  'transformation',
  'achievement',
  'challenge',
]);

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// PURPOSE: All state + callbacks for the create-post form
// ─────────────────────────────────────────────────────────────

export function useCreatePostForm() {
  const { user, authAxios } = useAuth();
  const { createPost, isCreatingPost } = useSocialFeed();
  const { triggerFromResult } = useCelebrationTriggers();
  const { error: toastError } = useToast();

  // Core form state
  const [postContent, setPostContent] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [postType, setPostType] = useState<PostType>('general');
  const [showCreateOptions, setShowCreateOptions] = useState(false);

  // Transformation state
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  // Workout state
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>(EMPTY_WORKOUT_STATS);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Refs
  const createCardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeImageRef = useRef<HTMLInputElement>(null);
  const afterImageRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup blob URLs + pending fetches on unmount (Issue #1: Memory Leak)
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      [mediaPreview, beforePreview, afterPreview].forEach(url => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setPostContent(current => appendHashtag(current, hashtag));
  }, []);

  // ── Workout History ─────────────────────────────────────────
  const fetchWorkoutHistory = useCallback(async () => {
    if (workoutHistory.length > 0) { setShowWorkoutHistory(true); return; }
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoadingHistory(true);
    try {
      const res = await authAxios.get<WorkoutSessionsResponse>(
        '/api/v1/workouts/sessions',
        { params: { limit: 20, status: 'completed' }, signal: controller.signal }
      );
      setWorkoutHistory(res.data.data);
      setShowWorkoutHistory(true);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Failed to fetch workout history:', err);
      setWorkoutHistory([]);
      setShowWorkoutHistory(true);
    } finally { setIsLoadingHistory(false); }
  }, [authAxios, workoutHistory.length]);

  const selectWorkoutFromHistory = useCallback((workout: WorkoutSession) => {
    const dur = workout.duration || workout.durationMinutes || '';
    const exercises = workout.exerciseCount || workout.exercises?.length || '';
    const weight = workout.totalWeight || workout.volumeLoad || '';
    const calories = workout.caloriesBurned || workout.calories || '';
    setWorkoutStats({
      duration: String(dur), exerciseCount: String(exercises),
      totalWeight: String(weight), caloriesBurned: String(calories),
    });
    const date = workout.date || workout.sessionDate || workout.createdAt;
    const dateStr = date ? new Date(date).toLocaleDateString() : '';
    const workoutName = workout.name || workout.workoutName || workout.title || 'Workout';
    setPostContent(
      `Just completed: ${workoutName}${dateStr ? ` on ${dateStr}` : ''}! ` +
      `${dur ? `${dur} min` : ''} ${exercises ? `| ${exercises} exercises` : ''} ` +
      `${weight ? `| ${weight} lbs lifted` : ''}`
    );
    setShowWorkoutHistory(false);
  }, []);

  // ── File Handling ───────────────────────────────────────────
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) { toastError(`File size exceeds ${isVideo ? '50MB' : '10MB'} limit`); return; }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toastError('Only image and video files are allowed'); return; }
    if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMedia(file);
    if (isVideo) { setMediaPreview(URL.createObjectURL(file)); }
    else { const r = new FileReader(); r.onload = () => setMediaPreview(r.result as string); r.readAsDataURL(file); }
  }, [mediaPreview, toastError]);

  const handleRemoveMedia = useCallback(() => {
    if (mediaPreview?.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMedia(null); setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [mediaPreview]);

  const handleBeforeImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setBeforeImage(e.target.files[0]);
    const r = new FileReader(); r.onload = () => setBeforePreview(r.result as string); r.readAsDataURL(e.target.files[0]);
  }, []);

  const handleAfterImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setAfterImage(e.target.files[0]);
    const r = new FileReader(); r.onload = () => setAfterPreview(r.result as string); r.readAsDataURL(e.target.files[0]);
  }, []);

  const handleRemoveBeforeImage = useCallback(() => {
    if (beforePreview?.startsWith('blob:')) URL.revokeObjectURL(beforePreview);
    setBeforeImage(null); setBeforePreview(null);
    if (beforeImageRef.current) beforeImageRef.current.value = '';
  }, [beforePreview]);

  const handleRemoveAfterImage = useCallback(() => {
    if (afterPreview?.startsWith('blob:')) URL.revokeObjectURL(afterPreview);
    setAfterImage(null); setAfterPreview(null);
    if (afterImageRef.current) afterImageRef.current.value = '';
  }, [afterPreview]);

  // ── Reset + Submit ──────────────────────────────────────────
  const resetForm = useCallback(() => {
    [mediaPreview, beforePreview, afterPreview].forEach(url => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setPostContent(''); setMedia(null); setMediaPreview(null);
    setBeforeImage(null); setAfterImage(null); setBeforePreview(null); setAfterPreview(null);
    setPostType('general'); setWorkoutStats(EMPTY_WORKOUT_STATS); setShowCreateOptions(false);
    [fileInputRef, beforeImageRef, afterImageRef].forEach(ref => { if (ref.current) ref.current.value = ''; });
  }, [mediaPreview, beforePreview, afterPreview]);

  const handleCreatePost = useCallback(async () => {
    // Validation
    if (postType === 'transformation' && !postContent.trim() && !beforeImage && !afterImage) return;
    else if (postType === 'workout' && !postContent.trim() && !Object.values(workoutStats).some(s => s.trim())) return;
    else if (postType !== 'transformation' && postType !== 'workout' && !postContent.trim() && !media) return;

    const typeForSubmit = postType === 'general' ? smartIntent.submissionType : postType;
    const postData: any = { content: postContent, type: typeForSubmit, visibility };
    if (postType === 'transformation') {
      if (beforeImage) postData.media = beforeImage;
      postData.transformationData = { hasBeforeImage: !!beforeImage, hasAfterImage: !!afterImage };
    } else if (postType === 'workout') {
      if (media) postData.media = media;
      postData.workoutData = workoutStats;
    } else {
      if (media) postData.media = media;
    }

    const result = await createPost(postData);
    if (result?.pointsAwarded) triggerFromResult(result);
    resetForm();
  }, [postType, smartIntent.submissionType, postContent, beforeImage, afterImage, workoutStats, media, visibility, createPost, triggerFromResult, resetForm]);

  // ── Derived: is submit disabled? ───────────────────────────
  const isSubmitDisabled = isCreatingPost || (
    postType === 'transformation' ? (!postContent.trim() && !beforeImage && !afterImage) :
    postType === 'workout' ? (!postContent.trim() && !Object.values(workoutStats).some(s => s.trim())) :
    (!postContent.trim() && !media)
  );

  return {
    // Auth
    user,
    // Core form state
    postContent, setPostContent,
    media,
    mediaPreview,
    visibility, setVisibility,
    postType, setPostType,
    showCreateOptions, setShowCreateOptions,
    // Transformation
    beforePreview, afterPreview,
    // Workout
    workoutStats, setWorkoutStats,
    showWorkoutHistory, workoutHistory,
    isLoadingHistory,
    // Category
    categorySuggestion,
    smartIntent,
    addHashtagToContent,
    // Refs
    createCardRef, fileInputRef, beforeImageRef, afterImageRef,
    // Submission
    isCreatingPost, isSubmitDisabled,
    handleCreatePost,
    // File handlers
    handleFileSelect, handleRemoveMedia,
    handleBeforeImageSelect, handleAfterImageSelect,
    handleRemoveBeforeImage, handleRemoveAfterImage,
    // Workout handlers
    fetchWorkoutHistory, selectWorkoutFromHistory,
  };
}
