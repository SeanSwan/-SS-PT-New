/**
 * SocialPage.V3.tsx — Cinematic Social Hub
 *
 * Full cinematic upgrade: parallax hero, glassmorphism cards, noise overlay,
 * TypewriterText, ScrollReveal, enhanced GlowButtons, 320px–3840px responsive.
 * Preserves all existing functionality (feed, friends, challenges, gamification).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Users,
  Trophy,
  Bell,
  PlusCircle,
  Star,
  Zap,
  Target,
  Award,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGamificationData } from '../../hooks/gamification/useGamificationData';
import SocialFeed from '../../components/Social/Feed/SocialFeed';
import FriendsList from '../../components/Social/Friends/FriendsList';
import ChallengesView from '../../components/Social/Challenges/ChallengesView';
import GlowButton from '../../components/ui/buttons/GlowButton';
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';

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
  background: #0a0a1a;
  color: #E0ECF4;
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
    rgba(10, 10, 26, 0.7) 0%,
    rgba(10, 10, 26, 0.85) 50%,
    rgba(10, 10, 26, 0.95) 100%
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
  background: linear-gradient(135deg, #00FFFF, #60C0F0, #C6A84B);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  animation: ${shimmer} 6s linear infinite;
  margin-bottom: 0.5rem;
  ${reducedMotion}

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
  color: rgba(224, 236, 244, 0.7);
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

const DesktopGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;

  @media (max-width: 899px) {
    grid-template-columns: 1fr;
  }
  @media (min-width: 2560px) {
    grid-template-columns: 320px 1fr;
    gap: 32px;
  }
  @media (min-width: 3840px) {
    grid-template-columns: 380px 1fr;
    gap: 40px;
  }
`;

// ─── Glass Sidebar ───────────────────────────────────────────────────

const GlassSidebar = styled.div`
  background: rgba(10, 10, 26, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 1.5rem;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 80px;
`;

// ─── Gamification Card ───────────────────────────────────────────────

const GamificationCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(120, 81, 169, 0.08));
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 1.25rem;
  padding: 20px;
  margin-bottom: 16px;
`;

const PointsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const PointsValue = styled.h3`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: linear-gradient(135deg, #00FFFF, #60C0F0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PointsLabel = styled.span`
  font-size: 0.8rem;
  color: rgba(224, 236, 244, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const LevelBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(0, 255, 255, 0.12);
  color: #00FFFF;
  border: 1px solid rgba(0, 255, 255, 0.2);
`;

const StreakRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: rgba(224, 236, 244, 0.8);

  svg {
    color: #C6A84B;
  }
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $value: number }>`
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #00FFFF, #60C0F0);
  width: ${props => Math.min(Math.max(props.$value, 0), 100)}%;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ProgressLabel = styled.span`
  font-size: 0.72rem;
  color: rgba(224, 236, 244, 0.5);
`;

// ─── Sidebar Navigation ─────────────────────────────────────────────

const NavSection = styled.div`
  margin-top: 8px;
`;

const NavTitle = styled.h4`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(224, 236, 244, 0.4);
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
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(96, 192, 240, 0.06))'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#00FFFF' : 'rgba(224, 236, 244, 0.8)')};
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.2s ease;
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(0, 255, 255, 0.15)' : 'transparent'};

  &:hover {
    background: rgba(0, 255, 255, 0.06);
    color: #00FFFF;
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
  background: linear-gradient(135deg, #C6A84B, #DAC36E);
  color: #0a0a1a;
  margin-left: auto;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(0, 255, 255, 0.08);
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
  border: 1px solid rgba(0, 255, 255, 0.12);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.8);
  font-family: inherit;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.05);
    border-color: rgba(0, 255, 255, 0.25);
    color: #00FFFF;
    transform: translateX(4px);
  }
`;

// ─── Mobile Tab Bar ──────────────────────────────────────────────────

const MobileTabBar = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 20px;
  background: rgba(10, 10, 26, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 4px;
  gap: 4px;
`;

const MobileTab = styled.button<{ $active?: boolean }>`
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
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.12), rgba(96, 192, 240, 0.08))'
      : 'transparent'};
  color: ${({ $active }) => ($active ? '#00FFFF' : 'rgba(224, 236, 244, 0.6)')};
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.2s ease;

  &:hover {
    color: #00FFFF;
  }

  @media (max-width: 320px) {
    font-size: 0.65rem;
    padding: 10px 4px;
  }
`;

// ─── Feed Container Glass ────────────────────────────────────────────

const FeedContainer = styled.div`
  background: rgba(10, 10, 26, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 255, 0.06);
  border-radius: 1.5rem;
  padding: 20px;
  min-height: 400px;

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

const VALID_TABS = ['feed', 'friends', 'challenges'] as const;
type SocialTab = (typeof VALID_TABS)[number];

const SocialPageV3: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useGamificationData();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement>(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 900
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const initialTab: SocialTab = VALID_TABS.includes(tab as SocialTab)
    ? (tab as SocialTab)
    : 'feed';
  const [activeTab, setActiveTab] = useState<SocialTab>(initialTab);

  useEffect(() => {
    const urlTab = VALID_TABS.includes(tab as SocialTab) ? (tab as SocialTab) : 'feed';
    setActiveTab(urlTab);
  }, [tab]);

  // Parallax
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  const notificationCount = 3;

  const handleTabChange = (newTab: SocialTab) => {
    setActiveTab(newTab);
    navigate(newTab === 'feed' ? '/social' : `/social/${newTab}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return <SocialFeed />;
      case 'friends':
        return <FriendsList />;
      case 'challenges':
        return <ChallengesView />;
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
        {isMobile ? (
          <>
            {/* Mobile: Gamification summary + tabs */}
            {profile.data && (
              <ScrollReveal direction="up" delay={0.05}>
                <GamificationCard>
                  <PointsRow>
                    <div>
                      <PointsValue>{profile.data.points?.toLocaleString() || 0}</PointsValue>
                      <PointsLabel>Points</PointsLabel>
                    </div>
                    <LevelBadge>
                      <Star size={14} />
                      Level {profile.data.level || 1}
                    </LevelBadge>
                  </PointsRow>
                  <StreakRow>
                    <Zap size={16} />
                    {profile.data.streakDays || 0} day streak
                  </StreakRow>
                  <ProgressTrack>
                    <ProgressFill $value={profile.data.nextLevelProgress || 0} />
                  </ProgressTrack>
                </GamificationCard>
              </ScrollReveal>
            )}

            <MobileTabBar>
              <MobileTab
                $active={activeTab === 'feed'}
                onClick={() => handleTabChange('feed')}
              >
                <Home size={20} />
                Feed
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
            </MobileTabBar>

            <FeedContainer>{renderContent()}</FeedContainer>
          </>
        ) : (
          <DesktopGrid>
            {/* ── Sidebar ── */}
            <div>
              {profile.data && (
                <ScrollReveal direction="left" delay={0.1}>
                  <GamificationCard>
                    <PointsRow>
                      <div>
                        <PointsValue>
                          {profile.data.points?.toLocaleString() || 0}
                        </PointsValue>
                        <PointsLabel>Points</PointsLabel>
                      </div>
                      <LevelBadge>
                        <Star size={14} />
                        Level {profile.data.level || 1}
                      </LevelBadge>
                    </PointsRow>
                    <StreakRow>
                      <Zap size={16} />
                      {profile.data.streakDays || 0} day streak
                    </StreakRow>
                    <div>
                      <ProgressLabel>Next Level Progress</ProgressLabel>
                      <ProgressTrack>
                        <ProgressFill $value={profile.data.nextLevelProgress || 0} />
                      </ProgressTrack>
                      <ProgressLabel>
                        {profile.data.nextLevelProgress || 0}% to Level{' '}
                        {(profile.data.level || 1) + 1}
                      </ProgressLabel>
                    </div>
                  </GamificationCard>
                </ScrollReveal>
              )}

              <ScrollReveal direction="left" delay={0.2}>
                <GlassSidebar>
                  <NavSection>
                    <NavTitle>Navigation</NavTitle>
                    <NavButton
                      $active={activeTab === 'feed'}
                      onClick={() => handleTabChange('feed')}
                    >
                      <Home size={18} />
                      Feed
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
                    <NavButton disabled style={{ opacity: 0.5 }}>
                      <Bell size={18} />
                      Notifications
                      {notificationCount > 0 && <NotifDot>{notificationCount}</NotifDot>}
                    </NavButton>
                  </NavSection>

                  <Divider />

                  <NavSection>
                    <NavTitle>Quick Actions</NavTitle>
                    <QuickActionBtn onClick={() => handleTabChange('feed')}>
                      <PlusCircle size={16} />
                      Create Post
                    </QuickActionBtn>
                    <QuickActionBtn>
                      <Target size={16} />
                      Set Goal
                    </QuickActionBtn>
                    <QuickActionBtn>
                      <Award size={16} />
                      View Rewards
                    </QuickActionBtn>
                  </NavSection>
                </GlassSidebar>
              </ScrollReveal>
            </div>

            {/* ── Feed ── */}
            <ScrollReveal direction="up" delay={0.15}>
              <FeedContainer>{renderContent()}</FeedContainer>
            </ScrollReveal>
          </DesktopGrid>
        )}
      </ContentArea>
    </PageWrapper>
  );
};

export default SocialPageV3;
