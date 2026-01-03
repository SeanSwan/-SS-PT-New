/**
 * ClientScheduleTab.tsx
 *
 * Enhanced Client Schedule Tab with brand-consistent styling
 * - Matches admin/trainer dashboard visual design
 * - Uses styled-components and design tokens
 * - Full viewport height utilization
 * - Client-specific stats and Quick Book functionality
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Calendar, Clock, CreditCard, User, TrendingUp, History } from 'lucide-react';
import moment from 'moment';

// Import design tokens
import { theme, prefersReducedMotion } from '../../../../../theme/tokens';

// Import components
import UnifiedCalendar from '../../../../Schedule/schedule';
import ScheduleInitializer from '../../../../Schedule/ScheduleInitializer';
import ScheduleErrorBoundary from '../../../../Schedule/ScheduleErrorBoundary';
import { useAuth } from '../../../../../context/AuthContext';
import { useAppSelector } from '../../../../../redux/hooks';
import { selectAllSessions } from '../../../../../redux/slices/scheduleSlice';
import ClientSessionHistory from './ClientSessionHistory';

// Client Schedule Container with brand gradient background
const ClientScheduleContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background:
    radial-gradient(circle at 10% 20%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(120, 81, 169, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
  overflow: hidden;

  /* Sensational background effects */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        rgba(0, 255, 255, 0.01) 1px,
        transparent 2px,
        transparent 40px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        rgba(120, 81, 169, 0.01) 1px,
        transparent 2px,
        transparent 40px
      );
    pointer-events: none;
    z-index: 0;
  }
`;

// Client Schedule Header with 60px min-height
const ClientScheduleHeader = styled(motion.div)`
  position: relative;
  z-index: 2;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  min-height: 60px;
  background: rgba(15, 12, 41, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);

  /* Brand gradient underline */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${theme.colors.brand.cyan} 25%,
      ${theme.colors.brand.purple} 75%,
      transparent 100%
    );
    animation: shimmer 3s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { opacity: 0.5; transform: translateX(-100%); }
    50% { opacity: 1; transform: translateX(100%); }
  }

  /* Mobile-first responsive */
  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md} ${theme.spacing.md};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
  }

  ${prefersReducedMotion} {
    &::after {
      animation: none;
    }
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing.sm};
  }
`;

const TitleSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ClientIcon = styled(motion.div)`
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  background: ${theme.colors.brand.gradient};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.primary};
  font-size: 1.2rem;
  box-shadow: 0 4px 16px rgba(0, 255, 255, 0.3);
  position: relative;

  /* Glow animation */
  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 14px;
    background: ${theme.colors.brand.gradient};
    filter: blur(4px);
    opacity: 0.7;
    z-index: -1;
    animation: glow 2s ease-in-out infinite alternate;
  }

  @keyframes glow {
    from { opacity: 0.7; transform: scale(1); }
    to { opacity: 1; transform: scale(1.05); }
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  ${prefersReducedMotion} {
    &::before {
      animation: none;
    }
  }
`;

const TitleText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const MainTitle = styled(motion.h1)`
  font-size: ${theme.typography.scale.xl};
  font-weight: ${theme.typography.weight.bold};
  margin: 0;
  background: linear-gradient(135deg, ${theme.colors.text.primary}, ${theme.colors.brand.cyan});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: ${theme.typography.scale.lg};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: ${theme.typography.scale.base};
  }
`;

const Subtitle = styled(motion.p)`
  font-size: ${theme.typography.scale.sm};
  color: ${theme.colors.text.secondary};
  margin: 0;
  font-weight: ${theme.typography.weight.normal};

  @media (max-width: ${theme.breakpoints.tablet}) {
    font-size: ${theme.typography.scale.xs};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: ${theme.spacing.sm};
  }
`;

const StatsBar = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: center;

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 100%;
    justify-content: space-between;
    gap: ${theme.spacing.sm};
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    flex-wrap: wrap;
    gap: ${theme.spacing.xs};
  }
`;

const StatItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  min-height: 44px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  font-size: ${theme.typography.scale.sm};
  color: ${theme.colors.text.primary};
  backdrop-filter: blur(10px);

  svg {
    color: ${theme.colors.brand.cyan};
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: rgba(0, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 3px solid ${theme.colors.brand.cyan};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    font-size: ${theme.typography.scale.xs};

    svg {
      font-size: 0.8rem;
    }
  }

  ${prefersReducedMotion} {
    &:hover {
      transform: none;
    }
  }
`;

const QuickBookButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-height: 44px;
  min-width: 120px;
  background: ${theme.colors.brand.gradient};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.scale.sm};
  font-weight: ${theme.typography.weight.semibold};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 255, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 3px solid ${theme.colors.brand.cyan};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 100%;
  }

  ${prefersReducedMotion} {
    transition: none;

    &:hover {
      transform: none;
    }

    &:active {
      transform: none;
    }
  }
`;

const HistoryButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  min-height: 44px;
  background: rgba(120, 81, 169, 0.15);
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.scale.sm};
  font-weight: ${theme.typography.weight.semibold};
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(120, 81, 169, 0.25);
    border-color: rgba(120, 81, 169, 0.5);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 3px solid ${theme.colors.brand.purple};
    outline-offset: 2px;
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: 100%;
  }
`;

// Main content area
const ScheduleMainContent = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  overflow: hidden;

  /* Premium card container */
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0;
  backdrop-filter: blur(10px);

  /* Inner content padding and styling */
  .schedule-content {
    flex: 1;
    padding: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;

    /* Full height calendar container */
    > div {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100% !important;
      min-height: calc(100vh - 120px) !important;

      > div {
        flex: 1;
        height: 100% !important;
      }

      @media (max-width: ${theme.breakpoints.tablet}) {
        min-height: calc(100vh - 180px) !important;
      }

      @media (max-width: ${theme.breakpoints.mobile}) {
        min-height: calc(100vh - 200px) !important;
      }
    }
  }
`;

// Animation variants
const containerVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  hidden: {
    opacity: 0,
    y: -30
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const contentVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.2,
      ease: "easeOut"
    }
  }
};

const itemVariants = {
  hidden: {
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const ClientScheduleTab: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { user } = useAuth();
  const allSessions = useAppSelector(selectAllSessions);

  // Calculate upcoming sessions this week for the current user
  const upcomingThisWeek = allSessions.filter(session => {
    const isUserSession = session.userId === user?.id;
    const isConfirmed = session.status === 'confirmed' || session.status === 'scheduled';
    const isThisWeek = moment(session.start).isBetween(moment().startOf('week'), moment().endOf('week'));
    return isUserSession && isConfirmed && isThisWeek;
  }).length;

  // Client-specific stats from the authenticated user context and calculated values
  const stats = {
    // `sessionsScheduled` on the user object is the single source of truth for scheduled sessions
    mySessionsCount: user?.sessionsScheduled ?? 0,
    // `sessionsRemaining` on the user object is the single source of truth for credits
    creditsRemaining: user?.sessionsRemaining ?? 0,
    upcomingThisWeek: upcomingThisWeek,
    sessionsCompleted: user?.sessionsCompleted ?? 0,
  };

  useEffect(() => {
    // Enhanced initialization with proper document title
    document.title = "My Training Schedule | Client Dashboard - SwanStudios";

    // Simulate loading delay for smooth animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleQuickBook = () => {
    alert("Quick Book feature: Click on an available session in the calendar to book");
  };

  return (
    <ClientScheduleContainer
      variants={containerVariants}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
    >
      {/* Client Schedule Header */}
      <ClientScheduleHeader variants={headerVariants}>
        <HeaderContent>
          <TitleSection>
            <ClientIcon
              whileHover={{
                scale: 1.1,
                rotate: 5
              }}
              whileTap={{ scale: 0.95 }}
            >
              <User />
            </ClientIcon>
            <TitleText>
              <MainTitle variants={itemVariants}>
                My Training Schedule
              </MainTitle>
              <Subtitle variants={itemVariants}>
                View available training slots, book new sessions, and manage your appointments
              </Subtitle>
            </TitleText>
          </TitleSection>

          <HeaderActions>
            <StatsBar variants={itemVariants}>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Calendar />
                <span>Scheduled: {stats.mySessionsCount}</span>
              </StatItem>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <CreditCard />
                <span>Credits Left: {stats.creditsRemaining}</span>
              </StatItem>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Clock />
                <span>This Week: {stats.upcomingThisWeek}</span>
              </StatItem>
              <StatItem
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <TrendingUp />
                <span>Completed: {stats.sessionsCompleted}</span>
              </StatItem>
            </StatsBar>

            <QuickBookButton
              onClick={handleQuickBook}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calendar size={16} />
              Quick Book
            </QuickBookButton>
          </HeaderActions>

          <HistoryButton
            onClick={() => setIsHistoryOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <History size={16} />
            View History
          </HistoryButton>
        </HeaderContent>
      </ClientScheduleHeader>

      {/* Main Content */}
      <ScheduleMainContent variants={contentVariants}>
        <div className="schedule-content">
          <ScheduleInitializer>
            <ScheduleErrorBoundary>
              <UnifiedCalendar />
            </ScheduleErrorBoundary>
          </ScheduleInitializer>
        </div>
      </ScheduleMainContent>

      <ClientSessionHistory 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={allSessions.filter(s => s.userId === user?.id)}
      />
    </ClientScheduleContainer>
  );
};

export default ClientScheduleTab;
