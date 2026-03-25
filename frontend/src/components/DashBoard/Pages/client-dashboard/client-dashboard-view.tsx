import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WorkoutProgressCharts from './WorkoutProgressCharts';
import GlowButton from '../../../ui/buttons/GlowButton';

const DashboardContainer = styled(motion.div)`
  padding: 2rem;
  background: var(--bg-base, #030712);
  min-height: 100vh;
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--text-primary, #E0ECF4), var(--accent-primary, #60C0F0));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary, #94a3b8);
  margin-top: 0.5rem;
`;

const StatsTickerPlaceholder = styled.div`
  background: var(--bg-elevated, #141419);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  color: var(--text-secondary, #94a3b8);
`;

const ClientDashboardView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <div>
          <PageTitle>Training Command Center</PageTitle>
          <Subtitle>Track your journey to peak performance.</Subtitle>
        </div>
        <GlowButton 
          text="Back to Social"
          icon={<ArrowLeft size={18} />}
          theme="purple"
          onClick={() => navigate('/dashboard/user')}
        />
      </Header>

      <StatsTickerPlaceholder>
        🏆 YOUR TRAINING STATS ───────────────────────────────────<br/>
        💪 1,247 TOTAL PUSHUPS │ 🦵 893 SQUATS │ 🏋️ 45,230 LBS TOTAL VOLUME
      </StatsTickerPlaceholder>

      <WorkoutProgressCharts />

    </DashboardContainer>
  );
};

export default ClientDashboardView;