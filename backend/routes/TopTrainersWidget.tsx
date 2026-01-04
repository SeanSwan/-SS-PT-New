import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Trophy } from 'lucide-react';
import apiService from '../../../../../services/api.service';
import { CommandCard } from '../admin-dashboard-view';

const TrainerList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 350px;
  overflow-y: auto;
`;

const TrainerItem = styled(motion.li)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(251, 191, 36, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const Rank = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fbbf24;
  width: 40px;
  text-align: center;
`;

const TrainerInfo = styled.div`
  flex: 1;
`;

const TrainerName = styled.div`
  font-weight: 600;
  color: #fff;
`;

const TrainerStats = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ComplianceScore = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
`;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const TopTrainersWidget: React.FC = () => {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const response = await apiService.get('/api/admin/reports/trainer-performance');
        setTrainers(response.data);
      } catch (error) {
        console.error("Failed to fetch top trainers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainers();
  }, []);

  return (
    <CommandCard style={{ padding: '2rem', height: '100%' }}>
      <h3 style={{ color: '#fbbf24', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
        Trainer Leaderboard
      </h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <TrainerList>
          {trainers.map((trainer, index) => (
            <TrainerItem key={trainer.rank} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: index * 0.1 }}>
              <Rank>{trainer.icon || trainer.rank}</Rank>
              <TrainerInfo>
                <TrainerName>{trainer.name}</TrainerName>
                <TrainerStats>{trainer.clientCount} clients</TrainerStats>
              </TrainerInfo>
              <ComplianceScore>{trainer.compliance}%</ComplianceScore>
            </TrainerItem>
          ))}
        </TrainerList>
      )}
    </CommandCard>
  );
};

export default TopTrainersWidget;