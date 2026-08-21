/**
 * HOOK: usePostCardModeration
 * PURPOSE: Owner/moderation state + handlers for a feed card — the overflow
 *          menu (outside-click close), edit composer, delete confirmation,
 *          report modal, share dialog, repost, copy-link, and mute.
 * PARENT: PostCard (extracted per the 300-line component cap; behavior is
 *         unchanged — PostCard renders the dialogs, this hook drives them).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostCardProps } from '../types/PostCardTypes';
import { buildSocialPostShareUrl } from '../../../../utils/socialPostShareUrl';

type ModerationInput = Pick<PostCardProps, 'post' | 'onEdit' | 'onDelete' | 'onReport' | 'onRepost'>;

export function usePostCardModeration({ post, onEdit, onDelete, onReport, onRepost }: ModerationInput) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCopyLink = useCallback(() => {
    const url = buildSocialPostShareUrl(post.id);
    navigator.clipboard.writeText(url).catch(() => {
      // Fallback silent
    });
  }, [post.id]);

  const handleEditPost = useCallback(() => {
    setEditContent(post.content);
    setEditMode(true);
  }, [post.content]);

  const handleSaveEdit = useCallback(async () => {
    if (!onEdit || !editContent.trim() || editContent === post.content) {
      setEditMode(false);
      return;
    }
    setIsSavingEdit(true);
    const ok = await onEdit(post.id, editContent.trim());
    setIsSavingEdit(false);
    if (ok) setEditMode(false);
  }, [onEdit, editContent, post.id, post.content]);

  const handleDeletePost = useCallback(() => {
    if (!onDelete) return;
    setDeleteConfirmOpen(true);
  }, [onDelete]);

  const handleConfirmDeletePost = useCallback(async () => {
    if (!onDelete) return;
    setIsDeletingPost(true);
    try {
      await onDelete(post.id);
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeletingPost(false);
    }
  }, [onDelete, post.id]);

  const handleReportSubmit = useCallback(async (reason: string, description?: string) => {
    if (!onReport) return false;
    return onReport(post.id, reason, description);
  }, [onReport, post.id]);

  const handleRepost = useCallback(async () => {
    if (!onRepost) return;
    await onRepost(post.id);
    setShareDialogOpen(false);
  }, [onRepost, post.id]);

  return {
    menuOpen, setMenuOpen, menuRef,
    editMode, setEditMode, editContent, setEditContent, isSavingEdit,
    reportModalOpen, setReportModalOpen,
    shareDialogOpen, setShareDialogOpen,
    deleteConfirmOpen, setDeleteConfirmOpen, isDeletingPost,
    handleCopyLink, handleEditPost, handleSaveEdit,
    handleDeletePost, handleConfirmDeletePost, handleReportSubmit, handleRepost,
  };
}
