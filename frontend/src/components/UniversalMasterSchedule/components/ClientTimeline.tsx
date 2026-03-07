/**
 * ClientTimeline — Client-facing "Orbit" view
 * Vertically scrolling timeline of upcoming sessions.
 * Per Gemini 3.1 Pro: "Think Apple Wallet boarding passes"
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Rocket } from 'lucide-react';
import SessionCard, { SessionCardSession } from './SessionCard';

const TOKENS = {
  surfaceGlass: 'rgba(10, 10, 26, 0.6)',
  elevatedGlass: 'rgba(30, 30, 50, 0.7)',
  swanCyan: '#00FFFF',
  cosmicPurple: '#7851A9',
  deepSpace: '#0A0A1A',
  stellarWhite: '#f0f0ff',
  mutedText: '#8892b0',
  glassStroke: 'rgba(0, 255, 255, 0.1)',
};

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
  const now = new Date();

  const { upcoming, past } = useMemo(() => {
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
          <Calendar size={40} color={TOKENS.swanCyan} />
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

// ---- Styled Components ----

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
`;

const CreditsBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: ${TOKENS.surfaceGlass};
  backdrop-filter: blur(16px);
  border: 1px solid ${TOKENS.glassStroke};
  border-radius: 12px;
`;

const CreditsLabel = styled.span`
  font-size: 14px;
  color: ${TOKENS.mutedText};
  font-weight: 500;
`;

const CreditsValue = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: ${TOKENS.swanCyan};
  font-variant-numeric: tabular-nums;
`;

const SectionLabel = styled.h3<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${p => p.$muted ? TOKENS.mutedText : TOKENS.stellarWhite};
  margin: 8px 0 0;
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  background: ${TOKENS.surfaceGlass};
  backdrop-filter: blur(16px);
  border: 1px solid ${TOKENS.glassStroke};
  border-radius: 16px;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${TOKENS.stellarWhite};
  margin: 16px 0 8px;
`;

const EmptyText = styled.p`
  font-size: 14px;
  color: ${TOKENS.mutedText};
  max-width: 320px;
  line-height: 1.5;
`;
