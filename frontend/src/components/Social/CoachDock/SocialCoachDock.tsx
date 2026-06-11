/**
 * ============================================================================
 * FILE: SocialCoachDock.tsx
 * PURPOSE: Swan Coach companion dock for the social hub feed tab (D2a shell).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the collapsed Coach strip (avatar + greeting +
 * four 44px action chips) at the top of the /social feed. Share/log/cheer
 * chips deep-link to existing mounted surfaces; the find-a-challenge chip
 * (D2b) expands the inline finder — 1-2 real matches with one-tap join —
 * lazily mounted so the feed never pays the challenges fetch unprompted.
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
 * - Hybrid depth: quick-log + cheer deep-link to their final surfaces; find
 *   challenge is inline as of D2b (InlineChallengeFinder); share milestone
 *   deep-links to the canonical Coach page until D2c lands its inline flow.
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
import {
  getSwanCoachDashboardPath,
  getLogWorkoutDashboardPath,
} from '../../UserDashboard/components/swanCoachDashboardRoute';
import InlineChallengeFinder from './InlineChallengeFinder';
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

const NAV_CHIPS_BEFORE_FINDER = [
  {
    label: 'Share a milestone',
    Icon: Share2,
    // Interim deep-link to the canonical Coach page; D2c replaces this with
    // the inline Coach-drafted share flow (real logged data only).
    getPath: (role?: string | null) => getSwanCoachDashboardPath(role),
  },
] as const;

const NAV_CHIPS_AFTER_FINDER = [
  {
    label: 'Log a workout',
    Icon: Dumbbell,
    getPath: (role?: string | null) => getLogWorkoutDashboardPath(role),
  },
  {
    label: 'Cheer a friend',
    Icon: ThumbsUp,
    // Simple cheer picker fallback; smart nudge (friend-activity signals) is
    // a fast-follow pending the friends-API signal audit.
    getPath: () => '/social/friends',
  },
] as const;

const SocialCoachDock: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [finderOpen, setFinderOpen] = useState(false);

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
          {NAV_CHIPS_BEFORE_FINDER.map(({ label, Icon, getPath }) => (
            <ActionChip
              key={label}
              onClick={() => navigate(getPath(user?.role))}
              aria-label={label}
            >
              <Icon size={15} />
              {label}
            </ActionChip>
          ))}
          {/* D2b: inline finder toggle — expands matches in-dock instead of
              navigating away (2-tap join per the grill-me click math). */}
          <ActionChip
            onClick={() => setFinderOpen((open) => !open)}
            aria-label="Find a challenge"
            aria-expanded={finderOpen}
            aria-controls="coach-challenge-finder"
          >
            <Trophy size={15} />
            Find a challenge
          </ActionChip>
          {NAV_CHIPS_AFTER_FINDER.map(({ label, Icon, getPath }) => (
            <ActionChip
              key={label}
              onClick={() => navigate(getPath(user?.role))}
              aria-label={label}
            >
              <Icon size={15} />
              {label}
            </ActionChip>
          ))}
        </ChipRow>

        {/* Lazy mount: the challenges fetch only fires when the user asks. */}
        {finderOpen && <InlineChallengeFinder />}
      </DockInner>
    </DockShell>
  );
};

export default SocialCoachDock;
