/**
 * ┌─── SUB-COMPONENT: ShareToFeedModal ────────────────────────┐
 * │ PARENT: EnhancedWorkoutsModal, AchievementCard, any view    │
 * │ PURPOSE: Quick-share workout/achievement/milestone to social │
 * │          feed via POST /api/social/posts                     │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23         │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────────────────────┐ │
 * │ │  Share to Feed                                    [X]    │ │
 * │ │ ┌──────────────────────────────────────────────────────┐ │ │
 * │ │ │ [Pre-filled message about workout/achievement]       │ │ │
 * │ │ │ [User can edit before posting]                       │ │ │
 * │ │ └──────────────────────────────────────────────────────┘ │ │
 * │ │ Visibility: [Public ▾] [Friends ▾] [Private ▾]          │ │
 * │ │ Type: 🏋️ Workout | 🏆 Achievement | 📊 Milestone       │ │
 * │ │                                        [Cancel] [Share]  │ │
 * │ └──────────────────────────────────────────────────────────┘ │
 * │ Props: { open, onClose, prefilledContent, postType,          │
 * │         workoutSessionId?, achievementId?, userAchievementId?│
 * │ CLICK-OUTCOMES:                                              │
 * │ [Share] → POST /api/social/posts → closes modal + toast     │
 * │ [Cancel] → closes modal                                     │
 * │ GAMIFICATION: Awards 10-50 XP depending on post type         │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { X, Share2, Globe, Users, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import {
  buildShareToFeedPostPayload,
  type ShareToFeedPostType,
  type ShareToFeedVisibility,
} from './ShareToFeedModal.payload';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;

  @supports (backdrop-filter: blur(8px)) {
    backdrop-filter: blur(8px);
  }
  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(0, 0, 0, 0.85);
  }
`;

const Modal = styled.div`
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const Title = styled.h3`
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
  border-radius: 8px;
  &:hover { background: rgba(255, 255, 255, 0.06); }
`;

const Body = styled.div`
  padding: 20px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 16px;

  &::placeholder { color: rgba(255, 255, 255, 0.3); }
  &:focus { outline: none; border-color: rgba(96, 192, 240, 0.4); }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const Label = styled.span`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
  white-space: nowrap;
`;

const VisBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  min-height: 44px;
  border-radius: 20px;
  border: 1px solid ${p => p.$active ? 'rgba(96, 192, 240, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  background: ${p => p.$active ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${p => p.$active ? '#60C0F0' : 'var(--text-secondary, #94a3b8)'};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { border-color: rgba(96, 192, 240, 0.3); }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

const CancelBtn = styled.button`
  padding: 8px 20px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8125rem;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.05); }
`;

const ShareBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 24px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const PointsHint = styled.div`
  font-size: 0.75rem;
  color: #C6A84B;
  margin-top: 4px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

type PostType = ShareToFeedPostType;
type Visibility = ShareToFeedVisibility;

interface Props {
  open: boolean;
  onClose: () => void;
  prefilledContent?: string;
  postType?: PostType;
  workoutSessionId?: string;
  achievementId?: number;
  userAchievementId?: number;
}

const POINT_VALUES: Record<PostType, number> = {
  general: 10,
  workout: 25,
  achievement: 30,
  challenge: 20,
  transformation: 50,
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ShareToFeedModal: React.FC<Props> = ({
  open,
  onClose,
  prefilledContent = '',
  postType = 'general',
  workoutSessionId,
  achievementId,
  userAchievementId,
}) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState(prefilledContent);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset content when modal opens with new prefilled content
  useEffect(() => {
    if (open) setContent(prefilledContent);
  }, [open, prefilledContent]);

  // Escape key to close + focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the modal on open
      modalRef.current?.focus();
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleShare = async () => {
    if (!content.trim() || !authAxios) return;
    setSubmitting(true);

    try {
      const payload = buildShareToFeedPostPayload({
        content,
        postType,
        visibility,
        workoutSessionId,
        achievementId,
        userAchievementId,
      });

      const resp = await authAxios.post('/api/social/posts', payload);

      const points = resp.data?.pointsAwarded || POINT_VALUES[postType];
      toast({
        title: 'Shared to feed!',
        description: `+${points} XP earned`,
        variant: 'default',
      });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Share failed',
        description: err.response?.data?.message || err.message || 'Could not share post',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Modal ref={modalRef} role="dialog" aria-modal="true" aria-label="Share to feed" tabIndex={-1}>
        <Header>
          <Title><Share2 size={18} color="#8B5CF6" /> Share to Feed</Title>
          <CloseBtn onClick={onClose} aria-label="Close"><X size={18} /></CloseBtn>
        </Header>

        <Body>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a message..."
            maxLength={2000}
            autoFocus
          />

          <Row role="radiogroup" aria-label="Post visibility">
            <Label id="vis-label">Visibility:</Label>
            <VisBtn $active={visibility === 'public'} onClick={() => setVisibility('public')}
              role="radio" aria-checked={visibility === 'public'}>
              <Globe size={14} /> Public
            </VisBtn>
            <VisBtn $active={visibility === 'friends'} onClick={() => setVisibility('friends')}
              role="radio" aria-checked={visibility === 'friends'}>
              <Users size={14} /> Friends
            </VisBtn>
            <VisBtn $active={visibility === 'private'} onClick={() => setVisibility('private')}
              role="radio" aria-checked={visibility === 'private'}>
              <Lock size={14} /> Private
            </VisBtn>
          </Row>

          <PointsHint>
            Sharing earns +{POINT_VALUES[postType]} XP
          </PointsHint>
        </Body>

        <Footer>
          <CancelBtn onClick={onClose}>Cancel</CancelBtn>
          <ShareBtn onClick={handleShare} disabled={!content.trim() || submitting}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            Share
          </ShareBtn>
        </Footer>
      </Modal>
    </Overlay>
  );
};

export default ShareToFeedModal;
