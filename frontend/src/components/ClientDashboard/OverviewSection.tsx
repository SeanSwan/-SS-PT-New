/**
 * OverviewSection.tsx
 * 
 * This component provides an advanced, gamified overview for clients.
 * It combines:
 *  - A GamificationCard displaying the client's current level, XP progress, and earned badges.
 *  - A TrophySection that displays NASM-inspired trophies (e.g., Push-Up Pro, Squat Champion)
 *    along with peer comparison statistics.
 *
 * The design is inspired by leading gaming platforms to motivate users.
 * All components are commented for clarity.
 */

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import ProgressBarFill from "../ProgressBarFill/ProgressBarFill"; // Ensure the path is correct

// --- Styled Components for Card Layout ---
const Card = styled.div`
  background: var(--light-bg);
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  padding: 1rem;
  margin-bottom: 1rem;
`;

const CardHeader = styled.div`
  margin-bottom: 0.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  color: var(--primary-color);
  text-align: center;
`;

const CardContent = styled.div`
  text-align: center;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 1rem auto;
  overflow: hidden;
  background: var(--primary-color);
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// --- Progress Bar ---
const ProgressBarContainer = styled.div`
  background: var(--grey);
  border-radius: 5px;
  height: 10px;
  width: 100%;
  margin: 1rem 0;
`;

const ProgressPercentageText = styled.p`
  font-size: 0.9rem;
  color: var(--primary-color);
  margin-top: 0.5rem;
  font-weight: bold;
`;

// --- Badge Layout ---
const BadgeContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Badge = styled.div`
  background: var(--secondary-color);
  color: var(--text-dark);
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

// --- Trophy Section ---
const TrophyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const TrophyCard = styled(Card)`
  padding: 0.5rem;
  text-align: center;
`;

const TrophyImage = styled.img`
  width: 100%;
  height: 80px;
  object-fit: contain;
`;

const TrophyTitle = styled.p`
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
  color: var(--primary-color);
`;

const TrophyStat = styled.p`
  font-size: 0.8rem;
  color: var(--text-dark);
`;

// --- GamificationCard Component ---
interface GamificationCardProps {
  currentLevel: number;
  currentPoints: number;
  nextLevelPoints: number;
  badges: { icon: React.FC<{ className?: string }>; label: string }[];
}

const GamificationCard: React.FC<GamificationCardProps> = ({
  currentLevel,
  currentPoints,
  nextLevelPoints,
  badges,
}) => {
  // Calculate progress percentage, ensuring it doesn't exceed 100%.
  const progressPercentage = Math.min(
    (currentPoints / nextLevelPoints) * 100,
    100
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gamification</CardTitle>
      </CardHeader>
      <CardContent>
        <Avatar>
          <AvatarImage src="/trophies/default-avatar.png" alt="User Avatar" />
        </Avatar>
        <h3>Level {currentLevel}</h3>
        <p>
          {currentPoints} / {nextLevelPoints} XP
        </p>
        <ProgressBarContainer>
          {/* Animate progress bar fill; $progress is transient */}
          <ProgressBarFill
            $progress={progressPercentage}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </ProgressBarContainer>
        <ProgressPercentageText>
          {progressPercentage.toFixed(0)}%
        </ProgressPercentageText>
        <BadgeContainer>
          {badges.map((badge, index) => (
            <Badge key={index}>
              {React.createElement(badge.icon, { className: "badge-icon" })}
              {badge.label}
            </Badge>
          ))}
        </BadgeContainer>
      </CardContent>
    </Card>
  );
};

// --- TrophySection Component ---
interface Trophy {
  id: number;
  title: string;
  imageUrl: string;
  achievedCount: number;
  totalClients: number;
}

const TrophySection: React.FC<{ trophies: Trophy[] }> = ({ trophies }) => {
  return (
    <div>
      <h3 style={{ textAlign: "center", color: "var(--primary-color)" }}>
        Trophies & Achievements
      </h3>
      <TrophyGrid>
        {trophies.map((trophy) => {
          // Calculate the percentage of clients who achieved this trophy.
          const percentage =
            trophy.totalClients > 0
              ? Math.round((trophy.achievedCount / trophy.totalClients) * 100)
              : 0;
          return (
            <TrophyCard key={trophy.id}>
              <TrophyImage src={trophy.imageUrl} alt={trophy.title} />
              <TrophyTitle>{trophy.title}</TrophyTitle>
              <TrophyStat>{percentage}% of clients achieved this</TrophyStat>
            </TrophyCard>
          );
        })}
      </TrophyGrid>
    </div>
  );
};

// --- OverviewSection Component ---
interface OverviewSectionProps {
  currentLevel: number;
  currentPoints: number;
  nextLevelPoints: number;
  badges: { icon: React.FC<{ className?: string }>; label: string }[];
  trophies: Trophy[];
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  currentLevel,
  currentPoints,
  nextLevelPoints,
  badges,
  trophies,
}) => {
  return (
    <div style={{ padding: "1rem" }}>
      <GamificationCard
        currentLevel={currentLevel}
        currentPoints={currentPoints}
        nextLevelPoints={nextLevelPoints}
        badges={badges}
      />
      <TrophySection trophies={trophies} />
      {/* Future additions: charts, logs, etc. */}
    </div>
  );
};

export default OverviewSection;
