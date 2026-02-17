import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';
import { Achievement } from '../../types';

const NotificationContainer = styled(motion.div)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  width: 400px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  padding: 16px;

  @media (max-width: 600px) {
    width: 90%;
  }
`;

const ContentRow = styled.div`
  display: flex;
  align-items: center;
`;

const IconCircle = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 16px;
  color: rgba(0, 255, 255, 0.9);
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
  flex-shrink: 0;
`;

const InfoSection = styled.div`
  flex: 1;
`;

const NotifTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const NotifName = styled.p`
  font-size: 1rem;
  color: white;
  margin: 4px 0;
`;

const NotifDescription = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
`;

const PointsRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 8px;
  gap: 4px;
`;

const PointsValue = styled.span`
  font-size: 0.875rem;
  font-weight: bold;
  color: white;
`;

const PointsLabel = styled.span`
  font-size: 0.875rem;
  color: white;
`;

interface AchievementNotificationProps {
  isVisible: boolean;
  achievement: Achievement | null;
}

/**
 * Component for displaying achievement unlock notifications
 */
const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  isVisible,
  achievement
}) => {
  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <NotificationContainer
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <ContentRow>
            <IconCircle>
              {achievement.icon}
            </IconCircle>
            <InfoSection>
              <NotifTitle>Achievement Unlocked!</NotifTitle>
              <NotifName>{achievement.name}</NotifName>
              <NotifDescription>{achievement.description}</NotifDescription>
              <PointsRow>
                <PointsValue>+{achievement.points}</PointsValue>
                <Award size={16} />
                <PointsLabel>points</PointsLabel>
              </PointsRow>
            </InfoSection>
          </ContentRow>
        </NotificationContainer>
      )}
    </AnimatePresence>
  );
};

export default AchievementNotification;
