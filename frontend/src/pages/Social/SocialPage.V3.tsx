/**
 * SocialPage.V3.tsx — Cinematic Social Hub
 *
 * Full cinematic upgrade: parallax hero, glassmorphism cards, noise overlay,
 * TypewriterText, ScrollReveal, enhanced GlowButtons, 320px–3840px responsive.
 * Preserves all existing functionality (feed, friends, challenges, gamification).
 */

import React, { useRef, lazy, Suspense, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import {
  Home,
  Users,
  Trophy,
  Bell,
  PlusCircle,
  Target,
  Award,
  Play,
  MessageCircle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getSwanCoachDashboardPath } from '../../components/UserDashboard/components/swanCoachDashboardRoute';
import SocialFeed from '../../components/Social/Feed/SocialFeed';
import SocialCoachDock from '../../components/Social/CoachDock/SocialCoachDock';
import SocialRightRail from './components/SocialRightRail';
import FriendsList from '../../components/Social/Friends/FriendsList';
import ChallengesView from '../../components/Social/Challenges/ChallengesView';
import SocialNotificationsPanel from '../../components/Social/Notifications/SocialNotificationsPanel';
import GlowButton from '../../components/ui/buttons/GlowButton';
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';
import { useSocialNotifications, type SocialNotification } from '../../hooks/useSocialNotifications';
const VerticalReels = lazy(() => import('../../components/Social/Reels/VerticalReels'));

// ─── SSR-safe useMediaQuery hook (Issue #2: DOM Bloat) ───────────────
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

// ─── Animations ──────────────────────────────────────────────────────

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

// ─── Noise Overlay ───────────────────────────────────────────────────

const NoiseOverlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

// ─── Page Layout ─────────────────────────────────────────────────────

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  background: var(--bg-base, #002060);
  color: var(--text-primary, #E0ECF4);
  overflow-x: hidden;
  position: relative;
`;

// ─── Parallax Hero ───────────────────────────────────────────────────

const HeroSection = styled.section`
  position: relative;
  min-height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;

  @media (max-width: 768px) {
    min-height: 35vh;
  }
  @media (max-width: 430px) {
    min-height: 30vh;
  }
`;

const HeroBg = styled(motion.div)`
  position: absolute;
  inset: -10% 0;
  width: 100%;
  height: 120%;
  z-index: 0;
`;

const HeroBgImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const HeroOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(0, 32, 96, 0.7) 0%,
    rgba(0, 32, 96, 0.85) 50%,
    rgba(0, 32, 96, 0.95) 100%
  );
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (min-width: 2560px) {
    max-width: 1600px;
  }
  @media (min-width: 3840px) {
    max-width: 2200px;
  }
`;

const HeroTitle = styled(TypewriterText)`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: 2px;
  color: #E0ECF4;
  text-shadow:
    0 0 20px rgba(139, 92, 246, 0.5),
    0 0 40px rgba(139, 92, 246, 0.2);
  margin-bottom: 0.5rem;

  @media (max-width: 320px) {
    font-size: 1.6rem;
  }
  @media (min-width: 2560px) {
    font-size: 4rem;
  }
  @media (min-width: 3840px) {
    font-size: 5rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: clamp(0.95rem, 2vw, 1.2rem);
  color: #50A0F0;
  margin: 0;
  max-width: 500px;
  line-height: 1.6;
`;

// ─── Content Area ────────────────────────────────────────────────────

const ContentArea = styled.div`
  max-width: 1400px;
  width: 92%;
  margin: 0 auto;
  padding: 2rem 0 5rem;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    width: 94%;
    padding: 1.5rem 0 3rem;
  }
  @media (max-width: 430px) {
    width: 96%;
  }
  @media (max-width: 320px) {
    width: 97%;
    padding: 1rem 0 2rem;
  }
  @media (min-width: 2560px) {
    max-width: 1800px;
  }
  @media (min-width: 3840px) {
    max-width: 2600px;
  }
`;

// ─── Desktop Grid ────────────────────────────────────────────────────

/* minmax(0, 1fr) everywhere (M5b QA fix, 2026-06-11): plain 1fr leaves grid
   items at min-width:auto, so one unbreakable descendant (e.g. a long word in
   a post) inflates the feed column past the track and the viewport — caught
   live at 414px (column hit 459px, cover copy clipped). minmax(0,...) caps
   the item at the track. */
const DesktopGrid = styled.div<{ $threeCol?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;

  @media (min-width: 900px) {
    grid-template-columns: 280px minmax(0, 1fr);
  }
  /* Merge M3: feed tab gains a right rail as a 3rd column on wide desktops. */
  @media (min-width: 1200px) {
    grid-template-columns: ${({ $threeCol }) => ($threeCol ? '280px minmax(0, 1fr) 300px' : '280px minmax(0, 1fr)')};
  }
  @media (min-width: 2560px) {
    grid-template-columns: ${({ $threeCol }) => ($threeCol ? '320px minmax(0, 1fr) 340px' : '320px minmax(0, 1fr)')};
    gap: 32px;
  }
  @media (min-width: 3840px) {
    grid-template-columns: ${({ $threeCol }) => ($threeCol ? '380px minmax(0, 1fr) 400px' : '380px minmax(0, 1fr)')};
    gap: 40px;
  }
`;

// ─── Sidebar Column (hidden on mobile via CSS — Issue #5) ────────────

const SidebarColumn = styled.div`
  display: none;

  @media (min-width: 900px) {
    display: block;
  }
`;

// ─── Glass Sidebar ───────────────────────────────────────────────────

const GlassSidebar = styled.div`
  background: rgba(0, 32, 96, 0.85);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 1.5rem;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 80px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  @supports (backdrop-filter: blur(20px)) {
    background: rgba(0, 32, 96, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: none;
  }
`;

/* Merge M3: the GamificationCard + Points/Level/Streak/Progress styled-
   components were retired with the duplicate gamification cards — the M2
   cover identity strip is the single identity/XP/streak source on /social. */

// ─── Sidebar Navigation ─────────────────────────────────────────────

const NavSection = styled.div`
  margin-top: 8px;
`;

const NavTitle = styled.h4`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #4070C0;
  margin: 0 0 12px;
  padding: 0 4px;
`;

const NavButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(96, 192, 240, 0.06))'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#8B5CF6' : '#E0ECF4')};
  cursor: pointer;
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.2s ease;
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};

  &:hover {
    background: rgba(139, 92, 246, 0.06);
    color: #8B5CF6;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4), inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  svg {
    flex-shrink: 0;
  }
`;

const NotifDot = styled.span`
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 0.6rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  background: #C6A84B;
  color: #002060;
  margin-left: auto;
`;

const MobileNotifDot = styled.span`
  position: absolute;
  top: 6px;
  right: 8px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--accent-luxury, #C6A84B);
  color: var(--surface-primary, #002060);
  font-size: 0.58rem;
  font-weight: 800;
  font-family: 'Fira Code', monospace;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(139, 92, 246, 0.08);
  margin: 16px 0;
`;

const QuickActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
  padding: 10px 16px;
  min-height: 44px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.05);
    border-color: rgba(139, 92, 246, 0.25);
    color: #8B5CF6;
    transform: translateX(4px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4), inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

/* Workstream D: mobile wrapper for the Coach quick action. ContentArea
   already provides the horizontal gutter (width: 92%), so this only adds
   bottom rhythm — flush with the gamification card above it. */
const MobileCoachEntry = styled.div`
  margin: 0 0 16px;

  @media (min-width: 900px) {
    display: none;
  }
`;

// ─── Mobile Tab Bar ──────────────────────────────────────────────────

const MobileTabBar = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 20px;
  background: var(--bg-elevated, rgba(0, 32, 96, 0.85));
  border: 1px solid rgba(139, 92, 246, 0.08);
  border-radius: 1rem;
  padding: 4px;
  gap: 4px;

  @supports (backdrop-filter: blur(16px)) {
    background: var(--bg-elevated, rgba(0, 32, 96, 0.6));
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  @media (min-width: 900px) {
    display: none;
  }
`;

const MobileTab = styled.button<{ $active?: boolean }>`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(96, 192, 240, 0.08))'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#8B5CF6' : '#50A0F0')};
  cursor: pointer;
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.2s ease;

  &:hover {
    color: #8B5CF6;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4), inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  @media (max-width: 320px) {
    font-size: 0.65rem;
    padding: 10px 4px;
  }
`;

// ─── Feed Container Glass ────────────────────────────────────────────

const FeedContainer = styled.div`
  background: var(--bg-surface, rgba(0, 32, 96, 0.5));
  border: 1px solid rgba(139, 92, 246, 0.06);
  border-radius: 1.5rem;
  padding: 20px;
  min-height: 400px;

  @supports (backdrop-filter: blur(8px)) {
    background: var(--bg-surface, rgba(0, 32, 96, 0.3));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 1rem;
  }
  @media (max-width: 430px) {
    padding: 8px;
    background: transparent;
    backdrop-filter: none;
    border: none;
  }
`;

// ─── Component ───────────────────────────────────────────────────────

const VALID_TABS = ['feed', 'reels', 'friends', 'challenges', 'notifications'] as const;
type SocialTab = (typeof VALID_TABS)[number];

const SocialPageV3: React.FC = () => {
  const { user } = useAuth();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);

  // Derive activeTab directly from URL — no state duplication (Issue #6)
  const activeTab: SocialTab = VALID_TABS.includes(tab as SocialTab)
    ? (tab as SocialTab)
    : 'feed';

  // Parallax
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  const isDesktop = useMediaQuery('(min-width: 900px)');
  const socialNotifications = useSocialNotifications();
  const notificationCount = socialNotifications.unreadCount;

  const handleTabChange = (newTab: SocialTab) => {
    navigate(newTab === 'feed' ? '/user-dashboard' : `/user-dashboard/${newTab}`);
  };

  const handleNotificationSelect = useCallback(
    async (notification: SocialNotification) => {
      await socialNotifications.markAsClicked(notification.id);
      const link = typeof notification.link === 'string' ? notification.link.trim() : '';
      if (link.startsWith('/') && !link.startsWith('//')) navigate(link);
    },
    [navigate, socialNotifications],
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        /* Workstream D2a: Coach companion dock is feed-tab-only (grill-me Q5)
           and lives inside the feed branch so reels stays immersive and the
           D1 entries cover every other tab. */
        return (
          <>
            <SocialCoachDock />
            <SocialFeed />
          </>
        );
      case 'reels':
        return (
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>Loading Reels...</div>}>
            <VerticalReels />
          </Suspense>
        );
      case 'friends':
        return <FriendsList />;
      case 'challenges':
        return <ChallengesView />;
      case 'notifications':
        return (
          <SocialNotificationsPanel
            notifications={socialNotifications.notifications}
            unreadCount={socialNotifications.unreadCount}
            loading={socialNotifications.loading}
            error={socialNotifications.error}
            onRefresh={socialNotifications.refresh}
            onMarkAllRead={socialNotifications.markAllAsRead}
            onOpenNotification={handleNotificationSelect}
          />
        );
      default:
        return <SocialFeed />;
    }
  };

  return (
    <PageWrapper>
      <NoiseOverlay />

      {/* ── Parallax Hero ── */}
      <HeroSection ref={heroRef}>
        <HeroBg style={{ y: heroY }}>
          <HeroBgImage
            src="/images/parallax/social-hero-bg.png"
            alt=""
            loading="eager"
          />
        </HeroBg>
        <HeroOverlay />
        <HeroContent>
          <ScrollReveal direction="up" delay={0.1}>
            <HeroTitle text="Social Hub" forwardedAs="h1" speed={50} />
            <HeroSubtitle>
              Connect, compete, and celebrate with the SwanStudios community
            </HeroSubtitle>
          </ScrollReveal>
        </HeroContent>
      </HeroSection>

      {/* ── Main Content ── */}
      <ContentArea>
        {/* Merge M3: the mobile gamification mini-card was retired — the M2
            cover identity strip (avatar + tier + XP + streak) is now the single
            source of identity/XP/streak on /social, so this duplicated it. Full
            gamification lives on the dashboard. */}

        {/* Workstream D (fourth face): mobile Coach entry. Lives outside the
            profile.data guard (gamification fetch failure must not hide the
            Coach) and outside the tab bar (tabs switch in-page content; this
            navigates to the canonical role-routed Coach page). */}
        {!isDesktop && (
          <MobileCoachEntry>
            <QuickActionBtn onClick={() => navigate(getSwanCoachDashboardPath(user?.role))}>
              <MessageCircle size={16} />
              Ask Swan Coach
            </QuickActionBtn>
          </MobileCoachEntry>
        )}

        {/* Mobile tab bar — conditionally rendered (Issue #2) */}
        {!isDesktop && <MobileTabBar>
          <MobileTab
            $active={activeTab === 'feed'}
            onClick={() => handleTabChange('feed')}
          >
            <Home size={20} />
            Feed
          </MobileTab>
          <MobileTab
            $active={activeTab === 'reels'}
            onClick={() => handleTabChange('reels')}
          >
            <Play size={20} />
            Reels
          </MobileTab>
          <MobileTab
            $active={activeTab === 'friends'}
            onClick={() => handleTabChange('friends')}
          >
            <Users size={20} />
            Friends
          </MobileTab>
          <MobileTab
            $active={activeTab === 'challenges'}
            onClick={() => handleTabChange('challenges')}
          >
            <Trophy size={20} />
            Challenges
          </MobileTab>
          <MobileTab
            $active={activeTab === 'notifications'}
            onClick={() => handleTabChange('notifications')}
          >
            <Bell size={20} />
            Alerts
            {notificationCount > 0 && <MobileNotifDot>{notificationCount > 9 ? '9+' : notificationCount}</MobileNotifDot>}
          </MobileTab>
        </MobileTabBar>}

        {/* Desktop grid: sidebar + feed (+ right rail on the feed tab — M3) */}
        <DesktopGrid $threeCol={isDesktop && activeTab === 'feed'}>
          {/* Sidebar — conditionally rendered on desktop only (Issue #2).
              Merge M3: the sidebar GamificationCard was retired — it duplicated
              the M2 cover identity strip. The right rail's Next Best Action now
              carries the level-progress nudge. */}
          {isDesktop && <SidebarColumn>
            <ScrollReveal direction="left" delay={0.2}>
              <GlassSidebar>
                <NavSection>
                  <NavTitle>Social Hub</NavTitle>
                  <NavButton
                    $active={activeTab === 'feed'}
                    onClick={() => handleTabChange('feed')}
                  >
                    <Home size={18} />
                    Feed
                  </NavButton>
                  <NavButton
                    $active={activeTab === 'reels'}
                    onClick={() => handleTabChange('reels')}
                  >
                    <Play size={18} />
                    Reels
                  </NavButton>
                  <NavButton
                    $active={activeTab === 'friends'}
                    onClick={() => handleTabChange('friends')}
                  >
                    <Users size={18} />
                    Friends
                  </NavButton>
                  <NavButton
                    $active={activeTab === 'challenges'}
                    onClick={() => handleTabChange('challenges')}
                  >
                    <Trophy size={18} />
                    Challenges
                  </NavButton>
                  <NavButton
                    $active={activeTab === 'notifications'}
                    onClick={() => handleTabChange('notifications')}
                    aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
                  >
                    <Bell size={18} />
                    Notifications
                    {notificationCount > 0 && <NotifDot>{notificationCount > 99 ? '99+' : notificationCount}</NotifDot>}
                  </NavButton>
                </NavSection>

                <Divider />

                <NavSection>
                  <NavTitle>Quick Actions</NavTitle>
                  {/* Workstream D (fourth face): social-hub entry to the
                      canonical role-routed Coach page — same cross-surface
                      navigate pattern as View Rewards below. */}
                  <QuickActionBtn onClick={() => navigate(getSwanCoachDashboardPath(user?.role))}>
                    <MessageCircle size={16} />
                    Ask Swan Coach
                  </QuickActionBtn>
                  <QuickActionBtn onClick={() => handleTabChange('feed')}>
                    <PlusCircle size={16} />
                    Create Post
                  </QuickActionBtn>
                  <QuickActionBtn onClick={() => navigate('/user-dashboard/challenges')}>
                    <Target size={16} />
                    Set Goal
                  </QuickActionBtn>
                  <QuickActionBtn onClick={() => navigate('/dashboard/gamification')}>
                    <Award size={16} />
                    View Rewards
                  </QuickActionBtn>
                </NavSection>
              </GlassSidebar>
            </ScrollReveal>
          </SidebarColumn>}

          {/* Feed */}
          <ScrollReveal direction="up" delay={0.15}>
            <FeedContainer>{renderContent()}</FeedContainer>
          </ScrollReveal>

          {/* Right rail — feed tab + desktop only (M3). Reachable surfaces
              (challenges, leaderboard, logger) cover the data on smaller screens. */}
          {isDesktop && activeTab === 'feed' && <SocialRightRail />}
        </DesktopGrid>
      </ContentArea>
    </PageWrapper>
  );
};

export default SocialPageV3;
