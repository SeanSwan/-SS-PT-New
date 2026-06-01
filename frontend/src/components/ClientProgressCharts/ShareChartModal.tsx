/**
 * ============================================================================
 * FILE: ShareChartModal.tsx
 * PURPOSE: Modal for sharing a chart screenshot to the social feed
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows a preview of the captured chart image, lets the
 * user add a caption, and posts it to the social feed via useSocialFeed.
 *
 * HOW IT FITS IN THE APP: ChartCard Share button → captureChartAsImage() →
 * ShareChartModal → useSocialFeed.createPost({ media: File })
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Globe, Users, Lock, Image as ImageIcon } from 'lucide-react';
import { useSocialFeed } from '../../hooks/social/useSocialFeed';
import { buildShareChartPostPayload } from './ShareChartModal.payload';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ShareChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartImage: File | null;
  chartTitle: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContainer = styled(motion.div)`
  background: linear-gradient(135deg, #141419 0%, #1A1A24 100%);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 20px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(96, 192, 240, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
`;

const ModalTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #E0ECF4;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  color: #E0ECF4;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.15);
    border-color: rgba(96, 192, 240, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ChartPreview = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: #0A0A0F;

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

const CaptionInput = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.875rem 1rem;
  background: rgba(0, 32, 96, 0.3);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }
`;

const VisibilityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VisibilityLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  color: rgba(224, 236, 244, 0.6);
  margin-right: 0.5rem;
`;

const VisibilityOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  background: ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(96, 192, 240, 0.06)'};
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(96, 192, 240, 0.12)'};
  border-radius: 10px;
  color: ${({ $active }) => ($active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.5)')};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(96, 192, 240, 0.12);
`;

const ShareButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.25rem;
  min-height: 44px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.15);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ShareChartModal: React.FC<ShareChartModalProps> = ({
  isOpen,
  onClose,
  chartImage,
  chartTitle,
}) => {
  const { createPost, isCreatingPost } = useSocialFeed();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('friends');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Generate preview URL from File
  useEffect(() => {
    if (chartImage) {
      const url = URL.createObjectURL(chartImage);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [chartImage]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCaption(`Check out my ${chartTitle} progress!`);
      setVisibility('friends');
    }
  }, [isOpen, chartTitle]);

  const handleShare = useCallback(async () => {
    if (!chartImage) return;

    const result = await createPost(buildShareChartPostPayload({
      caption,
      chartTitle,
      chartImage,
      visibility,
    }));

    if (result) {
      onClose();
    }
  }, [chartImage, caption, chartTitle, visibility, createPost, onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          ref={overlayRef}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Share chart to social feed"
        >
          <ModalContainer
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <ModalHeader>
              <ModalTitle>
                <ImageIcon size={18} />
                Share Chart
              </ModalTitle>
              <CloseButton onClick={onClose} aria-label="Close">
                <X size={18} />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              {previewUrl && (
                <ChartPreview>
                  <img src={previewUrl} alt={`${chartTitle} chart preview`} />
                </ChartPreview>
              )}

              <CaptionInput
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={500}
              />

              <VisibilityRow>
                <VisibilityLabel>Visibility:</VisibilityLabel>
                <VisibilityOption
                  $active={visibility === 'public'}
                  onClick={() => setVisibility('public')}
                >
                  <Globe size={14} /> Public
                </VisibilityOption>
                <VisibilityOption
                  $active={visibility === 'friends'}
                  onClick={() => setVisibility('friends')}
                >
                  <Users size={14} /> Friends
                </VisibilityOption>
                <VisibilityOption
                  $active={visibility === 'private'}
                  onClick={() => setVisibility('private')}
                >
                  <Lock size={14} /> Private
                </VisibilityOption>
              </VisibilityRow>
            </ModalBody>

            <ModalFooter>
              <CancelButton onClick={onClose}>Cancel</CancelButton>
              <ShareButton
                onClick={handleShare}
                disabled={isCreatingPost || !chartImage}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Send size={16} />
                {isCreatingPost ? 'Posting...' : 'Share to Feed'}
              </ShareButton>
            </ModalFooter>
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
};

export default ShareChartModal;
