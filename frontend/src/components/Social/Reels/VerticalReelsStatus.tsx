/**
 * Compact status renderer for the Reels viewer.
 */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { ReelsContainer, type ReelsFrame } from './VerticalReels.styles';
import { EmptyState } from './VerticalReels.statusStyles';

interface VerticalReelsStatusProps {
  frame: ReelsFrame;
  busy: boolean;
  alert?: boolean;
  icon: React.ReactNode;
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
}

const VerticalReelsStatus: React.FC<VerticalReelsStatusProps> = ({
  frame,
  busy,
  alert = false,
  icon,
  title,
  copy,
  actionLabel,
  onAction,
}) => (
  <ReelsContainer $frame={frame} aria-busy={busy}>
    <EmptyState role={alert ? 'alert' : 'status'} aria-live="polite">
      {icon}
      <h3>{title}</h3>
      <p>{copy}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          <RefreshCw size={16} aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </EmptyState>
  </ReelsContainer>
);

export default VerticalReelsStatus;
