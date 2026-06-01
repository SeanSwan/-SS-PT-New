import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Clock, User } from 'lucide-react';

import { FlexRow } from './AdminSessionsTable.styles';
import { StatsGridContainer, StatsCard, StatsIconContainer, StatsValue, StatsLabel } from './AdminSessionsStats.styles';
import { staggeredItemVariants } from './AdminSessionsTheme.styles';

export interface AdminSessionsStatsData {
  todaySessions: number;
  completedHours: number;
  activeTrainers: number;
  completionRate: number;
}

interface AdminSessionsStatsSummaryProps {
  loading: boolean;
  statsData: AdminSessionsStatsData;
}

const AdminSessionsStatsSummary: React.FC<AdminSessionsStatsSummaryProps> = ({ loading, statsData }) => (
  <StatsGridContainer>
    <StatsCard $variant="primary" as={motion.div} custom={0} variants={staggeredItemVariants}>
      <FlexRow $gap="1rem">
        <StatsIconContainer $variant="primary">
          <Calendar size={24} />
        </StatsIconContainer>
        <div>
          <StatsValue>{loading ? '-' : statsData.todaySessions}</StatsValue>
          <StatsLabel>Sessions Today</StatsLabel>
        </div>
      </FlexRow>
    </StatsCard>

    <StatsCard $variant="success" as={motion.div} custom={1} variants={staggeredItemVariants}>
      <FlexRow $gap="1rem">
        <StatsIconContainer $variant="success">
          <Clock size={24} />
        </StatsIconContainer>
        <div>
          <StatsValue>{loading ? '-' : statsData.completedHours}</StatsValue>
          <StatsLabel>Hours Completed</StatsLabel>
        </div>
      </FlexRow>
    </StatsCard>

    <StatsCard $variant="info" as={motion.div} custom={2} variants={staggeredItemVariants}>
      <FlexRow $gap="1rem">
        <StatsIconContainer $variant="info">
          <User size={24} />
        </StatsIconContainer>
        <div>
          <StatsValue>{loading ? '-' : statsData.activeTrainers}</StatsValue>
          <StatsLabel>Active Trainers</StatsLabel>
        </div>
      </FlexRow>
    </StatsCard>

    <StatsCard $variant="warning" as={motion.div} custom={3} variants={staggeredItemVariants}>
      <FlexRow $gap="1rem">
        <StatsIconContainer $variant="warning">
          <CheckCircle size={24} />
        </StatsIconContainer>
        <div>
          <StatsValue>{loading ? '-' : `${statsData.completionRate}%`}</StatsValue>
          <StatsLabel>Completion Rate</StatsLabel>
        </div>
      </FlexRow>
    </StatsCard>
  </StatsGridContainer>
);

export default AdminSessionsStatsSummary;
