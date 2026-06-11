/**
 * ============================================================================
 * FILE: SocialCoachDock.tsx
 * PURPOSE: Swan Coach companion dock for the social hub feed tab (D2a shell).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the collapsed Coach strip (avatar + greeting +
 * four 44px action chips) at the top of the /social feed. Log-a-workout
 * deep-links to the role-routed logger; share-a-milestone (D2c),
 * find-a-challenge (D2b), and cheer-a-friend (cheer v2, feed-anchored)
 * expand mutually-exclusive inline panels — all lazily mounted so the feed
 * never pays their data fetches unprompted.
 *
 * HOW IT FITS IN THE APP: Mounted once by SocialPage.V3 inside the feed branch
 * of renderContent (feed-tab-only per the 2026-06-11 grill-me decision Q5).
 * Self-contained — reads useAuth/useNavigate itself so the page-level D1
 * Coach-entry contract (exactly two getSwanCoachDashboardPath calls in the
 * page source) stays untouched.
 *
 * KEY DECISIONS (docs/ai-workflow/brainstorms/social-hub-embedded-coach-d2-2026-06-11.md):
 * - Companion consumer of the canonical Coach lane, NOT a second chat surface
 *   (rule 27): no message input, no send rail. Deeper asks go to the full
 *   Coach page via the share-milestone chip's deep-link.
 * - Hybrid depth complete: quick-log deep-links; find challenge (D2b),
 *   share milestone (D2c), and cheer a friend (cheer v2) run inline. The
 *   cheer panel is feed-anchored — the friends API exposes no activity
 *   signals (audit 2026-06-11), so friends' celebration posts are the
 *   honest signal and a swan reaction is the nudge.
 * - NO tier gating — free users get the working dock (Q6: community-flywheel
 *   actions stay free; intentional divergence from the dashboard SwanCoachDock
 *   teaser/lock pattern. Heavy Coach AI stays behind existing chat-lane caps.)
 * - No gamification-data guard: a profile fetch failure must never hide the
 *   dock (same posture as the D1 mobile entry).
 */

import React, { useState } from 'react';
import { Sparkles, Share2, Trophy, Dumbbell, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getLogWorkoutDashboardPath } from '../../UserDashboard/components/swanCoachDashboardRoute';
import InlineChallengeFinder from './InlineChallengeFinder';
import InlineMilestoneShare from './InlineMilestoneShare';
import InlineCheerPicker from './InlineCheerPicker';
import {
  ActionChip,
  ChipRow,
  CoachAvatar,
  DockAccent,
  DockHeader,
  DockInner,
  DockShell,
  Greeting,
  GreetingName,
  GreetingSub,
} from './SocialCoachDock.styles';

const NAV_CHIPS = [
  {
    label: 'Log a workout',
    Icon: Dumbbell,
    getPath: (role?: string | null) => getLogWorkoutDashboardPath(role),
  },
] as const;

type DockPanel = 'share' | 'finder' | 'cheer';

const SocialCoachDock: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // One panel at a time — opening one closes the other.
  const [openPanel, setOpenPanel] = useState<DockPanel | null>(null);
  const togglePanel = (panel: DockPanel) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  const firstName = user?.firstName || user?.username || '';
  const greeting = firstName
    ? `What's worth celebrating today, ${firstName}?`
    : "What's worth celebrating today?";

  return (
    <DockShell aria-label="Swan Coach quick actions">
      <DockAccent />
      <DockInner>
        <DockHeader>
          <CoachAvatar aria-hidden="true">
            <Sparkles size={18} />
          </CoachAvatar>
          <Greeting>
            <GreetingName>Swan Coach</GreetingName>
            <GreetingSub>{greeting}</GreetingSub>
          </Greeting>
        </DockHeader>

        <ChipRow role="group" aria-label="Coach quick actions">
          {/* D2c: inline share toggle — Coach drafts from real training data,
              explicit confirm posts to the feed (2 taps, no page change). */}
          <ActionChip
            onClick={() => togglePanel('share')}
            aria-label="Share a milestone"
            aria-expanded={openPanel === 'share'}
            aria-controls="coach-milestone-share"
          >
            <Share2 size={15} />
            Share a milestone
          </ActionChip>
          {/* D2b: inline finder toggle — expands matches in-dock instead of
              navigating away (2-tap join per the grill-me click math). */}
          <ActionChip
            onClick={() => togglePanel('finder')}
            aria-label="Find a challenge"
            aria-expanded={openPanel === 'finder'}
            aria-controls="coach-challenge-finder"
          >
            <Trophy size={15} />
            Find a challenge
          </ActionChip>
          {NAV_CHIPS.map(({ label, Icon, getPath }) => (
            <ActionChip
              key={label}
              onClick={() => navigate(getPath(user?.role))}
              aria-label={label}
            >
              <Icon size={15} />
              {label}
            </ActionChip>
          ))}
          {/* Cheer v2: feed-anchored — friends' real wins, one-tap swan
              reaction (Sean-ratified over messaging/slipping-friend variants;
              signal audit 2026-06-11). */}
          <ActionChip
            onClick={() => togglePanel('cheer')}
            aria-label="Cheer a friend"
            aria-expanded={openPanel === 'cheer'}
            aria-controls="coach-cheer-picker"
          >
            <ThumbsUp size={15} />
            Cheer a friend
          </ActionChip>
        </ChipRow>

        {/* Lazy mounts: each panel's data fetch only fires when the user asks. */}
        {openPanel === 'share' && (
          <InlineMilestoneShare onDismiss={() => setOpenPanel(null)} />
        )}
        {openPanel === 'finder' && <InlineChallengeFinder />}
        {openPanel === 'cheer' && <InlineCheerPicker />}
      </DockInner>
    </DockShell>
  );
};

export default SocialCoachDock;
