import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WorkoutProgressCharts from './WorkoutProgressCharts';
import GlowButton from '../../../ui/buttons/GlowButton';

const DashboardContainer = styled(motion.div)`
  padding: 2rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  min-height: 100vh;
  color: white;
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
  background: linear-gradient(135deg, #ffffff, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.5rem;
`;

const StatsTickerPlaceholder = styled.div`
  background: rgba(30, 41, 59, 0.6);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: rgba(255, 255, 255, 0.7);
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