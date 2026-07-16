/**
 * ============================================================================
 * FILE: ActivityTicker.tsx
 * PURPOSE: Live activity ticker showing real-time social events
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a compact horizontal-scrolling ticker bar with a pulsing LIVE dot,
 * displaying the most recent social activity events (workouts, posts, reactions,
 * comments) in real time.
 *
 * HOW IT FITS IN THE APP:
 * useActivityTicker hook -> ActivityTicker component -> embedded at top of SocialFeed
 *
 * KEY DECISIONS:
 * - Horizontal scroll instead of vertical to save vertical space in the feed
 * - Max 8 visible items to prevent performance issues with many DOM nodes
 * - GPU-composited pulse animation (opacity only) for the live indicator
 *
 * ┌─── SUB-COMPONENT: ActivityTicker ─────────────────────────┐
 * │ PARENT: SocialFeed                                          │
 * │ PURPOSE: Live activity ticker showing real-time social events│
 * │ WIREFRAME:                                                   │
 * │ ┌────────────────────────────────────────────┐              │
 * │ │ * LIVE  Sean completed a workout | ...     │              │
 * │ └────────────────────────────────────────────┘              │
 * │ Props: { events: ActivityEvent[] }                           │
 * │ CLICK-OUTCOMES: None (display-only ticker)                   │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Zap, Heart, MessageCircle, Dumbbell } from 'lucide-react';
import type { ActivityEvent } from '../../../hooks/social/useActivityTicker';

// ─────────────────────────────────────────────────────────────
// SECTION: Event Display Helpers
// PURPOSE: Map event types to icons and human-readable messages
// ─────────────────────────────────────────────────────────────

function getEventDisplay(event: ActivityEvent): { icon: React.ReactNode; text: string } {
  const actor = event.userName || 'A member';

  switch (event.type) {
    case 'workout_completed':
      return { icon: <Dumbbell size={14} />, text: `${actor} completed a workout` };
    case 'streak_milestone':
      return { icon: <Zap size={14} />, text: event.preview || `${actor} hit a streak milestone` };
    case 'achievement_unlocked':
      return { icon: <Zap size={14} />, text: event.preview || `${actor} unlocked an achievement` };
    case 'post_created':
      return { icon: <Zap size={14} />, text: `${actor} shared a ${event.postType || 'post'}` };
    case 'reaction_added':
      return { icon: <Heart size={14} />, text: `${actor} reacted to a post` };
    case 'comment_added':
      return { icon: <MessageCircle size={14} />, text: `${actor} commented` };
    default:
      return { icon: <Zap size={14} />, text: `${actor} was active` };
  }
}

/** Relative time string from ISO timestamp */
function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders the ticker UI with live dot + scrollable items
// ─────────────────────────────────────────────────────────────

const ActivityTicker: React.FC<{ events: ActivityEvent[] }> = memo(({ events }) => {
  if (events.length === 0) return null;

  return (
    <TickerWrap>
      <LiveDot />
      <TickerLabel>LIVE</TickerLabel>
      <TickerScroll>
        {events.slice(0, 8).map(event => {
          const { icon, text } = getEventDisplay(event);
          return (
            <TickerItem key={event.id}>
              <TickerIcon>{icon}</TickerIcon>
              <TickerText>{text}</TickerText>
              <TickerTime>{timeAgo(event.timestamp)}</TickerTime>
            </TickerItem>
          );
        })}
      </TickerScroll>
    </TickerWrap>
  );
});

ActivityTicker.displayName = 'ActivityTicker';
export default ActivityTicker;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first ticker styles with theme CSS variables
// WHY: GPU-composited pulse animation (opacity only)
// ─────────────────────────────────────────────────────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const TickerWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  overflow: hidden;
  min-height: 40px;
`;

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const TickerLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #ef4444;
  letter-spacing: 0.08em;
  flex-shrink: 0;
`;

const TickerScroll = styled.div`
  display: flex;
  gap: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const TickerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const TickerIcon = styled.span`
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
`;

const TickerText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
`;

const TickerTime = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
`;
