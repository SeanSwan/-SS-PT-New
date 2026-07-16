/**
 * ClientTimeline — Client-facing "Orbit" view
 * Vertically scrolling timeline of upcoming sessions.
 * Per Gemini 3.1 Pro: "Think Apple Wallet boarding passes"
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Rocket } from 'lucide-react';
import SessionCard, { SessionCardSession } from './SessionCard';
import { CLIENT_TIMELINE_THEME } from './ClientTimeline.theme';
import {
  CardList,
  CreditsBar,
  CreditsLabel,
  CreditsValue,
  EmptyState,
  EmptyText,
  EmptyTitle,
  SectionLabel,
  TimelineContainer,
} from './ClientTimeline.styles';

interface ClientTimelineProps {
  sessions: SessionCardSession[];
  onBook: (session: SessionCardSession) => void;
  onSelect: (session: SessionCardSession) => void;
  creditsDisplay: string | number;
}

const ClientTimeline: React.FC<ClientTimelineProps> = ({
  sessions,
  onBook,
  onSelect,
  creditsDisplay,
}) => {
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
    const upcoming = sorted.filter(s =>
      new Date(s.sessionDate) >= now &&
      (s.status === 'available' || s.status === 'scheduled' || s.status === 'confirmed')
    );
    const past = sorted
      .filter(s => new Date(s.sessionDate) < now || s.status === 'completed')
      .reverse()
      .slice(0, 5);
    return { upcoming, past };
  }, [sessions]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <TimelineContainer>
      {/* Credits Display */}
      <CreditsBar>
        <CreditsLabel>Sessions Remaining</CreditsLabel>
        <CreditsValue>{creditsDisplay}</CreditsValue>
      </CreditsBar>

      {/* Upcoming Sessions */}
      <SectionLabel>
        <Rocket size={16} />
        Upcoming Orbits
      </SectionLabel>

      {upcoming.length === 0 ? (
        <EmptyState>
          <Calendar size={40} color={CLIENT_TIMELINE_THEME.accentPrimary} />
          <EmptyTitle>No Upcoming Sessions</EmptyTitle>
          <EmptyText>
            Your orbit is clear. Browse available time slots to book your next session.
          </EmptyText>
        </EmptyState>
      ) : (
        <AnimatePresence>
          <CardList
            as={motion.div}
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {upcoming.map(session => (
              <motion.div key={session.id} variants={itemVariants}>
                <SessionCard
                  session={session}
                  variant="timeline"
                  onBook={onBook}
                  onSelect={onSelect}
                  showTrainer
                />
              </motion.div>
            ))}
          </CardList>
        </AnimatePresence>
      )}

      {/* Past Sessions */}
      {past.length > 0 && (
        <>
          <SectionLabel $muted>
            <Calendar size={16} />
            Recent
          </SectionLabel>
          <CardList>
            {past.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                variant="compact"
                onSelect={onSelect}
                showTrainer
              />
            ))}
          </CardList>
        </>
      )}
    </TimelineContainer>
  );
};

export default ClientTimeline;
