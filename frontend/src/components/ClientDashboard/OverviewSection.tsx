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
import { Activity, Award, Star, Shield, Target, Zap } from "lucide-react";

// Temporary ProgressBarFill component to avoid dependency issues
const ProgressBarFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background-color: var(--primary-color);
  border-radius: inherit;
`;

// --- Styled Components for Card Layout ---
const Card = styled.div`
  background: #1d1f2b;
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
  color: #00ffff;
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
  background: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1d1f2b;
  font-size: 2rem;
  font-weight: bold;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// --- Progress Bar ---
const ProgressBarContainer = styled.div`
  background: #2c2f3e;
  border-radius: 5px;
  height: 10px;
  width: 100%;
  margin: 1rem 0;
  overflow: hidden;
`;

const ProgressPercentageText = styled.p`
  font-size: 0.9rem;
  color: #00ffff;
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
  background: rgba(120, 81, 169, 0.3);
  color: #00ffff;
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

const TrophyIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  color: #00ffff;
`;

const TrophyTitle = styled.p`
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
  color: #00ffff;
`;

const TrophyStat = styled.p`
  font-size: 0.8rem;
  color: #b0b0b0;
`;

// --- GamificationCard Component ---
interface GamificationCardProps {
  currentLevel: number;
  currentPoints: number;
  nextLevelPoints: number;
  badges: { icon: React.FC<{ size?: number }>; label: string }[];
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
        <CardTitle>Your Gamification Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <Avatar>
          J
        </Avatar>
        <h3 style={{ color: "#ffffff", marginBottom: "0.5rem" }}>Level {currentLevel}</h3>
        <p style={{ color: "#b0b0b0", margin: "0" }}>
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
          {progressPercentage.toFixed(0)}% to Level {currentLevel + 1}
        </ProgressPercentageText>
        <BadgeContainer>
          {badges && badges.length > 0 ? (
            badges.map((badge, index) => (
              <Badge key={index}>
                {React.createElement(badge.icon, { size: 16 })}
                {badge.label}
              </Badge>
            ))
          ) : (
            <Badge>
              <Activity size={16} />
              Fitness Beginner
            </Badge>
          )}
        </BadgeContainer>
      </CardContent>
    </Card>
  );
};

// --- TrophySection Component ---
interface Trophy {
  id: number;
  title: string;
  icon: React.FC<{ size?: number }>;
  achievedCount: number;
  totalClients: number;
}

const TrophySection: React.FC<{ trophies: Trophy[] }> = ({ trophies }) => {
  // Mock trophies if none are provided
  const displayTrophies = trophies && trophies.length > 0 ? trophies : [
    {
      id: 1,
      title: "Push-Up Pro",
      icon: Award,
      achievedCount: 45,
      totalClients: 100,
    },
    {
      id: 2,
      title: "Squat Master",
      icon: Shield,
      achievedCount: 32,
      totalClients: 100,
    },
    {
      id: 3,
      title: "Consistency",
      icon: Target,
      achievedCount: 67,
      totalClients: 100,
    },
    {
      id: 4,
      title: "Early Bird",
      icon: Zap,
      achievedCount: 25,
      totalClients: 100,
    },
  ];

  return (
    <div>
      <h3 style={{ textAlign: "center", color: "#00ffff", marginTop: "2rem" }}>
        Trophies & Achievements
      </h3>
      <TrophyGrid>
        {displayTrophies.map((trophy) => {
          // Calculate the percentage of clients who achieved this trophy.
          const percentage =
            trophy.totalClients > 0
              ? Math.round((trophy.achievedCount / trophy.totalClients) * 100)
              : 0;
          return (
            <TrophyCard key={trophy.id}>
              <TrophyIcon>
                {React.createElement(trophy.icon, { size: 30 })}
              </TrophyIcon>
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
  badges: { icon: React.FC<{ size?: number }>; label: string }[];
  trophies: Trophy[];
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  currentLevel = 5,
  currentPoints = 450,
  nextLevelPoints = 1000,
  badges = [],
  trophies = [],
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