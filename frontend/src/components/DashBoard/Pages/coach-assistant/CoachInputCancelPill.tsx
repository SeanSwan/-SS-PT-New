/**
 * FILE: CoachInputCancelPill.tsx
 * PURPOSE: 2-second cancel window pill for Web Speech auto-send safety gate
 * PARENT: CoachInputBar
 *
 * WHAT THIS FILE DOES: Appears when Web Speech detects a final result and the
 * auto-send timer is counting down. The user has 2 seconds to cancel before
 * the message dispatches. Prevents garbled speech from silently firing.
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { X } from 'lucide-react';

const shrink = keyframes`
  from { width: 100%; }
  to { width: 0%; }
`;

const Pill = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 14px;
  margin: 0 0 6px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-surface, #1A1A24));
  border: 1px solid rgba(139, 92, 246, 0.25);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  position: relative;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ $duration: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--accent-secondary, #8B5CF6);
  animation: ${shrink} ${({ $duration }) => $duration}ms linear forwards;
`;

const CancelBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  min-height: 44px;
  border-radius: 6px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: transparent;
  color: var(--accent-secondary, #8B5CF6);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover { background: rgba(139, 92, 246, 0.12); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

interface CoachInputCancelPillProps {
  /** Duration of the cancel window in ms */
  duration?: number;
  onCancel: () => void;
}

const CoachInputCancelPill: React.FC<CoachInputCancelPillProps> = memo(({
  duration = 2000,
  onCancel,
}) => (
  <Pill role="status" aria-live="polite" aria-label="Voice message sending — tap to cancel">
    <span>Sending voice message…</span>
    <CancelBtn onClick={onCancel} aria-label="Cancel voice send">
      <X size={12} /> Cancel
    </CancelBtn>
    <ProgressBar $duration={duration} aria-hidden="true" />
  </Pill>
));

CoachInputCancelPill.displayName = 'CoachInputCancelPill';
export default CoachInputCancelPill;
