/**
 * ============================================================================
 * FILE: useFileUpload.ts
 * PURPOSE: Encapsulates profile and banner photo upload logic with optimistic UI
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages file input refs, handles image validation,
 * provides optimistic preview for banner uploads, and reverts on error.
 * HOW IT FITS IN THE APP: Used by UserDashboard orchestrator to handle
 * profile photo and banner photo uploads via hidden file inputs.
 * KEY DECISIONS: Optimistic preview shows blob URL immediately while upload
 * proceeds; useEffect in parent replaces with server URL on success.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Hook Interface
// PURPOSE: Define return type for the hook
// ─────────────────────────────────────────────────────────────

interface UseFileUploadOptions {
  /** Function to upload profile photo to backend */
  uploadProfilePhoto: (file: File) => Promise<void>;
  /** Function to upload banner photo to backend — returns server-confirmed URL or null */
  uploadBannerPhoto: (file: File) => Promise<string | null>;
  /** Current banner photo URL from profile data (server URL) */
  serverBannerUrl: string | null;
}

interface UseFileUploadReturn {
  /** Ref for the hidden profile photo input */
  profileInputRef: React.RefObject<HTMLInputElement>;
  /** Ref for the hidden banner photo input */
  backgroundInputRef: React.RefObject<HTMLInputElement>;
  /** Current background image (may be optimistic blob or server URL) */
  backgroundImage: string | null;
  /** Click handler to trigger profile photo file picker */
  handleProfileImageClick: () => void;
  /** Click handler to trigger banner photo file picker */
  handleBackgroundClick: () => void;
  /** onChange handler for file inputs */
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'background') => void;
}

/**
 * Manages file upload logic for profile and banner photos.
 * Provides optimistic preview for banner changes and reverts on error.
 */
export function useFileUpload({
  uploadProfilePhoto,
  uploadBannerPhoto,
  serverBannerUrl,
}: UseFileUploadOptions): UseFileUploadReturn {
  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Sync background image with server URL when profile data loads/changes
  useEffect(() => {
    if (serverBannerUrl) {
      setBackgroundImage(serverBannerUrl);
    }
  }, [serverBannerUrl]);

  const handleFileUpload = useCallback(async (file: File, type: 'profile' | 'background') => {
    if (!file || !file.type.startsWith('image/')) return;

    try {
      if (type === 'profile') {
        await uploadProfilePhoto(file);
      } else {
        // Optimistic preview — show blob URL immediately
        const previewUrl = URL.createObjectURL(file);
        setBackgroundImage(previewUrl);
        await uploadBannerPhoto(file);
        // useEffect will replace blob with server URL when profile updates
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Revert optimistic update on error
      if (type === 'background') {
        setBackgroundImage(serverBannerUrl);
      }
    }
  }, [uploadProfilePhoto, uploadBannerPhoto, serverBannerUrl]);

  const handleProfileImageClick = useCallback(() => {
    profileInputRef.current?.click();
  }, []);

  const handleBackgroundClick = useCallback(() => {
    backgroundInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'profile' | 'background'
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);

  return {
    profileInputRef,
    backgroundInputRef,
    backgroundImage,
    handleProfileImageClick,
    handleBackgroundClick,
    handleFileChange,
  };
}
