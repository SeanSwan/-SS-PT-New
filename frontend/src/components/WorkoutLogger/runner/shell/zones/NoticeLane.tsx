/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ NoticeLane — SESSION SHELL zone 2 (dumb renderer).          │
 * │ Max ONE notice at a time, highest priority wins (lower      │
 * │ number = louder). Dismiss is per-notice-id for the session. │
 * │ The lane OVERLAYS the content below its anchor — a notice   │
 * │ arriving mid-session never shifts layout (anti-jump).       │
 * │ Composition lives in ShellNotices; this file only renders.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

export interface ShellNotice {
  id: string;
  /** Lower = more urgent. offline/save-failure 10 · draft 20 · schedule 30 · billing 40 · tip 50. */
  priority: number;
  dismissible?: boolean;
  content: React.ReactNode;
}

/** Zero-height anchor — the lane hangs below it without moving the page. */
const Anchor = styled.div`
  position: relative;
  height: 0;
`;

const Lane = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 4px 12px;
  background: color-mix(in srgb, var(--bg-surface, #1a1a24) 92%, var(--accent-primary, #60c0f0));
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 14%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const DismissButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

const NoticeLane: React.FC<{ notices: ShellNotice[] }> = ({ notices }) => {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const active = notices
    .filter((notice) => !dismissed.has(notice.id))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!active) return null;

  return (
    <Anchor data-shell-zone='notice-lane'>
      <Lane role='status' aria-live='polite'>
        <Body>{active.content}</Body>
        {active.dismissible && (
          <DismissButton
            type='button'
            aria-label='Dismiss notice'
            onClick={() => setDismissed((prev) => new Set(prev).add(active.id))}
          >
            <X size={16} aria-hidden='true' />
          </DismissButton>
        )}
      </Lane>
    </Anchor>
  );
};

export default NoticeLane;
